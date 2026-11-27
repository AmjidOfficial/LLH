import boto3
from botocore.config import Config
from app.config import get_settings

class PrivateObjectStorage:
    """S3-compatible private bucket adapter. Credentials stay on the GPU host."""
    def __init__(self) -> None:
        s = get_settings()
        required = [s.storage_bucket, s.storage_access_key, s.storage_secret_key]
        if not all(required):
            raise RuntimeError("Private object storage is not configured")
        self.bucket = s.storage_bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=s.storage_endpoint_url or None,
            region_name=s.storage_region or "auto",
            aws_access_key_id=s.storage_access_key,
            aws_secret_access_key=s.storage_secret_key,
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )

    def read(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        body = response["Body"]
        try:
            data = body.read()
        finally:
            body.close()
        return data

    def write(self, key: str, data: bytes) -> None:
        self.client.put_object(
            Bucket=self.bucket, Key=key, Body=data, ContentType="image/png",
            ServerSideEncryption="AES256",
        )
