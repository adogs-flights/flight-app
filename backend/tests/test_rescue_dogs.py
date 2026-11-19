"""구조견 관리 대장의 권한·마스킹 규칙.

정책: 목록은 모든 단체가 공유해 보되, 임보자·입양자 개인정보는 담당 단체와
admin만 본다. 수정·삭제도 담당 단체(또는 admin)만 한다.
"""

from datetime import timedelta

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
