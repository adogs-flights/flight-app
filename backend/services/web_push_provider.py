"""All Web Push transport, VAPID and destination validation live here."""
import base64
import json
import logging
import re
from dataclasses import asdict, dataclass, field
from urllib.parse import urlsplit

import requests
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from pywebpush import WebPushException, webpush

from services.push_provider import DeliveryResult, PushProvider
from runtime_secrets import secret_value

logger = logging.getLogger(__name__)


def decode_key(value):
    if not re.fullmatch(r"[A-Za-z0-9_-]+={0,2}", value):
        raise ValueError("Invalid push key")
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def validate_endpoint(endpoint):
    # Only browser push services, never arbitrary URLs (SSRF). No redirects below.
    try:
        url = urlsplit(endpoint)
        host = url.hostname or ""
        allowed = host in {"fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"}
        allowed = allowed or host.endswith(".push.apple.com") or host.endswith(".notify.windows.com")
        if (not allowed or url.scheme != "https" or url.port not in (None, 443)
                or url.username or url.password or url.fragment or not url.path
                or len(endpoint) > 2048 or any(c.isspace() for c in endpoint)):
            raise ValueError()
    except ValueError:
        raise ValueError("Unsupported push endpoint") from None
    return endpoint


def validate_keys(p256dh, auth):
    ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), decode_key(p256dh))
    if len(decode_key(auth)) != 16:
        raise ValueError("Invalid push key")


@dataclass(frozen=True)
class WebPushSettings:
    public_key: str = ""
    private_key: str = field(default="", repr=False)
    subject: str = ""

    @classmethod
    def from_env(cls):
        values = cls(*(secret_value(name, "").strip() for name in (
            "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"
        )))
        if not any((values.public_key, values.private_key, values.subject)):
            return cls()
        try:
            private = decode_key(values.private_key)
            if len(private) != 32:
                raise ValueError()
            key = ec.derive_private_key(int.from_bytes(private, "big"), ec.SECP256R1())
            public = key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
            if public != decode_key(values.public_key):
                raise ValueError()
            subject = urlsplit(values.subject)
            if not ((subject.scheme == "mailto" and "@" in subject.path)
                    or (subject.scheme == "https" and subject.hostname)):
                raise ValueError()
            return values
        except Exception:
            logger.warning("Web Push disabled: invalid or incomplete VAPID configuration")
            return cls()

    @property
    def enabled(self):
        return bool(self.public_key and self.private_key and self.subject)


class NoRedirectSession(requests.Session):
    def request(self, method, url, **kwargs):
        kwargs["allow_redirects"] = False
        return super().request(method, url, **kwargs)


class WebPushProvider(PushProvider):
    def __init__(self, settings):
        self.settings = settings

    def send(self, subscription, message):
        if not self.settings.enabled:
            return DeliveryResult.FAILED
        try:
            validate_endpoint(subscription.endpoint)
            with NoRedirectSession() as session:
                response = webpush(
                    subscription_info={"endpoint": subscription.endpoint, "keys": {
                        "p256dh": subscription.p256dh, "auth": subscription.auth,
                    }},
                    data=json.dumps(asdict(message), ensure_ascii=False),
                    vapid_private_key=self.settings.private_key,
                    vapid_claims={"sub": self.settings.subject},
                    timeout=10, ttl=3600, requests_session=session,
                )
            status = response.status_code
        except WebPushException as error:
            status = error.response.status_code if error.response is not None else None
        except Exception:
            # Exception messages may contain endpoint capabilities or keys.
            logger.warning("Web Push transport failed")
            return DeliveryResult.FAILED
        if status in (404, 410):
            return DeliveryResult.EXPIRED
        if status is not None and 200 <= status < 300:
            return DeliveryResult.SENT
        logger.warning("Web Push delivery failed (status=%s)", status)
        return DeliveryResult.FAILED
