# Hatchable integration contract

Do not edit or deploy the existing LLH production project as part of this GPU service build.

## Hatchable remains authoritative

Hatchable owns and validates published products, SKU, price, variants, sizes, stock and try-on eligibility; customer identity and guest consent; upload validation and private storage; user-level rate limits, idempotency, job ownership; order creation, WhatsApp handoff and customer history.

The GPU engine must never edit inventory or create orders.

## Internal call

Hatchable sends a timestamped HMAC-signed JSON request. Signature:
`hex(HMAC_SHA256(shared_secret, timestamp + "." + raw_request_body))`

Headers: `X-LLH-Timestamp`, `X-LLH-Signature`.

Body fields: `job_id`, `idempotency_key`, `input_object_key`, `garment_object_key`, `category`, `callback_path`.

Do not send arbitrary URLs. A separate private-storage adapter must fetch objects with short-lived credentials. Do not log object keys, signed URLs, photos, request bodies or credentials.

## Staging acceptance

- Use a separate Hatchable staging project or isolated preview.
- Store the engine URL and secret only in staging secret storage.
- Verify public, guest, signed-in customer and admin access tiers.
- Verify SKU, size, price and stock read-only against the catalogue.
- Test consent, retention cleanup and deletion requests.
- Test retries, duplicate submissions, queue saturation and worker crashes.
- Keep production routes disabled until code review and explicit approval.
