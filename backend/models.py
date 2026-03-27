from sqlalchemy import Column, Integer, String, Date, Text
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    org_name = Column(String)
    phone_number = Column(String) # 📞 전화번호 추가

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    post_type = Column(String, index=True)
    departure_date = Column(Date, index=True)
    departure_loc = Column(String)
    arrival_loc = Column(String)
    content = Column(Text)
    status = Column(String, default="모집중")
    author_name = Column(String) 
    author_phone = Column(String) # 📞 게시글에도 전화번호 저장