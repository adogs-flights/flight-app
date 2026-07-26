import os  # noqa: F401  # Task 2 이후의 테스트가 사용한다
from pathlib import Path

import models  # noqa: F401  # Task 2 이후의 테스트가 사용한다


def test_alembic_env_imports_models():
    """env.py가 models를 import하는지 소스에서 확인한다.

    env.py는 alembic만 읽는 파일이라 런타임에 그 효과를 관측할 수 없다.
    그래서 소스를 직접 확인한다. 이 import가 없으면 Base.metadata가 비어 있어
    autogenerate가 모든 테이블을 drop하는 마이그레이션을 만든다.
    """
    env_source = (Path(__file__).parent.parent / "alembic" / "env.py").read_text()
    # 단순 substring 검사는 9번째 줄의 "...so we can import models" 주석과 겹쳐
    # 오탐(false positive)이 난다. 주석을 제거한 코드 라인만 비교한다.
    code_lines = [line.split("#")[0].strip() for line in env_source.splitlines()]
    assert "import models" in code_lines


def test_models_register_on_metadata():
    """models를 import하면 Base.metadata에 테이블이 등록된다."""
    from database import Base

    table_names = set(Base.metadata.tables.keys())
    assert "users" in table_names
    assert "guest_ticket_submissions" in table_names
