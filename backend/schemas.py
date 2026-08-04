import re
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, field_validator


# ======================================================================================
# Enums for status fields
# ======================================================================================
class TicketStatus(str, Enum):
    owned = "owned"
    sharing = "sharing"
    shared = "shared"


class TicketApplicationStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    rejected = "rejected"


# ======================================================================================
# Organization Schemas (User에서 참조하기 위해 위로 이동)
# ======================================================================================
class OrganizationBase(BaseModel):
    name: str
    slug: str | None = None
    is_active: bool | None = True

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not re.fullmatch(r"[a-z0-9-]+", v):
            raise ValueError("슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.")
        return v


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    is_active: bool | None = None

    @field_validator("slug")
    @classmethod
    def slug_format(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not re.fullmatch(r"[a-z0-9-]+", v):
            raise ValueError("슬러그는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.")
        return v


class Organization(OrganizationBase):
    id: int

    class Config:
        from_attributes = True


# ======================================================================================
# User Schemas
# ======================================================================================
class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str
    organization_id: int
    role: str = "org"

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class User(BaseModel):
    id: str
    name: str
    email: EmailStr | None = None
    role: str
    is_approved: bool = True
    organization_id: int | None = None
    organization: Organization | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserEmailUpdate(BaseModel):
    """관리자가 회원 이메일을 수정할 때 쓰는 바디."""

    email: EmailStr


class OrgRegisterRequest(BaseModel):
    """단체 자율 회원가입 요청. 새 단체를 만들고, 관리자 승인 전까지 비활성 상태로 둔다."""

    name: str
    email: EmailStr
    password: str
    organization_name: str

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("비밀번호에 영문을 포함해야 합니다.")
        if not re.search(r"[0-9]", v):
            raise ValueError("비밀번호에 숫자를 포함해야 합니다.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("비밀번호에 특수문자를 포함해야 합니다.")
        return v

    @field_validator("organization_name", "name")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("필수 입력값입니다.")
        return v.strip()


# ======================================================================================
# Google Drive Sync Schemas
# ======================================================================================
class GoogleDriveSyncBase(BaseModel):
    ticket_id: str
    google_folder_id: str
    sync_source: str


class GoogleDriveSync(GoogleDriveSyncBase):
    updated_at: datetime

    class Config:
        from_attributes = True


class UserGoogleTokenBase(BaseModel):
    user_id: str
    access_token: str | None = None # 연동 해제 시 NULL 허용
    refresh_token: str | None = None
    expires_at: datetime


class UserGoogleToken(UserGoogleTokenBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ======================================================================================
# Ticket Schemas
# ======================================================================================
class TicketBase(BaseModel):
    title: str
    arrival_airport: str
    departure_date: date
    arrival_date: date
    departure_time: str | None = ""
    arrival_time: str | None = ""
    flight_info: str | None = ""
    airline: str | None = ""
    capacity: int | None = 1
    cabin_capacity: int | None = 0
    cargo_capacity: int | None = 0
    manager_name: str
    contact: str
    memo: str | None = None


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    title: str | None = None
    arrival_airport: str | None = None
    departure_date: date | None = None
    arrival_date: date | None = None
    departure_time: str | None = None
    arrival_time: str | None = None
    flight_info: str | None = None
    airline: str | None = None
    capacity: int | None = None
    cabin_capacity: int | None = None
    cargo_capacity: int | None = None
    status: TicketStatus | None = None
    manager_name: str | None = None
    contact: str | None = None
    memo: str | None = None


class Ticket(TicketBase):
    id: str
    status: TicketStatus
    created_by_id: str | None
    owner_id: str | None
    created_at: datetime
    updated_at: datetime
    owner: User | None = None
    google_sync: GoogleDriveSync | None = None
    # 출국 준비 추가정보 (파일은 boolean으로만 노출, 실제 파일은 소유자/관리자만 서빙)
    dep_address: str | None = None
    dep_kakao_id: str | None = None
    has_passport: bool = False
    has_seat_confirm: bool = False
    has_eticket: bool = False
    departure_submitted: bool = False

    class Config:
        from_attributes = True


# ======================================================================================
# TicketApplication Schemas
# ======================================================================================
class TicketApplicationBase(BaseModel):
    message: str
    contact: str


class TicketApplicationCreate(TicketApplicationBase):
    ticket_id: str


class TicketApplicationUpdate(BaseModel):
    status: TicketApplicationStatus


class TicketApplication(TicketApplicationBase):
    id: str
    ticket_id: str
    applicant_id: str
    status: TicketApplicationStatus
    applied_at: datetime
    updated_at: datetime
    applicant: User | None = None
    ticket: Ticket | None = None

    class Config:
        from_attributes = True


# ======================================================================================
# NeedPost Schemas
# ======================================================================================
class NeedPostBase(BaseModel):
    title: str
    airport_code: str
    desired_date: date | None = None
    flight_route: str | None = ""
    seats_needed: int | None = 1
    contact: str
    detail: str | None = None
    is_urgent: bool | None = False


class NeedPostCreate(NeedPostBase):
    pass


class NeedPostUpdate(BaseModel):
    title: str | None = None
    airport_code: str | None = None
    desired_date: date | None = None
    flight_route: str | None = None
    seats_needed: int | None = None
    contact: str | None = None
    detail: str | None = None
    is_urgent: bool | None = None
    is_resolved: bool | None = None


class NeedPost(NeedPostBase):
    id: str
    is_resolved: bool
    author_id: str | None
    created_at: datetime
    updated_at: datetime
    author: User | None = None
    has_image: bool = False

    class Config:
        from_attributes = True


class NeedPostAuthorPublic(BaseModel):
    """공개 게시판에 노출되는 작성자 정보. 이메일 등 연락처는 절대 담지 않는다."""

    name: str

    class Config:
        from_attributes = True


class NeedPostPublic(BaseModel):
    """비로그인·일반 사용자용 읽기 전용 뷰. contact와 작성자 이메일을 제외한다.

    contact(작성자 전화)와 author.email은 로그인한 단체·관리자만 볼 수 있다.
    공개 게시판에서 이 값들이 새면 이메일·전화번호 스크래핑에 그대로 노출된다.
    """

    id: str
    title: str
    airport_code: str
    desired_date: date | None = None
    flight_route: str | None = ""
    seats_needed: int
    detail: str | None = None
    is_urgent: bool
    is_resolved: bool
    author: NeedPostAuthorPublic | None = None
    organization: Organization | None = None
    has_image: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NeedPostRef(BaseModel):
    """제출이 응답한 '구해요' 게시글의 최소 참조."""

    id: str
    title: str

    class Config:
        from_attributes = True


# ======================================================================================
# Token Schemas
# ======================================================================================
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenRefresh(BaseModel):
    refresh_token: str


class KakaoLoginRequest(BaseModel):
    code: str
    state: str


class TokenData(BaseModel):
    email: EmailStr | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v


# ======================================================================================
# Master Data Schemas (Airport, Airline)
# ======================================================================================
class AirportBase(BaseModel):
    code: str
    name: str
    country: str
    bg_color: str | None = "#f1f5f9"
    text_color: str | None = "#475569"
    is_active: bool | None = True


class AirportCreate(AirportBase):
    pass


class AirportUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    country: str | None = None
    bg_color: str | None = None
    text_color: str | None = None
    is_active: bool | None = None


class Airport(AirportBase):
    id: int

    class Config:
        from_attributes = True


class AirlineBase(BaseModel):
    code: str
    name: str
    is_active: bool | None = True


class AirlineCreate(AirlineBase):
    pass


class AirlineUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    is_active: bool | None = None


class Airline(AirlineBase):
    id: int

    class Config:
        from_attributes = True


# ======================================================================================
# Guest Ticket Submission Schemas
# ======================================================================================
class GuestSubmissionVerificationMethod(str, Enum):
    eticket_image = "eticket_image"
    reservation_number = "reservation_number"


class GuestSubmissionStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class GuestTicketSubmission(BaseModel):
    id: str
    phone: str
    kakao_id: str | None = None
    airline: str | None = None
    verification_method: GuestSubmissionVerificationMethod
    reservation_number: str | None = None
    passenger_last_name_en: str | None = None
    passenger_first_name_en: str | None = None
    organization_id: int | None = None
    organization: Organization | None = None
    need_post_id: str | None = None
    need_post: NeedPostRef | None = None
    user_id: str | None = None
    eticket_drive_url: str | None = None
    status: GuestSubmissionStatus
    admin_note: str | None = None
    created_ticket_id: str | None = None
    # 승인 후 출국 준비 정보 (파일은 boolean으로만 노출, 실제 파일은 격리 서빙)
    dep_address: str | None = None
    has_passport: bool = False
    has_seat_confirm: bool = False
    departure_submitted: bool = False
    submitted_at: datetime
    reviewed_at: datetime | None = None

    class Config:
        from_attributes = True


class GuestTicketSubmissionCreated(GuestTicketSubmission):
    """제출 직후 본인에게만 돌려주는 응답.

    lookup_token은 남의 개인정보(전화번호·e티켓)를 지키는 유일한 비밀이다.
    자기 조회 링크를 만들어야 하는 제출자 본인 외에는 아무도 볼 필요가 없으므로
    공용 응답 모델에서 빼고 이 생성 응답에만 싣는다.
    """

    lookup_token: str


class GuestSubmissionReject(BaseModel):
    admin_note: str | None = None


class GuestSubmissionApprove(TicketBase):
    owner_user_id: str | None = None


class GuestSubmissionClaim(BaseModel):
    lookup_token: str


class GuestSubmissionStatusPublic(BaseModel):
    """제출자가 lookup_token으로 조회하는 공개 상태 뷰.

    전화번호·e티켓·예약정보 등은 담지 않고 진행 상태만 노출한다.
    승인 후 출국 준비 서류 제출 여부(departure_submitted)를 함께 내려
    상태 페이지가 서류 제출 폼을 띄울지 판단한다.
    """

    status: GuestSubmissionStatus
    submitted_at: datetime
    reviewed_at: datetime | None = None
    admin_note: str | None = None
    # 승인 후 출국 준비 서류 제출 여부 (상태 페이지에서 폼 노출 판단용)
    departure_submitted: bool = False
    need_post: NeedPostRef | None = None
    organization: Organization | None = None

    class Config:
        from_attributes = True
