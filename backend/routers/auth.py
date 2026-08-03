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
from permissions import scope_to_org
from services import kakao_service, notification_service

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
# auto_error=False가 필수다. 기본값(True)이면 Authorization 헤더가 없는 요청을
# 스킴이 먼저 401로 끊어버려서 쿠키 인증이 통째로 죽는다
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token", auto_error=False)

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
    request: Request,
    response: Response,
    db: DBSession,
    # 값을 쓰지 않는다. OpenAPI 문서에 시큐리티 스킴을 등록해 /docs의 Authorize
    # 버튼을 살리는 용도이며, 실제 토큰 추출은 _extract_access_token이 담당한다.
    # 기본값 None을 유지해야 get_current_user(request, response, db) 직접 호출이 깨지지 않는다
    _bearer: Annotated[str | None, Depends(oauth2_scheme)] = None,
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
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have admin privileges",
        )
    return current_user


AdminUser = Annotated[models.User, Depends(get_current_admin_user)]


def get_current_org_user(current_user: CurrentUser) -> models.User:
    if current_user.role == "admin":
        return current_user
    # 단체 자율 회원가입 계정은 관리자 승인 전까지 단체 업무 화면에 접근할 수 없다.
    # 승인 없이 통과하면 GET /api/tickets 한 번으로 게스트 전화번호를 전부 읽는다.
    if current_user.role == "org" and current_user.is_approved:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="단체 계정만 접근할 수 있습니다.",
    )


OrgUser = Annotated[models.User, Depends(get_current_org_user)]


def get_optional_user(
    request: Request, response: Response, db: DBSession
) -> models.User | None:
    """로그인하지 않아도 통과한다. 공개 화면에서 쓴다."""
    try:
        return get_current_user(request, response, db)
    except HTTPException:
        return None


OptionalUser = Annotated[models.User | None, Depends(get_optional_user)]


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

    # 단체 자율 회원가입 계정은 관리자 승인 전까지 로그인시키지 않는다.
    if user.role == "org" and not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="가입 승인 대기 중입니다. 관리자 승인 후 이용할 수 있습니다.",
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
# Kakao Login
# ======================================================================================
KAKAO_STATE_EXPIRE_MINUTES = 10
KAKAO_STATE_COOKIE_NAME = "kakao_oauth_state"
KAKAO_STATE_ERROR_DETAIL = "잘못된 인증 요청입니다. 다시 시도해주세요."


def _create_kakao_state(nonce: str) -> str:
    """docs/security.md 규칙: OAuth state는 서명된 단기 JWT."""
    return jwt.encode(
        {
            "purpose": "kakao_login",
            "nonce": nonce,
            "exp": datetime.now(timezone.utc)
            + timedelta(minutes=KAKAO_STATE_EXPIRE_MINUTES),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def set_kakao_state_cookie(response: Response, nonce: str) -> None:
    # samesite는 반드시 lax다. 카카오에서 돌아오는 길은 top-level GET 내비게이션이라
    # lax 쿠키는 전송되지만, strict였다면 콜백 화면에서 쿠키가 사라져 로그인이 죽는다
    response.set_cookie(
        key=KAKAO_STATE_COOKIE_NAME,
        value=nonce,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=KAKAO_STATE_EXPIRE_MINUTES * 60,
    )


def clear_kakao_state_cookie(response: Response) -> None:
    response.delete_cookie(KAKAO_STATE_COOKIE_NAME, path="/")


def _kakao_state_clearing_headers() -> dict[str, str]:
    """HTTPException으로 빠져나가면 주입된 Response의 헤더가 버려진다.

    에러 응답에도 삭제 쿠키를 직접 실어야 실패한 state가 브라우저에 남아
    재시도에 섞이지 않는다.
    """
    carrier = Response()
    clear_kakao_state_cookie(carrier)
    return {"set-cookie": carrier.headers["set-cookie"]}


def _kakao_state_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=KAKAO_STATE_ERROR_DETAIL,
        headers=_kakao_state_clearing_headers(),
    )


def _verify_kakao_state(state: str, cookie_nonce: str | None) -> None:
    """서명·만료·용도에 더해 흐름을 시작한 브라우저인지까지 확인한다.

    login-url이 비로그인 공개 엔드포인트라 누구나 유효한 state를 찍어낼 수 있다.
    서명만 보면 "이 서버가 최근에 발급한 state"라는 사실밖에 증명되지 않으므로,
    공격자가 자기 카카오 계정으로 받은 code와 자기가 발급받은 state를 피해자에게
    열게 해 피해자를 공격자 계정으로 로그인시킬 수 있다(세션 고정).
    쿠키에 심어둔 nonce와 대조해 그 경로를 막는다.

    어느 검사에서 걸렸는지는 응답으로 구분되지 않게 한다.
    """
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError as err:
        raise _kakao_state_error() from err
    if payload.get("purpose") != "kakao_login":
        raise _kakao_state_error()

    nonce = payload.get("nonce")
    if not isinstance(nonce, str) or not cookie_nonce:
        raise _kakao_state_error()
    # 쿠키 값에는 비ASCII가 들어올 수 있어 compare_digest에 str을 그대로 주면 터진다
    if not secrets.compare_digest(nonce.encode("utf-8"), cookie_nonce.encode("utf-8")):
        raise _kakao_state_error()


@router.get("/auth/kakao/login-url")
def kakao_login_url(response: Response) -> dict[str, str]:
    nonce = secrets.token_urlsafe(16)
    state = _create_kakao_state(nonce)
    set_kakao_state_cookie(response, nonce)
    return {"authorize_url": kakao_service.build_authorize_url(state), "state": state}


@router.post("/auth/kakao", response_model=schemas.Token)
def kakao_login(
    login_in: schemas.KakaoLoginRequest,
    request: Request,
    db: DBSession,
    response: Response,
) -> dict[str, str]:
    _verify_kakao_state(login_in.state, request.cookies.get(KAKAO_STATE_COOKIE_NAME))
    # state는 1회용이다. 이 아래로는 성공하든 실패하든 소진된 것으로 본다
    clear_kakao_state_cookie(response)

    try:
        profile = kakao_service.exchange_code_for_profile(login_in.code)
    except kakao_service.KakaoAPIError as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.",
            headers=_kakao_state_clearing_headers(),
        ) from err

    user = (
        db.query(models.User)
        .filter(models.User.kakao_user_id == profile.id)
        .first()
    )
    if user is None:
        # 카카오 이메일로 기존 계정과 병합하지 않는다. 검증되지 않은 이메일로
        # 남의 단체 계정을 가져갈 길을 막는다. email은 비워 둔다
        user = models.User(
            name=profile.nickname or "봉사자",
            role="general",
            kakao_user_id=profile.id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return issue_tokens(db, response, user)


# ======================================================================================
# Self-service Registration
# ======================================================================================
@router.post(
    "/auth/register-org",
    response_model=schemas.User,
    status_code=status.HTTP_201_CREATED,
)
def register_org(reg_in: schemas.OrgRegisterRequest, db: DBSession) -> models.User:
    """단체 자율 회원가입. 새 단체를 만들고 승인 대기(is_approved=False) 상태로 계정을 만든다.

    관리자가 승인해야 로그인·데이터 접근이 열린다. 그전까지 단체는 비활성이라
    공개 제출 폼의 단체 드롭다운에도 나타나지 않는다.
    """
    if db.query(models.User).filter(models.User.email == reg_in.email).first():
        raise HTTPException(status_code=400, detail="이미 가입된 이메일입니다.")

    org_name = reg_in.organization_name.strip()
    if (
        db.query(models.Organization)
        .filter(models.Organization.name == org_name)
        .first()
    ):
        raise HTTPException(
            status_code=400,
            detail="이미 등록된 단체명입니다. 담당자 계정 추가는 관리자에게 문의해주세요.",
        )

    organization = models.Organization(name=org_name, is_active=False)
    db.add(organization)
    db.flush()  # organization.id 확보

    db_user = models.User(
        email=reg_in.email,
        name=reg_in.name,
        hashed_password=get_password_hash(reg_in.password),
        role="org",
        organization_id=organization.id,
        is_approved=False,
    )
    db.add(db_user)
    try:
        db.commit()
    except Exception as err:
        db.rollback()
        raise HTTPException(status_code=400, detail="가입에 실패했습니다.") from err
    db.refresh(db_user)
    return db_user


# ======================================================================================
# User Management Endpoints
# ======================================================================================
@router.get("/users", response_model=list[schemas.User])
def read_users(db: DBSession, current_user: OrgUser) -> list[models.User]:
    """회원 목록. 관리자는 전체, 단체 담당자는 자기 단체 회원만 본다.

    제출 승인 시 '소유 회원 지정' 드롭다운이 단체 담당자에게도 필요하므로
    관리자 전용에서 OrgUser로 열되, scope_to_org로 자기 단체로 범위를 좁힌다.
    """
    return scope_to_org(db.query(models.User), current_user, models.User).all()


@router.get(
    "/users/pending",
    response_model=list[schemas.User],
    dependencies=[Depends(get_current_admin_user)],
)
def read_pending_users(db: DBSession) -> list[models.User]:
    """승인 대기 중인 단체 자율 회원가입 계정 목록."""
    return (
        db.query(models.User)
        .filter(models.User.role == "org", models.User.is_approved.is_(False))
        .order_by(models.User.created_at.desc())
        .all()
    )


@router.post("/users/{user_id}/approve", response_model=schemas.User)
def approve_user(user_id: str, db: DBSession, admin_user: AdminUser) -> models.User:
    """대기 중인 단체 계정을 승인한다. 소속 단체도 함께 활성화한다."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다.")
    if user.role != "org":
        raise HTTPException(status_code=400, detail="단체 계정만 승인할 수 있습니다.")

    user.is_approved = True
    if user.organization_id:
        organization = (
            db.query(models.Organization)
            .filter(models.Organization.id == user.organization_id)
            .first()
        )
        if organization:
            organization.is_active = True
    db.commit()
    db.refresh(user)

    # 인앱 알림: 승인된 단체 담당자가 로그인하면 벨에서 확인할 수 있다.
    notification_service.create_notifications(
        db,
        [user.id],
        type="account_approved",
        title="가입이 승인되었습니다",
        body="단체 계정 가입이 승인되었습니다. 이제 모든 기능을 이용하실 수 있어요.",
        link="/schedules",
    )
    return user


@router.post("/users/{user_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_user(user_id: str, db: DBSession, admin_user: AdminUser) -> None:
    """대기 중인 단체 계정을 거부(삭제)한다.

    자율 가입으로 만들어진 단체에 다른 계정이 없으면 그 단체도 함께 지운다.
    승인된 계정은 실수 삭제를 막으려고 이 경로로 지우지 못하게 한다.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다.")
    if user.role != "org" or user.is_approved:
        raise HTTPException(
            status_code=400, detail="승인 대기 중인 단체 계정만 거부할 수 있습니다."
        )

    organization_id = user.organization_id
    db.delete(user)
    db.flush()

    if organization_id:
        remaining = (
            db.query(models.User)
            .filter(models.User.organization_id == organization_id)
            .count()
        )
        if remaining == 0:
            organization = (
                db.query(models.Organization)
                .filter(models.Organization.id == organization_id)
                .first()
            )
            # 자율 가입이 만든 단체만(비활성) 정리한다. 관리자가 만든 활성 단체는 남긴다.
            if organization and not organization.is_active:
                db.delete(organization)
    db.commit()


# /users/me DELETE는 반드시 /users/{user_id} DELETE보다 먼저 등록해야 한다.
# 아니면 'me'가 user_id로 잡힌다.
@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_own_account(
    db: DBSession, current_user: CurrentUser, response: Response
) -> None:
    """회원 본인이 계정을 탈퇴(삭제)한다.

    신청·구해요 글은 함께 삭제되고, 소유/작성한 티켓은 소유자만 비워진다(FK SET NULL).
    """
    db.delete(current_user)
    db.commit()
    clear_auth_cookies(response)


@router.patch("/users/{user_id}", response_model=schemas.User)
def update_user_email(
    user_id: str,
    update_in: schemas.UserEmailUpdate,
    db: DBSession,
    admin_user: AdminUser,
) -> models.User:
    """관리자가 회원 이메일을 수정한다. 이메일은 고유해야 한다."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다.")

    new_email = str(update_in.email)
    duplicate = (
        db.query(models.User)
        .filter(models.User.email == new_email, models.User.id != user_id)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다.")

    user.email = new_email
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_by_admin(
    user_id: str, db: DBSession, admin_user: AdminUser
) -> None:
    """관리자가 회원을 탈퇴 처리(삭제)한다.

    본인 계정은 실수 방지를 위해 이 경로로 못 지운다(본인 탈퇴를 쓴다).
    """
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=400,
            detail="본인 계정은 여기서 삭제할 수 없습니다. '회원 탈퇴'를 사용하세요.",
        )
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="회원을 찾을 수 없습니다.")
    db.delete(user)
    db.commit()


@router.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user_in: schemas.UserCreate,
    db: DBSession,
    admin_user: AdminUser,
) -> models.User:
    if user_in.role not in ("org", "admin"):
        raise HTTPException(
            status_code=400,
            detail="관리자는 단체 또는 관리자 계정만 만들 수 있습니다. "
            "일반 사용자는 카카오 로그인으로 가입합니다.",
        )

    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    organization_id = None
    if user_in.role == "org":
        organization = (
            db.query(models.Organization)
            .filter(models.Organization.id == user_in.organization_id)
            .first()
        )
        if not organization:
            raise HTTPException(status_code=404, detail="단체를 찾을 수 없습니다.")
        organization_id = organization.id

    db_user = models.User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        organization_id=organization_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # 이메일 템플릿 파일 읽기
    from pathlib import Path
    import string

    template_path = (
        Path(__file__).parent.parent / "templates" / "email" / "account_created.html"
    )

    try:
        with open(template_path, "r", encoding="utf-8") as f:
            template_content = f.read()

        # CSS 중괄호({})와 충돌을 피하기 위해 Template ($변수) 방식 사용
        t = string.Template(template_content)
        body = t.safe_substitute(
            base_url=BASE_URL,
            name=user_in.name,
            email=user_in.email,
            password=user_in.password,
        )
    except Exception as e:
        print(f"Failed to load email template: {e}")
        body = (
            f"안녕하세요 {user_in.name}님, 계정이 생성되었습니다. "
            f"ID: {user_in.email}, PW: {user_in.password}"
        )

    subject = "해봉티켓 계정이 생성되었습니다."
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
