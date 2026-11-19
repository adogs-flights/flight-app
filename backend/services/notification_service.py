"""Business entry point; background execution can later become a queue publisher."""
import logging

from database import SessionLocal
from models import PushSubscription
from services.push_provider import DeliveryResult, NotificationMessage, PushProvider

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, provider: PushProvider):
        self.provider = provider

    def send_to_user(self, *, db, user_id, message: NotificationMessage):
        results = {result.value: 0 for result in DeliveryResult}
        subscriptions = db.query(PushSubscription).filter_by(user_id=user_id).all()
        for subscription in subscriptions:
            try:
                result = self.provider.send(subscription, message)
            except Exception:
                logger.warning("Notification provider failed")
                result = DeliveryResult.FAILED
            results[result.value] += 1
            if result == DeliveryResult.EXPIRED:
                db.delete(subscription)
        db.commit()
        return results

    @staticmethod
    def enqueue(background_tasks, *, user_id, message: NotificationMessage):
        """Call only AFTER the business commit. Pass values, never request sessions."""
        if user_id:
            background_tasks.add_task(deliver_notification, user_id, message)


def deliver_notification(user_id, message):
    # Composition root: only this adapter chooses the concrete provider/session.
    from services.web_push_provider import WebPushProvider, WebPushSettings

    try:
        settings = WebPushSettings.from_env()
        if not settings.enabled:
            return
        with SessionLocal() as db:
            NotificationService(WebPushProvider(settings)).send_to_user(
                db=db, user_id=user_id, message=message
            )
    except Exception:
        logger.warning("Background notification failed")
