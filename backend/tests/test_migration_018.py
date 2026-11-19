from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
import pytest


def test_single_head_and_upgrade_downgrade(tmp_path, monkeypatch):
    url = f'sqlite:///{tmp_path / "migration.db"}'
    monkeypatch.setenv('DATABASE_URL', url)
    monkeypatch.setattr('database.SQLALCHEMY_DATABASE_URL', url)
    config = Config('alembic.ini')
    # 뒤에 마이그레이션이 쌓여도 head는 하나여야 한다. 특정 리비전 번호를
    # 박아두면 새 마이그레이션마다 깨지므로 갈래가 없다는 것만 확인한다.
    assert len(ScriptDirectory.from_config(config).get_heads()) == 1
    command.upgrade(config, '017')
    engine = create_engine(url)
    assert 'push_subscriptions' not in inspect(engine).get_table_names()
    command.upgrade(config, 'head')
    inspector = inspect(engine)
    # Exercise the actual constraint (SQLite reflection varies across versions).
    with engine.begin() as connection:
        connection.exec_driver_sql("INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES ('1', 'test', 'https://example.test/1', 'key', 'auth')")
        with pytest.raises(IntegrityError):
            connection.exec_driver_sql("INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES ('2', 'test', 'https://example.test/1', 'key', 'auth')")
    assert inspector.get_foreign_keys('push_subscriptions')[0]['options']['ondelete'] == 'CASCADE'
    command.downgrade(config, '017')
    assert 'push_subscriptions' not in inspect(engine).get_table_names()
    command.upgrade(config, 'head')
    assert 'push_subscriptions' in inspect(engine).get_table_names()
    engine.dispose()
