# RCCF-72.18D.6.1 — DIRECT_CREATOR Payment Link Reconciliation & Signed E2E — Closure

## 1. Executive Verdict

**A — IMPLEMENTED AND VERIFIED.** Staged, NOT committed, NOT pushed.

A customer paying a creator's Razorpay Payment Link now deterministically
completes the exact ProductOrder through the canonical completion boundary,
exactly once, via the real HMAC-signed webhook path. All verification gates
pass; all D-chain regression suites stay green; DIRECT_CREATOR remains
`status: "future"`.

## 2. Original P1 Finding (RCCF-72.18D.6)

> P1-1: A customer can successfully pay a creator's Razorpay Payment Link, but
> the corresponding ProductOrder can remain PENDING because the current
> `payment.captured` completion path expects `notes.orderId/productId`, while
> Payment Links do not reliably carry those notes.

## 3. Audit Evidence (Phase 1)

| Question (ticket §9) | Finding |
|---|---|
| Identifier stored at link creation | `link.id` (`plink_…`) persisted in BOTH `ProductOrder.providerReference` and `razorpayOrderId`; `short_url` in `providerMetadata.checkoutUrl` (`payment-account.actions.ts` createDirectCheckout) |
| Link `reference_id` / notes at creation | `reference_id = input.productId`, `notes = { referenceId, creatorStore: "true" }` (`providers/razorpay.ts` createCheckout) |
| Why captures never complete orders | Webhook `payment.captured` product block requires `notes.productId && notes.orderId` (route.ts). Plink payments carry neither key → block never runs → PENDING forever. The wire `payment.order_id` for a plink payment is a Razorpay-internal order id that is stored nowhere in our DB. |
| Provider lookup required? | **No.** Razorpay propagates Payment Link notes onto payments made through the link; combined with server-persisted identity this reconciles without any provider API call and WITHOUT decrypting credentials. |
| Existing payment-link lookup code | None found repo-wide (grep `payment_link\|plink\|PaymentLink`) beyond link creation itself. |
| Canonical completion boundary | `completeProductOrder` (`src/modules/billing/application/order-completion.ts`) — idempotent (`already_completed`), state-gated (`not_pending`), atomic quota reservation + fulfillment activation. Confirmed as the single authority; reused unchanged. |
| Historical PaymentAccount requirement | Not needed for reconciliation (webhook-only design); binding remains intact on every order for the D.4 refund path. |

## 4. Root Cause & Identity Mapping (Phase 2)

- **Root cause:** identity mismatch — checkout persisted a plink reference but
  the webhook could only resolve orders through legacy order-notes keys.
- **Non-unique legacy signal:** the plink's `reference_id` is the *productId*;
  several PENDING orders can share one product, so it can never identify an
  order by itself.
- **Canonical mapping implemented (server-persisted only):**
  1. **PRIMARY** — any provider plink id surfaced by the signed payload
     (`payload.payment_link.entity.id` or `payment.entity.payment_link`)
     matched by exact equality against `ProductOrder.providerReference`
     (DIRECT_CREATOR-filtered). Also covers **legacy orders** created before
     this change.
  2. **FALLBACK** — `notes.reconciliationRef`: a per-checkout
     `crypto.randomUUID()` minted server-side in `createDirectCheckout`,
     attached to the link notes via the adapter, and persisted inside
     `providerMetadata.reconciliationRef`. Matched by exact JSON-path equality.
  - If both signals resolve they MUST agree on the same order; disagreement ⇒
    refuse with zero mutation.

Never trusted: tenant/product/email/any client- or provider-supplied identity
field; amount alone; webhook-body tenant claims.

## 5. Implementation Changes

| File | Change |
|---|---|
| `src/modules/payment-account/providers/types.ts` | Add optional `order.metadata?: Record<string,string>` to `PaymentCheckoutInput` |
| `src/modules/payment-account/providers/razorpay.ts` | Merge `input.order.metadata` into Payment Link `notes` (additive; existing keys unchanged) |
| `src/actions/payment-account.actions.ts` | `createDirectCheckout` mints `reconciliationRef` UUID, passes it as adapter metadata, persists it in `providerMetadata` alongside `checkoutUrl` (+ `node:crypto` import) |
| `src/modules/billing/application/direct-creator-reconciliation.ts` (**NEW**) | Trusted server-side reconciliation boundary `reconcileDirectCreatorPaymentLinkPayment()` — identity resolution, strategy gate, state gate, amount authority, canonical completion, BillingEvent dedupe |
| `src/app/api/webhooks/razorpay/route.ts` | Extend payload type with optional `payment_link` entity; guarded reconciliation call inside `payment.captured` ONLY when the legacy `productId && orderId` block did not run |

No schema/migration change (existing columns sufficient — ticket §25 honored).
No new Razorpay client; adapter-only (ticket §24 honored).

## 6. Canonical Completion Boundary

`completeProductOrder(order.id, { paymentId })` is invoked unchanged — quota
reservation, PENDING→COMPLETED transition, `razorpayPaymentId` write and
`ensureFulfillment` are all the existing single-authority implementation.
Nothing is duplicated inside the webhook or the reconciliation module.

## 7. Safety Invariants Delivered

- **Amount authority:** integer paise, `Math.round(captured) === Math.round(order.amount × 100)`; under/over/malformed/missing amounts refuse with zero mutation (captureError diagnostics). No partial-payment semantics invented. ₹0 expected vs non-zero captured refuses structurally.
- **Strategy isolation:** resolution queries filter `commerceStrategy = "DIRECT_CREATOR"`; explicit defense-in-depth re-validation after resolution. PLATFORM_COLLECT orders always carry both legacy notes and never reach the branch (guarded `if (!(productId && dbOrderId))`).
- **State safety:** COMPLETED → idempotent success no-op (no quota, no fulfillment, no duplicate event); FAILED/CANCELLED/refund states → refused; only PENDING completes — enforced by both the module and the canonical boundary.
- **Tenant isolation:** the tenant comes from the resolved server row only; forged `notes.tenantId` is ignored (asserted by test: BillingEvent.accountId = row tenant).
- **Historical PaymentAccount:** zero `paymentAccount` lookups and zero credential decryptions during reconciliation (spy-asserted). The historical binding stays untouched for the D.4 refund path.
- **Idempotency:** established `razorpay_payment_captured_product_<payId>` BillingEvent key + DB unique constraint collapse sequential AND concurrent duplicate deliveries to exactly one completion / one quota slot / one fulfillment.
- **Webhook security:** untouched D.5.5 HMAC-SHA256 raw-body verification, timing-safe compare, length guard, malformed-JSON 400 handling; invalid signatures ⇒ 401 with ZERO database mutation (tested against plink-shaped payloads).

## 8. Test Matrix — `tests/unit/rccf72-18d61-payment-link-reconciliation.test.ts` (35 tests)

Route-level against the REAL `POST` handler with REAL signatures (mocked
boundaries: prisma store + canonical-boundary emulation of its exact contract).

- **Identity (7):** plink-entity-id match; token-only match; legacy plink-only match; `payment.entity.payment_link` field match; unknown identity no-mutation; wrong-link B≠A; conflicting identities refused.
- **Completion/state (3):** underpayment, overpayment, malformed(zero)-amount all refuse no-mutation; already-COMPLETED idempotent no-op; FAILED never resurrected.
- **Strategy (2):** PLATFORM_COLLECT legacy notes path completes end-to-end UNTOUCHED; PLATFORM_COLLECT row with identical plink value never matched by creator reconciliation.
- **Tenant (2):** forged wire tenant ignored (server-row authority); foreign creator's payment cannot cross-complete.
- **Account (1):** no paymentAccount lookup / no decryption during reconciliation.
- **Signature (8):** missing / invalid / wrong-secret / short-malformed / tampered-after-signing / valid-sig-non-JSON(400) / unconfigured-secret(500) / plus valid-signature acceptance exercised throughout.
- **Idempotency (3):** triple sequential delivery → one completion; CONCURRENT duplicates → one completion+one fulfillment+one event; independent payments/orders independent.
- **Ordering (3):** delayed capture completes; failed-then-captured; capture-then-duplicate stays single-completion.
- **Failure safety (3):** empty entity safe-200 no-mutation; infra error caught safe; quota refusal leaves order PENDING with zero partial side effects.
- **Checkout-side (2):** UUID reconciliationRef passed to adapter AND persisted identically in providerMetadata; failed provider checkout persists nothing.

## 9. Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ pass (exit 0) |
| `npm run lint` (eslint on all touched files) | ✅ pass (new files clean) |
| `npm run build` | ✅ pass (production build succeeded) |
| `npx prisma validate` | ✅ schema valid |
| `git diff --check` | ✅ clean (exit 0) |
| D.6.1 suite | ✅ 35/35 |
| Focused regressions: D.2, D.3, D.4, D.5.1, D.5.2-A/B/C/D, D.5.5 | ✅ 376/376 (11 files) |
| rccf67 / rccf69 commerce integrity, rccf38 order metering | ✅ 65/65 |
| commerce-strategy, fulfillment suites | ✅ 10/10 |
| Full suite `npx vitest run` | 4213 passed / 15 failed in 8 files — **all pre-existing**, see §10 |

## 10. Pre-existing Failure Classification (never hidden)

The 15 failures live exclusively in RCCF-70.4.3 dashboard and RCCF-71.x
theme/entitlement source-token guardrails (e.g. asserting tokens inside
`src/lib/publishing/service.ts`, `src/components/storefront/StorefrontPage.tsx`,
dashboard components).

Proof of pre-existence:
1. Every file those suites assert on was ALREADY modified (` M`) in the
   session-start baseline `git status --short`, captured BEFORE any D.6.1 edit
   (inherited in-flight protected work).
2. None of those test files references ANY D.6.1 surface (grep over all 7
   failing files for `webhooks/razorpay|payment-account|order-completion|direct-creator-reconciliation`
   returned zero matches).
3. No stash/checkout/reset was used at any point; working tree mutations since
   baseline are exactly the six D.6.1 files listed in §13.

Per ticket §31 these are classified pre-existing/unrelated and were neither
hidden nor "fixed" out of scope.

## 11. Protected-Work Verification (§33/§34)

- Baseline captured before edits (`git status --short`, staged/unstaged stats).
- The four modified files carry staged D-chain content; index-vs-worktree diffs
  (`git diff -- <file>`) show ONLY D.6.1 hunks atop the staged blobs:
  `types.ts +8/-0` (metadata field + doc), `razorpay.ts +11/-1` (notes merge),
  `payment-account.actions.ts +23/-2` (refund/D.3/D.4 functions byte-identical),
  `route.ts +37/-0` (D.5.5 semantics byte-identical, additive block only).
- No git reset/checkout/restore/clean/stash/amend/rebase performed anywhere.
- Unstaged protected work (70.x/71.x/dashboard/builder/settings/theme/
  publishing/construction/fixtures/e2e) left untouched.

## 12. Deferred Items (explicit non-goals honored)

- DIRECT_CREATOR activation & registry status (still `future`).
- Credential provider-API verification (D.6.2 scope).
- `payment_link.paid` / `payment_link.cancelled` event handling (payment.captured
  is authoritative for money movement; additional link-lifecycle events remain
  unhandled fall-throughs, safe 200 no-ops).
- payment.failed diagnostics for plink-shaped deliveries (wire `order_id` is an
  internal Razorpay order id not present in our DB — failure reasons for these
  orders are not persisted; no mutation, no crash).
- Inventory / refund-revocation / notifications / portal redesign — later RCCFs.

## 13. Exact Staged Files

```
src/app/api/webhooks/razorpay/route.ts
src/actions/payment-account.actions.ts
src/modules/payment-account/providers/types.ts
src/modules/payment-account/providers/razorpay.ts
src/modules/billing/application/direct-creator-reconciliation.ts   (new)
tests/unit/rccf72-18d61-payment-link-reconciliation.test.ts        (new)
docs/rccf-72.18d6.1-payment-link-reconciliation-closure.md         (this file)
```

## 14. Git State at Closure

- Commit: **NOT CREATED**. Push: **NOT PERFORMED**.
- Staging: surgical (§13 only); `git diff --cached --check` clean;
  pre-existing staged D-chain content verified intact (§11).
- `COMMERCE_STRATEGY_REGISTRY.DIRECT_CREATOR.status === "future"` — unchanged
  (registry file untouched; activation gates `status === "active"` untouched).

## 15. Recommendation

D.6.1 closes P1-1. With P1-2 (credential provider verification / accepted-risk
gate) remaining open in D.6.2, DIRECT_CREATOR activation readiness now hinges
solely on that follow-up RCCF.
