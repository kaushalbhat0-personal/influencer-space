# Creator Revenue — Audit 07

## Product ownership & type model

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| Products have **no real type** (digital/physical) | ❌ | High | Low | NO | `Product` schema has no `type/downloadUrl/sku/stock`; admin UI type dropdown is cosmetic — `productService.mapProduct` hardcodes `type: "digital"` (`src/features/products/service.ts:14`), create/update omit it |
| `Offering` has a free-text `type` ("course","digital_product","membership"…) but no fulfillment fields | ⚠️ | Medium | Medium | YES | `prisma/schema.prisma:1277-1297` |
| No `Course` model (courses are `Offering` rows `type:"course"`) | ⚠️ | Low | Low | YES | `src/features/courses/service.ts:53` |
| Bookings have customer fields but **no payment/provider fields** | ⚠️ | High | Medium | YES | `Booking` schema:1324-1352 — `price/duration/slotDate/customerName/Email/Phone`; no payment ref |

## Fulfillment

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| **No download delivery** for digital products (no `downloadUrl`, no delivery key, no secure link) | ❌ | Critical | Medium | NO | grep: none in `src/`; `PurchaseService.fulfill` only flips status (`purchases.ts:63-68`) |
| **No shipping/fulfillment** for physical products | ❌ | Critical | Medium | NO | grep `shipping|address|fulfillment|delivery|tracking|courier` → only marketing copy |
| No success/receipt page after purchase | ❌ | High | Low | NO | no `/purchase|/order-success|/receipt` route |
| No receipt/download **email** — zero email infrastructure | ❌ | High | High | NO | no resend/nodemailer/sendgrid anywhere in `src/` |
| `fanEmail` never collected (BuyNowButton passes `""`) | ❌ | High | Low | YES | `buy-now-button.tsx:69` |

## Shipping fields (Part 7)

| Field | ProductOrder | Booking | Purchase |
| --- | --- | --- | --- |
| Customer name | ❌ | ✅ | ✅ |
| Customer email | ⚠️ `fanEmail` (never filled) | ✅ | ✅ |
| Customer phone | ❌ | ✅ | ❌ |
| Shipping line | ❌ | ❌ | ❌ |
| PIN / postal | ❌ | ❌ | ❌ |
| State / country | ❌ | ❌ | ❌ |
| Tracking number | ❌ | ❌ | ❌ |
| Courier | ❌ | ❌ | ❌ |
| Shipment status | ❌ | ❌ | ❌ |
| Download URL | ❌ | ❌ | ❌ |

**All shipping + fulfillment fields are missing** (no `ShippingAddress` model).

## Creator payout (does the money reach the creator?)

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| Money lands in the **platform** Razorpay account; **no transfer to creators** | ❌ | Critical | High | NO | single `NEXT_PUBLIC_RAZORPAY_KEY_ID`; no `transfers`/Route call in `src/` |
| `ProductOrder.routeTransferId` reserved but never read/written | ⚠️ | High | Low | YES | `schema.prisma:374`; grep: schema/docs only |
| `Tenant.razorpayAccountId` / `WebsiteAgency.razorpayAccountId` reserved, unused | ⚠️ | High | Medium | YES | `schema.prisma:50,201` |
| `PayoutBatch/PayoutReservation` are partner-commission-only (keyed on `partnerId`, `commissionEntryId`) | ⚠️ | Medium | Medium | YES | `schema.prisma:1588-1631` |

## Add-ons (Part 11)

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| `ai_credits`, `storage_pack`, `theme_packs` are **config-only** (`// future add-on`); no purchase path | ❌ | High | Medium | YES | `src/config/commerce/plans.ts:31-33`; reserved `addon_*` codes in `constants.ts:140` |
| A creator cannot buy more storage/AI credits today | ❌ | High | Medium | YES | no add-on checkout action/route |

## Coupons / Launch programs (Part 15)

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| DB `Coupon`/`LaunchProgram` are Super-Admin CRUD **only** — not read at checkout | ❌ | High | Medium | YES | `schema.prisma:792-811`; `super-admin-pricing.actions.ts` |
| Checkout uses a **hardcoded in-memory** coupon map (`LAUNCH10/CREATOR25/FLAT100`) with non-persistent counters | ❌ | High | Low | NO | `src/lib/commerce/coupons.ts:25-29` |

## Super Admin configurability (Part 15)

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| Platform/agency/referral/creator splits configurable at runtime (`CommissionPolicy`) | ⚠️ | Medium | Medium | YES | `schema.prisma:1019-1032`; `super-admin-billing.actions.ts:98-117` |
| Engine is **in-memory**, not DB-backed → splits don't apply reliably | ❌ | High | Medium | YES | `commission/rules.ts:4`; `saveRule` never called |
| Per-agency / per-creator rev-share has **no runtime edit path** (`AgencyTenant.revSharePercent` set only at provisioning) | ❌ | High | Medium | YES | `schema.prisma:221-222`; `partner-relationship.ts:61-62` |

## Security (Part 16)

| Finding | Status | Severity | Evidence |
| --- | --- | --- | --- |
| Order amounts server-derived (product price + server coupon + tax) — **not client-controlled** | ✅ | — | `checkout.actions.ts:36-66` |
| planCode validated server-side against catalog | ✅ | — | `billing/service.ts:367-368` |
| `verifyPayment` marks COMPLETED on HMAC **without re-verifying the captured amount** | ❌ | High | `checkout.actions.ts:149-175` |
| Webhook product branch trusts notes, **no amount check, no idempotency record** | ❌ | High | `route.ts:132-150` |
| Plan fallback `notes.planCode || "creator_launch"` can silently activate the free tier | ⚠️ | Medium | `route.ts:95` |
| Invoice amount from **plan price, not paid amount** → divergence risk | ⚠️ | Medium | `billing/service.ts:91,232` |
| In-memory coupon counters non-atomic / non-persistent | ⚠️ | Medium | `coupons.ts:77-78` |
| Webhook signature solid (HMAC + timingSafeEqual + rate limit) | ✅ | — | `route.ts:47-61` |
