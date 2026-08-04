from datetime import timedelta

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def test_admin_create_org_with_intro_fields(client, db_session, make_user):
    admin = make_user(role="admin", email="admin@b.com")
    _authenticate(client, admin)

    res = client.post(
        "/api/organizations",
        json={
            "name": "어독스",
            "slug": "adogs",
            "description": "유기견 구조 단체",
            "homepage_url": "https://adogs.org",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["description"] == "유기견 구조 단체"
    assert body["homepage_url"] == "https://adogs.org"


def test_admin_update_org_intro_via_standard_put(
    client, db_session, make_user, make_organization
):
    org = make_organization(name="어독스", slug="adogs")
    admin = make_user(role="admin", email="admin@b.com")
    _authenticate(client, admin)

    res = client.put(
        f"/api/organizations/{org.id}",
        json={
            "name": "어독스",
            "slug": "adogs",
            "is_active": True,
            "description": "새 소개",
            "instagram_url": "https://instagram.com/adogs",
        },
    )
    assert res.status_code == 200
    assert res.json()["description"] == "새 소개"

    db_session.refresh(org)
    assert org.instagram_url == "https://instagram.com/adogs"


def test_non_admin_cannot_use_standard_org_update(
    client, db_session, make_user, make_organization
):
    org = make_organization(name="어독스", slug="adogs")
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _authenticate(client, user)

    # 표준 PUT은 관리자 전용(단체 담당자는 /profile 사용).
    res = client.put(f"/api/organizations/{org.id}", json={"description": "침범"})
    assert res.status_code == 403
