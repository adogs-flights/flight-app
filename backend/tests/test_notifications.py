"""인앱 알림 API와 이벤트 팬아웃 스모크 테스트."""

import models


def _login(client, email, password="pw1234"):
    return client.post("/api/token", data={"username": email, "password": password})


def _seed(db_session, user_id, **kwargs):
    from services import notification_service

    notification_service.create_notifications(
        db_session,
        [user_id],
        type=kwargs.get("type", "test"),
        title=kwargs.get("title", "알림 제목"),
        body=kwargs.get("body", "알림 본문"),
        link=kwargs.get("link", "/schedules"),
    )


def test_notification_list_and_read_flow(client, db_session, make_user, make_organization):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="m@org.kr")
    _seed(db_session, user.id, title="안녕하세요")
    _login(client, "m@org.kr")

    # 미읽음 개수
    r = client.get("/api/notifications/unread-count")
    assert r.status_code == 200
    assert r.json()["count"] == 1

    # 목록
    r = client.get("/api/notifications")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["title"] == "안녕하세요"
    assert data[0]["is_read"] is False
    nid = data[0]["id"]

    # 1건 읽음
    r = client.post(f"/api/notifications/{nid}/read")
    assert r.status_code == 204
    assert client.get("/api/notifications/unread-count").json()["count"] == 0


def test_read_all(client, db_session, make_user):
    user = make_user(role="admin", email="admin@b.com")
    _seed(db_session, user.id, title="A")
    _seed(db_session, user.id, title="B")
    _login(client, "admin@b.com")

    assert client.get("/api/notifications/unread-count").json()["count"] == 2
    r = client.post("/api/notifications/read-all")
    assert r.status_code == 204
    assert client.get("/api/notifications/unread-count").json()["count"] == 0


def test_notifications_scoped_to_user(client, db_session, make_user, make_organization):
    org = make_organization()
    owner = make_user(role="org", organization_id=org.id, email="owner@org.kr")
    other = make_user(role="org", organization_id=org.id, email="other@org.kr")
    _seed(db_session, owner.id, title="owner 것")

    _login(client, "other@org.kr")
    # 남의 알림은 보이지 않는다.
    assert client.get("/api/notifications/unread-count").json()["count"] == 0
    assert client.get("/api/notifications").json() == []


def test_submission_event_fans_out_to_org(
    client, db_session, make_user, make_organization, monkeypatch
):
    """게스트 제출이 지정 단체로 접수되면 그 단체 회원에게 인앱 알림이 생긴다."""
    import routers.guest_submissions as gs

    monkeypatch.setattr(gs.storage_service, "upload_bytes", lambda *a, **k: None)
    monkeypatch.setattr(
        gs.gdrive_service, "backup_guest_submission_to_drive", lambda *a, **k: None
    )

    org = make_organization()
    member = make_user(role="org", organization_id=org.id, email="member@org.kr")

    r = client.post(
        "/api/guest-submissions",
        data={
            "phone": "01011112222",
            "airline": "KE",
            "kakao_id": "gildong",
            "organization_id": str(org.id),
        },
        files={"eticket_image": ("e.jpg", b"bytes", "image/jpeg")},
    )
    assert r.status_code == 201

    notes = (
        db_session.query(models.Notification)
        .filter(models.Notification.user_id == member.id)
        .all()
    )
    assert len(notes) == 1
    assert notes[0].type == "submission_created"
    assert notes[0].link == "/submissions"


def test_account_approval_notifies_user(
    client, db_session, make_user, make_organization
):
    """관리자가 단체 계정을 승인하면 그 담당자에게 인앱 알림이 생긴다."""
    org = make_organization()
    admin = make_user(role="admin", email="admin@b.com")
    pending = make_user(
        role="org", organization_id=org.id, email="pending@org.kr", is_approved=False
    )
    _login(client, "admin@b.com")

    r = client.post(f"/api/users/{pending.id}/approve")
    assert r.status_code == 200

    notes = (
        db_session.query(models.Notification)
        .filter(models.Notification.user_id == pending.id)
        .all()
    )
    assert len(notes) == 1
    assert notes[0].type == "account_approved"
