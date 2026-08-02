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
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import get_db
from routers.auth import OrgUser
from services import gdrive_service, storage_service

DEPARTURE_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
DEPARTURE_MAX_SIZE = 10 * 1024 * 1024  # 10MB

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=schemas.Ticket, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: schemas.TicketCreate,
    db: DBSession,
    current_user: OrgUser,
    background_tasks: BackgroundTasks,
) -> models.Ticket:
    """
    Create a new ticket. The creator becomes the initial owner.
    """
    db_ticket = models.Ticket(
        **ticket_in.dict(), created_by_id=current_user.id, owner_id=current_user.id
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)

    # 구글 드라이브 연동 여부 확인 후 폴더 생성 예약
    google_token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == current_user.id)
        .first()
    )
    if google_token:
        background_tasks.add_task(
            gdrive_service.create_gdrive_folder, db, db_ticket.id, current_user.id
        )

    return db_ticket


@router.get("", response_model=list[schemas.Ticket])
def list_tickets(
    db: DBSession, current_user: OrgUser, schedule: bool = False
) -> list[models.Ticket]:
    """
    List tickets.
    - If schedule=True: Return only current user's tickets that are NOT in 'sharing' status.
    - If schedule=False:
        - 'owned' tickets are only visible to the owner or an admin.
        - 'sharing' and 'shared' tickets are visible to all logged-in users.
    """
    is_admin = current_user.role == "admin"

    # 1. Schedule View: Show active/owned tickets (not sharing)
    if schedule:
        query = (
            db.query(models.Ticket)
            .options(
                joinedload(models.Ticket.owner),
                joinedload(models.Ticket.google_sync),
            )
        )

        # 일반 사용자는 본인 티켓만, 관리자는 전체 티켓 조회
        if not is_admin:
            query = query.filter(models.Ticket.owner_id == current_user.id)

        tickets = (
            query.filter(models.Ticket.status != "sharing")
            .order_by(models.Ticket.departure_date.asc())
            .all()
        )
        return tickets

    # 2. General View (My Tickets or Admin)
    # Non-admin users
    if not is_admin:
        tickets = (
            db.query(models.Ticket)
            .options(
                joinedload(models.Ticket.owner),
                joinedload(models.Ticket.google_sync),
            )
            .filter(
                or_(
                    models.Ticket.status != "owned",
                    models.Ticket.owner_id == current_user.id,
                )
            )
            .order_by(models.Ticket.created_at.desc())
            .all()
        )
    # Admin users can see all tickets
    else:
        tickets = (
            db.query(models.Ticket)
            .options(
                joinedload(models.Ticket.owner),
                joinedload(models.Ticket.google_sync),
            )
            .order_by(models.Ticket.created_at.desc())
            .all()
        )

    return tickets


@router.get("/{ticket_id}", response_model=schemas.Ticket)
def get_ticket(
    ticket_id: str,
    db: DBSession,
    current_user: OrgUser,
) -> models.Ticket:
    """
    Get a single ticket by ID, respecting visibility rules.
    """
    ticket = (
        db.query(models.Ticket)
        .options(joinedload(models.Ticket.owner))
        .filter(models.Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    is_owner = ticket.owner_id == current_user.id
    is_admin = current_user.role == "admin"

    if ticket.status == "owned" and not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this ticket",
        )

    return ticket


@router.put("/{ticket_id}", response_model=schemas.Ticket)
def update_ticket(
    ticket_id: str,
    ticket_update: schemas.TicketUpdate,
    db: DBSession,
    current_user: OrgUser,
    background_tasks: BackgroundTasks,
) -> models.Ticket:
    """
    Update a ticket. Only the owner or an admin can perform updates.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    is_owner = ticket.owner_id == current_user.id
    is_admin = current_user.role == "admin"

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this ticket",
        )

    update_data = ticket_update.dict(exclude_unset=True)

    # [v1.7] 자동 생성된 제목인지 판별 (석 단위 기준)
    old_title = ticket.title
    
    # 현재 제목이 시스템에서 생성한 '기본 제목' 패턴인지 확인
    # (기존의 '수화물' 오타가 포함된 패턴도 자동 제목으로 간주하여 업데이트 유도)
    default_title = gdrive_service.generate_default_title(ticket.cabin_capacity, ticket.cargo_capacity)
    is_auto_title = (
        old_title == default_title or
        old_title == default_title.replace("하물", "화물") or
        old_title == "티켓 나눔 (상세 확인)"
    )

    for key, value in update_data.items():
        setattr(ticket, key, value)

    # 사용자가 제목을 직접 수정하지 않았고, 기존 제목이 자동 생성 패턴이었다면 제목 갱신
    new_auto_title = gdrive_service.generate_default_title(ticket.cabin_capacity, ticket.cargo_capacity)
    
    if is_auto_title:
        requested_title = update_data.get("title")
        # 프론트에서 제목을 안 보냈거나, 기존 제목을 그대로 보낸 경우 업데이트 수행
        if not requested_title or requested_title == old_title:
            ticket.title = new_auto_title

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # 구글 드라이브 폴더명 업데이트 예약
    background_tasks.add_task(
        gdrive_service.update_gdrive_folder_name, db, ticket.id, current_user.id
    )

    return ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: str,
    db: DBSession,
    current_user: OrgUser,
    background_tasks: BackgroundTasks,
) -> None:
    """
    Delete a ticket. Only the owner or an admin can delete.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    is_owner = ticket.owner_id == current_user.id
    is_admin = current_user.role == "admin"

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this ticket",
        )

    # 구글 드라이브 연동 여부 확인 후 폴더 삭제 예약
    sync_info = (
        db.query(models.GoogleDriveSync)
        .filter(models.GoogleDriveSync.ticket_id == ticket_id)
        .first()
    )
    if sync_info:
        background_tasks.add_task(
            gdrive_service.delete_gdrive_folder,
            db,
            sync_info.google_folder_id,
            current_user.id,
        )

    db.delete(ticket)
    db.commit()


# ======================================================================================
# 출국 준비 추가정보 (티켓 소유자/관리자)
# ======================================================================================
async def _store_departure_doc(upload: UploadFile, prefix: str) -> str:
    if upload.content_type not in DEPARTURE_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, detail="이미지 또는 PDF 파일만 업로드할 수 있습니다."
        )
    contents = await upload.read()
    if len(contents) > DEPARTURE_MAX_SIZE:
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


def _get_ticket_for_departure(
    db: Session, ticket_id: str, current_user: models.User
) -> models.Ticket:
    """티켓을 찾고 소유자/관리자만 통과시킨다. 민감 서류라 접근을 좁힌다."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=403, detail="이 티켓의 추가정보를 관리할 권한이 없습니다."
        )
    return ticket


@router.post("/{ticket_id}/departure-info", response_model=schemas.Ticket)
async def submit_ticket_departure_info(
    ticket_id: str,
    db: DBSession,
    current_user: OrgUser,
    background_tasks: BackgroundTasks,
    dep_address: Annotated[str, Form()],
    passport: Annotated[UploadFile | None, File()] = None,
    seat_confirm: Annotated[UploadFile | None, File()] = None,
) -> models.Ticket:
    """단체 담당자가 티켓에 출국 준비 추가정보를 입력한다(봉사자 2차 입력과 동일 항목).

    소유자·관리자만. 연동돼 있으면 티켓 드라이브 폴더에도 업로드한다.
    """
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    if passport:
        ticket.passport_object_key = await _store_departure_doc(passport, "passport")
    if seat_confirm:
        ticket.seat_confirm_object_key = await _store_departure_doc(
            seat_confirm, "seatconfirm"
        )
    ticket.dep_address = dep_address.strip()
    ticket.departure_submitted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    background_tasks.add_task(
        gdrive_service.upload_departure_docs_to_ticket_folder, db, ticket.id
    )
    return ticket


def _serve_ticket_document(ticket: models.Ticket, kind: str) -> Response:
    object_key = {
        "passport": ticket.passport_object_key,
        "seat_confirm": ticket.seat_confirm_object_key,
        "eticket": ticket.eticket_object_key,
    }.get(kind)
    if not object_key:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    try:
        content, content_type = storage_service.get_object(object_key)
    except Exception as e:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.") from e
    return Response(content=content, media_type=content_type)


@router.get("/{ticket_id}/passport")
def get_ticket_passport(
    ticket_id: str, db: DBSession, current_user: OrgUser
) -> Response:
    """여권 사본 스트리밍(소유자/관리자만)."""
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    return _serve_ticket_document(ticket, "passport")


@router.get("/{ticket_id}/seat-confirm")
def get_ticket_seat_confirm(
    ticket_id: str, db: DBSession, current_user: OrgUser
) -> Response:
    """자리 확약 캡쳐 스트리밍(소유자/관리자만)."""
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    return _serve_ticket_document(ticket, "seat_confirm")


@router.get("/{ticket_id}/eticket")
def get_ticket_eticket(
    ticket_id: str, db: DBSession, current_user: OrgUser
) -> Response:
    """봉사자가 제출한 e티켓 이미지 스트리밍(소유자/관리자만)."""
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    return _serve_ticket_document(ticket, "eticket")


@router.delete("/{ticket_id}/departure-info", response_model=schemas.Ticket)
def delete_ticket_departure_info(
    ticket_id: str, db: DBSession, current_user: OrgUser
) -> models.Ticket:
    """티켓의 출국 준비 개인정보를 영구 삭제한다(소유자/관리자만)."""
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    for key in (
        ticket.passport_object_key,
        ticket.seat_confirm_object_key,
        ticket.eticket_object_key,
    ):
        if key:
            try:
                storage_service.delete_object(key)
            except Exception as e:  # noqa: BLE001
                print(f"[purge] 파일 삭제 실패 ({key}): {e}")
    ticket.passport_object_key = None
    ticket.seat_confirm_object_key = None
    ticket.eticket_object_key = None
    ticket.dep_address = None
    db.commit()
    db.refresh(ticket)
    return ticket
