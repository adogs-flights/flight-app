from pydantic import BaseModel
from datetime import date
from typing import Optional

class ScheduleBase(BaseModel):
    post_type: str
    departure_date: date
    departure_loc: str
    arrival_loc: str
    content: str
    status: Optional[str] = "모집중"
    author_name: Optional[str] = None  # 추가
    author_phone: Optional[str] = None # 추가

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleResponse(ScheduleBase):
    id: int

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str
    org_name: str
    phone_number: str # 📞 회원가입 시 필요

class UserLogin(BaseModel):
    username: str
    password: str