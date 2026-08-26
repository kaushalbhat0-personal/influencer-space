# RCCF-COM-01 — Commerce Order Truth & Product/Service Consolidation — Closure

**Ticket:** RCCF-COM-01
**Date:** 2026-08-26
**Baseline release:** `76184aeb6e40e387c23c584b1bee73a2c6e126b9`
**Final verdict:** **B — IMPLEMENTED / PRODUCTION VERIFICATION REQUIRED**

---

## 1. Executive verdict

Two findings:

1. **Order-truth defect (fixed).** Razorpay's dedicated `payment_link.paid` webhook event was not handled — the DIRECT_CREATOR Payment Link reconciliation bridge ran only inside `payment.captured`. A creator account delivering only link events (or where captured is missed) left its `ProductOrder` PENDING forever while Razorpay already showed Paid. The product-order branch now accepts both events; everything downstream is unchanged.
2. **Products/Services audit (no consolidation).** Services are a genuinely separate domain: the admin Services surface persists to `Offering` (`type:"coaching"`) with Bookings/slots/approval and its own entitlement enforcement, while commerce Products (`Product.type`, which includes `"service"`) flow through checkout → `ProductOrder` → fulfillment. Per ticket §9 this is NOT duplicated UI over one resource, so **both surfaces are kept**. No data migration, no schema migration.

## 2. Production symptom & reconciliation

Dashboard showed 3 orders / ₹299 revenue / 1 Completed / 2 Pending. Key observation: the dashboard computes Revenue as the sum of **COMPLETED orders only**, so the successful ₹299 TEST payment almost certainly IS the Completed row; the two PENDING rows are consistent with pre-payment checkout attempts (checkout persists a PENDING order before the provider session). Without production DB access from this environment the row-level trace (§ Phase B identifiers) could not be executed; nothing was fabricated. What WAS proven by code trace — and fixed — is the structural path that makes "paid but pending forever" possible at all.

## 3. Payment/order state machine (canonical, unchanged)

```
checkout → ProductOrder(status=PENDING, providerReference=plink_*, providerMetadata.reconciliationRef)
Payment Link paid → webhook (payment.captured OR payment_link.paid)
  → signature gate → idempotency (BillingEvent keyed on payment id)
  → legacy notes path (PLATFORM_COLLECT) or DIRECT_CREATOR reconciliation
      (server-persisted identity: providerReference ∥ reconciliationRef notes;
       conflict/mismatch → refuse; strategy gate; exact amount authority)
  → completeProductOrder  [PENDING → COMPLETED, writes razorpayPaymentId,
                           creates exactly ONE OrderFulfillment via @unique]
Dashboard reads status directly (force-dynamic); COMPLETED renders "Paid".
```

No second state vocabulary exists or was introduced (`PAID` remains dead).

## 4. Webhook trace / root cause

`src/app/api/webhooks/razorpay/route.ts` handled only `payment.captured` + `order.paid` + `payment.failed` + `subscription.*` + `refund.*`. Razorpay emits **`payment_link.paid`** when a Payment Link is paid; its payload carries `payment_link.entity` AND the same `payment.entity`. Deliveries of that event fell through every branch with zero mutation. Fix: the product-order branch condition now accepts `payment_link.paid`; all inner paths (subscription guards, legacy notes path, D.6.1 reconciliation) work unchanged because they read `payment.entity`/link notes that plink.paid carries. Cross-event duplicates collapse through the existing payment-id idempotency key and the boundary's `already_completed` no-op.

## 5. Dashboard truth audit

`src/app/admin/orders/page.tsx`: `force-dynamic`, queries `fetchOrders(tenantId)` server-side, filters `status === "COMPLETED"` / `"PENDING"` — canonical fields, no cache layer, no transformation. `_components/order-presentation.ts` maps exactly the canonical vocabulary. Payment Links vs direct orders are represented uniformly post-reconciliation. No dashboard change needed or made — the transition, not the label, was fixed.

## 6. Products/Services architecture audit (Phase E classification)

| Surface | Runtime backing | Purchase path | Entitlements |
|---|---|---|---|
| Products (`/admin/products`) | `Product` model; `type ∈ {digital, physical, course, service, booking, affiliate, donation}` | storefront buy-now → checkout action → `ProductOrder` (+fulfillment type per taxonomy) | shared 3-item Launch ceiling |
| Services (`/admin/services`) | `Offering` model (`type:"coaching"`), slots, `bookable`, approval | `storefront-bookings.actions` → Booking/Purchase domain | own `withLaunchCoreContentCapacity` gates |

`Product.type="service"` is live runtime taxonomy (fulfillment strategies, generation engines, BI templates, orders UI grouping). Decision: **KEEP both surfaces** (§9 separate-domain branch); make no nav change; delete nothing. Zero data loss by construction.

## 7. Files changed

| File | Change |
|---|---|
| `src/app/api/webhooks/razorpay/route.ts` | product-order branch also accepts `payment_link.paid` (+ explanatory comment). One-line behavioral change. |
| `tests/unit/rccf-com-01-commerce-order-truth-and-service-consolidation.test.ts` | new focused suite (18 tests) |
| `docs/rccf-com-01-commerce-order-truth-service-consolidation-closure.md` | this document |

## 8. Test results

New suite 18/18: plink.paid completes PENDING→COMPLETED with exactly one fulfillment and zero subscription side effects; captured path unchanged; both-events-delivered → one completion/one capture event; duplicate delivery idempotent; amount mismatch refused; unmatched identity zero-mutation; tenant isolation under hostile payload claims; signature gate enforced on the new event; failed payments never complete; dashboard vocabulary guardrails; Offering/Product decision guardrails; bookings+entitlement wiring intact; schema taxonomy intact.

Regressions: commerce integrity d2–d55 **376/376**; D-chain d61–d75 + COM-01 **213/213** (single transient flake on first parallel run, clean rerun). Gates: tsc 0 · eslint 0 · build Compiled successfully · prisma valid · diff-check clean.

## 9. Responsive QA

No UI/CSS/layout file was modified in this RCCF (webhook-only fix), so responsive QA is N/A-by-scope; the existing Orders UI was not touched and remains covered by the d52x suites.

## 10. Production verification remaining

With TEST credentials in production: replay/deliver `payment_link.paid` for an order (or complete a fresh creator-direct TEST purchase) and confirm the dashboard flips it out of Pending without manual edits; safe duplicate-delivery replay for idempotency; then the standard §16 service create/publish/purchase walkthrough. Requires production creator session + Razorpay TEST keys — not available here; deferred honestly rather than fabricated.

## 11. Protected work & staging

`src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts`, and all unrelated dirty/untracked files untouched. No reset/stash/checkout/rebase/amend used. Staged exactly: the three files in §7. Commit: NOT CREATED · Push: NOT PERFORMED (per §20).
