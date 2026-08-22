# RCCF-72.18D.5.5 — DIRECT_CREATOR Webhook Production Hardening & Signed E2E — Closure Report

## 1. Verdict

**A — IMPLEMENTED AND VERIFIED.**

Signed webhook E2E coverage (WEBHOOK-01) is closed with real HMAC verification
never bypassed; `X-Razorpay-Failure-Reason` handling (WEBHOOK-02) is implemented
with zero schema change; one genuine financial-integrity defect in the webhook's
processed path was found and fixed (lost-update under concurrent legitimate
refunds). DIRECT_CREATOR remains `future`. **Commit NOT created; push NOT performed.**

## 2. Audit

- Route (`src/app/api/webhooks/razorpay/route.ts`): HMAC-SHA256 over the raw
  body with `RAZORPAY_WEBHOOK_SECRET`, `timingSafeEqual` + length guard → 401;
  BillingEvent-idempotent per event family.
- Supported event vocabulary (verified, none invented): `subscription.*` set,
  `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`,
  `refund.failed`.
- DIRECT_CREATOR reconciliation: order located ONLY by server-persisted
  `razorpayPaymentId`; strategy-gated to `DIRECT_CREATOR`; PLATFORM_COLLECT
  keeps its commission-reversal path; dedupe key
  `product_refund_webhook_<refundId>` on the unique `BillingEvent.idempotencyKey`
  (DB-level atomicity).
- Gaps found: no negative-signature tests; no concurrency tests; unknown-order /
  malformed-entity paths untested; failure-reason header never read (the prior
  audit's open item); `JSON.parse` of a validly-signed non-JSON body crashed the
  handler; **the processed-refund write computed totals from a pre-transaction
  read and issued an absolute write — two different legitimate refunds racing
  could lose an update (ledger shrank below provider truth).**
- Baseline measured before edits: D.5.1+D.4 suites 64/64 green; index carried
  30 protected staged files; 400 working-tree entries of unrelated in-flight work.

## 3. Implementation

| File | Change |
|---|---|
| `src/app/api/webhooks/razorpay/route.ts` | (1) WEBHOOK-02: sanitize + persist `X-Razorpay-Failure-Reason` for product orders. (2) Strictly-typed payload after a guarded parse → 400 instead of an unhandled crash. (3) Atomic refund application cycle (below). |
| `tests/unit/rccf72-18d55-webhook-hardening.test.ts` | NEW — signed route-level E2E suite, 28 tests / ~90 assertions. |
| `tests/unit/rccf72-18d5.1-refund-ledger-integrity.test.ts` | Mock-infrastructure modernization ONLY: tx client gained `productOrder.findUnique/updateMany` emulations required by the new atomic cycle. Zero assertions changed. |
| `docs/rccf-72.18d5.5-webhook-production-hardening-closure.md` | NEW — this document. |

### Atomic refund apply-cycle (replaces stale-read absolute write)

Inside ONE interactive transaction: re-read base ledger → clamp delta to fresh
headroom → conditional update (`WHERE refundAmount = <base>` with `{ increment }`
so the database performs the arithmetic) → derive PARTIAL/REFUNDED from applied
totals → create the dedupe BillingEvent LAST so a duplicate same-refund-id
delivery losing the unique constraint rolls back its money write. NOOP audit
events record truthful outcomes (no headroom / ledger moved concurrently).

## 4. Signature Security

Real contract tested end-to-end through the exported `POST`: valid signature
applies; invalid hex, missing header, wrong secret, length-mismatched garbage,
and post-signing payload tampering each → 401 with ZERO mutations; valid
signature over non-JSON bytes → new guarded 400; unset secret → 500. The
signing helper uses the repository's exact semantics (raw body string,
`createHmac("sha256", secret)`), matching the canonical harness introduced in
D.5.1 — never bypassed.

## 5. Refund Reconciliation

Preserved D.5.1 semantics, now race-safe and test-pinned: sequential partials
accumulate exactly; full-after-partial lands REFUNDED at precisely the captured
amount; over-reporting clamps to remaining at application time; refund.failed
never mutates `refundAmount` and can never downgrade settled states; late
processed after synchronous failure recovers truthfully. Invariant
`0 <= refundAmount <= captured` asserted after every scenario. Integer paise
throughout; no floating-point arithmetic.

## 6. Idempotency

Fast-path gate on `BillingEvent.idempotencyKey = product_refund_webhook_<refundId>`
(unique index = DB-level atomicity), reinforced by in-transaction creation so
racing duplicates cannot double-apply even when both pass the gate. Different
refund ids remain independent; failed→processed and processed→failed for the
same id are deterministic (first outcome owns the key); no cross-tenant/order
key collisions (provider-global refund ids).

## 7. Failure Reason (WEBHOOK-02)

`X-Razorpay-Failure-Reason` is provider-controlled text: control characters are
stripped, whitespace collapsed, value capped at 256 chars. Persisted ONLY when
a PENDING ProductOrder matches the Razorpay order id persisted at checkout
(server-side identity — nothing tenant-derived trusted from the wire):
merged into the existing `providerMetadata` Json field plus a deduped
`PAYMENT_FAILED_PRODUCT` BillingEvent (`razorpay_payment_failed_product_<paymentId>`)
for audit. No schema migration (no suitable column existed on ProductOrder;
PayoutBatch/Settlement failureReason columns belong to other domains).
Completed/settled orders are never mutated; subscription `payment.failed`
handling untouched (regression-tested). The reason is durable operator
diagnostics only — it is never echoed in responses, and creator-facing error
wording remains the D.5.2-D safe contract.

## 8. Tenant Safety

Webhooks carry no tenant signal by design: order lookup uses provider payment /
order identities only; strategy gate isolates PLATFORM_COLLECT; historical
PaymentAccount binding is resolved exclusively inside D.4 (unchanged this
ticket) — the webhook never touches PaymentAccount or credentials. Cross-
tenant mutation via webhook is structurally impossible (tested: foreign/
unknown payment ids produce zero mutations).

## 9. Tests

New suite `rccf72-18d55-webhook-hardening.test.ts`: signature security 8,
reconciliation 6, concurrency/idempotency 5, failure-reason 9 — 28 tests,
~90 assertions (targets were 10/15/5/8 assertions — exceeded). Harness includes
DB-realistic unique-constraint rejection and journaled transaction rollback.

## 10. Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (clean on all touched files) |
| `npx prisma validate` | PASS (schema untouched) |
| `git diff --check` | PASS |
| Focused D.5.5 | 28/28 |
| Adjacent regression | D.3+D.4+D.5.1+D.5.5 = 111/111; D.5.2-A/B/C/D + billing-v2 + commerce-strategy = 292/292 |
| `npm run build` | PASS — compiled, type-checked, 160/160 routes |

## 11. Protected Work

Baseline captured (400 working-tree entries / 30 staged chain files). Working-
tree delta vs index after implementation = exactly the two modified source/test
files above plus the new artifacts; all other protected areas (RCCF-70/71,
dashboard, builder, settings, theme, publishing, construction.actions.ts,
fixtures, E2E, D.4–D.5.2-D) byte-identical to baseline. No reset/checkout/
stash/clean/amend used.

## 12. Exact Staged Files

```
src/app/api/webhooks/razorpay/route.ts                      (D.5.5 hunks merged onto staged D.5.1 work)
tests/unit/rccf72-18d5.1-refund-ledger-integrity.test.ts    (tx-mock modernization hunk)
tests/unit/rccf72-18d55-webhook-hardening.test.ts           (new)
docs/rccf-72.18d5.5-webhook-production-hardening-closure.md (new)
```

## 13. Deferred

- Creator-facing surfacing of sanitized failure reasons in the drawer (data now
  exists in providerMetadata; UI exposure belongs to a future UX ticket).
- Razorpay retry/backoff simulation beyond duplicate-delivery scope.
- Per-type transition restriction in fulfillment (prior ticket note).
- DIRECT_CREATOR activation audit — explicitly out of scope; status unchanged.

## 14. Git

- Commit: NOT CREATED
- Push: NOT PERFORMED
- COMMERCE_STRATEGY_REGISTRY.DIRECT_CREATOR.status = "future" (untouched)
