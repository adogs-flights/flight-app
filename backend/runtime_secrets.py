"""Read a pinned host-published generation; never copy secrets into os.environ."""
import json
import os
import re
import stat
from functools import lru_cache
from pathlib import Path

NAMES = {"DATABASE_URL", "SECRET_KEY", "SMTP_PASSWORD", "KAKAO_CLIENT_SECRET",
         "KAKAO_REST_API_KEY", "GOOGLE_CLIENT_CONFIG"}


def read_generation_file(directory, name, owner_uid=0):
    try:
        root = Path(directory)
        if not root.is_absolute():
            raise ValueError()
        parent = root.lstat()
        if not stat.S_ISDIR(parent.st_mode) or parent.st_uid != owner_uid or stat.S_IMODE(parent.st_mode) != 0o750:
            raise ValueError()
        link = root / "current"
        if not link.is_symlink() or link.lstat().st_uid != owner_uid:
            raise ValueError()
        target = os.readlink(link)
        if not re.fullmatch(r"g-[A-Za-z0-9]{6}", target):
            raise ValueError()
        generation = root / target
        info = generation.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != owner_uid or info.st_gid != parent.st_gid or stat.S_IMODE(info.st_mode) != 0o750:
            raise ValueError()
        fd = os.open(generation / name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, "rb") as source:
            info = os.fstat(source.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_uid != owner_uid or info.st_gid != parent.st_gid or stat.S_IMODE(info.st_mode) != 0o640 or info.st_nlink != 1:
                raise ValueError()
            value = source.read(65537)
            if not value or len(value) > 65536 or len(value) != info.st_size or b"\0" in value:
                raise ValueError()
            return value.decode("utf-8", errors="strict")
    except Exception:
        raise RuntimeError("RUNTIME_SECRET_UNAVAILABLE") from None


@lru_cache(maxsize=1)
def read_runtime(directory):
    try:
        values = json.loads(read_generation_file(directory, "CONFIG_JSON"))
        if not isinstance(values, dict) or set(values) != NAMES or not all(isinstance(v, str) for v in values.values()):
            raise ValueError()
        if not values["DATABASE_URL"] or not values["SECRET_KEY"]:
            raise ValueError()
        return values
    except Exception:
        raise RuntimeError("RUNTIME_SECRET_UNAVAILABLE") from None


def secret_value(name, default=None):
    if name not in NAMES:
        raise RuntimeError("RUNTIME_SECRET_UNAVAILABLE")
    if "FLIGHT_SECRET_DIRECTORY" in os.environ:
        return read_runtime(os.environ["FLIGHT_SECRET_DIRECTORY"])[name]
    return os.environ.get(name, default)


def database_url():
    if "FLIGHT_MIGRATION_SECRET_DIRECTORY" in os.environ:
        if "FLIGHT_SECRET_DIRECTORY" in os.environ:
            raise RuntimeError("MIGRATION_SECRET_REQUIRED")
        return read_generation_file(os.environ["FLIGHT_MIGRATION_SECRET_DIRECTORY"], "DATABASE_URL")
    value = secret_value("DATABASE_URL")
    if not value and os.environ.get("ENV") == "production":
        raise RuntimeError("DATABASE_CONFIGURATION_REQUIRED")
    return value
