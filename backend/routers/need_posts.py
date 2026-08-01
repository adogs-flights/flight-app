import os
import uuid
from datetime import date
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

router = APIRouter(prefix="/api/need-posts", tags=["Need Posts"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


async def _store_image(image: UploadFile) -> str:
    """이미지를 검증하고 스토리지에 올린 뒤 오브젝트 키를 돌려준다."""
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400, detail="JPG, PNG, WEBP 이미지만 업로드할 수 있습니다."
        )
    contents = await image.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400, detail="이미지 크기는 10MB를 초과할 수 없습니다."
        )
    ext = os.path.splitext(image.filename or "")[1]
    object_key = f"needpost-{uuid.uuid4()}{ext}"
    try:
        storage_service.upload_bytes(object_key, contents, image.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=502, detail="이미지 저장소 연결에 실패했습니다."
        ) from e
    return object_key


@router.post("", response_model=schemas.NeedPost, status_code=status.HTTP_201_CREATED)
async def create_need_post(
    db: DBSession,
    current_user: OrgUser,
    title: Annotated[str, Form()],
    airport_code: Annotated[str, Form()],
    contact: Annotated[str, Form()],
    desired_date: Annotated[date | None, Form()] = None,
    seats_needed: Annotated[int, Form()] = 1,
    flight_route: Annotated[str, Form()] = "",
    detail: Annotated[str | None, Form()] = None,
    is_urgent: Annotated[bool, Form()] = False,
    image: Annotated[UploadFile | None, File()] = None,
) -> models.NeedPost:
    """
    Create a new 'need' post. 이동을 기다리는 강아지 사진을 함께 올릴 수 있다.
    """
    image_object_key = await _store_image(image) if image else None

    db_post = models.NeedPost(
        title=title,
        airport_code=airport_code,
        contact=contact,
        desired_date=desired_date,
        seats_needed=seats_needed,
        flight_route=flight_route,
        detail=detail,
        is_urgent=is_urgent,
        image_object_key=image_object_key,
        author_id=current_user.id,
    )
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


@router.get("", response_model=list[schemas.NeedPost])
def list_need_posts(db: DBSession, current_user: OrgUser) -> list[models.NeedPost]:
    """
    List 'need' posts.
    - Admin: See all posts.
    - Normal: See only future posts (desired_date >= today).
    """
    is_admin = current_user.role == "admin"

    query = db.query(models.NeedPost).options(joinedload(models.NeedPost.author))

    if not is_admin:
        today = date.today()
        query = query.filter(models.NeedPost.desired_date >= today)

    return query.order_by(models.NeedPost.desired_date.asc()).all()


@router.get("/public", response_model=list[schemas.NeedPostPublic])
def list_public_need_posts(db: DBSession) -> list[models.NeedPost]:
    """비로그인·일반 사용자용 공개 게시판. 인증이 필요 없다.

    앞으로 다가올(desired_date >= 오늘) 글만 보여주고, 응답 스키마에서
    contact와 작성자 이메일을 제외해 개인정보를 노출하지 않는다.
    라우트 순서상 반드시 '/{post_id}'보다 위에 있어야 한다. 아래에 있으면
    'public'이 post_id로 잡힌다.
    """
    today = date.today()
    return (
        db.query(models.NeedPost)
        .options(joinedload(models.NeedPost.author))
        .filter(models.NeedPost.desired_date >= today)
        .order_by(models.NeedPost.desired_date.asc())
        .all()
    )


@router.get("/{post_id}/image")
def get_need_post_image(post_id: str, db: DBSession) -> Response:
    """게시글의 강아지 사진을 스트리밍한다. 공개(비인증) 엔드포인트.

    이미지 자체는 개인정보가 아니므로 공개 게시판에서 바로 볼 수 있다.
    """
    post = db.query(models.NeedPost).filter(models.NeedPost.id == post_id).first()
    if not post or not post.image_object_key:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")
    try:
        content, content_type = storage_service.get_object(post.image_object_key)
    except Exception as e:
        raise HTTPException(
            status_code=404, detail="이미지를 찾을 수 없습니다."
        ) from e
    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/{post_id}", response_model=schemas.NeedPost)
def get_need_post(
    post_id: str,
    db: DBSession,
    current_user: OrgUser,
) -> models.NeedPost:
    """
    Get a single 'need' post by ID.
    """
    post = (
        db.query(models.NeedPost)
        .options(joinedload(models.NeedPost.author))
        .filter(models.NeedPost.id == post_id)
        .first()
    )
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    return post


@router.put("/{post_id}", response_model=schemas.NeedPost)
async def update_need_post(
    post_id: str,
    db: DBSession,
    current_user: OrgUser,
    title: Annotated[str, Form()],
    airport_code: Annotated[str, Form()],
    contact: Annotated[str, Form()],
    desired_date: Annotated[date | None, Form()] = None,
    seats_needed: Annotated[int, Form()] = 1,
    flight_route: Annotated[str, Form()] = "",
    detail: Annotated[str | None, Form()] = None,
    is_urgent: Annotated[bool, Form()] = False,
    is_resolved: Annotated[bool | None, Form()] = None,
    image: Annotated[UploadFile | None, File()] = None,
) -> models.NeedPost:
    """
    Update a 'need' post. Only the author or an admin can update.
    프론트가 폼 전체를 보내므로 텍스트 필드는 전체 치환한다.
    새 이미지가 오면 교체하고, 없으면 기존 이미지를 유지한다.
    """
    post = db.query(models.NeedPost).filter(models.NeedPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    is_author = post.author_id == current_user.id
    is_admin = current_user.role == "admin"

    if not is_author and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post",
        )

    post.title = title
    post.airport_code = airport_code
    post.contact = contact
    post.desired_date = desired_date
    post.seats_needed = seats_needed
    post.flight_route = flight_route
    post.detail = detail
    post.is_urgent = is_urgent
    if is_resolved is not None:
        post.is_resolved = is_resolved
    if image:
        post.image_object_key = await _store_image(image)

    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_need_post(post_id: str, db: DBSession, current_user: OrgUser) -> None:
    """
    Delete a 'need' post. Only the author or an admin can delete.
    """
    post = db.query(models.NeedPost).filter(models.NeedPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    is_author = post.author_id == current_user.id
    is_admin = current_user.role == "admin"

    if not is_author and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post",
        )

    db.delete(post)
    db.commit()
