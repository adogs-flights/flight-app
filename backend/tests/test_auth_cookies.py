from datetime import datetime, timedelta, timezone

import models
from routers.auth import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    create_access_token,
)


def _login(client, email, password="pw1234"):
    return client.post(
        "/api/token", data={"username": email, "password": password}
    )


def test_login_sets_httponly_cookies(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    response = _login(client, user.email)

    assert response.status_code == 200
    assert ACCESS_COOKIE_NAME in response.cookies
    assert REFRESH_COOKIE_NAME in response.cookies
    set_cookie_header = " ".join(response.headers.get_list("set-cookie")).lower()
    assert "httponly" in set_cookie_header
    assert "samesite=lax" in set_cookie_header


def test_jwt_subject_is_user_id_not_email(client, make_user, make_organization):
    """email이 NULL일 수 있으므로 sub는 user.id여야 한다."""
    import jwt as pyjwt

    from routers.auth import ALGORITHM, SECRET_KEY

    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    response = _login(client, user.email)
    token = response.cookies[ACCESS_COOKIE_NAME]
    payload = pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert payload["sub"] == user.id


def test_expired_access_token_is_silently_refreshed(
    client, db_session, make_user, make_organization
):
    """만료된 access + 유효한 refresh면 401이 아니라 200이 오고 새 쿠키가 내려온다."""
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    refresh_token = "valid-refresh-token"
    db_session.add(
        models.RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    db_session.commit()

    expired_access = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(seconds=-10)
    )
    client.cookies.set(ACCESS_COOKIE_NAME, expired_access)
    client.cookies.set(REFRESH_COOKIE_NAME, refresh_token)

    response = client.get("/api/users/me")

    assert response.status_code == 200
    assert response.json()["id"] == user.id
    assert ACCESS_COOKIE_NAME in response.cookies


def test_expired_refresh_token_returns_401(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    expired_access = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(seconds=-10)
    )
    client.cookies.set(ACCESS_COOKIE_NAME, expired_access)
    client.cookies.set(REFRESH_COOKIE_NAME, "no-such-refresh-token")

    response = client.get("/api/users/me")

    assert response.status_code == 401


def test_tampered_access_token_does_not_fall_through_to_refresh(
    client, db_session, make_user, make_organization
):
    """서명이 깨진 access는 유효한 refresh가 있어도 갱신되지 않고 401이어야 한다."""
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    refresh_token = "tamper-refresh-token"
    db_session.add(
        models.RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    db_session.commit()

    good = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(minutes=5)
    )
    header, payload, signature = good.split(".")
    tampered = f"{header}.{payload}.{signature[:-4]}AAAA"

    client.cookies.set(ACCESS_COOKIE_NAME, tampered)
    client.cookies.set(REFRESH_COOKIE_NAME, refresh_token)

    response = client.get("/api/users/me")

    assert response.status_code == 401


def test_no_credentials_returns_401(client):
    response = client.get("/api/users/me")

    assert response.status_code == 401


def test_concurrent_expired_requests_all_succeed(
    client, db_session, make_user, make_organization
):
    """refresh 회전을 껐으므로 같은 refresh로 여러 번 갱신해도 로그아웃되지 않는다."""
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")

    refresh_token = "shared-refresh-token"
    db_session.add(
        models.RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    db_session.commit()

    expired_access = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(seconds=-10)
    )

    for _ in range(3):
        client.cookies.set(ACCESS_COOKIE_NAME, expired_access)
        client.cookies.set(REFRESH_COOKIE_NAME, refresh_token)
        response = client.get("/api/users/me")
        assert response.status_code == 200


def _seed_refresh_token(db_session, user, token):
    db_session.add(
        models.RefreshToken(
            token=token,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    db_session.commit()


def test_refresh_endpoint_uses_cookie_and_does_not_rotate(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _seed_refresh_token(db_session, user, "rt-cookie")

    client.cookies.set(REFRESH_COOKIE_NAME, "rt-cookie")
    response = client.post("/api/refresh")

    assert response.status_code == 200
    # 회전하지 않으므로 같은 refresh가 그대로 돌아온다
    assert response.json()["refresh_token"] == "rt-cookie"
    assert ACCESS_COOKIE_NAME in response.cookies


def test_refresh_endpoint_still_accepts_body(
    client, db_session, make_user, make_organization
):
    """쿠키가 없는 API 클라이언트를 위해 본문 방식도 유지한다."""
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _seed_refresh_token(db_session, user, "rt-body")

    response = client.post("/api/refresh", json={"refresh_token": "rt-body"})

    assert response.status_code == 200


def test_refresh_endpoint_without_cookie_or_body_returns_401(client):
    response = client.post("/api/refresh")

    assert response.status_code == 401


def test_openapi_registers_bearer_security_scheme(client):
    """Bearer 지원의 유일한 존재 이유가 API 문서 화면 테스트이므로,
    스킴이 OpenAPI 문서에 실제로 등록되어 Authorize 버튼이 떠야 한다."""
    schema = client.get("/openapi.json").json()
    security_schemes = schema.get("components", {}).get("securitySchemes", {})

    assert "OAuth2PasswordBearer" in security_schemes
    assert security_schemes["OAuth2PasswordBearer"]["type"] == "oauth2"


def test_authorization_header_still_works(client, make_user, make_organization):
    """API 문서 화면 테스트용으로 Bearer 헤더도 계속 받는다."""
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    token = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(minutes=5)
    )

    response = client.get(
        "/api/users/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200


def test_logout_clears_cookies(client, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    _login(client, user.email)

    response = client.post("/api/logout")

    assert response.status_code == 204
    set_cookie_header = " ".join(response.headers.get_list("set-cookie"))
    assert ACCESS_COOKIE_NAME in set_cookie_header


def test_password_update_without_hash_returns_400(
    client, make_user, make_organization
):
    """hashed_password가 NULL인 카카오(general) 계정은 500이 아니라 400을 받아야 한다."""
    make_organization()
    user = make_user(role="general")
    assert user.hashed_password is None

    token = create_access_token(
        data={"sub": user.id}, expires_delta=timedelta(minutes=5)
    )
    response = client.put(
        "/api/users/me/password",
        headers={"Authorization": f"Bearer {token}"},
        json={"old_password": "whatever", "new_password": "NewPw1234!"},
    )

    assert response.status_code == 400
