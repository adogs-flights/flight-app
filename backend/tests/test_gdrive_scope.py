from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import models
from routers import gdrive
from services import gdrive_service


def test_google_drive_uses_only_drive_file_scope():
    assert gdrive_service.SCOPES == [
        "https://www.googleapis.com/auth/drive.file",
    ]


def test_connect_does_not_include_previously_granted_scopes(monkeypatch):
    class FakeFlow:
        code_verifier = "test-code-verifier"

        def __init__(self):
            self.calls = []

        def authorization_url(self, **kwargs):
            self.calls.append(kwargs)
            return "https://accounts.example/authorize", "unused-state"

    flow = FakeFlow()
    monkeypatch.setattr(gdrive_service, "get_flow", lambda: flow)
    monkeypatch.setattr(gdrive, "create_state_token", lambda *_: "signed-state")

    response = gdrive.connect_google_drive(SimpleNamespace(id="user-1"))

    assert response == {"authorization_url": "https://accounts.example/authorize"}
    assert len(flow.calls) == 2
    assert all("include_granted_scopes" not in call for call in flow.calls)
    assert flow.calls[-1]["state"] == "signed-state"


def test_arbitrary_drive_folder_endpoints_are_not_exposed():
    paths = {route.path for route in gdrive.router.routes}

    assert "/api/gdrive/folders" not in paths
    assert "/api/gdrive/set-folder" not in paths
    assert "/api/gdrive/setup-folder" in paths


def test_disconnect_clears_tokens_and_folder_link(db_session, make_user):
    user = make_user(role="admin")
    token = models.UserGoogleToken(
        user_id=user.id,
        access_token="access-token",
        refresh_token="refresh-token",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        root_folder_id="previous-folder",
    )
    db_session.add(token)
    db_session.commit()

    response = gdrive.disconnect_google_drive(user, db_session)

    db_session.refresh(token)
    assert token.access_token is None
    assert token.refresh_token is None
    assert token.root_folder_id is None
    assert "백업된 폴더와 파일은 그대로 유지" in response["detail"]
