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


def _make_submission(db_session, organization_id, token):
    submission = models.GuestTicketSubmission(
        phone="01011112222",
        verification_method="reservation_number",
        organization_id=organization_id,
        lookup_token=token,
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)
    return submission


def test_general_user_cannot_list_submissions(client, make_user):
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.get("/api/guest-submissions")

    assert response.status_code == 403


def test_org_user_cannot_create_users(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="org@b.com")
    _login(client, user.email)

    response = client.post(
        "/api/users",
        json={
            "email": "new@b.com",
            "name": "신규",
            "password": "Pw1234!@",
            "organization_id": org.id,
        },
    )

    assert response.status_code == 403


def test_admin_can_list_users(client, make_user):
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.get("/api/users")

    assert response.status_code == 200


def test_org_user_sees_only_own_organization_submissions(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    mine = _make_submission(db_session, org_a.id, "token-a")
    _make_submission(db_session, org_b.id, "token-b")

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    response = client.get("/api/guest-submissions")

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()]
    assert ids == [mine.id]


def test_org_user_cannot_read_other_organization_submission_image(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    other = _make_submission(db_session, org_b.id, "token-b")
    other.eticket_object_key = "some-object.png"
    db_session.commit()

    user = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _login(client, user.email)

    response = client.get(f"/api/guest-submissions/{other.id}/image")

    assert response.status_code == 404


def test_admin_sees_all_organizations_submissions(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="단체A", slug="a")
    org_b = make_organization(name="단체B", slug="b")
    _make_submission(db_session, org_a.id, "token-a")
    _make_submission(db_session, org_b.id, "token-b")

    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.get("/api/guest-submissions")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_admin_creates_org_user_with_organization(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.post(
        "/api/users",
        json={
            "email": "neworg@b.com",
            "name": "새단체담당",
            "password": "Pw1234!@",
            "organization_id": org.id,
            "role": "org",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "org"
    assert body["organization_id"] == org.id


def test_admin_creates_admin_user_without_organization(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.post(
        "/api/users",
        json={
            "email": "newadmin@b.com",
            "name": "새관리자",
            "password": "Pw1234!@",
            "organization_id": org.id,
            "role": "admin",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "admin"
    assert body["organization_id"] is None


def test_create_user_rejects_unknown_organization(client, make_user):
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.post(
        "/api/users",
        json={
            "email": "x@b.com",
            "name": "x",
            "password": "Pw1234!@",
            "organization_id": 99999,
            "role": "org",
        },
    )

    assert response.status_code == 404


def test_create_user_rejects_general_role(client, make_user):
    """general 계정은 카카오 로그인으로만 만들어진다."""
    admin = make_user(role="admin", email="admin@b.com")
    _login(client, admin.email)

    response = client.post(
        "/api/users",
        json={
            "email": "x@b.com",
            "name": "x",
            "password": "Pw1234!@",
            "organization_id": 1,
            "role": "general",
        },
    )

    assert response.status_code == 400


# ======================================================================================
# 단체 업무 화면은 general 계정에 열려 있으면 안 된다
#
# 카카오 셀프 가입으로 누구나 general 계정을 만들 수 있게 되었으므로, 티켓/니드포스트/
# 신청 API가 CurrentUser로 열려 있으면 게스트 전화번호(Ticket.contact)와 담당자명·메모·
# 소유자 이메일이 인터넷 전체에 공개된다.
# ======================================================================================
def test_general_user_cannot_list_tickets(client, make_user):
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.get("/api/tickets")

    assert response.status_code == 403


def test_general_user_cannot_list_need_posts(client, make_user):
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.get("/api/need-posts")

    assert response.status_code == 403


def test_general_user_cannot_create_ticket(client, make_user):
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.post(
        "/api/tickets",
        json={
            "title": "티켓",
            "arrival_airport": "JFK",
            "departure_date": "2030-01-01",
            "arrival_date": "2030-01-02",
            "manager_name": "담당자",
            "contact": "01011112222",
        },
    )

    assert response.status_code == 403


def test_general_user_cannot_list_own_applications(client, make_user):
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.get("/api/me/applications")

    assert response.status_code == 403


def test_org_user_can_list_tickets(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="org@b.com")
    _login(client, user.email)

    response = client.get("/api/tickets")

    assert response.status_code == 200


def test_org_user_can_list_need_posts(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="org@b.com")
    _login(client, user.email)

    response = client.get("/api/need-posts")

    assert response.status_code == 200


def test_org_user_can_list_own_applications(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="org@b.com")
    _login(client, user.email)

    response = client.get("/api/me/applications")

    assert response.status_code == 200


def test_submission_list_does_not_leak_lookup_token(
    client, db_session, make_user, make_organization
):
    """lookup_token은 남의 개인정보를 지키는 유일한 비밀이다. 목록에 실리면 안 된다."""
    org = make_organization()
    _make_submission(db_session, org.id, "token-a")
    user = make_user(role="org", organization_id=org.id, email="org@b.com")
    _login(client, user.email)

    response = client.get("/api/guest-submissions")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert "lookup_token" not in body[0]
