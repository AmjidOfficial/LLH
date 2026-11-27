import hashlib
import hmac
import time
from fastapi import HTTPException, Request, status
from app.config import get_settings

async def verify_internal_request(request: Request) -> bytes:
    """Verify timestamped HMAC over the exact raw request body."""
    settings = get_settings()
    secret = settings.llh_engine_shared_secret
    if len(secret) < 32 or secret == "CHANGE_ME_TO_A_LONG_RANDOM_SECRET":
        raise HTTPException(status_code=503, detail="Internal authentication is not configured")
    timestamp = request.headers.get("x-llh-timestamp", "")
    supplied = request.headers.get("x-llh-signature", "")
    try:
        sent_at = int(timestamp)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid internal authentication") from None
    if abs(int(time.time()) - sent_at) > settings.request_max_skew_seconds:
        raise HTTPException(status_code=401, detail="Expired internal authentication")
    body = await request.body()
    expected = hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Invalid internal authentication")
    return body
