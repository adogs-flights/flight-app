from datetime import timedelta

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def test_org_manager_updates_own_profile(
    client, db_session, make_user, make_organization
):
    org = make_organization(name="어독스", slug="adogs")
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    _authenticate(client, user)
    res = client.put(
        f"/api/organizations/{org.id}/profile",
        json={"description": "우리는 유기견을 구조합니다.", "homepage_url": "example.org"},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["description"] == "우리는 유기견을 구조합니다."
    assert body["homepage_url"] == "example.org"


def test_org_manager_cannot_edit_other_org(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="A", slug="a")
    org_b = make_organization(name="B", slug="b")
    user_a = make_user(role="org", organization_id=org_a.id, email="a@b.com")

    _authenticate(client, user_a)
    res = client.put(
        f"/api/organizations/{org_b.id}/profile",
        json={"description": "침범"},
    )

    assert res.status_code == 403


def test_public_by_slug_exposes_intro_fields(
    client, db_session, make_organization
):
    org = make_organization(name="어독스", slug="adogs")
    org.description = "소개글"
    org.instagram_url = "https://instagram.com/adogs"
    db_session.commit()

    # 비로그인으로 접근 가능해야 한다.
    res = client.get("/api/organizations/by-slug/adogs")

    assert res.status_code == 200
    body = res.json()
    assert body["description"] == "소개글"
    assert body["instagram_url"] == "https://instagram.com/adogs"
    assert body["has_logo"] is False


def test_delete_logo_permission(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="A", slug="a")
    org_b = make_organization(name="B", slug="b")
    user_a = make_user(role="org", organization_id=org_a.id, email="a@b.com")

    _authenticate(client, user_a)
    # 남의 단체 로고 삭제는 막힌다.
    assert client.delete(f"/api/organizations/{org_b.id}/logo").status_code == 403
    # 자기 단체(로고 없음) 삭제는 성공하고 has_logo False를 돌려준다.
    res = client.delete(f"/api/organizations/{org_a.id}/logo")
    assert res.status_code == 200
    assert res.json()["has_logo"] is False


def test_admin_can_edit_any_org(client, db_session, make_user, make_organization):
    org = make_organization(name="어독스", slug="adogs")
    admin = make_user(role="admin", email="admin@b.com")

    _authenticate(client, admin)
    res = client.put(
        f"/api/organizations/{org.id}/profile", json={"description": "관리자 편집"}
    )

    assert res.status_code == 200
    assert res.json()["description"] == "관리자 편집"
