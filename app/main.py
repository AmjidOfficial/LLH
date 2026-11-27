import json
import logging
import time
from fastapi import FastAPI, HTTPException, Request
from redis.asyncio import Redis
from redis.exceptions import RedisError
from app.config import get_settings
from app.runtime import RuntimeNotReady, VtonRuntime
from app.schemas import JobAccepted, JobCreate
from app.security import verify_internal_request

settings = get_settings()
logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("llh.engine")
app = FastAPI(title=settings.app_name, version="0.1.0", docs_url=None, redoc_url=None)
runtime = VtonRuntime()
redis: Redis | None = None

@app.on_event("startup")
async def startup() -> None:
    global redis
    redis = Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=2)
    try:
        await redis.ping()
    except RedisError:
        logger.error("Redis unavailable at startup")
    try:
        runtime.load()
    except RuntimeNotReady:
        logger.warning("VTON runtime not configured; generation disabled")

@app.on_event("shutdown")
async def shutdown() -> None:
    if redis is not None:
        await redis.aclose()

@app.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "alive"}

@app.get("/health/ready")
async def ready() -> dict[str, object]:
    redis_ok = False
    if redis is not None:
        try:
            redis_ok = bool(await redis.ping())
        except RedisError:
            redis_ok = False
    is_ready = redis_ok and runtime.is_ready
    return {"status": "ready" if is_ready else "not_ready",
            "queue": "ready" if redis_ok else "unavailable",
            "model": "ready" if runtime.is_ready else "not_configured"}

@app.post("/v1/jobs", response_model=JobAccepted, status_code=202)
async def submit_job(request: Request) -> JobAccepted:
    raw = await verify_internal_request(request)
    if not runtime.is_ready:
        raise HTTPException(status_code=503, detail="Local AI model is not ready")
    if redis is None:
        raise HTTPException(status_code=503, detail="Job queue is unavailable")
    try:
        payload = JobCreate.model_validate_json(raw)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid job request") from None
    existing = await redis.get(f"llh:job:{payload.job_id}")
    if existing:
        return JobAccepted(job_id=payload.job_id, status="already_exists",
                           message="Existing job retained; no second generation queued")
    if await redis.llen("llh:jobs") >= settings.max_queue_depth:
        raise HTTPException(status_code=429, detail="Generation queue is full")
    record = {"job_id": payload.job_id, "idempotency_key": payload.idempotency_key,
              "input_object_key": payload.input_object_key,
              "garment_object_key": payload.garment_object_key, "category": payload.category,
              "callback_path": payload.callback_path, "status": "queued",
              "created_at": str(int(time.time()))}
    created = await redis.set(f"llh:job:{payload.job_id}", json.dumps(record),
                              ex=settings.job_ttl_seconds, nx=True)
    if not created:
        return JobAccepted(job_id=payload.job_id, status="already_exists",
                           message="Duplicate job ignored")
    await redis.rpush("llh:jobs", payload.job_id)
    return JobAccepted(job_id=payload.job_id, status="queued", message="Job accepted")

@app.get("/v1/jobs/{job_id}")
async def get_job(job_id: str, request: Request) -> dict[str, str]:
    await verify_internal_request(request)
    if redis is None:
        raise HTTPException(status_code=503, detail="Job queue is unavailable")
    record = await redis.get(f"llh:job:{job_id}")
    if not record:
        raise HTTPException(status_code=404, detail="Job not found")
    data = json.loads(record)
    return {"job_id": data["job_id"], "status": data["status"]}
