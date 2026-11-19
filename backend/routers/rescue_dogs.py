"""구조견 관리 대장 API.

단체 업무 화면이라 전 엔드포인트를 OrgUser로 잠근다(docs/security.md의
"단체 업무 화면은 OrgUser 전용").

조회 범위 정책은 permissions.py의 결정을 그대로 따른다. 즉 구조견 목록
자체는 모든 단체가 공유해 보고, 임보자·입양자의 이름·주소·연락처·이메일
같은 개인정보는 담당 단체(와 admin)만 본다. 수정·삭제도 담당 단체만 한다.
"""

import os
import uuid
from datetime import date, datetime
from typing import Annotated

from fastapi import (
    APIRouter,
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
from routers.auth import OrgUser
from services import storage_service

router = APIRouter(prefix="/api/rescue-dogs", tags=["Rescue Dogs"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB

VALID_STATUSES = {"protecting", "fostering", "adopted"}
VALID_SEXES = {"male", "female"}

# 담당 단체·admin만 볼 수 있는 개인정보 필드.
PRIVATE_FIELDS = (
    "foster_name",
    "foster_address",
    "foster_contact",
    "foster_note",
    "adopter_name",
    "adopter_address",
    "adopter_contact",
    "adopter_email",
    "adoption_note",
)


async def _store_photo(photo: UploadFile) -> str:
    """사진을 검증하고 스토리지에 올린 뒤 오브젝트 키를 돌려준다."""
    if photo.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400, detail="JPG, PNG, WEBP 이미지만 업로드할 수 있습니다."
        )
    contents = await photo.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400, detail="이미지 크기는 10MB를 초과할 수 없습니다."
        )
    ext = os.path.splitext(photo.filename or "")[1]
    object_key = f"rescuedog-{uuid.uuid4()}{ext}"
    try:
        storage_service.upload_bytes(object_key, contents, photo.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=502, detail="이미지 저장소 연결에 실패했습니다."
        ) from e
    return object_key


def _clean(value: str | None) -> str | None:
    """폼의 빈 문자열을 None으로 정돈한다."""
    if value is None:
        return None
    value = value.strip()
    return value or None


def _parse_date(value: str | None, label: str) -> date | None:
    """YYYY-MM-DD 폼 값을 date로 바꾼다. 빈 값은 None.

    date 타입 Form으로 직접 받으면 빈 문자열에 422가 떨어진다. 선택 입력이
    많은 화면이라 문자열로 받아 여기서 정돈한다.
    """
    value = _clean(value)
    if value is None:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as e:
        raise HTTPException(
            status_code=400, detail=f"{label}은(는) YYYY-MM-DD 형식이어야 합니다."
        ) from e


def _validate_status(value: str) -> str:
    if value not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="알 수 없는 상태값입니다.")
    return value


def _validate_sex(value: str | None) -> str | None:
    value = _clean(value)
    if value is not None and value not in VALID_SEXES:
        raise HTTPException(status_code=400, detail="알 수 없는 성별값입니다.")
    return value


def _is_manager(dog: models.RescueDog, user: models.User) -> bool:
    """담당 단체 소속이거나 admin인지. 개인정보 열람·수정 권한과 같다."""
    if user.role == "admin":
        return True
    return (
        user.organization_id is not None
        and dog.organization_id == user.organization_id
    )


def _serialize(dog: models.RescueDog, user: models.User) -> schemas.RescueDog:
    """권한에 맞게 개인정보를 비운 응답을 만든다."""
    out = schemas.RescueDog.model_validate(dog)
    out.can_edit = _is_manager(dog, user)
    if not out.can_edit:
        # "값이 비었다"와 "볼 권한이 없다"를 프론트가 구분할 수 있게
        # 가린 내용이 실제로 있었는지만 알려준다.
        out.private_hidden = any(getattr(dog, f) for f in PRIVATE_FIELDS)
        for field in PRIVATE_FIELDS:
            setattr(out, field, None)
    return out


def _get_dog(db: Session, dog_id: str) -> models.RescueDog:
    dog = (
        db.query(models.RescueDog)
        .options(joinedload(models.RescueDog.organization))
        .filter(models.RescueDog.id == dog_id)
        .first()
    )
    if not dog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="구조견을 찾을 수 없습니다."
        )
    return dog


def _require_manager(dog: models.RescueDog, user: models.User) -> None:
    if not _is_manager(dog, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="담당 단체만 수정·삭제할 수 있습니다.",
        )


@router.post("", response_model=schemas.RescueDog, status_code=status.HTTP_201_CREATED)
async def create_rescue_dog(
    db: DBSession,
    current_user: OrgUser,
    name: Annotated[str, Form()],
    notice_number: Annotated[str | None, Form()] = None,
    rescued_on: Annotated[str | None, Form()] = None,
    birth_on: Annotated[str | None, Form()] = None,
    sex: Annotated[str | None, Form()] = None,
    rescue_place: Annotated[str | None, Form()] = None,
    dog_status: Annotated[str, Form(alias="status")] = "protecting",
    microchip_number: Annotated[str | None, Form()] = None,
    is_neutered: Annotated[bool, Form()] = False,
    note: Annotated[str | None, Form()] = None,
    foster_name: Annotated[str | None, Form()] = None,
    foster_address: Annotated[str | None, Form()] = None,
    foster_contact: Annotated[str | None, Form()] = None,
    foster_note: Annotated[str | None, Form()] = None,
    adopted_on: Annotated[str | None, Form()] = None,
    adopter_name: Annotated[str | None, Form()] = None,
    adopter_address: Annotated[str | None, Form()] = None,
    adopter_contact: Annotated[str | None, Form()] = None,
    adopter_email: Annotated[str | None, Form()] = None,
    adoption_note: Annotated[str | None, Form()] = None,
    photo: Annotated[UploadFile | None, File()] = None,
) -> schemas.RescueDog:
    """구조견을 등록한다. 담당 단체는 등록자의 소속 단체로 고정한다."""
    if not _clean(name):
        raise HTTPException(status_code=400, detail="이름을 입력해주세요.")

    photo_object_key = await _store_photo(photo) if photo else None

    dog = models.RescueDog(
        name=_clean(name),
        notice_number=_clean(notice_number),
        photo_object_key=photo_object_key,
        rescued_on=_parse_date(rescued_on, "구조일"),
        birth_on=_parse_date(birth_on, "생년월일"),
        sex=_validate_sex(sex),
        rescue_place=_clean(rescue_place),
        status=_validate_status(dog_status),
        microchip_number=_clean(microchip_number),
        is_neutered=is_neutered,
        note=_clean(note),
        foster_name=_clean(foster_name),
        foster_address=_clean(foster_address),
        foster_contact=_clean(foster_contact),
        foster_note=_clean(foster_note),
        adopted_on=_parse_date(adopted_on, "입양일"),
        adopter_name=_clean(adopter_name),
        adopter_address=_clean(adopter_address),
        adopter_contact=_clean(adopter_contact),
        adopter_email=_clean(adopter_email),
        adoption_note=_clean(adoption_note),
        organization_id=current_user.organization_id,
        created_by_id=current_user.id,
    )
    db.add(dog)
    db.commit()
    db.refresh(dog)
    return _serialize(dog, current_user)


@router.get("", response_model=list[schemas.RescueDog])
def list_rescue_dogs(
    db: DBSession,
    current_user: OrgUser,
) -> list[schemas.RescueDog]:
    """구조견 목록. 모든 단체의 개체를 함께 보되 개인정보는 가린다.

    구조일이 최근인 순으로 돌려준다. 구조일이 없는 개체는 맨 뒤로 가도록
    등록 시각을 보조 정렬키로 쓴다.
    """
    dogs = (
        db.query(models.RescueDog)
        .options(joinedload(models.RescueDog.organization))
        .order_by(
            models.RescueDog.rescued_on.desc().nullslast(),
            models.RescueDog.created_at.desc(),
        )
        .all()
    )
    return [_serialize(dog, current_user) for dog in dogs]


@router.get("/{dog_id}/photo")
def get_rescue_dog_photo(dog_id: str, db: DBSession, current_user: OrgUser) -> Response:
    """구조견 사진을 스트리밍한다. 내부 관리 자료라 로그인한 단체만 본다."""
    dog = _get_dog(db, dog_id)
    if not dog.photo_object_key:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.")
    try:
        content, content_type = storage_service.get_object(dog.photo_object_key)
    except Exception as e:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다.") from e
    return Response(
        content=content,
        media_type=content_type,
        # 개인정보는 아니지만 비공개 자료라 공용 캐시에 남기지 않는다.
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get("/{dog_id}", response_model=schemas.RescueDog)
def get_rescue_dog(
    dog_id: str, db: DBSession, current_user: OrgUser
) -> schemas.RescueDog:
    return _serialize(_get_dog(db, dog_id), current_user)


@router.put("/{dog_id}", response_model=schemas.RescueDog)
async def update_rescue_dog(
    dog_id: str,
    db: DBSession,
    current_user: OrgUser,
    name: Annotated[str, Form()],
    notice_number: Annotated[str | None, Form()] = None,
    rescued_on: Annotated[str | None, Form()] = None,
    birth_on: Annotated[str | None, Form()] = None,
    sex: Annotated[str | None, Form()] = None,
    rescue_place: Annotated[str | None, Form()] = None,
    dog_status: Annotated[str, Form(alias="status")] = "protecting",
    microchip_number: Annotated[str | None, Form()] = None,
    is_neutered: Annotated[bool, Form()] = False,
    note: Annotated[str | None, Form()] = None,
    foster_name: Annotated[str | None, Form()] = None,
    foster_address: Annotated[str | None, Form()] = None,
    foster_contact: Annotated[str | None, Form()] = None,
    foster_note: Annotated[str | None, Form()] = None,
    adopted_on: Annotated[str | None, Form()] = None,
    adopter_name: Annotated[str | None, Form()] = None,
    adopter_address: Annotated[str | None, Form()] = None,
    adopter_contact: Annotated[str | None, Form()] = None,
    adopter_email: Annotated[str | None, Form()] = None,
    adoption_note: Annotated[str | None, Form()] = None,
    photo: Annotated[UploadFile | None, File()] = None,
) -> schemas.RescueDog:
    """구조견 정보를 수정한다. 담당 단체(또는 admin)만 가능.

    프론트가 폼 전체를 보내므로 텍스트 필드는 전체 치환한다. 새 사진이 오면
    교체하고, 없으면 기존 사진을 유지한다.
    """
    dog = _get_dog(db, dog_id)
    _require_manager(dog, current_user)

    if not _clean(name):
        raise HTTPException(status_code=400, detail="이름을 입력해주세요.")

    dog.name = _clean(name)
    dog.notice_number = _clean(notice_number)
    dog.rescued_on = _parse_date(rescued_on, "구조일")
    dog.birth_on = _parse_date(birth_on, "생년월일")
    dog.sex = _validate_sex(sex)
    dog.rescue_place = _clean(rescue_place)
    dog.status = _validate_status(dog_status)
    dog.microchip_number = _clean(microchip_number)
    dog.is_neutered = is_neutered
    dog.note = _clean(note)
    dog.foster_name = _clean(foster_name)
    dog.foster_address = _clean(foster_address)
    dog.foster_contact = _clean(foster_contact)
    dog.foster_note = _clean(foster_note)
    dog.adopted_on = _parse_date(adopted_on, "입양일")
    dog.adopter_name = _clean(adopter_name)
    dog.adopter_address = _clean(adopter_address)
    dog.adopter_contact = _clean(adopter_contact)
    dog.adopter_email = _clean(adopter_email)
    dog.adoption_note = _clean(adoption_note)

    if photo:
        old_key = dog.photo_object_key
        dog.photo_object_key = await _store_photo(photo)
        if old_key:
            try:
                storage_service.delete_object(old_key)
            except Exception as e:
                # 옛 사진을 못 지워도 수정 자체는 성공시킨다.
                print(f"[rescue dog] 옛 사진 삭제 실패 ({old_key}): {e}")

    db.add(dog)
    db.commit()
    db.refresh(dog)
    return _serialize(dog, current_user)


@router.delete("/{dog_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rescue_dog(dog_id: str, db: DBSession, current_user: OrgUser) -> None:
    """구조견을 삭제한다. 담당 단체(또는 admin)만 가능."""
    dog = _get_dog(db, dog_id)
    _require_manager(dog, current_user)

    photo_key = dog.photo_object_key
    db.delete(dog)
    db.commit()
    if photo_key:
        try:
            storage_service.delete_object(photo_key)
        except Exception as e:
            # 대장에서는 이미 지워졌다. 남은 파일은 로그로만 알린다.
            print(f"[rescue dog] 사진 삭제 실패 ({photo_key}): {e}")
