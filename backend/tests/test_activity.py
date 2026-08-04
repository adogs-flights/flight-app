from datetime import timedelta

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def _make_ticket(db_session, owner):
    from datetime import date

    ticket = models.Ticket(
        title="티켓",
        arrival_airport="NRT",
        departure_date=date(2026, 9, 1),
        arrival_date=date(2026, 9, 2),
        manager_name="담당",
        contact="010",
        owner_id=owner.id,
        created_by_id=owner.id,
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    return ticket


def _make_application(db_session, ticket, applicant, status="pending"):
    app = models.TicketApplication(
        ticket_id=ticket.id,
        applicant_id=applicant.id,
        message="봉사할게요",
        contact="010",
        status=status,
    )
    db_session.add(app)
    db_session.commit()
    db_session.refresh(app)
    return app


def test_owner_sees_new_application_on_own_ticket(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    owner = make_user(role="org", organization_id=org.id, email="owner@b.com")
    applicant = make_user(role="general")
    ticket = _make_ticket(db_session, owner)
    _make_application(db_session, ticket, applicant)

    _authenticate(client, owner)
    res = client.get("/api/activity/sidebar")

    assert res.status_code == 200
    data = res.json()
    assert len(data["owned_new_applications"]) == 1


def test_applicant_sees_only_resolved_status_updates(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    owner = make_user(role="org", organization_id=org.id, email="owner2@b.com")
    applicant = make_user(role="general")
    ticket = _make_ticket(db_session, owner)
    _make_application(db_session, ticket, applicant, status="pending")

    _authenticate(client, applicant)
    pending = client.get("/api/activity/sidebar").json()
    assert len(pending["my_application_updates"]) == 0

    # 소유자가 확정 처리하면 신청자에게 새 내역으로 잡혀야 한다.
    app = db_session.query(models.TicketApplication).first()
    app.status = "confirmed"
    db_session.commit()

    confirmed = client.get("/api/activity/sidebar").json()
    assert len(confirmed["my_application_updates"]) == 1


def test_admin_sees_pending_orgs_others_do_not(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    make_user(role="org", organization_id=org.id, email="waiting@b.com", is_approved=False)
    admin = make_user(role="admin", email="admin@b.com")

    _authenticate(client, admin)
    admin_data = client.get("/api/activity/sidebar").json()
    assert len(admin_data["pending_orgs"]) == 1

    other = make_user(role="org", organization_id=org.id, email="other@b.com")
    _authenticate(client, other)
    other_data = client.get("/api/activity/sidebar").json()
    assert other_data["pending_orgs"] == []


def test_submissions_scoped_to_org(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="A", slug="a")
    org_b = make_organization(name="B", slug="b")
    for org, tok in ((org_a, "t-a"), (org_b, "t-b")):
        db_session.add(
            models.GuestTicketSubmission(
                phone="010",
                verification_method="reservation_number",
                organization_id=org.id,
                lookup_token=tok,
            )
        )
    db_session.commit()

    user_a = make_user(role="org", organization_id=org_a.id, email="a@b.com")
    _authenticate(client, user_a)
    data = client.get("/api/activity/sidebar").json()
    assert len(data["submissions"]) == 1
