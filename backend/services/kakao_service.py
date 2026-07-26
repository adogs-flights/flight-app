"""카카오 로그인 HTTP 통신을 이 모듈에 격리한다.

라우터가 직접 requests를 호출하지 않게 해서 테스트에서 목으로 대체할 수 있다.
카카오 액세스 토큰은 저장하지 않는다. 로그인 확인에만 쓰고 버린다.
"""

import os
from dataclasses import dataclass
from urllib.parse import urlencode

import requests

KAKAO_REST_API_KEY = os.environ.get("KAKAO_REST_API_KEY", "")
KAKAO_CLIENT_SECRET = os.environ.get("KAKAO_CLIENT_SECRET", "")
KAKAO_REDIRECT_URI = os.environ.get("KAKAO_REDIRECT_URI", "")

AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
TOKEN_URL = "https://kauth.kakao.com/oauth/token"
PROFILE_URL = "https://kapi.kakao.com/v2/user/me"
REQUEST_TIMEOUT_SECONDS = 10


class KakaoAPIError(Exception):
    """카카오 API 통신 실패."""


@dataclass
class KakaoProfile:
    id: str
    nickname: str | None
    email: str | None


def build_authorize_url(state: str) -> str:
    params = {
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "response_type": "code",
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code_for_profile(code: str) -> KakaoProfile:
    payload = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "code": code,
    }
    if KAKAO_CLIENT_SECRET:
        payload["client_secret"] = KAKAO_CLIENT_SECRET

    try:
        token_response = requests.post(
            TOKEN_URL, data=payload, timeout=REQUEST_TIMEOUT_SECONDS
        )
    except requests.RequestException as err:
        raise KakaoAPIError("카카오 토큰 요청에 실패했습니다.") from err

    if token_response.status_code != 200:
        raise KakaoAPIError(
            f"카카오 토큰 교환 실패: {token_response.status_code}"
        )

    access_token = token_response.json().get("access_token")
    if not access_token:
        raise KakaoAPIError("카카오 응답에 access_token이 없습니다.")

    try:
        profile_response = requests.get(
            PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as err:
        raise KakaoAPIError("카카오 사용자 정보 요청에 실패했습니다.") from err

    if profile_response.status_code != 200:
        raise KakaoAPIError(
            f"카카오 사용자 정보 조회 실패: {profile_response.status_code}"
        )

    body = profile_response.json()
    kakao_id = body.get("id")
    if kakao_id is None:
        raise KakaoAPIError("카카오 응답에 id가 없습니다.")

    account = body.get("kakao_account") or {}
    profile = account.get("profile") or {}

    return KakaoProfile(
        id=str(kakao_id),
        nickname=profile.get("nickname"),
        email=account.get("email"),
    )
