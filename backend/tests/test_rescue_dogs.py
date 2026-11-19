"""구조견 관리 대장의 권한·마스킹 규칙.

정책: 목록은 모든 단체가 공유해 보되, 임보자·입양자 개인정보는 담당 단체와
admin만 본다. 수정·삭제도 담당 단체(또는 admin)만 한다.
"""

from datetime import date, timedelta

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _login(client, email, password="pw1234"):
    return client.post("/api/token", data={"username": email, "password": password})


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def _make_dog(db_session, organization_id, name="구리", **kwargs):
    fields = {
        "name": name,
        "notice_number": kwargs.pop("notice_number", "경북-칠곡-2026-00159"),
        "status": kwargs.pop("status", "adopted"),
        "organization_id": organization_id,
        "adopter_name": kwargs.pop("adopter_name", "황나진"),
        "adopter_address": kwargs.pop("adopter_address", "산본주공 11단지"),
        "adopter_contact": kwargs.pop("adopter_contact", "010-2210-5544"),
        "adopter_email": kwargs.pop("adopter_email", "adopter@example.com"),
        "foster_name": kwargs.pop("foster_name", "신수정"),
        "foster_contact": kwargs.pop("foster_contact", "010-3210-3957"),
    }
    fields.update(kwargs)
    dog = models.RescueDog(**fields)
    db_session.add(dog)
    db_session.commit()
    db_session.refresh(dog)
    return dog


# --- 인증/인가 ---


def test_general_user_cannot_list_rescue_dogs(client, make_user):
    """카카오 셀프 가입 일반 계정은 단체 업무 화면에 못 들어온다."""
    user = make_user(role="general")
    _authenticate(client, user)

    assert client.get("/api/rescue-dogs").status_code == 403


def test_anonymous_cannot_list_rescue_dogs(client):
    assert client.get("/api/rescue-dogs").status_code == 401


# --- 조회 범위와 개인정보 마스킹 ---


def test_org_user_sees_other_org_dog_without_personal_data(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    _make_dog(db_session, org_b.id, name="메리")

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    response = client.get("/api/rescue-dogs")
    assert response.status_code == 200
    (dog,) = response.json()

    # 개체 정보는 공유된다.
    assert dog["name"] == "메리"
    assert dog["notice_number"] == "경북-칠곡-2026-00159"
    assert dog["organization"]["name"] == "단체B"
    # 개인정보는 전부 가려지고, 가린 사실만 알려준다.
    assert dog["adopter_name"] is None
    assert dog["adopter_address"] is None
    assert dog["adopter_contact"] is None
    assert dog["adopter_email"] is None
    assert dog["foster_name"] is None
    assert dog["foster_contact"] is None
    assert dog["private_hidden"] is True
    assert dog["can_edit"] is False


def test_owning_org_sees_personal_data(
    client, db_session, make_user, make_organization
):
    org = make_organization(name="단체A", slug="a")
    _make_dog(db_session, org.id)

    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    (dog,) = client.get("/api/rescue-dogs").json()

    assert dog["adopter_name"] == "황나진"
    assert dog["adopter_contact"] == "010-2210-5544"
    assert dog["foster_name"] == "신수정"
    assert dog["private_hidden"] is False
    assert dog["can_edit"] is True


def test_admin_sees_personal_data_of_every_org(
    client, db_session, make_user, make_organization
):
    org = make_organization(name="단체A", slug="a")
    _make_dog(db_session, org.id)

    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    (dog,) = client.get("/api/rescue-dogs").json()

    assert dog["adopter_name"] == "황나진"
    assert dog["can_edit"] is True


def test_private_hidden_is_false_when_there_is_nothing_to_hide(
    client, db_session, make_user, make_organization
):
    """가릴 개인정보가 아예 없으면 private_hidden은 서지 않는다."""
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    _make_dog(
        db_session,
        org_b.id,
        status="protecting",
        adopter_name=None,
        adopter_address=None,
        adopter_contact=None,
        adopter_email=None,
        foster_name=None,
        foster_contact=None,
    )

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    (dog,) = client.get("/api/rescue-dogs").json()
    assert dog["private_hidden"] is False


def test_detail_of_other_org_dog_is_masked(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    dog = _make_dog(db_session, org_b.id)

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    body = client.get(f"/api/rescue-dogs/{dog.id}").json()
    assert body["adopter_contact"] is None
    assert body["can_edit"] is False


# --- 생성 ---


def test_create_binds_dog_to_creator_organization(
    client, make_user, make_organization
):
    org = make_organization(name="단체A", slug="a")
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    response = client.post(
        "/api/rescue-dogs",
        data={
            "name": "구리",
            "notice_number": "경북-칠곡-2026-00159",
            "rescued_on": "2026-11-07",
            "birth_on": "2026-09-15",
            "sex": "male",
            "rescue_place": "칠곡시보호소",
            "status": "adopted",
            "is_neutered": "false",
            "adopted_on": "2026-11-14",
            "adopter_name": "황나진",
            "adopter_contact": "010-2210-5544",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "구리"
    assert body["sex"] == "male"
    assert body["rescued_on"] == "2026-11-07"
    assert body["adopted_on"] == "2026-11-14"
    assert body["is_neutered"] is False
    assert body["organization"]["name"] == "단체A"
    assert body["can_edit"] is True


def test_create_accepts_empty_optional_dates(client, make_user, make_organization):
    """선택 입력이 많은 폼이라 빈 문자열 날짜는 None으로 받아들인다."""
    org = make_organization(name="단체A", slug="a")
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    response = client.post(
        "/api/rescue-dogs",
        data={"name": "이름만", "rescued_on": "", "birth_on": "", "adopted_on": ""},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["rescued_on"] is None
    assert body["status"] == "protecting"


def test_create_rejects_unknown_status(client, make_user, make_organization):
    org = make_organization(name="단체A", slug="a")
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    response = client.post(
        "/api/rescue-dogs", data={"name": "구리", "status": "released"}
    )
    assert response.status_code == 400


def test_create_rejects_malformed_date(client, make_user, make_organization):
    org = make_organization(name="단체A", slug="a")
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    response = client.post(
        "/api/rescue-dogs", data={"name": "구리", "rescued_on": "2026/11/07"}
    )
    assert response.status_code == 400


# --- 수정·삭제 ---


def test_other_org_cannot_update_dog(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    dog = _make_dog(db_session, org_b.id)

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    response = client.put(
        f"/api/rescue-dogs/{dog.id}", data={"name": "탈취", "status": "protecting"}
    )
    assert response.status_code == 403


def test_other_org_cannot_delete_dog(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    dog = _make_dog(db_session, org_b.id)

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    assert client.delete(f"/api/rescue-dogs/{dog.id}").status_code == 403


def test_owning_org_can_update_and_delete(
    client, db_session, make_user, make_organization
):
    org = make_organization(name="단체A", slug="a")
    dog = _make_dog(db_session, org.id, status="fostering")

    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    response = client.put(
        f"/api/rescue-dogs/{dog.id}",
        data={
            "name": "구리",
            "status": "adopted",
            "adopted_on": "2026-11-14",
            "adopter_name": "황나진",
            "is_neutered": "true",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "adopted"
    assert body["is_neutered"] is True
    # 폼 전체 치환이라 이번에 보내지 않은 임보 정보는 비워진다.
    assert body["foster_name"] is None

    assert client.delete(f"/api/rescue-dogs/{dog.id}").status_code == 204
    assert client.get(f"/api/rescue-dogs/{dog.id}").status_code == 404


def test_admin_can_update_other_org_dog(
    client, db_session, make_user, make_organization
):
    org = make_organization(name="단체A", slug="a")
    dog = _make_dog(db_session, org.id)

    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.put(
        f"/api/rescue-dogs/{dog.id}", data={"name": "구리", "status": "adopted"}
    )
    assert response.status_code == 200


# --- 사진 업로드·조회 ---


def test_photo_upload_and_fetch(client, make_user, make_organization, monkeypatch):
    """사진은 스토리지 키만 DB에 남고, 조회는 저장된 바이트를 그대로 돌려준다."""
    from routers import rescue_dogs

    store = {}
    monkeypatch.setattr(
        rescue_dogs.storage_service,
        "upload_bytes",
        lambda key, content, content_type: store.__setitem__(
            key, (content, content_type)
        ),
    )
    monkeypatch.setattr(
        rescue_dogs.storage_service, "get_object", lambda key: store[key]
    )

    org = make_organization(name="단체A", slug="a")
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    created = client.post(
        "/api/rescue-dogs",
        data={"name": "구리"},
        files={"photo": ("guri.png", b"fake-png-bytes", "image/png")},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["has_photo"] is True
    # 응답에 스토리지 키를 흘리지 않는다.
    assert "photo_object_key" not in body

    photo = client.get(f"/api/rescue-dogs/{body['id']}/photo")
    assert photo.status_code == 200
    assert photo.content == b"fake-png-bytes"
    # 비공개 자료라 공용 캐시에 남기지 않는다.
    assert "private" in photo.headers["cache-control"]


def test_photo_rejects_non_image(client, make_user, make_organization):
    org = make_organization(name="단체A", slug="a")
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    response = client.post(
        "/api/rescue-dogs",
        data={"name": "구리"},
        files={"photo": ("evil.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert response.status_code == 400


def test_photo_requires_org_login(client, db_session, make_user, make_organization):
    """구조견 사진은 공개 자료가 아니다. need-post 이미지와 달리 로그인을 요구한다."""
    org = make_organization(name="단체A", slug="a")
    dog = _make_dog(db_session, org.id, photo_object_key="rescuedog-x.png")

    assert client.get(f"/api/rescue-dogs/{dog.id}/photo").status_code == 401

    general = make_user(role="general")
    _authenticate(client, general)
    assert client.get(f"/api/rescue-dogs/{dog.id}/photo").status_code == 403


# ======================================================================================
# 접종·검진·모니터링 기록
# ======================================================================================
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()
TOMORROW = (date.today() + timedelta(days=1)).isoformat()


def _make_record(db_session, dog_id, kind="vaccination", **kwargs):
    record = models.RescueDogRecord(dog_id=dog_id, kind=kind, **kwargs)
    db_session.add(record)
    db_session.commit()
    db_session.refresh(record)
    return record


def _org_login(client, make_user, make_organization, name="단체A", slug="a"):
    org = make_organization(name=name, slug=slug)
    user = make_user(role="org", organization_id=org.id, email=f"{slug}@b.com")
    _login(client, user.email)
    return org


# --- 지연(overdue) 판정 ---


def test_past_due_record_is_overdue(client, db_session, make_user, make_organization):
    """예정일이 지났는데 완료일이 없으면 지연이다."""
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    _make_record(db_session, dog.id, title="종합백신 2차", scheduled_on=date.today() - timedelta(days=1))

    (record,) = client.get(f"/api/rescue-dogs/{dog.id}/records").json()
    assert record["is_overdue"] is True
    assert record["is_completed"] is False


def test_completed_record_is_not_overdue(
    client, db_session, make_user, make_organization
):
    """예정일이 지났어도 완료했으면 지연이 아니다."""
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    _make_record(
        db_session,
        dog.id,
        scheduled_on=date.today() - timedelta(days=10),
        completed_on=date.today() - timedelta(days=9),
    )

    (record,) = client.get(f"/api/rescue-dogs/{dog.id}/records").json()
    assert record["is_overdue"] is False
    assert record["is_completed"] is True


def test_future_and_undated_records_are_not_overdue(
    client, db_session, make_user, make_organization
):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    _make_record(db_session, dog.id, title="미래", scheduled_on=date.today() + timedelta(days=3))
    _make_record(db_session, dog.id, title="날짜없음", scheduled_on=None)

    records = client.get(f"/api/rescue-dogs/{dog.id}/records").json()
    assert [r["is_overdue"] for r in records] == [False, False]


def test_dog_carries_overdue_count(client, db_session, make_user, make_organization):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    _make_record(db_session, dog.id, kind="vaccination", scheduled_on=date.today() - timedelta(days=1))
    _make_record(db_session, dog.id, kind="checkup", scheduled_on=date.today() - timedelta(days=2))
    _make_record(db_session, dog.id, kind="checkup", scheduled_on=date.today() + timedelta(days=2))

    (body,) = client.get("/api/rescue-dogs").json()
    assert body["overdue_count"] == 2


# --- 공개 범위: 모니터링은 담당 단체 전용 ---


def test_other_org_sees_medical_records_but_not_monitoring(
    client, db_session, make_user, make_organization
):
    """접종·검진은 개체 의료 이력이라 공유하고, 모니터링은 감춘다."""
    org_b = make_organization(name="단체B", slug="b")
    dog = _make_dog(db_session, org_b.id)
    _make_record(db_session, dog.id, kind="vaccination", title="종합백신 1차")
    _make_record(db_session, dog.id, kind="checkup", title="건강검진")
    _make_record(db_session, dog.id, kind="monitoring", note="입양자 통화, 잘 지냄")

    _org_login(client, make_user, make_organization)

    records = client.get(f"/api/rescue-dogs/{dog.id}/records").json()
    assert sorted(r["kind"] for r in records) == ["checkup", "vaccination"]


def test_owning_org_sees_monitoring(client, db_session, make_user, make_organization):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    _make_record(db_session, dog.id, kind="monitoring", note="입양자 통화, 잘 지냄")

    (record,) = client.get(f"/api/rescue-dogs/{dog.id}/records").json()
    assert record["kind"] == "monitoring"
    assert record["note"] == "입양자 통화, 잘 지냄"


def test_overdue_count_excludes_monitoring_for_other_org(
    client, db_session, make_user, make_organization
):
    """감춘 모니터링이 지연 건수로 새어나가면 안 된다."""
    org_b = make_organization(name="단체B", slug="b")
    dog = _make_dog(db_session, org_b.id)
    _make_record(db_session, dog.id, kind="monitoring", scheduled_on=date.today() - timedelta(days=1))

    _org_login(client, make_user, make_organization)

    (body,) = client.get("/api/rescue-dogs").json()
    assert body["overdue_count"] == 0


# --- 쓰기 권한 ---


def test_create_record(client, db_session, make_user, make_organization):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)

    response = client.post(
        f"/api/rescue-dogs/{dog.id}/records",
        json={
            "kind": "vaccination",
            "title": "종합백신 2차",
            "scheduled_on": TOMORROW,
            "note": "27일 예정",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["kind"] == "vaccination"
    assert body["title"] == "종합백신 2차"
    assert body["is_completed"] is False
    assert body["is_overdue"] is False


def test_create_record_rejects_unknown_kind(
    client, db_session, make_user, make_organization
):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)

    response = client.post(
        f"/api/rescue-dogs/{dog.id}/records", json={"kind": "grooming"}
    )
    assert response.status_code == 422


def test_other_org_cannot_write_records(
    client, db_session, make_user, make_organization
):
    org_b = make_organization(name="단체B", slug="b")
    dog = _make_dog(db_session, org_b.id)
    record = _make_record(db_session, dog.id, kind="vaccination")

    _org_login(client, make_user, make_organization)

    assert client.post(
        f"/api/rescue-dogs/{dog.id}/records", json={"kind": "vaccination"}
    ).status_code == 403
    assert client.put(
        f"/api/rescue-dogs/{dog.id}/records/{record.id}",
        json={"title": "덮어쓰기"},
    ).status_code == 403
    assert client.delete(
        f"/api/rescue-dogs/{dog.id}/records/{record.id}"
    ).status_code == 403


def test_update_and_delete_record(client, db_session, make_user, make_organization):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    record = _make_record(
        db_session, dog.id, kind="vaccination", scheduled_on=date.today() - timedelta(days=1)
    )

    response = client.put(
        f"/api/rescue-dogs/{dog.id}/records/{record.id}",
        json={"title": "종합백신 2차", "scheduled_on": YESTERDAY, "completed_on": YESTERDAY},
    )
    assert response.status_code == 200
    body = response.json()
    # 완료일이 채워지면 더 이상 지연이 아니다.
    assert body["is_completed"] is True
    assert body["is_overdue"] is False
    # kind는 수정 대상이 아니다.
    assert body["kind"] == "vaccination"

    assert client.delete(
        f"/api/rescue-dogs/{dog.id}/records/{record.id}"
    ).status_code == 204
    assert client.get(f"/api/rescue-dogs/{dog.id}/records").json() == []


def test_record_of_another_dog_is_not_reachable(
    client, db_session, make_user, make_organization
):
    """기록 id만 알아도 다른 구조견 경로로는 건드릴 수 없다."""
    org = _org_login(client, make_user, make_organization)
    dog_a = _make_dog(db_session, org.id, name="구리")
    dog_b = _make_dog(db_session, org.id, name="메리", notice_number="전북-김제-2026-00320")
    record = _make_record(db_session, dog_b.id, kind="vaccination")

    response = client.put(
        f"/api/rescue-dogs/{dog_a.id}/records/{record.id}", json={"title": "x"}
    )
    assert response.status_code == 404


def test_deleting_dog_removes_its_records(
    client, db_session, make_user, make_organization
):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    _make_record(db_session, dog.id, kind="vaccination")

    assert client.delete(f"/api/rescue-dogs/{dog.id}").status_code == 204
    assert db_session.query(models.RescueDogRecord).count() == 0


# ======================================================================================
# 비용 · 정산
# ======================================================================================
def _make_expense(db_session, dog_id, amount=76170, is_settled=False, **kwargs):
    expense = models.RescueDogExpense(
        dog_id=dog_id, amount=amount, is_settled=is_settled, **kwargs
    )
    db_session.add(expense)
    db_session.commit()
    db_session.refresh(expense)
    return expense


def test_expense_list_carries_sheet_totals(
    client, db_session, make_user, make_organization
):
    """시트 하단의 총 금액 / 정산 금액 / 미정산 금액을 그대로 돌려준다."""
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    _make_expense(db_session, dog.id, amount=76170, is_settled=True, category="병원진료")
    _make_expense(db_session, dog.id, amount=30000, is_settled=False, category="접종")

    body = client.get(f"/api/rescue-dogs/{dog.id}/expenses").json()

    assert body["summary"] == {"total": 106170, "settled": 76170, "unsettled": 30000}
    assert len(body["items"]) == 2


def test_create_expense(client, db_session, make_user, make_organization):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)

    response = client.post(
        f"/api/rescue-dogs/{dog.id}/expenses",
        json={
            "spent_on": "2026-11-17",
            "payer_name": "신수정",
            "category": "병원진료",
            "amount": 76170,
            "is_settled": True,
            "note": "곰팡이성 피부병 진료. 약욕",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["amount"] == 76170
    assert body["payer_name"] == "신수정"
    assert body["is_settled"] is True


def test_expense_rejects_negative_amount(
    client, db_session, make_user, make_organization
):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)

    response = client.post(
        f"/api/rescue-dogs/{dog.id}/expenses", json={"amount": -1000}
    )
    assert response.status_code == 422


def test_other_org_cannot_even_read_expenses(
    client, db_session, make_user, make_organization
):
    """금액·부담자는 단체 내부 정산 정보라 조회부터 막는다."""
    org_b = make_organization(name="단체B", slug="b")
    dog = _make_dog(db_session, org_b.id)
    expense = _make_expense(db_session, dog.id, payer_name="신수정")

    _org_login(client, make_user, make_organization)

    assert client.get(f"/api/rescue-dogs/{dog.id}/expenses").status_code == 403
    assert client.post(
        f"/api/rescue-dogs/{dog.id}/expenses", json={"amount": 1000}
    ).status_code == 403
    assert client.put(
        f"/api/rescue-dogs/{dog.id}/expenses/{expense.id}", json={"amount": 1}
    ).status_code == 403
    assert client.delete(
        f"/api/rescue-dogs/{dog.id}/expenses/{expense.id}"
    ).status_code == 403


def test_settle_and_delete_expense(client, db_session, make_user, make_organization):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    expense = _make_expense(db_session, dog.id, amount=76170, is_settled=False)

    response = client.put(
        f"/api/rescue-dogs/{dog.id}/expenses/{expense.id}",
        json={"amount": 76170, "is_settled": True, "payer_name": "신수정"},
    )
    assert response.status_code == 200
    assert response.json()["is_settled"] is True

    body = client.get(f"/api/rescue-dogs/{dog.id}/expenses").json()
    assert body["summary"]["unsettled"] == 0

    assert client.delete(
        f"/api/rescue-dogs/{dog.id}/expenses/{expense.id}"
    ).status_code == 204
    assert client.get(f"/api/rescue-dogs/{dog.id}/expenses").json()["items"] == []


def test_expense_of_another_dog_is_not_reachable(
    client, db_session, make_user, make_organization
):
    org = _org_login(client, make_user, make_organization)
    dog_a = _make_dog(db_session, org.id, name="구리")
    dog_b = _make_dog(db_session, org.id, name="메리", notice_number="전북-김제-2026-00320")
    expense = _make_expense(db_session, dog_b.id)

    response = client.put(
        f"/api/rescue-dogs/{dog_a.id}/expenses/{expense.id}", json={"amount": 1}
    )
    assert response.status_code == 404


def test_deleting_dog_removes_its_expenses(
    client, db_session, make_user, make_organization
):
    org = _org_login(client, make_user, make_organization)
    dog = _make_dog(db_session, org.id)
    _make_expense(db_session, dog.id)

    assert client.delete(f"/api/rescue-dogs/{dog.id}").status_code == 204
    assert db_session.query(models.RescueDogExpense).count() == 0


# --- 단체 전체 합계 ---


def test_org_summary_counts_only_own_organization(
    client, db_session, make_user, make_organization
):
    """다른 단체의 지출이 우리 합계에 섞이면 안 된다."""
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    dog_a = _make_dog(db_session, org_a.id, name="구리")
    dog_b = _make_dog(db_session, org_b.id, name="메리")
    _make_expense(db_session, dog_a.id, amount=76170, is_settled=True)
    _make_expense(db_session, dog_a.id, amount=30000, is_settled=False)
    _make_expense(db_session, dog_b.id, amount=999999, is_settled=False)

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    summary = client.get("/api/rescue-dogs/expenses/summary").json()
    assert summary == {"total": 106170, "settled": 76170, "unsettled": 30000}


def test_org_summary_is_zero_without_expenses(
    client, make_user, make_organization
):
    _org_login(client, make_user, make_organization)

    summary = client.get("/api/rescue-dogs/expenses/summary").json()
    assert summary == {"total": 0, "settled": 0, "unsettled": 0}


def test_admin_summary_spans_every_organization(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    _make_expense(db_session, _make_dog(db_session, org_a.id, name="구리").id, amount=1000)
    _make_expense(db_session, _make_dog(db_session, org_b.id, name="메리").id, amount=2000)

    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    assert client.get("/api/rescue-dogs/expenses/summary").json()["total"] == 3000


def test_summary_path_is_not_captured_by_dog_id_route(
    client, make_user, make_organization
):
    """'/expenses/summary'가 '/{dog_id}' 경로에 먹히지 않는지 못박는다."""
    _org_login(client, make_user, make_organization)

    response = client.get("/api/rescue-dogs/expenses/summary")

    assert response.status_code == 200
    assert set(response.json()) == {"total", "settled", "unsettled"}
