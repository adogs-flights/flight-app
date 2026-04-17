from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[models.User, Depends(get_current_user)]


@router.post("", response_model=schemas.Ticket, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: schemas.TicketCreate,
    db: DBSession,
    current_user: CurrentUser,
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
        query = db.query(models.Ticket).options(joinedload(models.Ticket.owner))

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
            .options(joinedload(models.Ticket.owner))
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
            .options(joinedload(models.Ticket.owner))
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
    for key, value in update_data.items():
        setattr(ticket, key, value)

    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(ticket_id: str, db: DBSession, current_user: CurrentUser) -> None:
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

    db.delete(ticket)
    db.commit()
