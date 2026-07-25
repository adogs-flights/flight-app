import os
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
from routers.auth import AdminUser
from services import gdrive_service, storage_service

router = APIRouter(prefix="/api/guest-submissions", tags=["Guest Ticket Submissions"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("", response_model=schemas.GuestTicketSubmission, status_code=status.HTTP_201_CREATED)
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

    return db_submission


@router.get("", response_model=list[schemas.GuestTicketSubmission])
def list_guest_submissions(
    db: DBSession,
    current_admin: AdminUser,
    submission_status: schemas.GuestSubmissionStatus | None = None,
) -> list[models.GuestTicketSubmission]:
    query = db.query(models.GuestTicketSubmission).options(
        joinedload(models.GuestTicketSubmission.organization)
    )
    if submission_status:
        query = query.filter(models.GuestTicketSubmission.status == submission_status.value)
    return query.order_by(models.GuestTicketSubmission.submitted_at.desc()).all()


@router.get("/{submission_id}/image")
def get_guest_submission_image(
    submission_id: str, db: DBSession, current_admin: AdminUser
) -> Response:
    submission = (
        db.query(models.GuestTicketSubmission)
        .filter(models.GuestTicketSubmission.id == submission_id)
        .first()
    )
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
    current_admin: AdminUser,
) -> models.Ticket:
    submission = (
        db.query(models.GuestTicketSubmission)
        .filter(models.GuestTicketSubmission.id == submission_id)
        .first()
    )
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
    db.commit()

    return db_ticket


@router.post("/{submission_id}/reject", response_model=schemas.GuestTicketSubmission)
def reject_guest_submission(
    submission_id: str,
    reject_in: schemas.GuestSubmissionReject,
    db: DBSession,
    current_admin: AdminUser,
) -> models.GuestTicketSubmission:
    submission = (
        db.query(models.GuestTicketSubmission)
        .filter(models.GuestTicketSubmission.id == submission_id)
        .first()
    )
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
