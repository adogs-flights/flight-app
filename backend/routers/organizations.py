import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routers.auth import AdminUser, OrgUser
from services import storage_service

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]

LOGO_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
LOGO_MAX_SIZE = 5 * 1024 * 1024  # 5MB


def _org_for_edit(
    db: Session, organization_id: int, user: models.User
) -> models.Organization:
    """소개 편집 대상 단체를 찾고 권한을 확인한다(관리자=전체, 단체=자기 단체만)."""
    org = (
        db.query(models.Organization)
        .filter(models.Organization.id == organization_id)
        .first()
    )
    if not org:
        raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다.")
    if user.role != "admin" and user.organization_id != organization_id:
        raise HTTPException(
            status_code=403, detail="자기 단체의 소개만 편집할 수 있습니다."
        )
    return org


@router.get("", response_model=list[schemas.Organization])
def get_organizations(db: DBSession) -> list[models.Organization]:
    return db.query(models.Organization).order_by(models.Organization.name).all()


@router.get("/with-accounts", response_model=list[schemas.Organization])
def get_organizations_with_accounts(db: DBSession) -> list[models.Organization]:
    """
    실제 로그인 계정이 존재하는 단체만 반환 (비로그인 제출 폼의 단체 선택 드롭다운용).
    """
    account_org_ids = (
        db.query(models.User.organization_id)
        .filter(models.User.organization_id.isnot(None))
        .distinct()
    )
    return (
        db.query(models.Organization)
        .filter(models.Organization.is_active.is_(True))
        .filter(models.Organization.id.in_(account_org_ids))
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


@router.put("/{organization_id}/profile", response_model=schemas.Organization)
def update_organization_profile(
    organization_id: int,
    profile: schemas.OrganizationProfileUpdate,
    db: DBSession,
    current_user: OrgUser,
) -> models.Organization:
    """단체 소개(소개글·링크)를 편집한다. 관리자 또는 자기 단체 담당자만."""
    org = _org_for_edit(db, organization_id, current_user)
    for key, value in profile.model_dump(exclude_unset=True).items():
        setattr(org, key, value)
    db.commit()
    db.refresh(org)
    return org


@router.get("/{organization_id}/logo")
def get_organization_logo(organization_id: int, db: DBSession) -> Response:
    """단체 로고 이미지 스트리밍. 공개(소개 페이지에서 바로 노출)."""
    org = (
        db.query(models.Organization)
        .filter(models.Organization.id == organization_id)
        .first()
    )
    if not org or not org.logo_object_key:
        raise HTTPException(status_code=404, detail="로고를 찾을 수 없습니다.")
    try:
        content, content_type = storage_service.get_object(org.logo_object_key)
    except Exception as e:
        raise HTTPException(status_code=404, detail="로고를 찾을 수 없습니다.") from e
    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.post("/{organization_id}/logo", response_model=schemas.Organization)
async def upload_organization_logo(
    organization_id: int,
    db: DBSession,
    current_user: OrgUser,
    logo: Annotated[UploadFile, File()],
) -> models.Organization:
    """단체 로고를 업로드/교체한다. 관리자 또는 자기 단체 담당자만."""
    org = _org_for_edit(db, organization_id, current_user)
    if logo.content_type not in LOGO_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, detail="JPG, PNG, WEBP 이미지만 업로드할 수 있습니다."
        )
    contents = await logo.read()
    if len(contents) > LOGO_MAX_SIZE:
        raise HTTPException(
            status_code=400, detail="로고 이미지는 5MB를 초과할 수 없습니다."
        )
    ext = os.path.splitext(logo.filename or "")[1]
    object_key = f"orglogo-{uuid.uuid4()}{ext}"
    try:
        storage_service.upload_bytes(object_key, contents, logo.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=502, detail="이미지 저장소 연결에 실패했습니다."
        ) from e

    old_key = org.logo_object_key
    org.logo_object_key = object_key
    db.commit()
    db.refresh(org)

    # 교체된 옛 로고는 스토리지에서 정리(실패는 무시).
    if old_key:
        try:
            storage_service.delete_object(old_key)
        except Exception as e:  # noqa: BLE001
            print(f"[org logo] 옛 로고 삭제 실패 ({old_key}): {e}")
    return org


@router.delete("/{organization_id}/logo", response_model=schemas.Organization)
def delete_organization_logo(
    organization_id: int, db: DBSession, current_user: OrgUser
) -> models.Organization:
    """단체 로고를 제거한다. 관리자 또는 자기 단체 담당자만."""
    org = _org_for_edit(db, organization_id, current_user)
    old_key = org.logo_object_key
    org.logo_object_key = None
    db.commit()
    db.refresh(org)
    if old_key:
        try:
            storage_service.delete_object(old_key)
        except Exception as e:  # noqa: BLE001
            print(f"[org logo] 로고 삭제 실패 ({old_key}): {e}")
    return org
