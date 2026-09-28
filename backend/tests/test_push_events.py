from unittest.mock import Mock

import pytest
from sqlalchemy.exc import SQLAlchemyError

import models
import services.notification_service as service
import routers.ticket_applications as applications
from test_application_notify import _authenticate, _make_sharing_ticket


@pytest.fixture
def scenario(client, db_session, make_user, make_organization, monkeypatch):
    owner = make_user(role='admin')
    org = make_organization()
    applicants = [make_user(organization_id=org.id) for _ in range(2)]
    ticket = _make_sharing_ticket(db_session, owner)
    monkeypatch.setattr(applications, 'send_email', lambda *args, **kwargs: None)
    return owner, applicants, ticket


def test_new_application_notifies_actual_owner_after_commit(client, db_session, scenario, monkeypatch):
    owner, applicants, ticket = scenario
    calls = []
    def delivered(user_id, message):
        assert db_session.query(models.TicketApplication).count() == 1
        calls.append((user_id, message.url))
    monkeypatch.setattr(service, 'deliver_notification', delivered)
    _authenticate(client, applicants[0])
    response = client.post(f'/api/tickets/{ticket.id}/applications', json={'ticket_id': ticket.id, 'message': '신청', 'contact': '010'})
    assert response.status_code == 201, response.text
    assert calls == [(owner.id, '/mytickets')]


@pytest.mark.parametrize('new_status', ['confirmed', 'rejected'])
def test_decision_and_automatic_rejections(client, db_session, scenario, monkeypatch, new_status):
    owner, applicants, ticket = scenario
    rows = [models.TicketApplication(ticket_id=ticket.id, applicant_id=user.id, message='신청', contact='010') for user in applicants]
    db_session.add_all(rows)
    db_session.commit()
    calls = []
    def delivered(user_id, message):
        assert db_session.get(models.TicketApplication, rows[0].id).status == new_status
        calls.append((user_id, message))
    monkeypatch.setattr(service, 'deliver_notification', delivered)
    # Email outages must not undo committed status updates either.
    monkeypatch.setattr(applications, 'send_email', Mock(side_effect=RuntimeError('offline')))
    _authenticate(client, owner)
    response = client.put(f'/api/applications/{rows[0].id}', json={'status': new_status})
    assert response.status_code == 200, response.text
    assert calls[0][0] == applicants[0].id
    assert calls[0][1].url == '/myapplications'
    if new_status == 'confirmed':
        assert db_session.get(models.Ticket, ticket.id).owner_id == applicants[0].id
        assert rows[1].status == 'rejected'
        assert calls[1][0] == applicants[1].id
    else:
        assert len(calls) == 1
    before = len(calls)
    assert client.put(f'/api/applications/{rows[0].id}', json={'status': new_status}).status_code == 200
    assert len(calls) == before


def test_commit_failure_never_enqueues(client, db_session, scenario, monkeypatch):
    owner, applicants, ticket = scenario
    row = models.TicketApplication(ticket_id=ticket.id, applicant_id=applicants[0].id, message='신청', contact='010')
    db_session.add(row)
    db_session.commit()
    row_id = row.id
    _authenticate(client, owner)
    enqueue = Mock()
    monkeypatch.setattr(service.NotificationService, 'enqueue', enqueue)
    monkeypatch.setattr(db_session, 'commit', Mock(side_effect=SQLAlchemyError('commit failed')))
    with pytest.raises(SQLAlchemyError):
        client.put(f'/api/applications/{row_id}', json={'status': 'confirmed'})
    enqueue.assert_not_called()
    db_session.rollback()


def test_background_outage_does_not_fail_business_response(client, db_session, scenario, monkeypatch):
    from services.web_push_provider import WebPushSettings
    owner, applicants, ticket = scenario
    row = models.TicketApplication(ticket_id=ticket.id, applicant_id=applicants[0].id, message='신청', contact='010')
    db_session.add(row)
    db_session.commit()
    _authenticate(client, owner)
    monkeypatch.setattr(WebPushSettings, 'from_env', Mock(side_effect=RuntimeError('transport unavailable')))
    response = client.put(f'/api/applications/{row.id}', json={'status': 'confirmed'})
    assert response.status_code == 200
    db_session.refresh(row)
    assert row.status == 'confirmed'
