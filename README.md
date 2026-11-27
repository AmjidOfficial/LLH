# LLH AI Engine

Self-hosted virtual try-on and outfit-editing service for Legacy Leather House. Hatchable remains the source of truth for catalogue, inventory, users, consent, orders and customer history.

**Status: isolated backend foundation only. Not deployed and not production-ready.** The model runtime is intentionally disabled until a commercially cleared model stack is selected and benchmarked. No commercial try-on API is used.

## Architecture

- Hatchable: public catalogue, authentication, consent, job ownership, inventory validation, user-level rate limits, idempotency, customer history and order/WhatsApp handoff.
- API container: authenticated internal job submission and status polling.
- GPU worker: local inference on rented NVIDIA GPU.
- Redis: bounded queue, job state and worker health.
- S3-compatible private storage: customer uploads and generated outputs. Credentials remain on the GPU host.

## Model gate

FASHN VTON v1.5 is not approved for LLH commercial use in its current dependency chain because its required FASHN Human Parser dependency inherits the NVIDIA SegFormer non-commercial licence. See `docs/MODEL-SETUP.md`. The model runtime stays disabled by default.

Qwen-Image-Edit-2511 is the leading commercial-safe prototype candidate based on its Apache 2.0 model card. It is a general image editor, not a dedicated VTON model. Garment and identity fidelity must be benchmarked before any customer use.

## Local setup

Requirements: Linux NVIDIA GPU host, compatible NVIDIA driver and Container Toolkit, Docker Compose with GPU support, private S3-compatible storage and Redis.

```bash
cp .env.example .env
# Set a random LLH_ENGINE_SHARED_SECRET and private storage credentials.
# Do not set LLH_VTON_RUNTIME_MODULE until a commercially cleared runtime is installed.
docker compose build
docker compose up -d
```

The API listens on localhost only by default. Put it behind private networking or a locked-down gateway. Redis is not published to the host. Readiness remains false until a real GPU worker is installed and healthy.

## Internal API

- `GET /health/live`: process liveness.
- `GET /health/ready`: Redis and GPU worker readiness.
- `POST /v1/jobs`: timestamped HMAC-authenticated job submission.
- `GET /v1/jobs/{job_id}`: timestamped HMAC-authenticated status polling.

Requests contain opaque private object keys, not arbitrary URLs. The GPU worker reads and writes objects using its own S3 credentials. No photos, request bodies, signed URLs or credentials are written to application logs.

## Production blockers

- Select and audit a commercially cleared local model and every dependency.
- Implement the selected model adapter and run image-quality benchmarks with LLH garments.
- Complete and test the Hatchable adapter against real database and storage APIs.
- Add signed result delivery and customer-facing status polling.
- Implement deletion/retention lifecycle for input and output objects.
- Add dead-letter/recovery strategy for worker crashes and Redis queue persistence.
- Add GPU load tests, image quality tests and cost measurement.
- Build separate multi-item outfit and accessory pipelines.
- Configure rented GPU host and private storage credentials.
- Complete staging acceptance and obtain explicit production approval.

No Hatchable production files, secrets, live inventory, customer photos or deployments were changed by this branch.
