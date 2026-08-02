import os
import secrets
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import get_db
from email_utils import send_email
from permissions import scope_to_org
from routers.auth import BASE_URL, CurrentUser, OrgUser
from services import gdrive_service, storage_service

router = APIRouter(prefix="/api/guest-submissions", tags=["Guest Ticket Submissions"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB


def _notify_new_submission(
    recipient_emails: list[str], kakao_id: str | None, need_post_title: str | None
) -> None:
    """[백그라운드] 새 제출이 들어오면 담당자에게 검토를 요청하는 이메일을 보낸다.

    전화번호 같은 민감정보는 메일에 싣지 않고 카카오 아이디만 넣는다.
    상세 정보는 제출 검토 화면에서 확인한다.
    SMTP 미설정 시 email_utils가 콘솔로 출력한다. 개별 발송 실패는 삼켜서
    한 명 실패가 다른 수신자 발송을 막지 않게 한다.
    """
    subject = "새 이동봉사 티켓 제출이 접수되었습니다."
    link = f"{BASE_URL}/submissions"
    post_line = (
        f"<p>응답 게시글: <b>{need_post_title}</b></p>" if need_post_title else ""
    )
    body = (
        "<p>새로운 이동봉사 티켓 제출이 접수되었습니다. 검토가 필요합니다.</p>"
        f"<p>제출자 카카오 아이디: <b>{kakao_id or '미입력'}</b></p>"
        f"{post_line}"
        f'<p><a href="{link}">제출 검토하러 가기</a></p>'
    )
    for email in recipient_emails:
        try:
            send_email(receiver_email=email, subject=subject, body=body)
        except Exception as e:  # noqa: BLE001
            print(f"[notify] 제출 알림 이메일 실패 ({email}): {e}")


@router.post(
    "",
    response_model=schemas.GuestTicketSubmissionCreated,
    status_code=status.HTTP_201_CREATED,
)
async def create_guest_submission(
    db: DBSession,
    background_tasks: BackgroundTasks,
    phone: Annotated[str, Form()],
    airline: Annotated[str, Form()],
    verification_method: Annotated[schemas.GuestSubmissionVerificationMethod, Form()],
    kakao_id: Annotated[str | None, Form()] = None,
    reservation_number: Annotated[str | None, Form()] = None,
    passenger_last_name_en: Annotated[str | None, Form()] = None,
    passenger_first_name_en: Annotated[str | None, Form()] = None,
    organization_id: Annotated[int | None, Form()] = None,
    need_post_id: Annotated[str | None, Form()] = None,
    eticket_image: Annotated[UploadFile | None, File()] = None,
) -> models.GuestTicketSubmission:
    """
    Public endpoint. Anyone (no login required) can submit their flight ticket info
    to volunteer spare pet-carrying capacity.
    """
    if not phone.strip():
        raise HTTPException(status_code=400, detail="전화번호를 입력해주세요.")

    if not airline.strip():
        raise HTTPException(status_code=400, detail="항공사를 선택해주세요.")

    if verification_method == schemas.GuestSubmissionVerificationMethod.eticket_image:
        if not eticket_image:
            raise HTTPException(
                status_code=400, detail="e티켓 이미지를 첨부해주세요."
            )
    else:
        if (
            not (reservation_number and reservation_number.strip())
            or not (passenger_last_name_en and passenger_last_name_en.strip())
            or not (passenger_first_name_en and passenger_first_name_en.strip())
        ):
            raise HTTPException(
                status_code=400,
                detail="예약번호와 탑승객 성/이름을 모두 입력해주세요.",
            )

    if organization_id is not None:
        organization = (
            db.query(models.Organization)
            .filter(models.Organization.id == organization_id)
            .first()
        )
        if not organization:
            raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다.")

    if need_post_id is not None:
        need_post = (
            db.query(models.NeedPost)
            .filter(models.NeedPost.id == need_post_id)
            .first()
        )
        if not need_post:
            raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
        # 게시글에 소속 단체가 있으면 그 단체로 제출을 귀속시킨다(폼에서 안 골라도).
        if organization_id is None and need_post.author and need_post.author.organization_id:
            organization_id = need_post.author.organization_id

    eticket_object_key = None
    if eticket_image:
        if eticket_image.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400, detail="이미지 또는 PDF 파일만 업로드할 수 있습니다."
            )
        contents = await eticket_image.read()
        if len(contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다."
            )
        ext = os.path.splitext(eticket_image.filename or "")[1]
        eticket_object_key = f"{uuid.uuid4()}{ext}"
        try:
            storage_service.upload_bytes(
                eticket_object_key, contents, eticket_image.content_type
            )
        except Exception as e:
            raise HTTPException(
                status_code=502, detail="이미지 저장소 연결에 실패했습니다."
            ) from e

    is_reservation_method = (
        verification_method == schemas.GuestSubmissionVerificationMethod.reservation_number
    )
    db_submission = models.GuestTicketSubmission(
        phone=phone,
        kakao_id=kakao_id,
        airline=airline,
        verification_method=verification_method.value,
        eticket_object_key=eticket_object_key,
        reservation_number=reservation_number if is_reservation_method else None,
        passenger_last_name_en=passenger_last_name_en if is_reservation_method else None,
        passenger_first_name_en=passenger_first_name_en if is_reservation_method else None,
        organization_id=organization_id,
        need_post_id=need_post_id,
        lookup_token=secrets.token_urlsafe(24),
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    if eticket_object_key:
        background_tasks.add_task(
            gdrive_service.backup_guest_submission_to_drive,
            db,
            db_submission.id,
            eticket_object_key,
            eticket_image.content_type,
        )

    # 새 제출 알림: 지정 단체가 있으면 그 단체 회원에게, 없으면 관리자에게 보낸다.
    # 수신자 이메일은 요청 세션에서 미리 뽑고, 실제 발송만 백그라운드로 넘긴다.
    if db_submission.organization_id:
        recipient_rows = (
            db.query(models.User.email)
            .filter(
                models.User.organization_id == db_submission.organization_id,
                models.User.email.isnot(None),
            )
            .all()
        )
    else:
        recipient_rows = (
            db.query(models.User.email)
            .filter(models.User.role == "admin", models.User.email.isnot(None))
            .all()
        )
    recipient_emails = [row[0] for row in recipient_rows if row[0]]

    need_post_title = None
    if db_submission.need_post_id:
        np = (
            db.query(models.NeedPost.title)
            .filter(models.NeedPost.id == db_submission.need_post_id)
            .first()
        )
        need_post_title = np[0] if np else None

    if recipient_emails:
        background_tasks.add_task(
            _notify_new_submission,
            recipient_emails,
            db_submission.kakao_id,
            need_post_title,
        )

    return db_submission


@router.get(
    "/{submission_id}/status",
    response_model=schemas.GuestSubmissionStatusPublic,
)
def get_submission_status(
    submission_id: str, token: str, db: DBSession
) -> models.GuestTicketSubmission:
    """제출자가 조회 링크(id + lookup_token)로 진행 상태를 확인한다. 공개 엔드포인트.

    토큰 불일치는 404. 상태 뷰라 전화번호·e티켓 등 개인정보는 응답에 담지 않는다.
    """
    submission = (
        db.query(models.GuestTicketSubmission)
        .options(
            joinedload(models.GuestTicketSubmission.need_post),
            joinedload(models.GuestTicketSubmission.organization),
        )
        .filter(
            models.GuestTicketSubmission.id == submission_id,
            models.GuestTicketSubmission.lookup_token == token,
        )
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="제출 내역을 찾을 수 없습니다.")
    return submission


@router.get("", response_model=list[schemas.GuestTicketSubmission])
def list_guest_submissions(
    db: DBSession,
    current_user: OrgUser,
    submission_status: schemas.GuestSubmissionStatus | None = None,
) -> list[models.GuestTicketSubmission]:
    query = db.query(models.GuestTicketSubmission).options(
        joinedload(models.GuestTicketSubmission.organization),
        joinedload(models.GuestTicketSubmission.need_post),
    )
    query = scope_to_org(query, current_user, models.GuestTicketSubmission)
    if submission_status:
        query = query.filter(models.GuestTicketSubmission.status == submission_status.value)
    return query.order_by(models.GuestTicketSubmission.submitted_at.desc()).all()


@router.get("/{submission_id}/image")
def get_guest_submission_image(
    submission_id: str, db: DBSession, current_user: OrgUser
) -> Response:
    query = db.query(models.GuestTicketSubmission).filter(
        models.GuestTicketSubmission.id == submission_id
    )
    submission = scope_to_org(
        query, current_user, models.GuestTicketSubmission
    ).first()
    if not submission or not submission.eticket_object_key:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    try:
        content, content_type = storage_service.get_object(submission.eticket_object_key)
    except Exception as e:
        raise HTTPException(
            status_code=404, detail="이미지를 찾을 수 없습니다."
        ) from e

    return Response(content=content, media_type=content_type)


@router.post("/{submission_id}/approve", response_model=schemas.Ticket)
def approve_guest_submission(
    submission_id: str,
    approve_in: schemas.GuestSubmissionApprove,
    db: DBSession,
    current_user: OrgUser,
) -> models.Ticket:
    # 단체 담당자는 자기 단체로 지정된 제출만 승인할 수 있다(관리자는 전체).
    # scope_to_org가 범위를 좁히므로, 범위 밖이면 존재조차 알리지 않고 404.
    query = db.query(models.GuestTicketSubmission).filter(
        models.GuestTicketSubmission.id == submission_id
    )
    submission = scope_to_org(query, current_user, models.GuestTicketSubmission).first()
    if not submission:
        raise HTTPException(status_code=404, detail="제출 내역을 찾을 수 없습니다.")
    if submission.status != "pending":
        raise HTTPException(
            status_code=400, detail="이미 처리된 제출 내역입니다."
        )

    owner_user_id = approve_in.owner_user_id
    if owner_user_id:
        owner = db.query(models.User).filter(models.User.id == owner_user_id).first()
        if not owner:
            raise HTTPException(status_code=404, detail="선택한 회원을 찾을 수 없습니다.")
        # 단체 담당자는 같은 단체 회원만 소유자로 지정할 수 있다.
        if (
            current_user.role != "admin"
            and owner.organization_id != current_user.organization_id
        ):
            raise HTTPException(
                status_code=403,
                detail="소유자는 같은 단체 회원만 지정할 수 있습니다.",
            )

    ticket_data = approve_in.model_dump(exclude={"owner_user_id"})
    db_ticket = models.Ticket(
        **ticket_data,
        status="sharing",
        created_by_id=owner_user_id,
        owner_id=owner_user_id,
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)

    submission.status = "approved"
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.created_ticket_id = db_ticket.id

    # 게시글에 응답한 제출이면 해당 '구해요' 글을 해결 처리(매칭)한다.
    # 제출-게시글-티켓 연결은 submission.need_post_id / created_ticket_id로 추적된다.
    if submission.need_post_id:
        need_post = (
            db.query(models.NeedPost)
            .filter(models.NeedPost.id == submission.need_post_id)
            .first()
        )
        if need_post and not need_post.is_resolved:
            need_post.is_resolved = True

    db.commit()

    return db_ticket


@router.post("/{submission_id}/reject", response_model=schemas.GuestTicketSubmission)
def reject_guest_submission(
    submission_id: str,
    reject_in: schemas.GuestSubmissionReject,
    db: DBSession,
    current_user: OrgUser,
) -> models.GuestTicketSubmission:
    # 자기 단체 제출만 반려 가능(관리자는 전체).
    query = db.query(models.GuestTicketSubmission).filter(
        models.GuestTicketSubmission.id == submission_id
    )
    submission = scope_to_org(query, current_user, models.GuestTicketSubmission).first()
    if not submission:
        raise HTTPException(status_code=404, detail="제출 내역을 찾을 수 없습니다.")
    if submission.status != "pending":
        raise HTTPException(
            status_code=400, detail="이미 처리된 제출 내역입니다."
        )

    submission.status = "rejected"
    submission.admin_note = reject_in.admin_note
    submission.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(submission)
    return submission


@router.post(
    "/{submission_id}/claim", response_model=schemas.GuestTicketSubmission
)
def claim_guest_submission(
    submission_id: str,
    claim_in: schemas.GuestSubmissionClaim,
    db: DBSession,
    current_user: CurrentUser,
) -> models.GuestTicketSubmission:
    """조회링크에서 본인이 눌러 자기 계정에 담는다.

    lookup_token 불일치는 404로 답한다. 제출이 존재하는지조차 알려주지 않는다.
    """
    # unclaim 엔드포인트가 없어서 한 번 잘못 담기면 진짜 제출자는 영영 409를 받는다.
    # 토큰이 다른 경로로 새더라도 업무 계정이 남의 제출을 가져가지 못하게 막는다
    if current_user.role != "general":
        raise HTTPException(
            status_code=403,
            detail="단체·관리자 계정으로는 제출 내역을 담을 수 없습니다.",
        )

    submission = (
        db.query(models.GuestTicketSubmission)
        .filter(
            models.GuestTicketSubmission.id == submission_id,
            models.GuestTicketSubmission.lookup_token == claim_in.lookup_token,
        )
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="제출 내역을 찾을 수 없습니다.")

    if submission.user_id is not None:
        if submission.user_id == current_user.id:
            return submission
        raise HTTPException(
            status_code=409, detail="이미 다른 계정에 등록된 제출 내역입니다."
        )

    submission.user_id = current_user.id
    db.commit()
    db.refresh(submission)
    return submission
