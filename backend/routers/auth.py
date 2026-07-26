import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
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
BASE_URL = os.environ.get("BASE_URL", "http://localhost:5173") # 프론트엔드 주소

COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
# refresh 쿠키 경로가 /api/auth가 아니라 /api인 이유:
# 사일런트 리프레시가 get_current_user 안에서 일어나므로 모든 /api/* 요청이
# refresh 쿠키를 들고 와야 한다
REFRESH_COOKIE_PATH = "/api"

router = APIRouter(prefix="/api", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# --- Annotated types for clean dependencies ---
DBSession = Annotated[Session, Depends(get_db)]
OAuth2Form = Annotated[OAuth2PasswordRequestForm, Depends()]


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


def set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


def issue_tokens(
    db: Session, response: Response, user: models.User
) -> dict[str, str]:
    """access/refresh를 발급하고 쿠키에 심는다. 본문에도 담아 API 클라이언트를 지원한다."""
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(db, user.id)
    set_access_cookie(response, access_token)
    set_refresh_cookie(response, refresh_token)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


# ======================================================================================
# User Dependencies
# ======================================================================================
def _extract_access_token(request: Request) -> str | None:
    """쿠키를 먼저 보고, 없으면 Authorization 헤더를 본다."""
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if token:
        return token
    header = request.headers.get("Authorization")
    if header and header.lower().startswith("bearer "):
        return header[7:]
    return None


def _user_from_refresh_cookie(
    request: Request, response: Response, db: Session
) -> models.User | None:
    """refresh 쿠키를 검증하고 새 access 쿠키를 심는다. 회전하지 않는다."""
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        return None

    db_token = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.token == raw_token,
            models.RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not db_token:
        return None

    user = db_token.user
    if user is None:
        return None

    new_access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    set_access_cookie(response, new_access_token)
    return user


def get_current_user(
    request: Request, response: Response, db: DBSession
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_access_token(request)
    user: models.User | None = None

    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str | None = payload.get("sub")
            if user_id:
                user = db.query(models.User).filter(models.User.id == user_id).first()
        except jwt.ExpiredSignatureError:
            # 401을 던지지 않고 refresh로 조용히 갱신한다
            user = _user_from_refresh_cookie(request, response, db)
        except jwt.PyJWTError as err:
            raise credentials_exception from err
    else:
        # access 쿠키가 만료되어 브라우저가 지웠을 수 있다
        user = _user_from_refresh_cookie(request, response, db)

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
def login_for_access_token(
    form_data: OAuth2Form, db: DBSession, response: Response
) -> dict[str, str]:
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if (
        not user
        or not user.hashed_password
        or not verify_password(form_data.password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return issue_tokens(db, response, user)


@router.post("/refresh", response_model=schemas.Token)
def refresh_access_token(
    request: Request,
    response: Response,
    db: DBSession,
    refresh_in: schemas.TokenRefresh | None = None,
) -> dict[str, str]:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token and refresh_in:
        raw_token = refresh_in.refresh_token

    db_token = (
        db.query(models.RefreshToken)
        .filter(
            models.RefreshToken.token == raw_token,
            models.RefreshToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
        if raw_token
        else None
    )

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user = db_token.user
    new_access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    set_access_cookie(response, new_access_token)

    # refresh 회전을 하지 않는다. 동시 요청이 서로의 토큰을 무효화하면
    # 사용자가 로그아웃된다
    return {
        "access_token": new_access_token,
        "refresh_token": db_token.token,
        "token_type": "bearer",
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        db.query(models.RefreshToken).filter(
            models.RefreshToken.token == raw_token,
            models.RefreshToken.user_id == current_user.id,
        ).delete()
        db.commit()
    clear_auth_cookies(response)


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
        organization=user_in.organization, # 단체명 저장
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # 계정에 단체명이 있으면 단체 마스터 데이터에도 자동 반영 (없으면 생성)
    org_name = (user_in.organization or "").strip()
    if org_name:
        existing_org = (
            db.query(models.Organization)
            .filter(models.Organization.name == org_name)
            .first()
        )
        if not existing_org:
            db.add(models.Organization(name=org_name, is_active=True))
            db.commit()

    # 이메일 템플릿 파일 읽기
    from pathlib import Path
    import string
    template_path = Path(__file__).parent.parent / "templates" / "email" / "account_created.html"
    
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            template_content = f.read()
        
        # CSS 중괄호({})와 충돌을 피하기 위해 Template ($변수) 방식 사용
        t = string.Template(template_content)
        body = t.safe_substitute(
            base_url=BASE_URL,
            name=user_in.name,
            email=user_in.email,
            password=user_in.password
        )
    except Exception as e:
        print(f"Failed to load email template: {e}")
        # 폴백 디자인 (파일을 못 읽을 경우)
        body = f"안녕하세요 {user_in.name}님, 계정이 생성되었습니다. ID: {user_in.email}, PW: {user_in.password}"

    subject = "해봉티켓 계정이 생성되었습니다."
    send_email(receiver_email=user_in.email, subject=subject, body=body)

    return db_user

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
    # 카카오 로그인 계정은 hashed_password가 NULL이라 verify_password가 터진다
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=400, detail="비밀번호가 설정되지 않은 계정입니다."
        )

    if not verify_password(password_update.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    current_user.hashed_password = get_password_hash(password_update.new_password)
    db.add(current_user)
    db.commit()
