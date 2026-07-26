from datetime import timedelta

import models
from routers.auth import ACCESS_COOKIE_NAME, create_access_token


def _authenticate(client, user):
    client.cookies.set(
        ACCESS_COOKIE_NAME,
        create_access_token(data={"sub": user.id}, expires_delta=timedelta(minutes=5)),
    )


def _make_submission(db_session, token="lookup-token-1", user_id=None):
    submission = models.GuestTicketSubmission(
        phone="01011112222",
        verification_method="reservation_number",
        lookup_token=token,
        user_id=user_id,
    )
    db_session.add(submission)
    db_session.commit()
    db_session.refresh(submission)
    return submission


def test_claim_assigns_submission_to_user(client, db_session, make_user):
    submission = _make_submission(db_session)
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "lookup-token-1"},
    )

    assert response.status_code == 200
    db_session.refresh(submission)
    assert submission.user_id == user.id


def test_claim_twice_returns_409(client, db_session, make_user):
    owner = make_user(role="general")
    submission = _make_submission(db_session, user_id=owner.id)
    other = make_user(role="general")
    _authenticate(client, other)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "lookup-token-1"},
    )

    assert response.status_code == 409


def test_claim_with_wrong_token_returns_404(client, db_session, make_user):
    submission = _make_submission(db_session)
    user = make_user(role="general")
    _authenticate(client, user)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "wrong-token"},
    )

    assert response.status_code == 404


def test_claim_requires_login(client, db_session):
    submission = _make_submission(db_session)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "lookup-token-1"},
    )

    assert response.status_code == 401


def test_claim_same_user_twice_returns_200(client, db_session, make_user):
    """링크를 두 번 눌러도 이미 자신의 것이면 성공으로 처리한다(409가 아니다)."""
    user = make_user(role="general")
    submission = _make_submission(db_session, user_id=user.id)
    _authenticate(client, user)

    response = client.post(
        f"/api/guest-submissions/{submission.id}/claim",
        json={"lookup_token": "lookup-token-1"},
    )

    assert response.status_code == 200
    db_session.refresh(submission)
    assert submission.user_id == user.id


def test_create_guest_submission_generates_lookup_token(client, db_session):
    """공개 제출 엔드포인트가 실제로 lookup_token을 발급하는지 end-to-end로 증명한다.

    lookup_token은 NOT NULL 컬럼이라, 이 값을 채우지 못하면 제출 자체가
    IntegrityError로 죽는다. 스키마 검사만으로는 이 경로를 못 잡는다.
    """
    response = client.post(
        "/api/guest-submissions",
        data={
            "phone": "01099998888",
            "airline": "KE",
            "verification_method": "reservation_number",
            "reservation_number": "ABC123",
            "passenger_last_name_en": "Kim",
            "passenger_first_name_en": "Minsu",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["lookup_token"], str)
    assert len(body["lookup_token"]) >= 20

    submission = (
        db_session.query(models.GuestTicketSubmission)
        .filter(models.GuestTicketSubmission.id == body["id"])
        .first()
    )
    assert submission is not None
    assert submission.lookup_token == body["lookup_token"]
