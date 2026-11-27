# LLH AI Engine

Self-hosted virtual try-on inference service for Legacy Leather House. Hatchable remains the source of truth for catalogue, inventory, users, consent, orders and customer history.

**Status: isolated foundation and first local-model adapter. Not deployed and not production-ready.** No commercial try-on API is used. The service is designed to fail closed until the model, GPU worker and private object storage are configured.

## Architecture

- Hatchable: public catalogue, authentication, consent, job ownership, inventory validation, user-level rate limits, idempotency, customer history and order/WhatsApp handoff.
- API container: authenticated internal job submission and status polling.
- GPU worker: local FASHN VTON inference on rented NVIDIA GPU.
- Redis: bounded queue, job state and worker health.
- S3-compatible private object storage: customer uploads and generated outputs. Credentials remain on the GPU host.

## First model baseline

FASHN VTON v1.5 is installed locally from a pinned upstream Git commit in `Dockerfile.gpu`. It supports `tops`, `bottoms` and `one-pieces`, using person and garment images. It does not natively do belts, bags or multi-garment outfits in one pass. See `docs/MODEL-SETUP.md`.

## Local setup

Requirements: Linux NVIDIA GPU host, compatible NVIDIA driver and Container Toolkit, Docker Compose with GPU support, private S3-compatible storage and Redis.

```bash
cp .env.example .env
# Set a random LLH_ENGINE_SHARED_SECRET and private storage credentials.
docker compose build
docker compose run --rm --entrypoint python worker /opt/fashn-vton/scripts/download_weights.py --weights-dir /srv/llh/weights
docker compose up -d
```

The API listens on localhost only by default. Put it behind private networking or a locked-down gateway. Redis is not published to the host.

## Internal API

- `GET /health/live`: process liveness.
- `GET /health/ready`: Redis and GPU worker readiness.
- `POST /v1/jobs`: timestamped HMAC-authenticated job submission.
- `GET /v1/jobs/{job_id}`: timestamped HMAC-authenticated status polling.

Requests contain opaque private object keys, not arbitrary URLs. The GPU worker reads and writes objects using its own S3 credentials. No photos, request bodies, signed URLs or credentials are written to application logs.

## Production blockers

- Complete and test the Hatchable adapter against its real database and storage APIs.
- Add signed result delivery and customer-facing status polling.
- Implement deletion/retention lifecycle for both input and output objects.
- Add a dead-letter/recovery strategy for worker crashes and Redis queue persistence.
- Add GPU load tests, image quality tests and cost measurement.
- Build a separate multi-item outfit compositor and accessory-specific path.
- Review the model and every dependency licence before commercial launch.
- Configure rented GPU host and private storage credentials.
- Complete staging acceptance and obtain explicit production approval.

No Hatchable production files, secrets, live inventory, customer photos or deployments were changed by this branch.
