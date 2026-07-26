"""단체 격리 규칙을 한 곳에 모은다.

스펙 결정: 티켓·강아지 리스트·일정은 모든 단체가 공유하고,
제출 서류·전화번호·e티켓은 지정된 자기 단체만 본다.
정책이 바뀌면 이 파일만 고친다.
"""

from typing import Any

from sqlalchemy import false
from sqlalchemy.orm import Query

import models


def scope_to_org(query: Query, user: models.User | None, model: Any) -> Query:
    """model의 organization_id를 기준으로 조회 범위를 좁힌다.

    admin은 전체, org는 자기 단체만, 그 외는 빈 결과.
    """
    if user is not None and user.role == "admin":
        return query
    if user is not None and user.role == "org" and user.organization_id is not None:
        return query.filter(model.organization_id == user.organization_id)
    return query.filter(false())
