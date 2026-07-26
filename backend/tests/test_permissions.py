import models


def _login(client, email, password="pw1234"):
    return client.post("/api/token", data={"username": email, "password": password})


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
    from datetime import timedelta

    from routers.auth import ACCESS_COOKIE_NAME, create_access_token

    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )

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
