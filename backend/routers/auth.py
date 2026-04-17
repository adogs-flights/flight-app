import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from email_utils import send_email

# ======================================================================================
# Configuration
# ======================================================================================
SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key-for-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Short-lived for security
REFRESH_TOKEN_EXPIRE_DAYS = 14  # Long-lived for convenience

router = APIRouter(prefix="/api", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# --- Annotated types for clean dependencies ---
DBSession = Annotated[Session, Depends(get_db)]
OAuth2Form = Annotated[OAuth2PasswordRequestForm, Depends()]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


# ======================================================================================
# Password & Token Utilities
# ======================================================================================
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(db: Session, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db_refresh_token = models.RefreshToken(
        token=token, user_id=user_id, expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()
    db.refresh(db_refresh_token)
    return token


# ======================================================================================
# User Dependencies
# ======================================================================================
def get_current_user(token: TokenDep, db: DBSession) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except jwt.PyJWTError as err:
        raise credentials_exception from err

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


CurrentUser = Annotated[models.User, Depends(get_current_user)]


def get_current_admin_user(current_user: CurrentUser) -> models.User:
    if not current_user.admin_info or not current_user.admin_info.approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have admin privileges",
        )
    return current_user


AdminUser = Annotated[models.User, Depends(get_current_admin_user)]


# ======================================================================================
# Authentication Endpoints
# ======================================================================================
@router.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2Form, db: DBSession) -> dict[str, str]:
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires,
    )
    refresh_token = create_refresh_token(db, user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=schemas.Token)
def refresh_access_token(
    refresh_in: schemas.TokenRefresh, db: DBSession
) -> dict[str, str]:
    db_token = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.token == refresh_in.refresh_token,
            models.RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db_token.user
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires,
    )

    # Optional: Refresh Token Rotation
    db.delete(db_token)
    new_refresh_token = create_refresh_token(db, user.id)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    refresh_in: schemas.TokenRefresh, db: DBSession, current_user: CurrentUser
) -> None:
    db.query(models.RefreshToken).filter(
        models.RefreshToken.token == refresh_in.refresh_token,
        models.RefreshToken.user_id == current_user.id,
    ).delete()
    db.commit()


# ======================================================================================
# User Management Endpoints
# ======================================================================================
@router.get(
    "/users",
    response_model=list[schemas.User],
    dependencies=[Depends(get_current_admin_user)],
)
def read_users(db: DBSession) -> list[models.User]:
    users = db.query(models.User).all()
    return users


@router.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user_in: schemas.UserCreate,
    db: DBSession,
    admin_user: AdminUser,
) -> models.User:
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user_in.password)
    db_user = models.User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    subject = "해봉티켓 계정이 생성되었습니다."
    body = (
        f"<html><body><h2>안녕하세요, {user_in.name}님!</h2>"
        "<p>해봉티켓 계정이 생성되었습니다. 즉시 비밀번호를 변경해주세요.</p><hr>"
        f"<p>ID: {user_in.email}</p><p>임시 PW: {user_in.password}</p></body></html>"
    )
    send_email(receiver_email=user_in.email, subject=subject, body=body)

    return db_user


@router.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: CurrentUser) -> models.User:
    return current_user


@router.put("/users/me/password", status_code=status.HTTP_204_NO_CONTENT)
def update_password(
    password_update: schemas.PasswordUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    if not verify_password(password_update.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    current_user.hashed_password = get_password_hash(password_update.new_password)
    db.add(current_user)
    db.commit()
