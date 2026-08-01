import io
import os
from functools import lru_cache

from minio import Minio

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "eticket-images")

# 개발용 로컬 파일시스템 폴백.
# MINIO_ACCESS_KEY가 비어 있으면(=로컬 개발) MinIO 없이 디스크에 저장한다.
# 운영에서는 키가 항상 설정되므로 이 경로를 타지 않는다.
USE_LOCAL_STORAGE = not MINIO_ACCESS_KEY
LOCAL_STORAGE_DIR = os.environ.get(
    "LOCAL_STORAGE_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "uploads"),
)


def _local_path(object_key: str) -> str:
    return os.path.join(LOCAL_STORAGE_DIR, object_key)


@lru_cache(maxsize=1)
def get_client() -> Minio:
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE,
    )
    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)
    return client


def upload_bytes(object_key: str, content: bytes, content_type: str) -> None:
    if USE_LOCAL_STORAGE:
        os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)
        path = _local_path(object_key)
        with open(path, "wb") as f:
            f.write(content)
        # content-type을 사이드카 파일에 함께 저장해 get_object가 복원한다.
        with open(path + ".ct", "w", encoding="utf-8") as f:
            f.write(content_type)
        return

    client = get_client()
    client.put_object(
        MINIO_BUCKET,
        object_key,
        io.BytesIO(content),
        length=len(content),
        content_type=content_type,
    )


def get_object(object_key: str) -> tuple[bytes, str]:
    """
    반환: (파일 바이트, content-type)
    """
    if USE_LOCAL_STORAGE:
        path = _local_path(object_key)
        with open(path, "rb") as f:
            content = f.read()
        content_type = "application/octet-stream"
        try:
            with open(path + ".ct", encoding="utf-8") as f:
                content_type = f.read().strip() or content_type
        except FileNotFoundError:
            pass
        return content, content_type

    client = get_client()
    response = client.get_object(MINIO_BUCKET, object_key)
    try:
        content = response.read()
        content_type = response.headers.get("content-type", "application/octet-stream")
    finally:
        response.close()
        response.release_conn()
    return content, content_type
