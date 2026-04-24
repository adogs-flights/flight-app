import datetime
import os
from typing import Annotated, Any

import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import models
from database import get_db
from routers.auth import ALGORITHM, SECRET_KEY, get_current_user
from services import gdrive_service

# 개발 환경에서 HTTP 허용 (파일 상단으로 이동)
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

router = APIRouter(prefix="/api/gdrive", tags=["Google Drive"])

# --- Annotated types ---
DBSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[models.User, Depends(get_current_user)]

# OAuth State 유효 시간 (10분)
STATE_TOKEN_EXPIRE_MINUTES = 10


def create_state_token(user_id: str, code_verifier: str | None = None) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        minutes=STATE_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"user_id": user_id, "exp": expire}
    if code_verifier:
        to_encode["code_verifier"] = code_verifier
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_state_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=400, detail="Invalid state token: missing user_id"
            )
        return payload
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status_code=400, detail="State token has expired") from e
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=400, detail="Invalid state token") from e


@router.get("/status")
def get_gdrive_status(current_user: CurrentUser, db: DBSession) -> dict[str, Any]:
    """
    현재 구글 드라이브 연동 상태 및 설정된 폴더 정보를 반환합니다.
    """
    token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == current_user.id)
        .first()
    )
    if not token:
        return {"is_connected": False}

    return {
        "is_connected": True,
        "root_folder_id": token.root_folder_id,
        "expires_at": token.expires_at,
    }


@router.get("/connect")
def connect_google_drive(current_user: CurrentUser) -> dict[str, str]:
    flow = gdrive_service.get_flow()
    # PKCE를 위해 flow에서 생성된 code_verifier를 state에 포함
    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )

    # flow.code_verifier는 authorization_url() 호출 후 생성됨
    state = create_state_token(current_user.id, getattr(flow, "code_verifier", None))

    # 생성된 state를 포함하여 다시 URL 구성
    authorization_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state
    )

    return {"authorization_url": authorization_url}


@router.get("/callback")
def google_drive_callback(
    db: DBSession,
    state: str | None = None,
    code: str | None = None,
    error: str | None = None
) -> RedirectResponse:
    # 개발 환경에서 HTTP 허용 (oauthlib용)
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

    if error:
        raise HTTPException(status_code=400, detail=f"Google Auth Error: {error}")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Required parameters missing")

    try:
        payload = verify_state_token(state)
        user_id = payload.get("user_id")
        code_verifier = payload.get("code_verifier")

        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        flow = gdrive_service.get_flow()
        if code_verifier:
            flow.code_verifier = code_verifier

        flow.fetch_token(code=code)
        credentials = flow.credentials

        now = datetime.datetime.now(datetime.timezone.utc)
        expiry = (
            credentials.expiry.replace(tzinfo=datetime.timezone.utc)
            if credentials.expiry and credentials.expiry.tzinfo is None
            else (credentials.expiry or now + datetime.timedelta(hours=1))
        )

        token_entry = (
            db.query(models.UserGoogleToken)
            .filter(models.UserGoogleToken.user_id == user.id)
            .first()
        )
        if token_entry:
            token_entry.access_token = credentials.token
            if credentials.refresh_token:
                token_entry.refresh_token = credentials.refresh_token
            token_entry.expires_at = expiry
        else:
            token_entry = models.UserGoogleToken(
                user_id=user.id,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                expires_at=expiry,
            )
            db.add(token_entry)

        db.commit()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

    # 인증 완료 후 프론트엔드 '내 티켓' 페이지로 리다이렉트
    frontend_url = f"{gdrive_service.BASE_URL}/my-tickets?gdrive=success"
    return RedirectResponse(url=frontend_url)

@router.delete("/disconnect")
def disconnect_google_drive(current_user: CurrentUser, db: DBSession) -> dict[str, str]:
    """
    구글 드라이브 연동을 해제합니다. 토큰 정보만 삭제하고 루트 폴더 아이디는 보존합니다.
    """
    token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == current_user.id)
        .first()
    )
    if not token:
        raise HTTPException(status_code=404, detail="연동된 계정이 없습니다.")

    # 토큰 정보만 비우기 (루트 폴더 ID 보존)
    token.access_token = None
    token.refresh_token = None
    db.commit()

    return {
        "detail": (
            "구글 드라이브 연동이 해제되었습니다. "
            "설정된 폴더 정보는 유지됩니다."
        )
    }


@router.get("/folders")
def get_google_drive_folders(
    current_user: CurrentUser, db: DBSession
) -> list[dict[str, str]]:
    """
    사용자의 구글 드라이브에서 폴더 목록을 조회합니다.
    """
    token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == current_user.id)
        .first()
    )
    if not token or not token.access_token:
        raise HTTPException(status_code=400, detail="구글 연동이 필요합니다.")

    return gdrive_service.list_user_folders(token)


@router.post("/set-folder")
def set_google_drive_folder(
    current_user: CurrentUser,
    db: DBSession,
    background_tasks: BackgroundTasks,
    folder_id: str
) -> dict[str, Any]:
    """
    기존의 특정 폴더를 동기화 폴더로 설정합니다.
    """
    token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == current_user.id)
        .first()
    )
    if not token or not token.access_token:
        raise HTTPException(status_code=400, detail="구글 연동이 필요합니다.")

    # 1. DB에 폴더 ID 저장
    token.root_folder_id = folder_id
    db.commit()

    # 2. 초기 동기화 트리거 (v1.7 정합성 강화를 위해 구현했으나 단방향 전환을 위해 주석 처리)
    # background_tasks.add_task(
    #     gdrive_service.sync_drive_to_web, db, current_user.id, folder_id
    # )

    # try:
    #     gdrive_service.watch_folder(token, folder_id)
    # except Exception as e:
    #     print(f"Watch 등록 실패 (무시 가능): {e}")

    return {"detail": "폴더 설정이 완료되었습니다.", "folder_id": folder_id}


@router.post("/setup-folder")
def setup_sync_folder(
    current_user: CurrentUser,
    db: DBSession,
    background_tasks: BackgroundTasks,
    folder_name: str | None = "해봉티켓_동기화",
    auto_create: bool = True
) -> dict[str, Any]:
    """
    동기화용 루트 폴더를 설정하거나 자동으로 생성합니다.
    """
    token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == current_user.id)
        .first()
    )
    if not token or not token.access_token:
        raise HTTPException(
            status_code=400, detail="구글 연동이 선행되어야 합니다."
        )

    folder_id = None
    if auto_create:
        # 1. 같은 이름의 폴더가 있는지 먼저 확인 (중복 생성 방지)
        folder_id = gdrive_service.find_folder_by_name(token, folder_name)
        if not folder_id:
            # 2. 없으면 생성
            folder_id = gdrive_service.create_root_sync_folder(token, folder_name)
    else:
        # 이름으로 찾기만 수행
        folder_id = gdrive_service.find_folder_by_name(token, folder_name)
        if not folder_id:
            raise HTTPException(
                status_code=404, detail="해당 이름의 폴더를 찾을 수 없습니다."
            )

    # 3. DB에 폴더 ID 저장
    token.root_folder_id = folder_id
    db.commit()

    # 4. 초기 동기화 트리거 (단방향 전환을 위해 주석 처리)
    # background_tasks.add_task(
    #     gdrive_service.sync_drive_to_web, db, current_user.id, folder_id
    # )

    # try:
    #     gdrive_service.watch_folder(token, folder_id)
    # except Exception as e:
    #     print(f"Watch 등록 실패 (무시 가능): {e}")

    return {"detail": "폴더 설정이 완료되었습니다.", "folder_id": folder_id}


@router.post("/webhook")
async def google_drive_webhook(
    request: Request,
    db: DBSession,
    background_tasks: BackgroundTasks
) -> dict[str, str]:
    """
    구글 드라이브 웹훅 처리. 단방향 연동을 위해 동기화 로직은 주석 처리함.
    """
    resource_state = request.headers.get("X-Goog-Resource-State")
    channel_id = request.headers.get("X-Goog-Channel-ID")

    if resource_state == "sync" or not channel_id:
        return {"detail": "Sync notification received"}

    # 드라이브 -> 웹 동기화는 현재 비활성화됨 (주석 처리)
    """
    try:
        parts = channel_id.split("__")
        if len(parts) >= 2:
            user_id = parts[1]
            token = (
                db.query(models.UserGoogleToken)
                .filter(models.UserGoogleToken.user_id == user_id)
                .first()
            )

            if token and token.root_folder_id:
                background_tasks.add_task(
                    gdrive_service.sync_drive_to_web,
                    db,
                    user_id,
                    token.root_folder_id
                )
    except Exception as e:
        print(f"Webhook error: {e}")
    """

    return {"detail": "Webhook ignored (Unidirectional sync enabled)"}
