# Local FASHN VTON model setup

The first inference baseline is the self-hosted FASHN VTON v1.5 package. It runs in our GPU worker, not through the FASHN API.

Upstream source is pinned in `Dockerfile.gpu` to commit `7c0f10af3f91ad4048fe9729c470a13ef905d25a`. Review that commit and all transitive dependency licences before production use.

## Build and download weights

1. Prepare a Linux GPU host with Docker, NVIDIA drivers and NVIDIA Container Toolkit.
2. Set the private object-storage and Redis values in the host's secret environment.
3. Build the worker image:

```bash
docker compose build worker
```

4. Download model weights into the private persistent volume. This is a one-time download, not an API call:

```bash
docker compose run --rm --entrypoint python worker /opt/fashn-vton/scripts/download_weights.py --weights-dir /srv/llh/weights
```

5. Start services:

```bash
docker compose up -d
```

The worker loads `TryOnPipeline(weights_dir=...)`. Its Redis heartbeat makes the API readiness endpoint return ready only while the worker is healthy.

## Model limits

The model supports `tops`, `bottoms`, and `one-pieces`. It accepts a person photo and a garment photo and returns one or more generated images. The first integration uses one output image.

It does not natively place belts, bags, shoes or multiple separate garments in one pass. Those require a separate accessory pipeline or a multi-pass outfit compositor with their own quality tests. Do not claim those flows are ready based on this adapter alone.

The upstream project documents approximately 8 GB VRAM for inference and 576×864 output. Actual VRAM and speed depend on driver, CUDA, input image and concurrent load. Benchmark on the selected GPU before setting customer-facing limits.
