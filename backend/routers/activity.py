"""사이드바 '새 내역' 표기용 활동 요약.

읽음/미읽음 상태는 서버에 저장하지 않는다. 각 메뉴가 다룰 항목들의
발생 시각만 역할에 맞게 내려주고, '언제까지 확인했는지'는 프론트가
localStorage로 관리해 개수를 계산한다. 그래서 모델·마이그레이션이 없다.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
from database import get_db
from permissions import scope_to_org
from routers.auth import get_current_user

router = APIRouter(prefix="/api/activity", tags=["Activity"])

DBSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[models.User, Depends(get_current_user)]


def _iso(rows: list[tuple[datetime | None]]) -> list[str]:
    return [t.isoformat() for (t,) in rows if t is not None]


@router.get("/sidebar")
def get_sidebar_activity(
    current_user: CurrentUser, db: DBSession
) -> dict[str, list[str]]:
    """메뉴별로 표기 대상 항목의 발생 시각 목록을 역할에 맞게 반환한다."""
    # 제출 검토: 자기 단체(관리자=전체)로 스코프된 게스트 제출의 접수 시각.
    sub_q = scope_to_org(
        db.query(models.GuestTicketSubmission.submitted_at),
        current_user,
        models.GuestTicketSubmission,
    )
    submissions = _iso(sub_q.all())

    # 내 신청 현황: 내가 낸 신청 중 확정/거절로 바뀐 건의 갱신 시각.
    my_app_q = (
        db.query(models.TicketApplication.updated_at)
        .filter(models.TicketApplication.applicant_id == current_user.id)
        .filter(models.TicketApplication.status != "pending")
    )
    my_application_updates = _iso(my_app_q.all())

    # 내 티켓: 내가 소유한 티켓에 들어온 신청의 접수 시각.
    owned_q = (
        db.query(models.TicketApplication.applied_at)
        .join(models.Ticket, models.TicketApplication.ticket_id == models.Ticket.id)
        .filter(models.Ticket.owner_id == current_user.id)
    )
    owned_new_applications = _iso(owned_q.all())

    # 새 단체 승인: 승인 대기 중인 단체 자율가입 계정(관리자만).
    pending_orgs: list[str] = []
    if current_user.role == "admin":
        org_q = db.query(models.User.created_at).filter(
            models.User.role == "org", models.User.is_approved.is_(False)
        )
        pending_orgs = _iso(org_q.all())

    return {
        "submissions": submissions,
        "my_application_updates": my_application_updates,
        "owned_new_applications": owned_new_applications,
        "pending_orgs": pending_orgs,
    }
