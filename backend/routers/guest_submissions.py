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
from services import gdrive_service, notification_service, storage_service

router = APIRouter(prefix="/api/guest-submissions", tags=["Guest Ticket Submissions"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB


def _submission_recipients(
    db: Session, submission: models.GuestTicketSubmission
) -> list[str]:
    """제출 알림 수신자 이메일. 지정 단체가 있으면 그 단체 회원, 없으면 관리자."""
    if submission.organization_id:
        rows = (
            db.query(models.User.email)
            .filter(
                models.User.organization_id == submission.organization_id,
                models.User.email.isnot(None),
            )
            .all()
        )
    else:
        rows = (
            db.query(models.User.email)
            .filter(models.User.role == "admin", models.User.email.isnot(None))
            .all()
        )
    return [row[0] for row in rows if row[0]]


def _submission_recipient_user_ids(
    db: Session, submission: models.GuestTicketSubmission
) -> list[str]:
    """제출 인앱 알림 수신자(지정 단체 회원 or 관리자)의 user_id."""
    if submission.organization_id:
        rows = (
            db.query(models.User.id)
            .filter(models.User.organization_id == submission.organization_id)
            .all()
        )
    else:
        rows = (
            db.query(models.User.id)
            .filter(models.User.role == "admin")
            .all()
        )
    return [row[0] for row in rows]


def _notify_submission_event(
    recipient_emails: list[str],
    subject: str,
    headline: str,
    kakao_id: str | None,
    need_post_title: str | None,
) -> None:
    """[백그라운드] 담당자에게 제출 관련 알림 메일을 보낸다.

    전화번호 같은 민감정보는 싣지 않고 카카오 아이디만 넣는다. 상세는 검토 화면에서 본다.
    SMTP 미설정 시 email_utils가 콘솔로 출력한다. 개별 발송 실패는 삼켜서
    한 명 실패가 다른 수신자 발송을 막지 않게 한다.
    """
    link = f"{BASE_URL}/submissions"
    post_line = (
        f"<p>응답 게시글: <b>{need_post_title}</b></p>" if need_post_title else ""
    )
    body = (
        f"<p>{headline}</p>"
        f"<p>제출자 카카오 아이디: <b>{kakao_id or '미입력'}</b></p>"
        f"{post_line}"
        f'<p><a href="{link}">제출 검토하러 가기</a></p>'
    )
    for email in recipient_emails:
        try:
            send_email(receiver_email=email, subject=subject, body=body)
        except Exception as e:  # noqa: BLE001
            print(f"[notify] 제출 알림 이메일 실패 ({email}): {e}")


async def _store_document(upload: UploadFile, prefix: str) -> str:
    """출국 준비 파일(여권 사본/자리 확약 캡쳐)을 검증·저장하고 스토리지 키를 돌려준다."""
    if upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, detail="이미지 또는 PDF 파일만 업로드할 수 있습니다."
        )
    contents = await upload.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400, detail="파일 크기는 10MB를 초과할 수 없습니다."
        )
    ext = os.path.splitext(upload.filename or "")[1]
    object_key = f"{prefix}-{uuid.uuid4()}{ext}"
    try:
        storage_service.upload_bytes(object_key, contents, upload.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=502, detail="파일 저장소 연결에 실패했습니다."
        ) from e
    return object_key


def _serve_document(
    db: Session, submission_id: str, current_user: models.User, kind: str
) -> Response:
    """민감 출국 서류를 단체 격리로 스트리밍한다. 범위 밖/없음은 404."""
    query = db.query(models.GuestTicketSubmission).filter(
        models.GuestTicketSubmission.id == submission_id
    )
    submission = scope_to_org(query, current_user, models.GuestTicketSubmission).first()
    object_key = None
    if submission and submission.created_ticket:
        object_key = (
            submission.created_ticket.passport_object_key
            if kind == "passport"
            else submission.created_ticket.seat_confirm_object_key
        )
    if not submission or not object_key:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    try:
        content, content_type = storage_service.get_object(object_key)
    except Exception as e:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.") from e
    return Response(content=content, media_type=content_type)


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
    kakao_id: Annotated[str, Form()],
    eticket_image: Annotated[UploadFile, File()],
    organization_id: Annotated[int | None, Form()] = None,
    need_post_id: Annotated[str | None, Form()] = None,
) -> models.GuestTicketSubmission:
    """
    Public endpoint. Anyone (no login required) can submit their flight ticket info
    to volunteer spare pet-carrying capacity.
    """
    if not phone.strip():
        raise HTTPException(status_code=400, detail="전화번호를 입력해주세요.")

    if not airline.strip():
        raise HTTPException(status_code=400, detail="항공사를 선택해주세요.")

    if not kakao_id.strip():
        raise HTTPException(status_code=400, detail="카카오톡 아이디를 입력해주세요.")

    if not eticket_image:
        raise HTTPException(status_code=400, detail="e티켓 이미지를 첨부해주세요.")

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

    db_submission = models.GuestTicketSubmission(
        phone=phone,
        kakao_id=kakao_id,
        airline=airline,
        verification_method=schemas.GuestSubmissionVerificationMethod.eticket_image.value,
        eticket_object_key=eticket_object_key,
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
    recipient_emails = _submission_recipients(db, db_submission)
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
            _notify_submission_event,
            recipient_emails,
            "새 이동봉사 티켓 제출이 접수되었습니다.",
            "새로운 이동봉사 티켓 제출이 접수되었습니다. 검토가 필요합니다.",
            db_submission.kakao_id,
            need_post_title,
        )

    # 인앱 알림: 단체 담당자/관리자 벨에 바로 뜨게 저장(이메일과 별개 채널).
    notification_service.create_notifications(
        db,
        _submission_recipient_user_ids(db, db_submission),
        type="submission_created",
        title="새 이동봉사 티켓 제출",
        body=(
            f"‘{need_post_title}’ 게시글에 새 제출이 접수되었습니다."
            if need_post_title
            else "새로운 이동봉사 티켓 제출이 접수되었습니다."
        ),
        link="/submissions",
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
    background_tasks: BackgroundTasks,
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
    else:
        # 소유자를 지정하지 않으면 승인한 담당자를 소유자로 둔다.
        # 그래야 티켓이 반드시 누군가의 일정으로 들어가고, 그 담당자가 드라이브를
        # 연동했다면 폴더도 생성된다.
        owner_user_id = current_user.id

    ticket_data = approve_in.model_dump(exclude={"owner_user_id"})
    db_ticket = models.Ticket(
        **ticket_data,
        status="owned",  # 소유자의 일정으로 들어간다(웹에서 만든 티켓과 동일)
        created_by_id=owner_user_id,
        owner_id=owner_user_id,
        # 제출 시 받은 e티켓 이미지를 이 일정에서도 볼 수 있게 티켓으로 이관한다.
        eticket_object_key=submission.eticket_object_key,
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

    # 소유자가 구글 드라이브를 연동해 두었으면 이 티켓의 폴더를 만든다(웹 생성과 동일).
    if owner_user_id:
        owner_token = (
            db.query(models.UserGoogleToken)
            .filter(models.UserGoogleToken.user_id == owner_user_id)
            .first()
        )
        if owner_token:
            background_tasks.add_task(
                gdrive_service.create_gdrive_folder, db, db_ticket.id, owner_user_id
            )
            # 폴더 생성 다음 순서로 e티켓을 그 폴더에 올린다(폴더 존재 보장).
            background_tasks.add_task(
                gdrive_service.upload_eticket_to_ticket_folder, db, submission.id
            )

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
    "/{submission_id}/departure-info",
    response_model=schemas.GuestSubmissionStatusPublic,
)
async def submit_departure_info(
    submission_id: str,
    db: DBSession,
    background_tasks: BackgroundTasks,
    lookup_token: Annotated[str, Form()],
    dep_address: Annotated[str, Form()],
    passport: Annotated[UploadFile | None, File()] = None,
    seat_confirm: Annotated[UploadFile | None, File()] = None,
) -> models.GuestTicketSubmission:
    """제출자가 상태 조회 페이지에서 출국 준비 서류를 제출한다. 공개(토큰 기반).

    승인(자리 완료)된 건에서만 가능. 여권 사본·자리 확약 캡쳐는 민감정보라
    스토리지에 올리고 키만 저장하며, 열람은 단체·관리자로 제한한다.
    """
    submission = (
        db.query(models.GuestTicketSubmission)
        .options(joinedload(models.GuestTicketSubmission.need_post))
        .filter(
            models.GuestTicketSubmission.id == submission_id,
            models.GuestTicketSubmission.lookup_token == lookup_token,
        )
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="제출 내역을 찾을 수 없습니다.")
    if submission.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="자리 예약이 완료된 뒤에만 출국 준비 서류를 제출할 수 있습니다.",
        )
    ticket = submission.created_ticket
    if not ticket:
        raise HTTPException(status_code=400, detail="연결된 티켓을 찾을 수 없습니다.")

    # 출국 준비 정보는 티켓에 저장한다(단체 등록 티켓과 동일한 자리).
    if passport:
        ticket.passport_object_key = await _store_document(passport, "passport")
    if seat_confirm:
        ticket.seat_confirm_object_key = await _store_document(
            seat_confirm, "seatconfirm"
        )

    ticket.dep_address = dep_address.strip()
    ticket.departure_submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(submission)

    # 소유자가 드라이브를 연동해 티켓 폴더가 있으면, 출국 서류를 그 폴더에도 올린다.
    background_tasks.add_task(
        gdrive_service.upload_departure_docs_to_ticket_folder, db, ticket.id
    )

    recipient_emails = _submission_recipients(db, submission)
    if recipient_emails:
        need_post_title = submission.need_post.title if submission.need_post else None
        background_tasks.add_task(
            _notify_submission_event,
            recipient_emails,
            "제출자가 출국 준비 서류를 제출했습니다.",
            "승인하신 건의 제출자가 출국 준비 서류(여권 사본 등)를 제출했습니다.",
            submission.kakao_id,
            need_post_title,
        )

    return submission


@router.get("/{submission_id}/passport")
def get_submission_passport(
    submission_id: str, db: DBSession, current_user: OrgUser
) -> Response:
    """여권 사본 스트리밍. 단체·관리자만(자기 단체 제출만)."""
    return _serve_document(db, submission_id, current_user, "passport")


@router.get("/{submission_id}/seat-confirm")
def get_submission_seat_confirm(
    submission_id: str, db: DBSession, current_user: OrgUser
) -> Response:
    """자리 확약 캡쳐 스트리밍. 단체·관리자만(자기 단체 제출만)."""
    return _serve_document(db, submission_id, current_user, "seat_confirm")


@router.delete(
    "/{submission_id}/departure-info",
    response_model=schemas.GuestTicketSubmission,
)
def delete_departure_info(
    submission_id: str, db: DBSession, current_user: OrgUser
) -> models.GuestTicketSubmission:
    """단체가 원할 때(예: 이동봉사 종료) 출국 준비 개인정보를 영구 삭제한다.

    여권 사본·자리 확약 캡쳐 파일을 스토리지에서 지우고, 성함·주소 등 개인정보
    필드를 비운다. 자기 단체 제출만(범위 밖 404). 제출 시각은 남겨 두어
    제출자에게 다시 제출을 요구하지 않는다.
    """
    query = db.query(models.GuestTicketSubmission).filter(
        models.GuestTicketSubmission.id == submission_id
    )
    submission = scope_to_org(query, current_user, models.GuestTicketSubmission).first()
    if not submission:
        raise HTTPException(status_code=404, detail="제출 내역을 찾을 수 없습니다.")

    ticket = submission.created_ticket
    if ticket:
        for key in (ticket.passport_object_key, ticket.seat_confirm_object_key):
            if key:
                try:
                    storage_service.delete_object(key)
                except Exception as e:  # noqa: BLE001
                    print(f"[purge] 파일 삭제 실패 ({key}): {e}")
        ticket.passport_object_key = None
        ticket.seat_confirm_object_key = None
        ticket.dep_address = None
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
