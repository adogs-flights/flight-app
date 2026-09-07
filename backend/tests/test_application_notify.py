from datetime import date, timedelta

import routers.ticket_applications as ta
import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def _make_sharing_ticket(db_session, owner):
    ticket = models.Ticket(
        title="9월 나리타",
        arrival_airport="NRT",
        departure_date=date(2026, 9, 1),
        arrival_date=date(2026, 9, 2),
        manager_name="담당",
        contact="010",
        owner_id=owner.id,
        created_by_id=owner.id,
        status="sharing",
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


def test_new_application_emails_all_owner_org_members(
    client, db_session, make_user, make_organization, monkeypatch
):
    sent = []
    monkeypatch.setattr(
        ta, "send_email", lambda receiver_email, subject, body: sent.append(
            (receiver_email, subject)
        )
    )

    owner_org = make_organization(name="소유단체", slug="owner-org")
    owner = make_user(role="org", organization_id=owner_org.id, email="owner@org.com")
    coworker = make_user(
        role="org", organization_id=owner_org.id, email="coworker@org.com"
    )

    applicant_org = make_organization(name="신청단체", slug="applicant-org")
    applicant = make_user(
        role="org", organization_id=applicant_org.id, email="applicant@other.com"
    )

    ticket = _make_sharing_ticket(db_session, owner)

    _authenticate(client, applicant)
    res = client.post(
        f"/api/tickets/{ticket.id}/applications",
        json={"ticket_id": ticket.id, "message": "봉사 가능합니다", "contact": "010"},
    )

    assert res.status_code == 201, res.text

    recipients = {email for email, _ in sent}
    # 티켓 소유 단체 회원 전원이 받는다(소유자 + 같은 단체 동료).
    assert recipients == {"owner@org.com", "coworker@org.com"}
    # 신청자(다른 단체)에게는 가지 않는다.
    assert "applicant@other.com" not in recipients
    # 제목에 티켓 제목이 들어간다.
    assert all("9월 나리타" in subject for _, subject in sent)


def test_new_application_falls_back_to_owner_when_no_org(
    client, db_session, make_user, make_organization, monkeypatch
):
    sent = []
    monkeypatch.setattr(
        ta, "send_email", lambda receiver_email, subject, body: sent.append(
            receiver_email
        )
    )

    # 소유자에게 단체가 없는(admin이 소유) 경우: 소유자 개인 이메일로 폴백.
    owner = make_user(role="admin", email="admin-owner@site.com")
    applicant_org = make_organization(name="신청단체", slug="applicant-org")
    applicant = make_user(
        role="org", organization_id=applicant_org.id, email="applicant@other.com"
    )
    ticket = _make_sharing_ticket(db_session, owner)

    _authenticate(client, applicant)
    res = client.post(
        f"/api/tickets/{ticket.id}/applications",
        json={"ticket_id": ticket.id, "message": "봉사 가능합니다", "contact": "010"},
    )

    assert res.status_code == 201, res.text
    assert sent == ["admin-owner@site.com"]
