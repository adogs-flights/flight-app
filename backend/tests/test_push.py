import base64
from datetime import timedelta
from unittest.mock import Mock

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from sqlalchemy.orm import sessionmaker

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token
from services.notification_service import NotificationMessage, NotificationService, deliver_notification
from services.push_provider import DeliveryResult, PushProvider
from services.web_push_provider import WebPushProvider, WebPushSettings


def encoded(value):
    return base64.urlsafe_b64encode(value).decode().rstrip('=')


@pytest.fixture
def configured(monkeypatch):
    key = ec.generate_private_key(ec.SECP256R1())
    public = encoded(key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint))
    private = encoded(key.private_numbers().private_value.to_bytes(32, 'big'))
    monkeypatch.setenv('VAPID_PUBLIC_KEY', public)
    monkeypatch.setenv('VAPID_PRIVATE_KEY', private)
    monkeypatch.setenv('VAPID_SUBJECT', 'mailto:admin@example.com')
    return WebPushSettings.from_env()


@pytest.fixture
def payload(configured):
    return {'endpoint': 'https://fcm.googleapis.com/fcm/send/test-device',
            'keys': {'p256dh': configured.public_key, 'auth': encoded(b'a' * 16)},
            'expirationTime': None}


def authenticate(client, user):
    client.cookies.set(ACCESS_COOKIE_NAME, create_access_token(
        data={'sub': user.id}, expires_delta=timedelta(minutes=5)))


def test_subscription_upsert_and_account_transfer(client, db_session, make_user, payload):
    first, second = make_user(role='general'), make_user(role='general')
    authenticate(client, first)
    assert client.post('/api/push/subscriptions', json=payload).status_code == 204
    payload['keys']['auth'] = encoded(b'b' * 16)
    assert client.post('/api/push/subscriptions', json=payload).status_code == 204
    subscription = db_session.query(models.PushSubscription).one()
    assert subscription.user_id == first.id
    assert subscription.auth == payload['keys']['auth']
    authenticate(client, second)
    assert client.post('/api/push/subscriptions', json=payload).status_code == 204
    db_session.expire_all()
    assert db_session.query(models.PushSubscription).one().user_id == second.id


def test_delete_only_own_and_status(client, db_session, make_user, payload):
    owner, other = make_user(role='general'), make_user(role='general')
    authenticate(client, owner)
    client.post('/api/push/subscriptions', json=payload)
    endpoint = {'endpoint': payload['endpoint']}
    assert client.post('/api/push/subscription-status', json=endpoint).json() == {'subscribed': True}
    authenticate(client, other)
    assert client.post('/api/push/subscription-status', json=endpoint).json() == {'subscribed': False}
    assert client.request('DELETE', '/api/push/subscriptions', json=endpoint).status_code == 204
    assert db_session.query(models.PushSubscription).count() == 1
    authenticate(client, owner)
    assert client.request('DELETE', '/api/push/subscriptions', json=endpoint).status_code == 204
    assert db_session.query(models.PushSubscription).count() == 0


def test_public_key_and_disabled(client, configured, monkeypatch):
    response = client.get('/api/push/public-key')
    assert response.json() == {'public_key': configured.public_key}
    assert configured.private_key not in response.text
    monkeypatch.delenv('VAPID_PRIVATE_KEY')
    assert client.get('/api/push/public-key').status_code == 503


@pytest.mark.parametrize('method,path', [
    ('post', '/subscriptions'), ('delete', '/subscriptions'), ('get', '/status'),
    ('post', '/test'), ('post', '/subscription-status'),
])
def test_auth_required(client, method, path, payload):
    response = client.request(method, '/api/push' + path, json=payload)
    assert response.status_code == 401


@pytest.mark.parametrize('endpoint', [
    'http://fcm.googleapis.com/send/1', 'https://127.0.0.1/send',
    'https://fcm.googleapis.com.evil.test/send', 'https://evil.test/send',
    'https://fcm.googleapis.com:8443/send', 'https://user@fcm.googleapis.com/send',
])
def test_endpoint_ssrf_rejected(client, make_user, payload, endpoint):
    authenticate(client, make_user(role='general'))
    payload['endpoint'] = endpoint
    assert client.post('/api/push/subscriptions', json=payload).status_code == 422


def test_cannot_supply_user_id_or_invalid_keys(client, make_user, payload):
    authenticate(client, make_user(role='general'))
    assert client.post('/api/push/subscriptions', json={**payload, 'user_id': 'someone'}).status_code == 422
    payload['keys']['p256dh'] = 'invalid'
    assert client.post('/api/push/subscriptions', json=payload).status_code == 422


class FakeProvider(PushProvider):
    def __init__(self, results):
        self.results = iter(results)
        self.calls = []

    def send(self, subscription, message):
        self.calls.append((subscription.id, message))
        result = next(self.results)
        if isinstance(result, Exception):
            raise result
        return result


def add_subscriptions(db, user, count=1):
    for i in range(count):
        db.add(models.PushSubscription(user_id=user.id, endpoint=f'https://fcm.googleapis.com/send/{user.id}/{i}', p256dh='test', auth='test'))
    db.commit()


def test_service_multiple_devices_expired_and_failure_isolation(db_session, make_user):
    user, other = make_user(role='general'), make_user(role='general')
    add_subscriptions(db_session, user, 4)
    add_subscriptions(db_session, other)
    provider = FakeProvider([DeliveryResult.SENT, DeliveryResult.EXPIRED, RuntimeError('private'), DeliveryResult.SENT])
    message = NotificationMessage('title', 'body', '/myapplications')
    result = NotificationService(provider).send_to_user(db=db_session, user_id=user.id, message=message)
    assert result == {'sent': 2, 'expired': 1, 'failed': 1}
    assert len(provider.calls) == 4
    assert all(call[1] == message for call in provider.calls)
    assert db_session.query(models.PushSubscription).filter_by(user_id=user.id).count() == 3
    assert db_session.query(models.PushSubscription).filter_by(user_id=other.id).count() == 1


@pytest.mark.parametrize('status,expected', [(201, 'sent'), (404, 'expired'), (410, 'expired'), (429, 'failed'), (500, 'failed'), (302, 'failed')])
def test_provider_http_mapping_and_cleanup(status, expected, configured, monkeypatch, db_session, make_user):
    from pywebpush import WebPushException
    import services.web_push_provider as module
    response = Mock(status_code=status)
    # requests.Response(404/410) is falsy; exercise that boundary too.
    sender = Mock(return_value=response)
    if status >= 400:
        from requests import Response
        response = Response()
        response.status_code = status
        sender.side_effect = WebPushException('secret endpoint', response=response)
    monkeypatch.setattr(module, 'webpush', sender)
    user = make_user(role='general')
    add_subscriptions(db_session, user)
    result = NotificationService(WebPushProvider(configured)).send_to_user(
        db=db_session, user_id=user.id, message=NotificationMessage('title', 'body'))
    assert result[expected] == 1
    assert db_session.query(models.PushSubscription).count() == (0 if expected == 'expired' else 1)
    assert sender.call_args.kwargs['timeout'] == 10
    assert sender.call_args.kwargs['vapid_claims'] == {'sub': configured.subject}


def test_background_owns_and_closes_session(db_engine, make_user, configured, monkeypatch):
    import services.notification_service as service
    import services.web_push_provider as transport
    user = make_user(role='general')
    factory = sessionmaker(bind=db_engine)
    sessions = []
    def create_session():
        session = factory()
        session.close = Mock(wraps=session.close)
        sessions.append(session)
        return session
    monkeypatch.setattr(service, 'SessionLocal', create_session)
    monkeypatch.setattr(transport, 'WebPushProvider', lambda settings: FakeProvider([]))
    deliver_notification(user.id, NotificationMessage('title', 'body'))
    assert len(sessions) == 1
    sessions[0].close.assert_called_once()


def test_user_delete_cascades(db_session, make_user):
    user = make_user(role='general')
    add_subscriptions(db_session, user)
    db_session.delete(user)
    db_session.commit()
    assert db_session.query(models.PushSubscription).count() == 0


def test_test_push_only_current_user(client, make_user, configured, monkeypatch):
    import services.notification_service as service
    sent = Mock()
    monkeypatch.setattr(service, 'deliver_notification', sent)
    user = make_user(role='general')
    authenticate(client, user)
    assert client.post('/api/push/test').status_code == 202
    assert sent.call_args.args[0] == user.id


def test_real_encoding_and_vapid_without_network(configured, payload, monkeypatch):
    """Exercise library arguments/crypto; replace only the HTTP boundary."""
    from pywebpush import webpush
    from types import SimpleNamespace
    import services.web_push_provider as transport
    monkeypatch.setattr(transport, 'webpush', webpush)
    posted = Mock(return_value=Mock(status_code=201))
    monkeypatch.setattr(transport.NoRedirectSession, 'post', posted)
    subscription = SimpleNamespace(endpoint=payload['endpoint'], **payload['keys'])
    result = WebPushProvider(configured).send(subscription, NotificationMessage('제목', '내용'))
    assert result == DeliveryResult.SENT
    assert posted.call_args.kwargs['headers']['authorization'].startswith('vapid ')
    assert isinstance(posted.call_args.kwargs['data'], bytes)


def test_transport_cannot_follow_redirects(monkeypatch):
    from services.web_push_provider import NoRedirectSession
    request = Mock()
    monkeypatch.setattr('requests.Session.request', request)
    with NoRedirectSession() as session:
        session.post('https://fcm.googleapis.com/send/test')
    assert request.call_args.kwargs['allow_redirects'] is False
