from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import get_db
from routers.auth import get_current_user
from services import gdrive_service

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[models.User, Depends(get_current_user)]


@router.post("", response_model=schemas.Ticket, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: schemas.TicketCreate,
    db: DBSession,
    current_user: CurrentUser,
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
    db: DBSession, current_user: CurrentUser, schedule: bool = False
) -> list[models.Ticket]:
    """
    List tickets.
    - If schedule=True: Return only current user's tickets that are NOT in 'sharing' status.
    - If schedule=False:
        - 'owned' tickets are only visible to the owner or an admin.
        - 'sharing' and 'shared' tickets are visible to all logged-in users.
    """
    is_admin = current_user.admin_info and current_user.admin_info.approved

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
    current_user: CurrentUser,
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
    is_admin = current_user.admin_info and current_user.admin_info.approved

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
    current_user: CurrentUser,
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
    is_admin = current_user.admin_info and current_user.admin_info.approved

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
    current_user: CurrentUser,
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
    is_admin = current_user.admin_info and current_user.admin_info.approved

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
