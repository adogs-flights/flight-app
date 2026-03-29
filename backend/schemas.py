
from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional, List
from enum import Enum
import uuid

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

class AirportCode(str, Enum):
    JFK = "JFK"
    EWR = "EWR"
    LAX = "LAX"
    YVR = "YVR"
    YYZ = "YYZ"

# ======================================================================================
# User Schemas
# ======================================================================================
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ======================================================================================
# AdminUser Schemas
# ======================================================================================
class AdminUserBase(BaseModel):
    user_id: str
    approved: bool

class AdminUser(AdminUserBase):
    created_at: datetime
    
    class Config:
        from_attributes = True

# =_====================================================================================
# Ticket Schemas
# ======================================================================================
class TicketBase(BaseModel):
    title: str
    country: str
    departure_date: date
    return_date: date
    flight_info: Optional[str] = ""
    airline: Optional[str] = ""
    capacity: Optional[int] = 1
    manager_name: str
    contact: str
    memo: Optional[str] = None

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    country: Optional[str] = None
    departure_date: Optional[date] = None
    return_date: Optional[date] = None
    flight_info: Optional[str] = None
    airline: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[TicketStatus] = None
    manager_name: Optional[str] = None
    contact: Optional[str] = None
    memo: Optional[str] = None

class Ticket(TicketBase):
    id: str
    status: TicketStatus
    created_by_id: Optional[str]
    owner_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    owner: Optional[User] = None

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
    applicant: Optional[User] = None
    ticket: Optional[Ticket] = None

    class Config:
        from_attributes = True

# ======================================================================================
# NeedPost Schemas
# ======================================================================================
class NeedPostBase(BaseModel):
    title: str
    airport_code: AirportCode
    desired_date: Optional[date] = None
    flight_route: Optional[str] = ""
    seats_needed: Optional[int] = 1
    contact: str
    detail: Optional[str] = None
    is_urgent: Optional[bool] = False

class NeedPostCreate(NeedPostBase):
    pass

class NeedPostUpdate(BaseModel):
    title: Optional[str] = None
    airport_code: Optional[AirportCode] = None
    desired_date: Optional[date] = None
    flight_route: Optional[str] = None
    seats_needed: Optional[int] = None
    contact: Optional[str] = None
    detail: Optional[str] = None
    is_urgent: Optional[bool] = None
    is_resolved: Optional[bool] = None

class NeedPost(NeedPostBase):
    id: str
    is_resolved: bool
    author_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    author: Optional[User] = None

    class Config:
        from_attributes = True
        
# ======================================================================================
# Token Schemas
# ======================================================================================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[EmailStr] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str
