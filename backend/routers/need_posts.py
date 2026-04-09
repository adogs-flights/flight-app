

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/need-posts", tags=["Need Posts"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[models.User, Depends(get_current_user)]


@router.post("", response_model=schemas.NeedPost, status_code=status.HTTP_201_CREATED)
def create_need_post(
    post_in: schemas.NeedPostCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> models.NeedPost:
    """
    Create a new 'need' post.
    """
    db_post = models.NeedPost(**post_in.dict(), author_id=current_user.id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


@router.get("", response_model=list[schemas.NeedPost])
def list_need_posts(db: DBSession, current_user: CurrentUser) -> list[models.NeedPost]:
    """
    List all 'need' posts. Any logged-in user can view them.
    """
    return (
        db.query(models.NeedPost)
        .options(joinedload(models.NeedPost.author))
        .order_by(models.NeedPost.created_at.desc())
        .all()
    )


@router.get("/{post_id}", response_model=schemas.NeedPost)
def get_need_post(
    post_id: str,
    db: DBSession,
    current_user: CurrentUser,
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
def update_need_post(
    post_id: str,
    post_update: schemas.NeedPostUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> models.NeedPost:
    """
    Update a 'need' post. Only the author or an admin can update.
    """
    post = db.query(models.NeedPost).filter(models.NeedPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    is_author = post.author_id == current_user.id
    is_admin = current_user.admin_info and current_user.admin_info.approved

    if not is_author and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post",
        )

    update_data = post_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)

    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_need_post(post_id: str, db: DBSession, current_user: CurrentUser) -> None:
    """
    Delete a 'need' post. Only the author or an admin can delete.
    """
    post = db.query(models.NeedPost).filter(models.NeedPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    is_author = post.author_id == current_user.id
    is_admin = current_user.admin_info and current_user.admin_info.approved

    if not is_author and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post",
        )

    db.delete(post)
    db.commit()
