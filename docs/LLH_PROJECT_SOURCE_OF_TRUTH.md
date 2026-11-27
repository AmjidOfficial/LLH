# Legacy Leather House (LLH)

**Canonical source-control repository for the Legacy Leather House digital storefront and its future self-hosted virtual try-on system.**

## Current system map

- **Live production foundation:** Hatchable project `proj_NtlpIFfYd2MI`, currently deployed at https://top-fashion-leather.hatchable.site (version 57 as audited 27 Nov 2026).
- **Development workspace:** Lovable project “Legacylh” at https://lovable.dev/projects/8cf60240-34ce-4eb2-bd8c-7fe8726c240a. Its workspace was out of credits when the latest update was attempted, so no new Lovable changes were made in that attempt.
- **This repository:** intended canonical GitHub source. Keep the live Hatchable app and its database safe until a tested source migration is complete.
- **Legacy repository:** https://github.com/AmjidOfficial/Fashion-Store is an old generic fashion-store exercise (shirts, shoes, perfumes, generic sale copy). It is not the LLH full-stack source and must not be merged blindly.

## Business details

- Brand: Legacy Leather House (LLH)
- Location: Zaryab Colony, Peshawar, Pakistan
- WhatsApp: +92 332 8884141
- Facebook: https://www.facebook.com/share/1AV6C6Cpu9/
- Currency: PKR

## Non-negotiable rules

- No fake inventory, stock, prices, reviews, offers, or AI try-on results.
- Catalogue designs are not proof of physical stock. Show “Price on request” and “Availability to confirm” until the owner verifies details.
- Admin operations must be authenticated, authorized on the server, persistent, and audited.
- Customer photos must remain private, with explicit consent and a clear retention/deletion policy.
- No secrets in client code.
- LLH is currently a single-business store. OpenFit Room is a separate future product concept, not a multi-tenant conversion of this store.

See [the full project source of truth](docs/LLH_PROJECT_SOURCE_OF_TRUTH.md) for requirements, verified system status, admin modules, and the self-hosted AI try-on plan.
