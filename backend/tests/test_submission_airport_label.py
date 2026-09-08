from datetime import timedelta

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def test_submission_list_exposes_need_post_airport_code(
    client, db_session, make_user, make_organization
):
    """제출 검토 화면이 공항 라벨을 그리려면, 목록 응답의 need_post에
    airport_code가 실려 와야 한다."""
    org = make_organization()
    reviewer = make_user(role="org", organization_id=org.id, email="reviewer@b.com")

    need_post = models.NeedPost(
        title="뉴욕행 급구",
        airport_code="JFK",
        contact="010",
        seats_needed=1,
    )
    db_session.add(need_post)
    db_session.commit()
    db_session.refresh(need_post)

    submission = models.GuestTicketSubmission(
        phone="01011112222",
        verification_method="reservation_number",
        organization_id=org.id,
        need_post_id=need_post.id,
        lookup_token="tok-airport",
    )
    db_session.add(submission)
    db_session.commit()

    _authenticate(client, reviewer)
    res = client.get("/api/guest-submissions")

    assert res.status_code == 200, res.text
    rows = res.json()
    assert len(rows) == 1
    assert rows[0]["need_post"] is not None
    assert rows[0]["need_post"]["airport_code"] == "JFK"
