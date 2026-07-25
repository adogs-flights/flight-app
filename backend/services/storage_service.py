import io
import os
from functools import lru_cache

from minio import Minio

MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "eticket-images")


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
    client = get_client()
    response = client.get_object(MINIO_BUCKET, object_key)
    try:
        content = response.read()
        content_type = response.headers.get("content-type", "application/octet-stream")
    finally:
        response.close()
        response.release_conn()
    return content, content_type
