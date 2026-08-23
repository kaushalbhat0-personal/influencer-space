# RCCF-MKT-02-R2 — SPower Gaming Storefront Truthful Demo + Canonical Storefront Assets Closure

**Ticket:** RCCF-MKT-02-R2 (follow-up to RCCF-MKT-02-R1 marketing-truth work)
**Date:** 2026-08-23
**Status:** Complete
**Scope:** Make `http://localhost:3000/spower-gaming` a fully truthful, publishable demo storefront (real product imagery, working WhatsApp CTA, real Razorpay TEST-mode purchase end-to-end) and replace the deferred canonical marketing assets `public/marketing-assets/storefront/01-desktop.png` and `02-mobile.png`.

---

## 1. Objective Recap

R1 established the marketing-truth contract (real data only, no placeholder/mojibake content) but deferred two canonical storefront captures and had not exercised the commerce CTAs against real providers. R2 closes both gaps:

1. Product/game imagery on the SPower Gaming storefront (was text-only cards).
2. WhatsApp CTA verification against the owner-designated number.
3. Razorpay TEST-mode checkout executed end-to-end (order → hosted payment link → paid → webhook reconciliation → fulfillment row), including idempotency proof.
4. Canonical asset replacement at exact original dimensions.

## 2. Tenant / Data Context

- Tenant: **SPower Gaming**, slug `spower-gaming`, tenantId `9ac022f0-5860-4fb3-a2bd-54fed1c68de0`.
- Theme: Neon Dark; site published at **v4** (status Live).
- Products: "Creator Demo — Gaming Setup Guide" (₹199) and "Creator Demo — Gameplay Review" (₹299), productIds per DB (`9520d862-…` for Gameplay Review).
- Plan: upgraded **creator_launch → creator_grow (Creator Growth, Active)** via the real super-admin UI (TenantLedger ⋮ → Manage Plan → "Set to Creator Growth (Active)"), owner-directed, because the launch plan's lifetime 3-publish quota was exhausted. Grow plan allowance: 10 publishes/month, resets 2026-08-31. Publish of v4 succeeded post-upgrade ("0 of 10 used").
- Payment rail: platform keys are **live** → `PLATFORM_COLLECT` is forbidden. Tenant has a TEST-mode Razorpay PaymentAccount (key id redacted here: `rzp_test_TLZ…Rv9D`, secret stored encrypted). All checkout ran in Razorpay **Test Mode** via `DIRECT_CREATOR`.

## 3. What Was Done

### 3.1 Product imagery (real admin flow)
- Generated two neutral gradient tiles locally (.NET System.Drawing, no external fetches).
- Uploaded through the real admin product editor (`/admin/products` → Edit → media field → "Choose from Library" → Upload New → Update) — not by direct DB writes:
  - `Gaming Setup Guide` → guide tile
  - `Gameplay Review` → review tile
- Storefront now renders 3 real `<img>` elements (hero background + two product images), 0 unloaded.

### 3.2 WhatsApp CTA verification
- CTA href verified on the live storefront:
  `https://wa.me/917666940844?text=Hi!%20I'd%20like%20to%20order%3A%20Creator%20Demo%20%E2%80%94%20Gaming%20Setup%20Guide%0APrice%3A%20%E2%82%B9199`
- Number `7666940844` is the owner-designated demo recipient.
- Confirmed **zero** `ProductOrder` rows exist for the tenant before checkout (compose-only deep link; no order side effects).

### 3.3 Razorpay TEST checkout (end-to-end)
- Buy Now → email step (`fan.demo@creatorstore.test`) → redirect to Razorpay-hosted **Payment Link** (`plink_TTB5miPMts90gX`), Test Mode banner shown, receipt = platform reconciliationRef `f4e20f21-efc2-495d-9bc2-04567fea5288`, amount ₹299.
- `DIRECT_CREATOR` hosted-link completion reconciles **only** via the signed webhook (`/api/webhooks/razorpay` → `reconcileDirectCreatorPaymentLinkPayment`); webhooks cannot reach localhost, so the owner completed the TEST payment manually in the hosted page (automation is blocked by Razorpay's PerimeterX bot defense) and a **signed webhook relay** was used locally:
  - Fetched the real link + payment entities from Razorpay (`GET /v1/payment_links/plink_TTB5miPMts90gX` — note underscore path; the hyphenated variant 404s on this account).
  - Built the canonical `payment_link.paid` event payload, signed HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET` over the raw JSON body, POSTed to `http://localhost:3000/api/webhooks/razorpay` → `200 {ok:true}`.
- Result (DB, verified):
  - Order `cmt5nxv5k0000rshhpem50ium`: **COMPLETED**, `razorpayPaymentId = pay_TTBbrW0Mp99jGa`, paymentAccountId bound.
  - `BillingEvent` `PAYMENT_CAPTURED_PRODUCT`, idempotencyKey `razorpay_payment_captured_product_pay_TTBbrW0Mp99jGa`.
  - Exactly **one** `OrderFulfillment` row (`708d9f8b-…`, status pending) — no duplicates.
- **Idempotency proof:** the signed webhook was relayed a **second** time → `200 {ok:true}`, and re-inspection showed the same single fulfillment row and `billingEventCount = 1`.
- Provider-side truth: link status `paid`, `amount_paid = 29900`, payment `pay_TTBbrW0Mp99jGa` captured (test card), `order_TTB5ojcehWrCif`, notes echo the platform `reconciliationRef`.

### 3.4 Canonical asset replacement
- `public/marketing-assets/storefront/01-desktop.png` — replaced, **1440×900** (original dims preserved), viewport capture, top-of-page, all imagery loaded, no dev overlay.
- `public/marketing-assets/storefront/02-mobile.png` — replaced, **390×844**, no horizontal overflow (`scrollWidth 390 == clientWidth 390`).
- Both captures show the truthful storefront (real imagery, real copy, real socials/CTAs).

## 4. Verification Gates

| Gate | Result |
| --- | --- |
| `tests/unit/rccf-mkt-02r1-marketing-truth.test.ts` + homepage-structure | ✅ 2 files / 30 tests passed |
| `rccf72-18d61-payment-link-reconciliation` + `rccf69-commerce-integrity` + `rccf72-18d2-product-order-refund-binding` | ✅ 3 files / 71 tests passed |
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx eslint` (touched paths) | ✅ exit 0 |
| `npm run build` (prisma generate + next build) | ✅ success |
| `npx prisma validate` | ✅ valid |
| `git diff --check` | ✅ clean (pre-existing CRLF warnings on unrelated fixtures only) |

Note: the production build temporarily corrupted the running dev instance's `.next` (HTTP 500 on the storefront); the dev server was restarted and the storefront re-verified at HTTP 200 (≈64 KB HTML) before closure.

## 5. Techniques / Notes for Future Tickets

- Razorpay Payment-Link **reads** on this account require the underscore route `/v1/payment_links/{id}`; `/v1/payment-links/{id}` returns routing 404. `POST /v1/payments/create/json` is not available; payments list/fetch endpoints work normally.
- Razorpay hosted payment pages deploy PerimeterX bot defense — Playwright cannot complete them (form stays invalid; fingerprint probes blocked). Manual TEST-mode completion + signed webhook relay is the reliable localhost pattern. The relay must sign the **raw** body bytes with `RAZORPAY_WEBHOOK_SECRET`.
- Playwright file uploads are restricted to allowed roots (repo root / `.playwright-mcp`); product-card CTAs have continuous animations, so `locator.click()` fails actionability ("element is not stable") — use `page.evaluate` clicks for those.
- Ad-hoc prisma inspection scripts must set `DATABASE_URL` from `.env.local` before `npx tsx`.

## 6. Cleanup

- Removed temp artifacts: repo-root `rccfmkt02r2-storefront-desktop-check.png`, `.playwright-mcp/rccfmkt02r2-hero-bg.png`, `rccfmkt02r2-prod-guide.png`, `rccfmkt02r2-prod-review.png`.
- `.playwright-mcp` contains older session artifacts from other work — left untouched.
- Demo records (order, billing event, fulfillment, published site v4) intentionally **kept**: they are the live truthful demo state the ticket exists to produce.

## 7. Security

- All credentials (superadmin/creator demo passwords, Razorpay key secrets) are excluded from this document, from source, and from the commit. Key identifiers above are order/link/payment IDs only.

## 8. Staged Changes (this ticket)

- `public/marketing-assets/storefront/01-desktop.png` (replaced, 1440×900)
- `public/marketing-assets/storefront/02-mobile.png` (replaced, 390×844)
- `docs/rccf-mkt-02r2-spower-gaming-storefront-asset-closure.md` (this file)

R1's previously staged set and all unrelated working-tree changes (docs/marketing-assets screenshots, storefront component edits from other tickets) are untouched and remain unstaged/untouched as applicable.
