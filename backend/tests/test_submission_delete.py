from datetime import date, timedelta

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def _make_submission(db_session, organization_id, token, **kwargs):
    submission = models.GuestTicketSubmission(
        phone="01011112222",
        verification_method="reservation_number",
        organization_id=organization_id,
        lookup_token=token,
        **kwargs,
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)
    return submission


def test_org_user_can_delete_own_submission(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    sub = _make_submission(db_session, org.id, "tok-own")

    _authenticate(client, user)
    res = client.delete(f"/api/guest-submissions/{sub.id}")

    assert res.status_code == 204
    assert (
        db_session.query(models.GuestTicketSubmission)
        .filter_by(id=sub.id)
        .first()
        is None
    )


def test_org_user_cannot_delete_other_org_submission(
    client, db_session, make_user, make_organization
):
    org_a = make_organization(name="A", slug="a")
    org_b = make_organization(name="B", slug="b")
    other = _make_submission(db_session, org_b.id, "tok-other")
    user_a = make_user(role="org", organization_id=org_a.id, email="a@b.com")

    _authenticate(client, user_a)
    res = client.delete(f"/api/guest-submissions/{other.id}")

    assert res.status_code == 404
    # 범위 밖 제출은 그대로 남아 있어야 한다.
    assert (
        db_session.query(models.GuestTicketSubmission).filter_by(id=other.id).first()
        is not None
    )


def test_deleting_approved_submission_keeps_created_ticket(
    client, db_session, make_user, make_organization
):
    org = make_organization()
    user = make_user(role="org", organization_id=org.id, email="a@b.com")
    ticket = models.Ticket(
        title="티켓",
        arrival_airport="NRT",
        departure_date=date(2026, 9, 1),
        arrival_date=date(2026, 9, 2),
        manager_name="담당",
        contact="010",
        owner_id=user.id,
        created_by_id=user.id,
    )
    db_session.add(ticket)
    db_session.commit()
    db_session.refresh(ticket)
    sub = _make_submission(
        db_session, org.id, "tok-appr", status="approved", created_ticket_id=ticket.id
    )

    _authenticate(client, user)
    res = client.delete(f"/api/guest-submissions/{sub.id}")

    assert res.status_code == 204
    # 승인으로 만들어진 일정(티켓)은 유지된다.
    assert db_session.query(models.Ticket).filter_by(id=ticket.id).first() is not None
