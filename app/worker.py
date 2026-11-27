import json
import logging
import time
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from redis import Redis
from app.config import get_settings
from app.runtime import VtonRuntime
from app.storage import PrivateObjectStorage

logging.basicConfig(level="INFO")
log = logging.getLogger("llh.worker")
settings = get_settings()

def validate_image(data: bytes) -> None:
    if not data or len(data) > settings.max_image_bytes:
        raise ValueError("invalid_image_size")
    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()
        with Image.open(BytesIO(data)) as image:
            if image.width * image.height > settings.max_image_pixels:
                raise ValueError("image_pixel_limit")
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("unsupported_image_format")
    except (UnidentifiedImageError, OSError):
        raise ValueError("invalid_image") from None

def run() -> None:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    runtime = VtonRuntime()
    runtime.load()
    storage = PrivateObjectStorage()
    log.info("LLH worker ready")
    while True:
        item = redis.brpop("llh:jobs", timeout=5)
        if item is None:
            continue
        _, job_id = item
        key = f"llh:job:{job_id}"
        raw = redis.get(key)
        if not raw:
            continue
        record = json.loads(raw)
        try:
            record["status"] = "running"
            redis.set(key, json.dumps(record), keepttl=True)
            person = storage.read(record["input_object_key"])
            garment = storage.read(record["garment_object_key"])
            validate_image(person)
            validate_image(garment)
            output = runtime.generate(input_image=person, garment_image=garment,
                                      category=record["category"])
            result_key = f"llh-results/{job_id}.png"
            storage.write(result_key, output)
            record.update(status="completed", result_object_key=result_key,
                          completed_at=str(int(time.time())))
            redis.set(key, json.dumps(record), keepttl=True)
        except Exception as exc:
            # Exception text and user data are intentionally excluded from logs.
            log.error("Generation failed job_id=%s error_type=%s", job_id, type(exc).__name__)
            record.update(status="failed", error_code="generation_failed",
                          completed_at=str(int(time.time())))
            redis.set(key, json.dumps(record), keepttl=True)

if __name__ == "__main__":
    run()
