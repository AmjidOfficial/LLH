from typing import Literal
from pydantic import BaseModel, Field, field_validator

class JobCreate(BaseModel):
    job_id: str = Field(min_length=16, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    idempotency_key: str = Field(min_length=16, max_length=128)
    input_object_key: str = Field(min_length=8, max_length=512)
    garment_object_key: str = Field(min_length=8, max_length=512)
    category: Literal["tops", "bottoms", "one-pieces", "accessories"]
    callback_path: str = Field(min_length=1, max_length=256)

    @field_validator("input_object_key", "garment_object_key")
    @classmethod
    def opaque_object_keys_only(cls, value: str) -> str:
        if value.startswith("/") or ".." in value or "://" in value:
            raise ValueError("Expected opaque private storage key")
        return value

    @field_validator("callback_path")
    @classmethod
    def relative_callback_only(cls, value: str) -> str:
        if not value.startswith("/api/") or "://" in value or ".." in value:
            raise ValueError("Callback must be a relative Hatchable API path")
        return value

class JobAccepted(BaseModel):
    job_id: str
    status: Literal["queued", "already_exists"]
    message: str
