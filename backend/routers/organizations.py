from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routers.auth import AdminUser

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[schemas.Organization])
def get_organizations(db: DBSession) -> list[models.Organization]:
    return db.query(models.Organization).order_by(models.Organization.name).all()


@router.get("/with-accounts", response_model=list[schemas.Organization])
def get_organizations_with_accounts(db: DBSession) -> list[models.Organization]:
    """
    실제 로그인 계정이 존재하는 단체만 반환 (비로그인 제출 폼의 단체 선택 드롭다운용).
    """
    account_org_names = (
        db.query(models.User.organization)
        .filter(models.User.organization.isnot(None))
        .distinct()
    )
    return (
        db.query(models.Organization)
        .filter(models.Organization.is_active.is_(True))
        .filter(models.Organization.name.in_(account_org_names))
        .order_by(models.Organization.name)
        .all()
    )


@router.get("/by-slug/{slug}", response_model=schemas.Organization)
def get_organization_by_slug(slug: str, db: DBSession) -> models.Organization:
    organization = (
        db.query(models.Organization)
        .filter(models.Organization.slug == slug, models.Organization.is_active.is_(True))
        .first()
    )
    if not organization:
        raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다.")
    return organization


@router.post("", response_model=schemas.Organization)
def create_organization(
    organization: schemas.OrganizationCreate,
    db: DBSession,
    current_admin: AdminUser = None,
) -> models.Organization:
    db_organization = models.Organization(**organization.model_dump())
    db.add(db_organization)
    try:
        db.commit()
        db.refresh(db_organization)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="이미 존재하는 단체명 또는 슬러그입니다."
        ) from e
    return db_organization


@router.put("/{organization_id}", response_model=schemas.Organization)
def update_organization(
    organization_id: int,
    organization_update: schemas.OrganizationUpdate,
    db: DBSession,
    current_admin: AdminUser = None,
) -> models.Organization:
    db_organization = (
        db.query(models.Organization)
        .filter(models.Organization.id == organization_id)
        .first()
    )
    if not db_organization:
        raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다.")

    update_data = organization_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_organization, key, value)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400, detail="이미 존재하는 단체명 또는 슬러그입니다."
        ) from e
    db.refresh(db_organization)
    return db_organization


@router.delete("/{organization_id}")
def delete_organization(
    organization_id: int, db: DBSession, current_admin: AdminUser = None
) -> dict[str, str]:
    db_organization = (
        db.query(models.Organization)
        .filter(models.Organization.id == organization_id)
        .first()
    )
    if not db_organization:
        raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다.")
    db.delete(db_organization)
    db.commit()
    return {"detail": "단체가 삭제되었습니다."}
