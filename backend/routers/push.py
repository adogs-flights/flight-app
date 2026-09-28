from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from database import get_db
from models import PushSubscription, generate_uuid
from routers.auth import CurrentUser
from services.notification_service import NotificationService, NotificationMessage
from services.web_push_provider import WebPushSettings, validate_endpoint, validate_keys

router = APIRouter(prefix="/api/push", tags=["Push"])
DBSession = Annotated[Session, Depends(get_db)]


class EndpointInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    endpoint: str = Field(min_length=1, max_length=2048)

    @field_validator("endpoint")
    @classmethod
    def valid_endpoint(cls, value):
        return validate_endpoint(value)


class SubscriptionKeys(BaseModel):
    model_config = ConfigDict(extra="forbid")
    p256dh: str = Field(max_length=128)
    auth: str = Field(max_length=64)

    @model_validator(mode="after")
    def valid_keys(self):
        try:
            validate_keys(self.p256dh, self.auth)
        except Exception:
            raise ValueError("Invalid subscription keys") from None
        return self


class SubscriptionInput(EndpointInput):
    keys: SubscriptionKeys
    expirationTime: float | None = None


def configured_settings():
    settings = WebPushSettings.from_env()
    if not settings.enabled:
        raise HTTPException(503, "알림 기능이 설정되지 않았습니다.")
    return settings


@router.get("/public-key")
def public_key():
    return {"public_key": configured_settings().public_key}


@router.get("/status")
def push_status(current_user: CurrentUser):
    return {"enabled": WebPushSettings.from_env().enabled}


@router.post("/subscriptions", status_code=204)
def subscribe(payload: SubscriptionInput, db: DBSession, current_user: CurrentUser):
    configured_settings()
    insert = sqlite_insert if db.bind.dialect.name == "sqlite" else pg_insert
    statement = insert(PushSubscription).values(
        id=generate_uuid(), user_id=current_user.id, endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh, auth=payload.keys.auth,
    )
    # Same browser may switch accounts: its explicit opt-in transfers ownership.
    db.execute(statement.on_conflict_do_update(
        index_elements=[PushSubscription.endpoint],
        set_={"user_id": current_user.id, "p256dh": payload.keys.p256dh,
              "auth": payload.keys.auth, "updated_at": func.now()},
    ))
    db.commit()


@router.post("/subscription-status")
def subscription_status(payload: EndpointInput, db: DBSession, current_user: CurrentUser):
    return {"subscribed": db.query(PushSubscription.id).filter_by(
        endpoint=payload.endpoint, user_id=current_user.id
    ).first() is not None}


@router.delete("/subscriptions", status_code=204)
def unsubscribe(payload: EndpointInput, db: DBSession, current_user: CurrentUser):
    db.query(PushSubscription).filter_by(
        endpoint=payload.endpoint, user_id=current_user.id
    ).delete()
    db.commit()


@router.post("/test", status_code=202)
def test_push(current_user: CurrentUser, background_tasks: BackgroundTasks):
    configured_settings()
    NotificationService.enqueue(background_tasks, user_id=current_user.id, message=NotificationMessage(
        title="해봉티켓 테스트 알림", body="이 기기에서 알림을 받을 수 있습니다.",
    ))
    return {"detail": "알림 발송을 요청했습니다."}
