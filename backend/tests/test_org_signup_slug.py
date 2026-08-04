import models


def _payload(**over):
    base = {
        "name": "홍길동",
        "email": "org@example.com",
        "password": "abcd1234!",
        "organization_name": "행복한 유기견 보호소",
        "slug": "haengbok",
    }
    base.update(over)
    return base


def test_signup_uses_submitted_slug(client, db_session):
    res = client.post("/api/auth/register-org", json=_payload())
    assert res.status_code == 201
    org = (
        db_session.query(models.Organization)
        .filter_by(name="행복한 유기견 보호소")
        .first()
    )
    assert org.slug == "haengbok"


def test_signup_requires_slug(client):
    body = _payload()
    del body["slug"]
    res = client.post("/api/auth/register-org", json=body)
    assert res.status_code == 422


def test_signup_rejects_invalid_slug(client):
    res = client.post("/api/auth/register-org", json=_payload(slug="한글불가"))
    assert res.status_code == 422


def test_signup_rejects_duplicate_slug(client, db_session, make_organization):
    make_organization(name="선점 단체", slug="taken")
    res = client.post(
        "/api/auth/register-org",
        json=_payload(email="new@example.com", organization_name="새 단체", slug="taken"),
    )
    assert res.status_code == 400
    assert "slug" in res.json()["detail"].lower() or "링크" in res.json()["detail"]
