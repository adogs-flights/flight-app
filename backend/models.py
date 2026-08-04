import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
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
    __table_args__ = (
        CheckConstraint(
            "role <> 'general' OR kakao_user_id IS NOT NULL",
            name="ck_users_general_requires_kakao",
        ),
        CheckConstraint(
            "role <> 'org' OR (email IS NOT NULL AND hashed_password IS NOT NULL "
            "AND organization_id IS NOT NULL)",
            name="ck_users_org_requires_credentials_and_org",
        ),
        CheckConstraint(
            "role <> 'admin' OR (email IS NOT NULL AND hashed_password IS NOT NULL)",
            name="ck_users_admin_requires_credentials",
        ),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=True)
    role = Column(String, nullable=False, default="org", index=True)
    # 단체 자율 회원가입은 관리자 승인 전까지 False로 남는다. 관리자 발급 계정과
    # 카카오 일반 계정은 승인 개념이 없어 True로 만들어진다.
    is_approved = Column(Boolean, nullable=False, default=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    kakao_user_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
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
    google_token = relationship(
        "UserGoogleToken",
        back_populates="user",
        uselist=False,
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

    # 출국 준비 추가정보(2차). 봉사자 제출 티켓이든 단체 등록 티켓이든 여기에 모은다.
    # 민감 파일은 스토리지 키만 저장하고 소유자/관리자만 열람한다.
    dep_address = Column(String, nullable=True)  # 주소
    dep_kakao_id = Column(String, nullable=True)  # 카카오톡 아이디
    passport_object_key = Column(String, nullable=True)  # 여권 사본
    seat_confirm_object_key = Column(String, nullable=True)  # 자리 확약 캡쳐
    departure_submitted_at = Column(DateTime(timezone=True), nullable=True)
    # 봉사자 제출 티켓을 승인해 만든 일정이면, 제출 시 받은 e티켓 이미지 키를 여기로 이관한다.
    eticket_object_key = Column(String, nullable=True)  # e티켓 이미지

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
    google_sync = relationship(
        "GoogleDriveSync", back_populates="ticket", uselist=False, cascade="all, delete-orphan"
    )

    @property
    def has_passport(self) -> bool:
        return self.passport_object_key is not None

    @property
    def has_seat_confirm(self) -> bool:
        return self.seat_confirm_object_key is not None

    @property
    def has_eticket(self) -> bool:
        return self.eticket_object_key is not None

    @property
    def departure_submitted(self) -> bool:
        return self.departure_submitted_at is not None


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
    # 이동을 기다리는 강아지 사진. 스토리지(오브젝트) 키만 저장하고 파일은
    # storage_service가 관리한다.
    image_object_key = Column(String, nullable=True)

    author_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    author = relationship("User", back_populates="need_posts")

    @property
    def has_image(self) -> bool:
        return self.image_object_key is not None

    @property
    def organization(self):
        """게시글을 올린 단체. 작성자의 소속 단체를 그대로 노출한다."""
        return self.author.organization if self.author else None


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


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=True)  # 전용 제출 링크용
    is_active = Column(Boolean, default=True)


class GuestTicketSubmission(Base):
    __tablename__ = "guest_ticket_submissions"

    id = Column(String, primary_key=True, default=generate_uuid)
    phone = Column(String, nullable=False)
    kakao_id = Column(String, nullable=True)  # 카카오톡 아이디 (선택)
    airline = Column(String, nullable=True)  # 항공사 코드 (마스터 데이터 참조)
    verification_method = Column(String, nullable=False, index=True)  # 'eticket_image', 'reservation_number'
    eticket_object_key = Column(String, nullable=True)  # MinIO 오브젝트 키
    eticket_drive_url = Column(String, nullable=True)  # 대표 관리자 구글 드라이브 백업 링크
    reservation_number = Column(String, nullable=True)
    passenger_last_name_en = Column(String, nullable=True)
    passenger_first_name_en = Column(String, nullable=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # 어떤 '구해요' 게시글에 응답해 제출했는지. 게시글에서 바로 제출할 때 채워진다.
    need_post_id = Column(
        String, ForeignKey("need_posts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    lookup_token = Column(String, unique=True, index=True, nullable=False)
    status = Column(
        String, nullable=False, default="pending", index=True
    )  # 'pending', 'approved', 'rejected'
    admin_note = Column(Text, nullable=True)
    created_ticket_id = Column(
        String, ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True
    )

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization")
    user = relationship("User")
    created_ticket = relationship("Ticket")
    need_post = relationship("NeedPost")

    # 출국 준비 정보는 이제 연결된 티켓에 저장된다. 게스트 검토 UI가 제출 기준으로
    # 조회하므로, 편의를 위해 연결 티켓의 값을 그대로 위임해 노출한다.
    @property
    def dep_address(self):
        return self.created_ticket.dep_address if self.created_ticket else None

    @property
    def has_passport(self) -> bool:
        return bool(self.created_ticket and self.created_ticket.passport_object_key)

    @property
    def has_seat_confirm(self) -> bool:
        return bool(self.created_ticket and self.created_ticket.seat_confirm_object_key)

    @property
    def departure_submitted(self) -> bool:
        return bool(self.created_ticket and self.created_ticket.departure_submitted_at)


class UserGoogleToken(Base):
    __tablename__ = "user_google_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    access_token = Column(String, nullable=True)  # 연동 해제 시 None (폴더 ID 보존)
    refresh_token = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    root_folder_id = Column(String, nullable=True)  # 동기화 루트 폴더 ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="google_token")


class GoogleDriveSync(Base):
    __tablename__ = "google_drive_sync"

    ticket_id = Column(
        String, ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True
    )
    google_folder_id = Column(String, unique=True, index=True, nullable=False)
    sync_source = Column(String)  # 'WEB' 또는 'DRIVE'
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    ticket = relationship("Ticket", back_populates="google_sync")
