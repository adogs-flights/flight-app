
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models, schemas
from database import get_db
from routers.auth import get_current_user
from email_utils import send_email

router = APIRouter(
    prefix="/api",
    tags=["Ticket Applications"]
)

@router.post("/tickets/{ticket_id}/applications", response_model=schemas.TicketApplication, status_code=status.HTTP_201_CREATED)
def create_application_for_ticket(
    ticket_id: str,
    application_in: schemas.TicketApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new application for a ticket.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    if ticket.status != 'sharing':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This ticket is not available for sharing")
        
    if ticket.owner_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot apply for your own ticket")

    existing_application = db.query(models.TicketApplication).filter(
        models.TicketApplication.ticket_id == ticket_id,
        models.TicketApplication.applicant_id == current_user.id
    ).first()
    if existing_application:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already applied for this ticket")

    db_application = models.TicketApplication(
        ticket_id=ticket_id,
        applicant_id=current_user.id,
        message=application_in.message,
        contact=application_in.contact
    )
    db.add(db_application)
    db.commit()
    
    # Notify ticket owner
    if ticket.owner and ticket.owner.email:
        subject = f"[{ticket.title}] 새로운 나눔 신청"
        body = f"""
        <h3>'{ticket.title}' 티켓에 새로운 나눔 신청이 있습니다.</h3>
        <p><strong>신청자:</strong> {current_user.name} ({current_user.email})</p>
        <p><strong>메시지:</strong> {application_in.message}</p>
        <p>사이트에서 신청 내역을 확인하고 처리해주세요.</p>
        """
        send_email(ticket.owner.email, subject, body)
    
    db.refresh(db_application)
    return db_application

@router.get("/tickets/{ticket_id}/applications", response_model=List[schemas.TicketApplication])
def list_applications_for_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all applications for a specific ticket. Only visible to the ticket owner or an admin.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    is_owner = ticket.owner_id == current_user.id
    is_admin = current_user.admin_info and current_user.admin_info.approved
    
    if not is_owner and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view applications for this ticket")
        
    return ticket.applications

@router.get("/me/applications", response_model=List[schemas.TicketApplication])
def list_my_applications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    List all applications made by the current logged-in user.
    """
    return db.query(models.TicketApplication).filter(models.TicketApplication.applicant_id == current_user.id).all()

@router.put("/applications/{application_id}", response_model=schemas.TicketApplication)
def update_application_status(
    application_id: str,
    application_update: schemas.TicketApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update an application's status (e.g., to 'confirmed' or 'rejected').
    Only the ticket owner or an admin can do this.
    If confirmed, triggers transfer of ownership.
    """
    application = db.query(models.TicketApplication).filter(models.TicketApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        
    ticket = application.ticket
    is_owner = ticket.owner_id == current_user.id
    is_admin = current_user.admin_info and current_user.admin_info.approved

    if not is_owner and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this application")

    original_status = application.status
    new_status = application_update.status
    
    if original_status == new_status:
        return application # No change

    application.status = new_status

    if new_status == 'confirmed' and original_status != 'confirmed':
        ticket.owner_id = application.applicant_id
        ticket.status = 'shared'
        
        # Notify approved applicant
        subject_approved = f"신청하신 '{ticket.title}' 티켓이 확정되었습니다."
        body_approved = f"<h3>축하합니다! '{ticket.title}' 티켓 나눔 대상으로 확정되었습니다.</h3><p>자세한 내용은 사이트에서 확인해주세요.</p>"
        send_email(application.applicant.email, subject_approved, body_approved)
        
        other_applications = db.query(models.TicketApplication).filter(
            models.TicketApplication.ticket_id == ticket.id,
            models.TicketApplication.id != application.id,
            models.TicketApplication.status == 'pending'
        ).all()
        
        for other_app in other_applications:
            other_app.status = 'rejected'
            # Notify rejected applicants
            subject_rejected = f"신청하신 '{ticket.title}' 티켓이 마감되었습니다."
            body_rejected = f"<h3>아쉽지만 '{ticket.title}' 티켓은 다른 분에게 나눔이 확정되었습니다.</h3><p>다음에 더 좋은 기회로 만나 뵙기를 바랍니다.</p>"
            send_email(other_app.applicant.email, subject_rejected, body_rejected)
            
    elif new_status == 'rejected':
        # Notify the single rejected applicant
        subject_rejected = f"신청하신 '{ticket.title}' 티켓이 미선정되었습니다."
        body_rejected = f"<h3>아쉽지만 '{ticket.title}' 티켓 나눔 대상으로 선정되지 않았습니다.</h3><p>다음에 더 좋은 기회로 만나 뵙기를 바랍니다.</p>"
        send_email(application.applicant.email, subject_rejected, body_rejected)

    db.commit()
    db.refresh(application)
    return application

@router.get("/applications/{application_id}", response_model=schemas.TicketApplication)
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get details of a specific application. 
    Only visible to the ticket owner, the applicant, or an admin.
    """
    application = db.query(models.TicketApplication).filter(models.TicketApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        
    is_owner = application.ticket.owner_id == current_user.id
    is_applicant = application.applicant_id == current_user.id
    is_admin = current_user.admin_info and current_user.admin_info.approved
    
    if not any([is_owner, is_applicant, is_admin]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this application")
        
    return application

@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Delete an application. Can only be done by the applicant, preferably while status is 'pending'.
    """
    application = db.query(models.TicketApplication).filter(models.TicketApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        
    if application.applicant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this application")
        
    # Optional: Add logic to prevent deletion after a certain status
    if application.status != 'pending':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete an application that is not in pending state")

    db.delete(application)
    db.commit()
    return
