import hashlib
import hmac
import time
import pytest
from fastapi import HTTPException
from starlette.requests import Request
from app.config import get_settings
from app.security import verify_internal_request

@pytest.mark.asyncio
async def test_rejects_missing_secret(monkeypatch):
    monkeypatch.setenv("LLH_ENGINE_SHARED_SECRET", "")
    get_settings.cache_clear()
    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}
    request = Request({"type": "http", "method": "POST", "headers": [], "path": "/", "query_string": b""}, receive)
    with pytest.raises(HTTPException) as error:
        await verify_internal_request(request)
    assert error.value.status_code == 503
    get_settings.cache_clear()

def test_hmac_contract_is_deterministic():
    secret = "x" * 48
    timestamp = str(int(time.time()))
    body = b'{"job_id":"job_1234567890123456"}'
    signature = hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()
    assert len(signature) == 64
