import pytest

import models
from routers.auth import ACCESS_COOKIE_NAME, KAKAO_STATE_COOKIE_NAME
from services import kakao_service


@pytest.fixture(autouse=True)
def kakao_env(monkeypatch):
    monkeypatch.setattr(kakao_service, "KAKAO_REST_API_KEY", "test-rest-key")
    monkeypatch.setattr(
        kakao_service,
        "KAKAO_REDIRECT_URI",
        "https://adogs-ticket.shop/auth/kakao/callback",
    )


def test_login_url_contains_state_and_redirect(client):
    response = client.get("/api/auth/kakao/login-url")

    assert response.status_code == 200
    url = response.json()["authorize_url"]
    assert url.startswith("https://kauth.kakao.com/oauth/authorize")
    assert "client_id=test-rest-key" in url
    assert "state=" in url


def test_kakao_login_creates_general_user(client, db_session, monkeypatch):
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    def fake_exchange(code):
        assert code == "auth-code-123"
        return kakao_service.KakaoProfile(
            id="kakao-98765", nickname="봉사자", email=None
        )

    monkeypatch.setattr(kakao_service, "exchange_code_for_profile", fake_exchange)

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 200
    assert ACCESS_COOKIE_NAME in response.cookies

    user = (
        db_session.query(models.User)
        .filter(models.User.kakao_user_id == "kakao-98765")
        .first()
    )
    assert user is not None
    assert user.role == "general"
    assert user.name == "봉사자"
    assert user.email is None


def test_kakao_login_reuses_existing_user(client, db_session, make_user, monkeypatch):
    existing = make_user(role="general", kakao_user_id="kakao-98765")
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(
            id="kakao-98765", nickname="봉사자", email=None
        ),
    )

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 200
    matches = (
        db_session.query(models.User)
        .filter(models.User.kakao_user_id == "kakao-98765")
        .all()
    )
    assert len(matches) == 1
    assert matches[0].id == existing.id


def test_kakao_login_rejects_invalid_state(client, monkeypatch):
    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(id="x", nickname="y", email=None),
    )

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": "forged-state"}
    )

    assert response.status_code == 400


def test_kakao_login_does_not_merge_with_existing_email_account(
    client, db_session, make_user, make_organization, monkeypatch
):
    """카카오 이메일이 기존 단체 계정과 같아도 합치지 않는다.
    검증되지 않은 이메일로 남의 계정을 가져갈 길을 막는다."""
    org = make_organization()
    org_user = make_user(
        role="org", organization_id=org.id, email="shared@example.com"
    )
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(
            id="kakao-new", nickname="동일이메일", email="shared@example.com"
        ),
    )

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 200
    new_user = (
        db_session.query(models.User)
        .filter(models.User.kakao_user_id == "kakao-new")
        .first()
    )
    assert new_user is not None
    assert new_user.id != org_user.id
    # email unique 제약과 충돌하지 않도록 카카오 계정에는 이메일을 넣지 않는다
    assert new_user.email is None


def test_kakao_api_failure_returns_502(client, monkeypatch):
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    def failing_exchange(code):
        raise kakao_service.KakaoAPIError("token exchange failed")

    monkeypatch.setattr(kakao_service, "exchange_code_for_profile", failing_exchange)

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 502


# ======================================================================================
# state를 브라우저에 묶는다 (로그인 CSRF / 세션 고정 방지)
#
# state가 서명·만료만 검사하면 "이 서버가 최근에 발급한 state"라는 것만 증명한다.
# login-url은 비로그인 공개 엔드포인트라 공격자도 유효한 state를 얼마든지 만들 수 있고,
# 자기 카카오 계정으로 동의를 마쳐 받은 code와 함께 피해자를 콜백 URL로 유인하면
# 피해자가 공격자 계정으로 로그인된다.
# ======================================================================================
def test_login_url_sets_state_cookie(client):
    response = client.get("/api/auth/kakao/login-url")

    assert response.status_code == 200
    assert KAKAO_STATE_COOKIE_NAME in response.cookies


def test_kakao_login_rejects_missing_state_cookie(client, monkeypatch):
    state = client.get("/api/auth/kakao/login-url").json()["state"]
    # 흐름을 시작하지 않은 브라우저를 흉내낸다
    client.cookies.delete(KAKAO_STATE_COOKIE_NAME)

    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(id="x", nickname="y", email=None),
    )

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 400
    # 어느 검사에서 걸렸는지 알려주지 않는다
    assert response.json()["detail"] == "잘못된 인증 요청입니다. 다시 시도해주세요."


def test_kakao_login_rejects_state_cookie_from_another_browser(client, monkeypatch):
    """공격자가 만든 state를 피해자 브라우저에 먹여도 nonce가 맞지 않는다."""
    attacker_state = client.get("/api/auth/kakao/login-url").json()["state"]
    # 피해자 브라우저는 자기 자신의 흐름에서 받은 다른 nonce를 들고 있다
    client.cookies.delete(KAKAO_STATE_COOKIE_NAME)
    client.cookies.set(KAKAO_STATE_COOKIE_NAME, "victims-own-nonce")

    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(id="x", nickname="y", email=None),
    )

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": attacker_state}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "잘못된 인증 요청입니다. 다시 시도해주세요."


def test_kakao_login_clears_state_cookie_after_success(client, monkeypatch):
    """state는 1회용이다. 성공 후 재사용할 수 없어야 한다."""
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    monkeypatch.setattr(
        kakao_service,
        "exchange_code_for_profile",
        lambda code: kakao_service.KakaoProfile(
            id="kakao-once", nickname="봉사자", email=None
        ),
    )

    first = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )
    assert first.status_code == 200
    assert client.cookies.get(KAKAO_STATE_COOKIE_NAME) is None

    replay = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )
    assert replay.status_code == 400


def test_kakao_login_clears_state_cookie_after_failure(client, monkeypatch):
    state = client.get("/api/auth/kakao/login-url").json()["state"]

    def failing_exchange(code):
        raise kakao_service.KakaoAPIError("token exchange failed")

    monkeypatch.setattr(kakao_service, "exchange_code_for_profile", failing_exchange)

    response = client.post(
        "/api/auth/kakao", json={"code": "auth-code-123", "state": state}
    )

    assert response.status_code == 502
    assert client.cookies.get(KAKAO_STATE_COOKIE_NAME) is None
