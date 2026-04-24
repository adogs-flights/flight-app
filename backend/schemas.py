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
# AdminUser Schemas (User에서 참조하기 위해 위로 이동)
# ======================================================================================
class AdminUserBase(BaseModel):
    user_id: str
    approved: bool


class AdminUser(AdminUserBase):
    created_at: datetime

    class Config:
        from_attributes = True


# ======================================================================================
# User Schemas
# ======================================================================================
class UserBase(BaseModel):
    email: EmailStr
    name: str
    organization: str | None = None # 단체명 추가


class UserCreate(UserBase):
    password: str

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


class User(UserBase):
    id: str
    created_at: datetime
    admin_info: AdminUser | None = None

    class Config:
        from_attributes = True


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
s = True
