import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    admin_info = relationship(
        "AdminUser",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    tickets_created = relationship(
        "Ticket",
        back_populates="creator",
        foreign_keys="[Ticket.created_by_id]",
    )
    tickets_owned = relationship(
        "Ticket",
        back_populates="owner",
        foreign_keys="[Ticket.owner_id]",
    )
    applications = relationship(
        "TicketApplication",
        back_populates="applicant",
        cascade="all, delete-orphan",
    )
    need_posts = relationship(
        "NeedPost",
        back_populates="author",
        cascade="all, delete-orphan",
    )
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")


class AdminUser(Base):
    __tablename__ = "admin_users"

    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="admin_info")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(Text, nullable=False)
    arrival_airport = Column(
        Text, nullable=False, index=True
    )  # country -> arrival_airport
    departure_date = Column(Date, nullable=False, index=True)
    arrival_date = Column(Date, nullable=False)
    departure_time = Column(String, default="")  # 신규
    arrival_time = Column(String, default="")  # 신규
    flight_info = Column(Text, default="")
    airline = Column(Text, default="", index=True)
    capacity = Column(Integer, default=1)
    cabin_capacity = Column(Integer, default=0)  # 신규 (기내)
    cargo_capacity = Column(Integer, default=0)  # 신규 (수하물)
    status = Column(
        String, nullable=False, default="owned", index=True
    )  # 'owned', 'sharing', 'shared'
    manager_name = Column(Text, nullable=False)
    contact = Column(Text, nullable=False)
    memo = Column(Text)

    created_by_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    owner_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    creator = relationship(
        "User", back_populates="tickets_created", foreign_keys=[created_by_id]
    )
    owner = relationship(
        "User", back_populates="tickets_owned", foreign_keys=[owner_id]
    )
    applications = relationship(
        "TicketApplication", back_populates="ticket", cascade="all, delete-orphan"
    )


class TicketApplication(Base):
    __tablename__ = "ticket_applications"
    __table_args__ = (
        UniqueConstraint("ticket_id", "applicant_id", name="uq_ticket_applicant"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(
        String, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    applicant_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message = Column(Text, nullable=False)
    contact = Column(Text, nullable=False)
    status = Column(
        String, nullable=False, default="pending", index=True
    )  # 'pending', 'confirmed', 'rejected'

    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    ticket = relationship("Ticket", back_populates="applications")
    applicant = relationship("User", back_populates="applications")


class NeedPost(Base):
    __tablename__ = "need_posts"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(Text, nullable=False)
    airport_code = Column(
        String, nullable=False, index=True
    )  # 'JFK', 'EWR', 'LAX', 'YVR', 'YYZ'
    desired_date = Column(Date, index=True, nullable=True)
    flight_route = Column(Text, default="")
    seats_needed = Column(Integer, nullable=False, default=1)
    contact = Column(Text, nullable=False)
    detail = Column(Text)
    is_urgent = Column(Boolean, nullable=False, default=False)
    is_resolved = Column(Boolean, nullable=False, default=False, index=True)

    author_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    author = relationship("User", back_populates="need_posts")


class Airport(Base):
    __tablename__ = "airports"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)  # JFK, LAX
    name = Column(String, nullable=False)  # 뉴욕 존 F. 케네디 국제공항
    country = Column(String, nullable=False)  # 미국, 캐나다, 기타
    bg_color = Column(String, default="#f1f5f9")  # 배경색 (HEX)
    text_color = Column(String, default="#475569")  # 글자색 (HEX)
    is_active = Column(Boolean, default=True)


class Airline(Base):
    __tablename__ = "airlines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)  # KE, OZ
    name = Column(String, nullable=False)  # 대한항공
    is_active = Column(Boolean, default=True)
