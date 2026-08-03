from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routers.auth import CurrentUser

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

DBSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[schemas.Notification])
def list_notifications(
    db: DBSession,
    current_user: CurrentUser,
    unread_only: bool = False,
    limit: int = 20,
) -> list[models.Notification]:
    """로그인 사용자 본인의 알림을 최신순으로 반환한다(벨 드롭다운용)."""
    limit = max(1, min(limit, 100))
    query = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    )
    if unread_only:
        query = query.filter(models.Notification.is_read.is_(False))
    return (
        query.order_by(models.Notification.created_at.desc()).limit(limit).all()
    )


@router.get("/unread-count", response_model=schemas.UnreadCount)
def get_unread_count(db: DBSession, current_user: CurrentUser) -> schemas.UnreadCount:
    """미읽음 알림 개수(뱃지용)."""
    count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read.is_(False),
        )
        .count()
    )
    return schemas.UnreadCount(count=count)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(db: DBSession, current_user: CurrentUser) -> None:
    """본인의 미읽음 알림을 모두 읽음 처리한다."""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read.is_(False),
    ).update(
        {"is_read": True, "read_at": datetime.now(timezone.utc)},
        synchronize_session=False,
    )
    db.commit()


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    notification_id: str, db: DBSession, current_user: CurrentUser
) -> None:
    """알림 1건을 읽음 처리한다(본인 것만)."""
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="알림을 찾을 수 없습니다.")
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
