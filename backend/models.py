import uuid
from datetime import date

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
    push_subscriptions = relationship(
        "PushSubscription", back_populates="user", cascade="all, delete-orphan"
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
    google_token = relationship(
        "UserGoogleToken",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    __table_args__ = (UniqueConstraint("endpoint", name="uq_push_subscriptions_endpoint"),)

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(String(2048), nullable=False)
    p256dh = Column(String(128), nullable=False)
    auth = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    user = relationship("User", back_populates="push_subscriptions")


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

    # 출국 준비 체크리스트의 기본 항목을 깔아준 시각. 항목을 전부 지운 티켓에
    # 기본 항목이 되살아나지 않게 하려고 "시드했는지"를 따로 기록한다.
    checklist_initialized_at = Column(DateTime(timezone=True), nullable=True)

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
    checklist_items = relationship(
        "TicketChecklistItem",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="TicketChecklistItem.sort_order",
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


class TicketChecklistItem(Base):
    """티켓 하나의 출국 준비 체크리스트 항목.

    기한 없이 "했는지 안 했는지"만 본다. 출국일이 티켓에 이미 있어 항목마다
    날짜를 또 받으면 관리 대상만 늘어나기 때문이다. 완료로 바꾼 시점은
    completed_at에 남겨 누가 언제 끝냈는지 되짚을 수 있게 한다.

    기본 항목(static_data.DEPARTURE_CHECKLIST_TEMPLATE)에서 생성된 항목은
    template_key를 갖고, 담당자가 직접 추가한 항목은 비어 있다. 기본 항목도
    수정·삭제할 수 있으므로 template_key는 "복원 시 중복 생성 방지" 용도다.

    서류(여권·자리 확약·e티켓)와 주소는 Ticket 컬럼에 이미 있으므로 여기에
    항목으로 복제하지 않고, 조회 응답에서 파생 상태로만 함께 보여준다.
    """

    __tablename__ = "ticket_checklist_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    ticket_id = Column(
        String, ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 기본 항목 식별자. 담당자가 추가한 항목은 None.
    template_key = Column(String, nullable=True)
    label = Column(Text, nullable=False)
    note = Column(Text, nullable=True)
    is_done = Column(Boolean, nullable=False, default=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)

    created_by_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    ticket = relationship("Ticket", back_populates="checklist_items")


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

    # 공개 단체 소개 페이지(/org/{slug})용 정보. 담당자가 직접 편집한다.
    description = Column(Text, nullable=True)  # 단체 소개글
    logo_object_key = Column(String, nullable=True)  # 로고 이미지(스토리지 키)
    homepage_url = Column(String, nullable=True)  # 홈페이지
    instagram_url = Column(String, nullable=True)  # 인스타그램

    @property
    def has_logo(self) -> bool:
        return self.logo_object_key is not None


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


class RescueDog(Base):
    """구조견 관리 대장.

    구글 시트의 3개 블록(구조견 정보 / 임보 / 입양)을 한 행으로 모은다.
    임보자·입양자의 이름·주소·연락처·이메일은 개인정보이므로 담당 단체와
    admin만 본다(permissions.py의 "전화번호는 자기 단체만" 규칙과 동일 계열).
    """

    __tablename__ = "rescue_dogs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('protecting', 'fostering', 'adopted')",
            name="ck_rescue_dogs_status",
        ),
        CheckConstraint(
            "sex IS NULL OR sex IN ('male', 'female')",
            name="ck_rescue_dogs_sex",
        ),
    )

    id = Column(String, primary_key=True, default=generate_uuid)

    # --- 구조견 정보 ---
    # 공고번호(예: 경북-칠곡-2026-00159). 사설 구조는 공고가 없어 nullable.
    notice_number = Column(String, nullable=True, index=True)
    name = Column(String, nullable=False)
    photo_object_key = Column(String, nullable=True)  # 사진(스토리지 키)
    rescued_on = Column(Date, nullable=True, index=True)  # 구조일
    birth_on = Column(Date, nullable=True)  # 생년월일(추정)
    sex = Column(String, nullable=True)  # 'male' | 'female'
    rescue_place = Column(String, nullable=True)  # 구조 장소
    status = Column(
        String, nullable=False, default="protecting", index=True
    )  # 'protecting'(보호중) | 'fostering'(임보중) | 'adopted'(입양완료)
    microchip_number = Column(String, nullable=True)  # 내장칩 번호
    is_neutered = Column(Boolean, nullable=False, default=False)  # 중성화 완료 여부
    note = Column(Text, nullable=True)  # 비고

    # --- 임보 ---
    foster_name = Column(String, nullable=True)
    foster_address = Column(String, nullable=True)
    foster_contact = Column(String, nullable=True)
    foster_note = Column(Text, nullable=True)

    # --- 입양 ---
    adopted_on = Column(Date, nullable=True)
    adopter_name = Column(String, nullable=True)
    adopter_address = Column(String, nullable=True)
    adopter_contact = Column(String, nullable=True)
    adopter_email = Column(String, nullable=True)
    adoption_note = Column(Text, nullable=True)

    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization = relationship("Organization")
    creator = relationship("User")
    records = relationship(
        "RescueDogRecord",
        back_populates="dog",
        cascade="all, delete-orphan",
    )
    expenses = relationship(
        "RescueDogExpense",
        back_populates="dog",
        cascade="all, delete-orphan",
    )

    @property
    def has_photo(self) -> bool:
        return self.photo_object_key is not None


class RescueDogRecord(Base):
    """구조견의 접종·검진·모니터링 이력.

    셋 다 "예정일 → 완료일 + 내용"이라는 같은 모양이라 kind로 구분해 한
    테이블에 담는다. completed_on이 비어 있고 예정일이 지났으면 지연(overdue)
    으로 보고 화면에서 붉게 표시한다.

    공개 범위는 종류에 따라 다르다. 접종·검진은 개체의 의료 이력이라 구조견
    정보와 함께 모든 단체가 공유하고, 모니터링은 입양자 사후관리 기록이라
    담당 단체와 admin만 본다. 등록·수정·삭제는 셋 다 담당 단체만 한다.
    """

    __tablename__ = "rescue_dog_records"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('vaccination', 'checkup', 'monitoring')",
            name="ck_rescue_dog_records_kind",
        ),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    dog_id = Column(
        String, ForeignKey("rescue_dogs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind = Column(String, nullable=False, index=True)
    # 접종은 백신 종류, 검진은 검진 항목. 모니터링은 비워두는 경우가 많다.
    title = Column(String, nullable=True)
    scheduled_on = Column(Date, nullable=True, index=True)  # 예정일(모니터링은 날짜)
    completed_on = Column(Date, nullable=True)  # 완료일. 비어 있으면 미완료
    note = Column(Text, nullable=True)  # 내용·결과·소견

    created_by_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    dog = relationship("RescueDog", back_populates="records")

    @property
    def is_completed(self) -> bool:
        return self.completed_on is not None

    @property
    def is_overdue(self) -> bool:
        """예정일이 지났는데 아직 완료되지 않았는지."""
        if self.completed_on is not None or self.scheduled_on is None:
            return False
        return self.scheduled_on < date.today()


class RescueDogExpense(Base):
    """구조견에게 든 비용과 정산 여부.

    시트의 "비용/정산" 탭(날짜·구조견·임보자·구분·비용·정산 여부·내용)을 옮긴
    것이다. 임보자가 먼저 부담한 병원비를 단체가 돌려주는 흐름이라 "누가 먼저
    냈는지"(payer_name)와 "돌려줬는지"(is_settled)를 함께 둔다.

    금액과 임보자 이름은 단체 내부 정산 정보라 접종·검진처럼 공유하지 않는다.
    담당 단체와 admin만 조회·수정한다.
    """

    __tablename__ = "rescue_dog_expenses"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_rescue_dog_expenses_amount"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    dog_id = Column(
        String, ForeignKey("rescue_dogs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    spent_on = Column(Date, nullable=True, index=True)  # 날짜
    payer_name = Column(String, nullable=True)  # 임보자 등 먼저 부담한 사람
    category = Column(String, nullable=True)  # 구분(병원진료, 접종, 사료·용품 등)
    # 원 단위 정수. 원화는 소수점을 쓰지 않아 부동소수 오차를 들일 이유가 없다.
    amount = Column(Integer, nullable=False, default=0)
    is_settled = Column(Boolean, nullable=False, default=False, index=True)  # 정산 여부
    note = Column(Text, nullable=True)  # 내용

    created_by_id = Column(
        String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    dog = relationship("RescueDog", back_populates="expenses")
