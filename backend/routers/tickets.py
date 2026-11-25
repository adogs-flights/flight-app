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
from static_data import DEPARTURE_CHECKLIST_TEMPLATE

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
    db.flush()
    # 출국 준비 체크리스트 기본 항목을 함께 깔아준다.
    _seed_checklist_items(db, db_ticket, current_user.id)
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
    dep_kakao_id: Annotated[str | None, Form()] = None,
    passport: Annotated[UploadFile | None, File()] = None,
    seat_confirm: Annotated[UploadFile | None, File()] = None,
    eticket: Annotated[UploadFile | None, File()] = None,
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
    if eticket:
        ticket.eticket_object_key = await _store_departure_doc(eticket, "eticket")
    ticket.dep_address = dep_address.strip()
    ticket.dep_kakao_id = (dep_kakao_id or "").strip() or None
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
    ticket.dep_kakao_id = None
    db.commit()
    db.refresh(ticket)
    return ticket


# --------------------------------------------------------------------------------------
# 출국 준비 체크리스트
#
# 기한 없이 완료 여부만 다룬다. 조회·수정 권한은 출국 준비 추가정보와 같은
# _get_ticket_for_departure(소유자·admin)를 재사용한다. 체크리스트에는 인수자
# 연락처 등 개인정보가 섞일 수 있어 공용 Ticket 응답에는 싣지 않는다.
# --------------------------------------------------------------------------------------


def _seed_checklist_items(
    db: Session, ticket: models.Ticket, user_id: str | None
) -> None:
    """기본 항목을 아직 깔지 않은 티켓에 템플릿을 깔아준다.

    이미 시드한 티켓은 건드리지 않는다. 담당자가 기본 항목을 전부 지웠을 때
    조회만으로 되살아나면 지운 의미가 없기 때문이다. 되살리려면 복원
    엔드포인트를 쓴다. commit은 호출하는 쪽에서 한다.
    """
    if ticket.checklist_initialized_at is not None:
        return
    for order, item in enumerate(DEPARTURE_CHECKLIST_TEMPLATE):
        db.add(
            models.TicketChecklistItem(
                ticket_id=ticket.id,
                template_key=item["template_key"],
                label=item["label"],
                sort_order=order,
                created_by_id=user_id,
            )
        )
    ticket.checklist_initialized_at = datetime.now(timezone.utc)


def _list_checklist_items(
    db: Session, ticket_id: str
) -> list[models.TicketChecklistItem]:
    return (
        db.query(models.TicketChecklistItem)
        .filter(models.TicketChecklistItem.ticket_id == ticket_id)
        .order_by(
            models.TicketChecklistItem.sort_order,
            models.TicketChecklistItem.created_at,
        )
        .all()
    )


def _checklist_response(
    ticket: models.Ticket, items: list[models.TicketChecklistItem]
) -> schemas.TicketChecklist:
    """항목 진행률과 기존 추가정보 진행률을 함께 담는다."""
    document_flags = [
        bool(ticket.dep_address),
        bool(ticket.dep_kakao_id),
        ticket.has_passport,
        ticket.has_seat_confirm,
        ticket.has_eticket,
    ]
    documents = schemas.TicketChecklistDocuments(
        has_address=document_flags[0],
        has_kakao_id=document_flags[1],
        has_passport=document_flags[2],
        has_seat_confirm=document_flags[3],
        has_eticket=document_flags[4],
        total=len(document_flags),
        done=sum(1 for flag in document_flags if flag),
    )
    present_keys = {item.template_key for item in items if item.template_key}
    return schemas.TicketChecklist(
        ticket_id=ticket.id,
        items=[schemas.TicketChecklistItem.model_validate(item) for item in items],
        total=len(items),
        done=sum(1 for item in items if item.is_done),
        documents=documents,
        missing_template_keys=[
            t["template_key"]
            for t in DEPARTURE_CHECKLIST_TEMPLATE
            if t["template_key"] not in present_keys
        ],
    )


def _get_checklist_item(
    db: Session, ticket_id: str, item_id: str
) -> models.TicketChecklistItem:
    item = (
        db.query(models.TicketChecklistItem)
        .filter(
            models.TicketChecklistItem.id == item_id,
            models.TicketChecklistItem.ticket_id == ticket_id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="체크리스트 항목을 찾을 수 없습니다.")
    return item


@router.get("/{ticket_id}/checklist", response_model=schemas.TicketChecklist)
def get_ticket_checklist(
    ticket_id: str, db: DBSession, current_user: OrgUser
) -> schemas.TicketChecklist:
    """티켓의 출국 준비 체크리스트 조회(소유자·관리자만).

    체크리스트가 생기기 전에 만들어진 티켓은 이 시점에 기본 항목을 깔아준다.
    """
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    if ticket.checklist_initialized_at is None:
        _seed_checklist_items(db, ticket, current_user.id)
        db.commit()
    return _checklist_response(ticket, _list_checklist_items(db, ticket.id))


@router.post(
    "/{ticket_id}/checklist",
    response_model=schemas.TicketChecklist,
    status_code=status.HTTP_201_CREATED,
)
def create_ticket_checklist_item(
    ticket_id: str,
    item_in: schemas.TicketChecklistItemCreate,
    db: DBSession,
    current_user: OrgUser,
) -> schemas.TicketChecklist:
    """체크리스트 항목 추가(소유자·관리자만). 맨 뒤에 붙인다."""
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    items = _list_checklist_items(db, ticket.id)
    next_order = (max((i.sort_order for i in items), default=-1)) + 1
    now = datetime.now(timezone.utc)
    db.add(
        models.TicketChecklistItem(
            ticket_id=ticket.id,
            label=item_in.label,
            note=item_in.note,
            is_done=item_in.is_done,
            completed_at=now if item_in.is_done else None,
            sort_order=next_order,
            created_by_id=current_user.id,
        )
    )
    # 직접 추가한 항목만 있는 티켓에도 기본 항목이 뒤늦게 깔리지 않게 시드 처리로 본다.
    if ticket.checklist_initialized_at is None:
        ticket.checklist_initialized_at = now
    db.commit()
    db.refresh(ticket)
    return _checklist_response(ticket, _list_checklist_items(db, ticket.id))


@router.put(
    "/{ticket_id}/checklist/{item_id}", response_model=schemas.TicketChecklist
)
def update_ticket_checklist_item(
    ticket_id: str,
    item_id: str,
    item_in: schemas.TicketChecklistItemUpdate,
    db: DBSession,
    current_user: OrgUser,
) -> schemas.TicketChecklist:
    """체크리스트 항목 수정(소유자·관리자만). 보낸 필드만 바꾼다."""
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    item = _get_checklist_item(db, ticket.id, item_id)
    changes = item_in.model_dump(exclude_unset=True)
    if "label" in changes:
        item.label = changes["label"]
    if "note" in changes:
        item.note = changes["note"]
    if "is_done" in changes and changes["is_done"] != item.is_done:
        item.is_done = changes["is_done"]
        item.completed_at = datetime.now(timezone.utc) if item.is_done else None
    db.commit()
    return _checklist_response(ticket, _list_checklist_items(db, ticket.id))


@router.delete(
    "/{ticket_id}/checklist/{item_id}", response_model=schemas.TicketChecklist
)
def delete_ticket_checklist_item(
    ticket_id: str, item_id: str, db: DBSession, current_user: OrgUser
) -> schemas.TicketChecklist:
    """체크리스트 항목 삭제(소유자·관리자만)."""
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    item = _get_checklist_item(db, ticket.id, item_id)
    db.delete(item)
    db.commit()
    return _checklist_response(ticket, _list_checklist_items(db, ticket.id))


@router.post(
    "/{ticket_id}/checklist/restore-template",
    response_model=schemas.TicketChecklist,
)
def restore_ticket_checklist_template(
    ticket_id: str, db: DBSession, current_user: OrgUser
) -> schemas.TicketChecklist:
    """지워진 기본 항목만 다시 만든다(소유자·관리자만).

    남아 있는 항목과 완료 상태는 그대로 두고, template_key가 비어 있는 기본
    항목만 뒤에 붙인다. 이름을 고친 기본 항목은 키가 남아 있어 중복되지 않는다.
    """
    ticket = _get_ticket_for_departure(db, ticket_id, current_user)
    items = _list_checklist_items(db, ticket.id)
    present_keys = {item.template_key for item in items if item.template_key}
    next_order = (max((i.sort_order for i in items), default=-1)) + 1
    for template in DEPARTURE_CHECKLIST_TEMPLATE:
        if template["template_key"] in present_keys:
            continue
        db.add(
            models.TicketChecklistItem(
                ticket_id=ticket.id,
                template_key=template["template_key"],
                label=template["label"],
                sort_order=next_order,
                created_by_id=current_user.id,
            )
        )
        next_order += 1
    if ticket.checklist_initialized_at is None:
        ticket.checklist_initialized_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return _checklist_response(ticket, _list_checklist_items(db, ticket.id))
