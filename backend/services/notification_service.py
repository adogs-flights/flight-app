"""인앱 알림 생성을 한 곳에 모은다.

이벤트가 발생하는 라우터에서 수신자 user_id들과 함께 호출한다. 이메일 등 다른
채널과 나란히 쓰이며, 여기서는 DB에 알림 레코드만 남긴다(표시는 프론트 벨/뱃지).
"""

from sqlalchemy.orm import Session

import models


def create_notifications(
    db: Session,
    user_ids: list[str],
    type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
) -> None:
    """수신자별로 알림 1건씩 저장한다. 중복 user_id는 제거한다.

    호출부의 트랜잭션과 분리해 자체 commit 한다(메인 엔티티 저장 이후 호출 가정).
    """
    unique_ids = {uid for uid in user_ids if uid}
    if not unique_ids:
        return
    for uid in unique_ids:
        db.add(
            models.Notification(
                user_id=uid,
                type=type,
                title=title,
                body=body,
                link=link,
            )
        )
    db.commit()
