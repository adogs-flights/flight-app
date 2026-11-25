"""티켓별 출국 준비 체크리스트의 시드·권한·수정 규칙.

정책: 체크리스트에는 현지 인수자 연락처 등 개인정보가 섞일 수 있어
출국 준비 추가정보와 같은 범위(소유자·admin)로 잠근다. 기한은 두지 않고
완료 여부만 다룬다.
"""

from datetime import date, timedelta

import pytest

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token
from static_data import DEPARTURE_CHECKLIST_TEMPLATE


@pytest.fixture
def org_user(make_user, make_organization):
    """단체에 속한 업무 계정. org 역할은 소속 단체가 없으면 CHECK 제약에 걸린다."""
    counter = {"n": 0}

    def _make(**kwargs):
        counter["n"] += 1
        n = counter["n"]
        org = make_organization(name=f"단체{n}", slug=f"org-{n}")
        return make_user(role="org", organization_id=org.id, **kwargs)

    return _make


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def _make_ticket(db_session, owner, **kwargs):
    fields = {
        "title": "인천-토론토",
        "arrival_airport": "YYZ",
        "departure_date": date(2026, 12, 1),
        "arrival_date": date(2026, 12, 1),
        "manager_name": "담당",
        "contact": "010-0000-0000",
        "owner_id": owner.id,
        "created_by_id": owner.id,
    }
    fields.update(kwargs)
    ticket = models.Ticket(**fields)
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


# --- 인가 ---


def test_anonymous_cannot_read_checklist(client, db_session, org_user):
    owner = org_user()
    ticket = _make_ticket(db_session, owner)

    assert client.get(f"/api/tickets/{ticket.id}/checklist").status_code == 401


def test_general_user_cannot_read_checklist(client, db_session, make_user, org_user):
    """카카오 셀프 가입 일반 계정은 단체 업무 화면에 못 들어온다."""
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, make_user(role="general"))

    assert client.get(f"/api/tickets/{ticket.id}/checklist").status_code == 403


def test_other_org_user_cannot_read_checklist(client, db_session, org_user):
    """같은 단체 업무 계정이라도 티켓 소유자가 아니면 체크리스트를 못 본다."""
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, org_user())

    response = client.get(f"/api/tickets/{ticket.id}/checklist")
    assert response.status_code == 403


def test_other_org_user_cannot_modify_checklist(client, db_session, org_user):
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)
    item = client.get(f"/api/tickets/{ticket.id}/checklist").json()["items"][0]

    _authenticate(client, org_user())
    assert client.post(
        f"/api/tickets/{ticket.id}/checklist", json={"label": "몰래 추가"}
    ).status_code == 403
    assert client.put(
        f"/api/tickets/{ticket.id}/checklist/{item['id']}", json={"is_done": True}
    ).status_code == 403
    assert client.delete(
        f"/api/tickets/{ticket.id}/checklist/{item['id']}"
    ).status_code == 403


def test_admin_can_read_other_users_checklist(client, db_session, make_user, org_user):
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, make_user(role="admin"))

    assert client.get(f"/api/tickets/{ticket.id}/checklist").status_code == 200


def test_checklist_is_not_exposed_in_ticket_response(client, db_session, org_user):
    """공용 티켓 응답에는 체크리스트를 싣지 않는다(다른 단체에 진행 상황 비노출)."""
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)

    body = client.get(f"/api/tickets/{ticket.id}").json()
    assert "checklist_items" not in body
    assert "checklist" not in body


# --- 기본 항목 시드 ---


def test_created_ticket_gets_template_items(client, org_user):
    """티켓을 만들면 기본 항목이 함께 깔린다."""
    _authenticate(client, org_user())

    created = client.post(
        "/api/tickets",
        json={
            "title": "인천-밴쿠버",
            "arrival_airport": "YVR",
            "departure_date": "2026-12-10",
            "arrival_date": "2026-12-10",
            "manager_name": "담당",
            "contact": "010-0000-0000",
        },
    )
    assert created.status_code == 201

    body = client.get(f"/api/tickets/{created.json()['id']}/checklist").json()
    assert body["total"] == len(DEPARTURE_CHECKLIST_TEMPLATE)
    assert body["done"] == 0
    assert [i["label"] for i in body["items"]] == [
        t["label"] for t in DEPARTURE_CHECKLIST_TEMPLATE
    ]
    assert body["missing_template_keys"] == []


def test_existing_ticket_is_seeded_on_first_read(client, db_session, org_user):
    """체크리스트 기능 이전에 만들어진 티켓은 첫 조회 때 기본 항목을 받는다."""
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    assert ticket.checklist_initialized_at is None
    _authenticate(client, owner)

    body = client.get(f"/api/tickets/{ticket.id}/checklist").json()
    assert body["total"] == len(DEPARTURE_CHECKLIST_TEMPLATE)

    db_session.refresh(ticket)
    assert ticket.checklist_initialized_at is not None


def test_deleted_items_do_not_come_back_on_read(client, db_session, org_user):
    """항목을 전부 지운 티켓에 조회만으로 기본 항목이 되살아나지 않는다."""
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)

    for item in client.get(f"/api/tickets/{ticket.id}/checklist").json()["items"]:
        client.delete(f"/api/tickets/{ticket.id}/checklist/{item['id']}")

    body = client.get(f"/api/tickets/{ticket.id}/checklist").json()
    assert body["total"] == 0
    assert len(body["missing_template_keys"]) == len(DEPARTURE_CHECKLIST_TEMPLATE)


def test_restore_template_adds_only_missing_items(client, db_session, org_user):
    """복원은 지워진 기본 항목만 되살리고 남은 항목과 완료 상태는 건드리지 않는다."""
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)

    items = client.get(f"/api/tickets/{ticket.id}/checklist").json()["items"]
    kept, removed = items[0], items[1]
    client.put(f"/api/tickets/{ticket.id}/checklist/{kept['id']}", json={"is_done": True})
    client.delete(f"/api/tickets/{ticket.id}/checklist/{removed['id']}")

    body = client.post(f"/api/tickets/{ticket.id}/checklist/restore-template").json()
    assert body["total"] == len(DEPARTURE_CHECKLIST_TEMPLATE)
    assert body["missing_template_keys"] == []
    assert body["done"] == 1

    by_key = {i["template_key"]: i for i in body["items"]}
    assert by_key[kept["template_key"]]["id"] == kept["id"]
    assert by_key[kept["template_key"]]["is_done"] is True
    # 지웠던 항목은 새 id로 다시 생기고 미완료 상태다.
    assert by_key[removed["template_key"]]["id"] != removed["id"]
    assert by_key[removed["template_key"]]["is_done"] is False


def test_restore_template_keeps_renamed_item(client, db_session, org_user):
    """이름을 고친 기본 항목은 키가 남아 있어 복원 시 중복되지 않는다."""
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)

    item = client.get(f"/api/tickets/{ticket.id}/checklist").json()["items"][0]
    client.put(
        f"/api/tickets/{ticket.id}/checklist/{item['id']}", json={"label": "우리 식 이름"}
    )

    body = client.post(f"/api/tickets/{ticket.id}/checklist/restore-template").json()
    assert body["total"] == len(DEPARTURE_CHECKLIST_TEMPLATE)
    labels = [i["label"] for i in body["items"]]
    assert "우리 식 이름" in labels


# --- 항목 추가·수정·삭제 ---


def test_add_custom_item_goes_to_the_end(client, db_session, org_user):
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)
    client.get(f"/api/tickets/{ticket.id}/checklist")

    response = client.post(
        f"/api/tickets/{ticket.id}/checklist",
        json={"label": "입양자 서약서 수령", "note": "스캔본 보관"},
    )
    assert response.status_code == 201
    body = response.json()

    assert body["total"] == len(DEPARTURE_CHECKLIST_TEMPLATE) + 1
    added = body["items"][-1]
    assert added["label"] == "입양자 서약서 수령"
    assert added["note"] == "스캔본 보관"
    assert added["template_key"] is None
    assert added["is_done"] is False


def test_blank_label_is_rejected(client, db_session, org_user):
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)

    assert client.post(
        f"/api/tickets/{ticket.id}/checklist", json={"label": "   "}
    ).status_code == 422


def test_toggle_done_sets_and_clears_completed_at(client, db_session, org_user):
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)
    item = client.get(f"/api/tickets/{ticket.id}/checklist").json()["items"][0]

    body = client.put(
        f"/api/tickets/{ticket.id}/checklist/{item['id']}", json={"is_done": True}
    ).json()
    done = next(i for i in body["items"] if i["id"] == item["id"])
    assert done["is_done"] is True
    assert done["completed_at"] is not None
    assert body["done"] == 1

    body = client.put(
        f"/api/tickets/{ticket.id}/checklist/{item['id']}", json={"is_done": False}
    ).json()
    undone = next(i for i in body["items"] if i["id"] == item["id"])
    assert undone["is_done"] is False
    assert undone["completed_at"] is None
    assert body["done"] == 0


def test_partial_update_keeps_other_fields(client, db_session, org_user):
    """완료만 토글해도 라벨·메모가 날아가지 않는다."""
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)
    created = client.post(
        f"/api/tickets/{ticket.id}/checklist",
        json={"label": "켄넬 대여", "note": "공항 픽업"},
    ).json()["items"][-1]

    body = client.put(
        f"/api/tickets/{ticket.id}/checklist/{created['id']}", json={"is_done": True}
    ).json()
    updated = next(i for i in body["items"] if i["id"] == created["id"])
    assert updated["label"] == "켄넬 대여"
    assert updated["note"] == "공항 픽업"


def test_item_of_another_ticket_is_not_found(client, db_session, org_user):
    """다른 티켓의 항목 id를 끼워 넣어도 건드릴 수 없다."""
    owner = org_user()
    ticket_a = _make_ticket(db_session, owner)
    ticket_b = _make_ticket(db_session, owner, title="다른 티켓")
    _authenticate(client, owner)
    item_b = client.get(f"/api/tickets/{ticket_b.id}/checklist").json()["items"][0]

    assert client.put(
        f"/api/tickets/{ticket_a.id}/checklist/{item_b['id']}", json={"is_done": True}
    ).status_code == 404


def test_deleting_ticket_removes_its_checklist(client, db_session, org_user):
    owner = org_user()
    ticket = _make_ticket(db_session, owner)
    _authenticate(client, owner)
    client.get(f"/api/tickets/{ticket.id}/checklist")

    assert client.delete(f"/api/tickets/{ticket.id}").status_code == 204
    remaining = (
        db_session.query(models.TicketChecklistItem)
        .filter(models.TicketChecklistItem.ticket_id == ticket.id)
        .count()
    )
    assert remaining == 0


# --- 기존 출국 준비 추가정보 진행률 ---


def test_documents_progress_is_derived_from_ticket_columns(client, db_session, org_user):
    """서류 진행률은 체크리스트 항목이 아니라 티켓 컬럼에서 파생된다."""
    owner = org_user()
    ticket = _make_ticket(
        db_session,
        owner,
        dep_address="서울시 어딘가",
        passport_object_key="passport-key",
    )
    _authenticate(client, owner)

    documents = client.get(f"/api/tickets/{ticket.id}/checklist").json()["documents"]
    assert documents == {
        "has_address": True,
        "has_kakao_id": False,
        "has_passport": True,
        "has_seat_confirm": False,
        "has_eticket": False,
        "total": 5,
        "done": 2,
    }
