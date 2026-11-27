# Legacy Leather House — Project Source of Truth

Audit date: 27 November 2026

## 1. Purpose and scope

Build and maintain the official Legacy Leather House (LLH) digital storefront, admin workspace, and real virtual try-on experience. This document consolidates owner decisions and the verified state of the current systems. It is the working reference for Lovable, GitHub, and Hatchable.

## 2. Brand and business identity

- Current public brand name: **Legacy Leather House (LLH)**.
- Retire visible legacy names: “TOP Fashion Leather Garments”, “Legacy Leathers”, “Zara”, “LM/LLM”.
- Business location: Zaryab Colony, Peshawar, Pakistan.
- WhatsApp: +92 332 8884141; https://wa.me/923328884141
- Facebook source supplied by owner: https://www.facebook.com/share/1AV6C6Cpu9/
- Currency: PKR.
- Supplied PDF and logo artwork uses “Legacy Leathers” and “Since 1998”. Use the artwork as a visual reference, but do not assert the founding date, global delivery, certifications, guarantees, material grades, policies, customer reviews, or stock as verified business facts without owner confirmation.
- Design: premium editorial leather atelier, espresso/obsidian, warm ivory, cognac, antique brass/gold, premium serif headlines, clean sans-serif body, restrained motion, strong genuine product photography, mobile-first, accessible, fast. Avoid generic marketplace or SaaS-template design.

## 3. Connected projects and repository audit

### Hatchable production foundation
- Project ID: `proj_NtlpIFfYd2MI`
- Project name: Legacy Leather House
- Slug: `top-fashion-leather`
- URL: https://top-fashion-leather.hatchable.site
- Version at audit: 57, deployed 24 Nov 2026.
- Keep this project and its database. Do not replace, reset, fork over, or make destructive edits during Lovable work.
- Public endpoint `/api/storefront?store=top-fashion-leather` was tested and returned HTTP 200.
- `/api/products` is declared `access='user'` and correctly returned 401 for an anonymous caller. It is not the anonymous storefront endpoint. Public catalogue data is served by `/api/storefront`.
- Current database workspace record still has the display name “Legacy Leathers”; this is a known brand mismatch to correct carefully.
- Current source tree includes storefront, product, variants, orders, checkout, content management/upload, community/reviews, admin operations, customer portal and admin pages, plus migrations. Inspect and preserve working code before editing.
- No project environment variables were declared in the inspected project metadata.
- Try-on API functions (upload/start/status/catalog/cleanup and avatar route) are disabled in the current project state.

### GitHub
- This repository, `AmjidOfficial/LLH`, was effectively empty at audit: only a 5-byte README. It is the intended canonical source-control destination.
- `AmjidOfficial/Fashion-Store` is a separate old generic static store. Its root contains `Fashion_Store.html`, duplicate `index.html`, `style.css`, README and two large generic images. The HTML promotes T-shirts, sunglasses, shirts, shoes, pants, perfumes, invented sale schedules and payment claims. It is not the current LLH source. Do not merge it into LLH or treat it as the source of truth.
- Preserve the legacy repo untouched. Reuse an asset only after checking that it is actually an LLH asset and the owner approves it.

### Lovable
- Existing project: “Legacylh”, ID `8cf60240-34ce-4eb2-bd8c-7fe8726c240a`.
- URL: https://lovable.dev/projects/8cf60240-34ce-4eb2-bd8c-7fe8726c240a
- Published project scaffold, last edited 21 Nov 2026.
- Earlier Lovable messages explicitly reported unresolved TypeScript/build errors in `made-to-measure.tsx`, `shop.tsx`, and `size-guide.tsx`; the earlier build had not been verified.
- Earlier admin implementation was demo-only, in-memory, and not secure. Missing at that time: full product create/edit form, content assistant, stock history and reports.
- A later OpenFit Room plan was written in this project. That is a separate future platform concept. LLH remains a single-business store.
- The latest Lovable message attempt was rejected because the workspace was out of credits. No new code changes were made by that attempted message. Workspace billing/credits must be restored before the Lovable agent can continue.

## 4. Verified current catalogue and data status

The live public storefront API returned 12 active catalogue-style jacket records:

Men:
- Classic Biker Jacket (LLH-M-001)
- Cafe Racer Jacket (LLH-M-002)
- Bomber Jacket (LLH-M-003)
- Vintage Leather Jacket (LLH-M-004)
- Suede Jacket (LLH-M-005)
- Hooded Leather Jacket (LLH-M-006)

Women:
- Women's Biker Jacket (LLH-W-001)
- Cropped Leather Jacket (LLH-W-002)
- Classic Leather Jacket (LLH-W-003)
- Long Leather Coat (LLH-W-004)
- Belted Leather Jacket (LLH-W-005)
- Suede Jacket (LLH-W-006)

For all 12 records at audit:
- Price is null / quotation required.
- Quantity on hand is 0.
- Stock status is availability to confirm.
- Try-on is disabled.
- The records are catalogue design references, not verified physical stock.
- Three demo records (bag, belt, jacket) are archived and marked demo. Never present them as real products.

At audit:
- No published customer reviews.
- No content posts or campaigns.
- No try-on guest sessions, try-on sessions, or avatar sessions.
- No verified stock movements or real AI job history were found in the checked tables.

## 5. Storefront requirements

- Public browsing without forced login.
- Home page with a clear luxury brand story and one main call to action.
- Searchable/filterable catalogue with men's and women's jacket styles.
- Product details, photo gallery, style/material notes, price-on-request and availability-to-confirm labels until verified.
- Bespoke / made-to-measure request with name, phone, selected style, leather, colour/finish, lining, body measurements, fit preference, notes and optional photo, plus clear consent.
- Measurement guide. Do not infer a definitive size from height/weight alone. Require actual measurements and a verified size chart.
- About/craftsmanship, contact, FAQ, privacy and terms pages.
- WhatsApp assisted ordering. Do not enable payments or checkout unless configured and explicitly approved.
- No invented claims, stock, reviews, exact material details, prices, delivery promises or guarantees.

## 6. Admin and community requirements

Admin and Super Admin must have real server-side access control. Required modules:
- Overview and reports based on real database records.
- Full product create/edit/archive/delete/restore and sold/out-of-stock state.
- Product variants by size/colour, SKU-level inventory, stock adjustments, stock movement history and low-stock rules.
- Upload/replace/delete product photos using protected upload handling.
- Price, quotation, confirmed price, special offer, start/end dates, publication status and product metadata.
- Posts, announcements, promotions and campaign scheduling with image upload, edit, replace, archive/delete and publish controls.
- Enquiries and orders with customer details, status, notes, follow-up, and WhatsApp-ready summaries.
- Customer feedback/reviews with moderation. New reviews remain pending and are not public until an admin approves them.
- Public like/love/save/share/comment features only when backed by real persisted records and moderation/abuse controls.
- Settings for brand, contact, location, policies and social links.
- Audit log for admin actions.
- No fake admin login, no client-only security, no localStorage-only persistence, and no fake metrics.

## 7. Virtual Try-On: owner decisions and architecture

Owner decisions:
- AI ownership: hybrid, with the model/inference stack owned and operated by LLH.
- GPU infrastructure: rent GPU compute.
- Initial product scope: full.
- Avoid dependence on a third-party virtual try-on API. The goal is LLH-controlled technology.

Required architecture:
1. Web studio accepts a real customer photo (upload or camera) and a real catalogue garment or customer-uploaded custom design.
2. Validate file type, size, dimensions and person/garment inputs. Require explicit consent.
3. Store source images privately; issue short-lived signed URLs only to authorized services.
4. Create an idempotent asynchronous job in the backend.
5. Dispatch to a separately deployable self-hosted GPU worker.
6. Worker runs a commercially permitted open-source VTON model after legal/license review. Keep model weights and GPU dependencies outside the normal web runtime.
7. Track queued/running/completed/failed states, progress, retries, timeout, errors and GPU health.
8. Worker returns a genuine generated image to private storage. The customer can preview, save, download or share it.
9. Admin can monitor jobs, errors, usage and retention.
10. Provide deletion/retention controls. No use of customer photos for model training without separate informed opt-in.

No fake result:
- A CSS overlay, composited garment card, static image or generated placeholder must never be described as a real try-on.
- If worker/model is unavailable, show a clear unavailable state and retain the WhatsApp enquiry path.
- Clearly distinguish catalogue inventory, made-to-order catalogue style, customer-uploaded custom design, and AI-generated output.
- Do not claim end-to-end try-on works until a real worker and model are connected and tested.

## 8. System and data safety

- Keep Hatchable as the current live backend and data source until a deliberate, tested migration is approved.
- Do not create a second unrelated database in Lovable and let the two diverge.
- Before connecting Lovable UI to Hatchable, inspect API contracts, CORS, auth/session behavior, access tiers and storage URL behavior.
- Never put secrets or API keys in frontend code or GitHub.
- Protect admin operations server-side and scope data to the LLH business.
- Use explicit consent, private storage, short retention, signed access, rate limits, idempotency and audit logs for photos and AI jobs.
- Do not delete production records or reset tables as part of redesign.

## 9. Required implementation and verification order

1. Inspect all existing Lovable files, dependencies, routes, integrations and current build diagnostics.
2. Fix known TypeScript errors in made-to-measure, shop and size-guide routes.
3. Rebrand all UI, metadata, PWA and admin to Legacy Leather House.
4. Complete the storefront without inventing product facts.
5. Complete persistent, secure admin and community workflows using real backend operations.
6. Establish a safe API adapter to the existing Hatchable project. Identify CORS/auth limitations before claiming integration.
7. Build the self-hosted GPU worker package and model integration plan with license checks.
8. Run build, typecheck, unit/integration tests and end-to-end tests.
9. Test public/member/admin access tiers, product CRUD, upload, enquiry/order, review moderation, privacy and try-on job lifecycle.
10. Report actual test results and blockers. Do not use “100% production ready” until every required flow has passed.

## 10. Design and content assets

- Supplied Legacy Leathers catalogue PDF: 8 pages, image-based; includes men's and women's jacket style references, bespoke process, and contact details from an older brand presentation. Treat old phone/email and claims as historical artwork only, not current contact data.
- Supplied logo board: embossed leather brown and antique gold LL monogram; full logo and simplified app icon.
- Supplied logo image: LL plaque with “Since 1998”. The visual style is a reference; current text lockup must read Legacy Leather House.
- A screen recording was uploaded to the conversation but is not accessible through the available file browser. Do not claim it was inspected.

## 11. Current next blockers

- Lovable workspace has no credits available. The agent rejected the latest build request before editing. Add credits/update plan before sending the consolidated build request again.
- LLH GitHub repo needs the actual source files mirrored/committed after Lovable/Hatchable ownership and sync path is confirmed.
- Hatchable try-on worker and model are not connected; no API key/provider integration exists, by design. Rented GPU worker setup and commercial model license review remain necessary.
- Brand mismatch “Legacy Leathers” remains in current live Hatchable database/UI and needs a carefully tested brand correction.
