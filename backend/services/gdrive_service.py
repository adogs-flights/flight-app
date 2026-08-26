import datetime
import json
import os
import re
from typing import Any

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload
from sqlalchemy.orm import Session

import models
from services import storage_service

# Google API Scopes
SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
]

# 환경 변수 설정
GOOGLE_CLIENT_CONFIG = os.environ.get("GOOGLE_CLIENT_CONFIG")  # JSON string
BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000").rstrip("/")
REDIRECT_URI = f"{BASE_URL}/api/gdrive/callback"
WEBHOOK_URL = f"{BASE_URL}/api/gdrive/webhook"


def get_flow() -> Flow:
    if not GOOGLE_CLIENT_CONFIG:
        raise ValueError("GOOGLE_CLIENT_CONFIG environment variable is not set")

    client_config = json.loads(GOOGLE_CLIENT_CONFIG)
    flow = Flow.from_client_config(
        client_config, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )
    return flow


def get_drive_service(user_token: models.UserGoogleToken) -> Any:
    if not GOOGLE_CLIENT_CONFIG:
        raise ValueError("GOOGLE_CLIENT_CONFIG environment variable is not set")

    client_info = json.loads(GOOGLE_CLIENT_CONFIG)["web"]
    creds = Credentials(
        token=user_token.access_token,
        refresh_token=user_token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_info["client_id"],
        client_secret=client_info["client_secret"],
    )
    return build("drive", "v3", credentials=creds)


def generate_default_title(cabin: int, cargo: int) -> str:
    """
    진짜 기본 티켓 제목 생성 규칙:
    기내 N석 / 수하물 M석 (용량에 따라 유동적)
    """
    if (cabin or 0) > 0 and (cargo or 0) > 0:
        return f"기내 {cabin}석 / 수하물 {cargo}석"
    elif (cargo or 0) > 0:
        return f"수하물 {cargo}석"
    elif (cabin or 0) > 0:
        return f"기내 {cabin}석"
    else:
        return "티켓 나눔 (상세 확인)"


def parse_flight_folder_name(folder_name: str) -> dict[str, Any] | None:
    """
    폴더명 파싱 규칙: YYYYMMDD_HHMM_HHMM_N자리_[공항코드]
    N자리는 수하물(cargo_capacity)로 매핑합니다.
    """
    pattern = r"^(\d{8})_(\d{4})_(\d{4})_(.*)_\[([A-Z]{3})\]$"
    match = re.match(pattern, folder_name)

    if not match:
        return None

    departure_date_str = match.group(1)
    departure_time_str = match.group(2)
    arrival_time_str = match.group(3)
    n_value_str = match.group(4)  # "N자리" 부분
    airport_code = match.group(5)

    try:
        departure_date = datetime.datetime.strptime(departure_date_str, "%Y%m%d").date()
        dep_time = f"{departure_time_str[:2]}:{departure_time_str[2:]}"
        arr_time = f"{arrival_time_str[:2]}:{arrival_time_str[2:]}"

        # N자리 값을 숫자로 변환 (실패 시 0)
        try:
            cargo_capacity = int(re.search(r"\d+", n_value_str).group())
        except (ValueError, AttributeError):
            cargo_capacity = 0

        arrival_date = departure_date
        if arrival_time_str < departure_time_str:
            arrival_date = departure_date + datetime.timedelta(days=1)

        # 진짜 제목 생성 규칙 적용 (파싱 시에는 수하물 위주로 매핑)
        return {
            "departure_date": departure_date,
            "departure_time": dep_time,
            "arrival_date": arrival_date,
            "arrival_time": arr_time,
            "flight_info": n_value_str, # 원본 텍스트도 보관
            "cargo_capacity": cargo_capacity,
            "cabin_capacity": 0,
            "arrival_airport": airport_code,
            "title": generate_default_title(0, cargo_capacity),
        }
    except ValueError:
        return None


def format_ticket_to_folder_name(ticket: models.Ticket) -> str:
    """
    Ticket 데이터를 폴더명 형식으로 변환.
    기내와 수하물 중 더 큰 값을 사용하여 'N자리' 형식으로 반환합니다.
    """
    date_prefix = ticket.departure_date.strftime("%Y%m%d")
    dep_ts = ticket.departure_time.replace(":", "") if ticket.departure_time else "0000"
    arr_ts = ticket.arrival_time.replace(":", "") if ticket.arrival_time else "0000"

    # 기내와 수하물 중 더 큰 값을 추출하여 'N자리'로 표시
    n_value = max(ticket.cabin_capacity or 0, ticket.cargo_capacity or 0)
    info = f"{n_value}자리"

    airport = ticket.arrival_airport

    return f"{date_prefix}_{dep_ts}_{arr_ts}_{info}_[{airport}]"


def create_gdrive_folder(db: Session, ticket_id: str, user_id: str) -> None:
    """
    [Web -> Drive] 폴더 생성
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    user_token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == user_id)
        .first()
    )

    if not ticket or not user_token:
        return

    service = get_drive_service(user_token)
    folder_name = format_ticket_to_folder_name(ticket)

    file_metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }

    # 루트 동기화 폴더가 설정되어 있다면 부모 폴더로 지정
    if user_token.root_folder_id:
        file_metadata["parents"] = [user_token.root_folder_id]

    try:
        folder = service.files().create(body=file_metadata, fields="id").execute()
        folder_id = folder.get("id")
        sync_entry = models.GoogleDriveSync(
            ticket_id=ticket.id, google_folder_id=folder_id, sync_source="WEB"
        )
        db.add(sync_entry)
        db.commit()
    except Exception as e:
        print(f"Error creating GDrive folder: {e}")
        db.rollback()


def delete_gdrive_folder(db: Session, google_folder_id: str, user_id: str) -> None:
    """
    [Web -> Drive] 폴더 삭제 (휴지통 이동)
    """
    user_token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == user_id)
        .first()
    )
    if not user_token:
        return

    service = get_drive_service(user_token)
    try:
        service.files().update(
            fileId=google_folder_id, body={"trashed": True}
        ).execute()
    except Exception as e:
        print(f"Error deleting GDrive folder: {e}")


def update_gdrive_folder_name(db: Session, ticket_id: str, user_id: str) -> None:
    """
    [Web -> Drive] 티켓 정보 수정 시 드라이브 폴더명 동기화
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    sync_info = (
        db.query(models.GoogleDriveSync)
        .filter(models.GoogleDriveSync.ticket_id == ticket_id)
        .first()
    )
    user_token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == user_id)
        .first()
    )

    if not ticket or not sync_info or not user_token or not user_token.access_token:
        return

    service = get_drive_service(user_token)
    new_folder_name = format_ticket_to_folder_name(ticket)

    try:
        service.files().update(
            fileId=sync_info.google_folder_id,
            body={"name": new_folder_name}
        ).execute()
    except Exception as e:
        print(f"Error updating GDrive folder name: {e}")


def watch_folder(user_token: models.UserGoogleToken, folder_id: str) -> dict[str, Any]:
    """
    [단계 2] 특정 폴더에 대한 변경 감지 웹훅을 등록합니다.
    """
    service = get_drive_service(user_token)
    # UUID 하이픈과 겹치지 않도록 구분자를 '__'로 변경
    channel_id = f"watch__{user_token.user_id}__{folder_id[:8]}"
    body = {
        "id": channel_id,
        "type": "web_hook",
        "address": WEBHOOK_URL,
    }
    return service.files().watch(fileId=folder_id, body=body).execute()


def sync_drive_to_web(db: Session, user_id: str, folder_id: str) -> None:
    """
    [단계 3] 드라이브 폴더 목록을 조회하여 티켓으로 동기화합니다.
    생성뿐만 아니라 삭제된 폴더에 대한 처리도 포함합니다.
    """
    user_token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == user_id)
        .first()
    )
    if not user_token:
        return

    service = get_drive_service(user_token)
    query = (
        f"'{folder_id}' in parents and "
        "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    )

    try:
        results = service.files().list(q=query, fields="files(id, name)").execute()
        active_folders = results.get("files", [])
        active_folder_ids = {f["id"] for f in active_folders}

        # 1. 생성 및 업데이트 동기화 (Reconciliation)
        for folder in active_folders:
            folder_id_g = folder["id"]
            folder_name = folder["name"]

            # 폴더명 규칙 확인 및 파싱
            parsed_data = parse_flight_folder_name(folder_name)
            if not parsed_data:
                continue

            # 이미 동기화된 폴더인지 확인
            sync_entry = (
                db.query(models.GoogleDriveSync)
                .filter(models.GoogleDriveSync.google_folder_id == folder_id_g)
                .first()
            )

            if sync_entry:
                # [v1.7 정합성 검사] 이미 동기화된 경우 티켓 정보와 대조하여 업데이트
                ticket = (
                    db.query(models.Ticket)
                    .filter(models.Ticket.id == sync_entry.ticket_id)
                    .first()
                )
                if ticket:
                    needs_update = False
                    # 파싱된 데이터와 현재 티켓 데이터를 비교하여 변경된 부분 반영
                    for key, value in parsed_data.items():
                        if getattr(ticket, key) != value:
                            setattr(ticket, key, value)
                            needs_update = True

                    if needs_update:
                        ticket.updated_at = datetime.datetime.now(datetime.timezone.utc)
                continue

            # 2. 매핑 정보는 없지만 동일한 정보를 가진 티켓이 있는지 확인 (재연결 시 복구 로직)
            # (생략 가능하나 정합성을 위해 추가 고려 가능)

            # 3. 신규 티켓 생성
            new_ticket = models.Ticket(
                **parsed_data,
                manager_name="Google Drive Sync",
                contact="N/A",
                created_by_id=user_id,
                owner_id=user_id,
                status="owned",
            )
            db.add(new_ticket)
            db.flush()

            # 동기화 이력 기록
            sync_entry = models.GoogleDriveSync(
                ticket_id=new_ticket.id,
                google_folder_id=folder_id_g,
                sync_source="DRIVE",
            )
            db.add(sync_entry)

        # 2. 삭제 동기화 (Drive -> Web)
        # 사용자가 소유한 티켓 중 구글 동기화 정보가 있는 것들을 조회
        synced_tickets = (
            db.query(models.GoogleDriveSync)
            .join(models.Ticket)
            .filter(models.Ticket.owner_id == user_id)
            .all()
        )

        for sync in synced_tickets:
            if sync.google_folder_id not in active_folder_ids:
                # 드라이브에는 없는데 DB에는 동기화 정보가 남아있는 경우 -> 삭제된 것으로 간주
                ticket_to_delete = (
                    db.query(models.Ticket)
                    .filter(models.Ticket.id == sync.ticket_id)
                    .first()
                )
                if ticket_to_delete:
                    db.delete(ticket_to_delete)

        db.commit()
    except Exception as e:
        print(f"Error during Drive to Web sync: {e}")
        db.rollback()


def find_folder_by_name(
    user_token: models.UserGoogleToken, folder_name: str
) -> str | None:
    """
    이름으로 구글 드라이브 폴더를 검색합니다.
    """
    service = get_drive_service(user_token)
    query = (
        f"name = '{folder_name}' and "
        "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    )
    results = service.files().list(q=query, fields="files(id, name)").execute()
    folders = results.get("files", [])
    return folders[0]["id"] if folders else None


def get_or_create_folder(
    user_token: models.UserGoogleToken,
    folder_name: str,
    parent_id: str | None = None,
) -> str:
    """
    parent_id 아래에서 folder_name 폴더를 찾고, 없으면 새로 생성합니다.
    """
    service = get_drive_service(user_token)
    query = (
        f"name = '{folder_name}' and "
        "mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    )
    if parent_id:
        query += f" and '{parent_id}' in parents"

    results = service.files().list(q=query, fields="files(id, name)").execute()
    folders = results.get("files", [])
    if folders:
        return folders[0]["id"]

    file_metadata: dict[str, Any] = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        file_metadata["parents"] = [parent_id]
    folder = service.files().create(body=file_metadata, fields="id").execute()
    return folder.get("id")


def upload_file_to_drive(
    user_token: models.UserGoogleToken,
    filename: str,
    content: bytes,
    mime_type: str,
    folder_id: str | None = None,
) -> str | None:
    """
    파일 바이트를 사용자의 구글 드라이브에 업로드하고 파일 ID를 반환합니다.
    """
    service = get_drive_service(user_token)
    file_metadata: dict[str, Any] = {"name": filename}
    if folder_id:
        file_metadata["parents"] = [folder_id]

    media = MediaInMemoryUpload(content, mimetype=mime_type, resumable=False)
    uploaded = service.files().create(
        body=file_metadata, media_body=media, fields="id, webViewLink"
    ).execute()
    return uploaded.get("id")


GDRIVE_UPLOAD_ADMIN_EMAIL = os.environ.get("GDRIVE_UPLOAD_ADMIN_EMAIL")
GUEST_SUBMISSION_FOLDER_NAME = "이동봉사_티켓제출_이미지"


def backup_guest_submission_to_drive(
    db: Session,
    submission_id: str,
    object_key: str,
    mime_type: str,
) -> None:
    """
    [백그라운드] 비로그인 제출자의 e티켓 이미지(MinIO에 저장됨)를
    대표 관리자(GDRIVE_UPLOAD_ADMIN_EMAIL)의 구글 드라이브에 백업 업로드합니다.
    대표 관리자 미설정/미연동 시 조용히 건너뜁니다. MinIO 원본은 그대로 유지되며,
    이 업로드는 어디까지나 백업 용도입니다.
    """
    if not GDRIVE_UPLOAD_ADMIN_EMAIL:
        return

    admin_user = (
        db.query(models.User)
        .filter(models.User.email == GDRIVE_UPLOAD_ADMIN_EMAIL)
        .first()
    )
    if not admin_user:
        return

    user_token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == admin_user.id)
        .first()
    )
    if not user_token or not user_token.access_token:
        return

    submission = (
        db.query(models.GuestTicketSubmission)
        .filter(models.GuestTicketSubmission.id == submission_id)
        .first()
    )
    if not submission:
        return

    try:
        content, _ = storage_service.get_object(object_key)
        folder_id = get_or_create_folder(
            user_token, GUEST_SUBMISSION_FOLDER_NAME, parent_id=user_token.root_folder_id
        )
        file_id = upload_file_to_drive(user_token, object_key, content, mime_type, folder_id)
        if file_id:
            submission.eticket_drive_url = f"https://drive.google.com/file/d/{file_id}/view"
            db.commit()
    except Exception as e:
        print(f"Error backing up guest submission to GDrive: {e}")
        db.rollback()


def _ticket_folder_target(
    db: Session, ticket: models.Ticket | None
) -> tuple[models.UserGoogleToken | None, str | None]:
    """티켓의 드라이브 업로드 대상(소유자 토큰, 폴더 id)을 찾는다.

    티켓 폴더(GoogleDriveSync)나 소유자 토큰이 없으면 (None, None).
    """
    if not ticket or not ticket.owner_id:
        return None, None
    sync = (
        db.query(models.GoogleDriveSync)
        .filter(models.GoogleDriveSync.ticket_id == ticket.id)
        .first()
    )
    if not sync:
        return None, None
    user_token = (
        db.query(models.UserGoogleToken)
        .filter(models.UserGoogleToken.user_id == ticket.owner_id)
        .first()
    )
    if not user_token or not user_token.access_token:
        return None, None
    return user_token, sync.google_folder_id


def _drive_name_suffix(ticket: models.Ticket) -> str:
    """파일명 뒤에 붙는 '_{도착공항}_{월 일}'. 예: '_SFO_Aug 08'."""
    airport = (ticket.arrival_airport or "").strip() or "UNKNOWN"
    if ticket.departure_date:
        return f"_{airport}_{ticket.departure_date.strftime('%b %d')}"
    return f"_{airport}"


def upload_eticket_to_ticket_folder(db: Session, submission_id: str) -> None:
    """[백그라운드] 제출자의 e티켓 파일을 연결된 티켓의 드라이브 폴더에 올린다.

    예약번호 방식 제출(e티켓 없음)이거나 폴더/토큰이 없으면 조용히 스킵한다.
    """
    submission = (
        db.query(models.GuestTicketSubmission)
        .filter(models.GuestTicketSubmission.id == submission_id)
        .first()
    )
    if not submission or not submission.eticket_object_key or not submission.created_ticket:
        return
    ticket = submission.created_ticket
    user_token, folder_id = _ticket_folder_target(db, ticket)
    if not user_token:
        return
    suffix = _drive_name_suffix(ticket)
    try:
        content, content_type = storage_service.get_object(submission.eticket_object_key)
        ext = os.path.splitext(submission.eticket_object_key)[1]
        upload_file_to_drive(
            user_token, f"0 e ticket{suffix}{ext}", content, content_type, folder_id
        )
    except Exception as e:
        print(f"Error uploading e-ticket to GDrive: {e}")


def _build_ticket_info_text(db: Session, ticket: models.Ticket) -> str:
    """티켓의 추가정보(주소 등)와, 봉사자 제출 티켓이면 카톡 아이디·전화 등을 텍스트로 정리한다."""
    submission = (
        db.query(models.GuestTicketSubmission)
        .filter(models.GuestTicketSubmission.created_ticket_id == ticket.id)
        .first()
    )
    lines = ["[이동봉사 제출 정보]"]
    if submission:
        lines.append(f"카카오 아이디: {submission.kakao_id or '-'}")
        lines.append(f"전화번호: {submission.phone or '-'}")
    lines.append(f"담당자: {ticket.manager_name or '-'}")
    lines.append(f"연락처: {ticket.contact or '-'}")
    lines.append(f"주소: {ticket.dep_address or '-'}")
    if ticket.dep_kakao_id:
        lines.append(f"카카오톡 아이디: {ticket.dep_kakao_id}")
    lines.append(f"항공사: {ticket.airline or '-'}")
    lines.append(f"도착 공항: {ticket.arrival_airport or '-'}")
    lines.append(
        f"출발일: {ticket.departure_date.isoformat() if ticket.departure_date else '-'}"
    )
    if submission:
        if submission.reservation_number:
            lines.append(f"예약번호: {submission.reservation_number}")
        passenger = " ".join(
            part
            for part in [
                submission.passenger_last_name_en,
                submission.passenger_first_name_en,
            ]
            if part
        )
        if passenger:
            lines.append(f"탑승객(영문): {passenger}")
        if submission.need_post:
            lines.append(f"응답 게시글: {submission.need_post.title}")
    if ticket.owner and ticket.owner.organization:
        lines.append(f"단체: {ticket.owner.organization.name}")
    return "\n".join(lines) + "\n"


def upload_departure_docs_to_ticket_folder(db: Session, ticket_id: str) -> None:
    """[백그라운드] 티켓의 출국 준비 서류(여권·자리확약)와 정보 텍스트를 티켓 드라이브 폴더에 올린다.

    봉사자 제출 티켓이든 단체 등록 티켓이든 동일하게 티켓 기준으로 처리한다.
    티켓 폴더나 소유자 토큰이 없으면 조용히 스킵한다.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    user_token, folder_id = _ticket_folder_target(db, ticket)
    if not user_token:
        return
    suffix = _drive_name_suffix(ticket)

    docs = [
        ("0 passport", ticket.passport_object_key),
        ("2 confirmation", ticket.seat_confirm_object_key),
        ("3 eticket", ticket.eticket_object_key),
    ]
    for label, object_key in docs:
        if not object_key:
            continue
        try:
            content, content_type = storage_service.get_object(object_key)
            ext = os.path.splitext(object_key)[1]
            upload_file_to_drive(
                user_token, f"{label}{suffix}{ext}", content, content_type, folder_id
            )
        except Exception as e:
            print(f"Error uploading departure doc to GDrive: {e}")

    # 주소·카톡 아이디 등 텍스트 정보를 파일로 만들어 함께 올린다.
    try:
        info_text = _build_ticket_info_text(db, ticket)
        upload_file_to_drive(
            user_token,
            f"1 information{suffix}.txt",
            info_text.encode("utf-8"),
            "text/plain; charset=utf-8",
            folder_id,
        )
    except Exception as e:
        print(f"Error uploading submission info text to GDrive: {e}")


def create_root_sync_folder(
    user_token: models.UserGoogleToken, folder_name: str = "해봉티켓_동기화"
) -> str:
    """
    동기화를 위한 루트 폴더를 생성합니다.
    """
    service = get_drive_service(user_token)
    file_metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    folder = service.files().create(body=file_metadata, fields="id").execute()
    return folder.get("id")

