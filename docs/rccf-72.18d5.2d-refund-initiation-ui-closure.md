# RCCF-72.18D.5.2-D — Refund Initiation UI — Closure Report

## 1. Executive Verdict

**Verdict: A — IMPLEMENTED AND VERIFIED.**

The creator can now initiate a creator-direct refund from the existing order
detail drawer through the UNCHANGED D.3/D.4 server pipeline, with D.5.1 ledger
semantics fully preserved. Server truth is refreshed after every outcome; the
server remains the sole authority. Work is **staged, not committed, not pushed**.

## 2. Audit Findings

### Existing D.3/D.4 contract (consumed as-is — ZERO backend changes)

- **D.3 `requestProductOrderRefund({orderId, amountPaise})`**
  (payment-account.actions.ts:154): role-guarded (creator/SUPER_ADMIN),
  tenant-isolated, requires `commerceStrategy === "DIRECT_CREATOR"`, historical
  `paymentAccountId` bound to the same tenant, captured payment, COMPLETED
  order, integer paise > 0 ≤ remaining headroom. Reservation is EXCLUSIVELY
  the atomic conditional status update `NONE/PARTIAL/FAILED → PENDING`
  (refundAmount is NEVER written at initiation — D.5.1). Codes: UNAUTHORIZED,
  NOT_FOUND, FORBIDDEN, INVALID_STRATEGY, MISSING_PAYMENT_ACCOUNT,
  INVALID_PAYMENT_ACCOUNT, NO_CAPTURED_PAYMENT, INVALID_ORDER_STATUS,
  INVALID_AMOUNT, AMOUNT_EXCEEDS_REMAINING, REFUND_IN_PROGRESS,
  CONCURRENT_MODIFICATION.
- **D.4 `executeProductOrderRefund({orderId, amountPaise})`**
  (payment-account.actions.ts:299): re-validates everything against fresh
  state, decrypts creator credentials in memory only, executes via Razorpay,
  transitions PENDING → PARTIAL/REFUNDED (writes refundAmount once, provider-
  confirmed) or PENDING → FAILED (writes ONLY status — full headroom stays
  retryable). Idempotency via `product_refund_initiated_<orderId>` BillingEvent.

### Refund state machine (existing, unchanged)

```
NONE/PARTIAL/FAILED ──(D.3, atomic guard)──► PENDING
PENDING ──(D.4 success, amount<original)──► PARTIAL   (refundAmount += executed)
PENDING ──(D.4 success, amount=original)──► REFUNDED  (refundAmount += executed)
PENDING ──(D.4 provider failure/error)────► FAILED    (refundAmount untouched)
Webhook reconciliation (D.5.1 chain) remains authoritative for async truth.
```

### Eligibility gap + resolution

The D.5.2-A projection did not carry `commerceStrategy` or payment-account
binding presence, so the UI could not render "Request Refund" only when
eligible. Resolution: ONE server-derived boolean `refund.eligible` added to the
projection, computed inside `getCreatorOrderDetail` from scalars ALREADY loaded
by its existing query (zero extra queries, no identifier/secret exposed).
D.3/D.4 remain fully authoritative — the flag only drives rendering.

### Amount handling

Repository canonical minor-unit utility found: `toMinorUnits()`
(src/lib/commission/constants.ts:35, integer paise via rounding). No input
parser existed, so `parseRefundAmountInput()` was added to the presentation
layer: strict `^\d+(\.\d{1,2})?$` after ₹/comma/space stripping → canonical
conversion. Rejects empty / non-numeric / negative / NaN / Infinity /
fractional paise (>2 decimals, never rounded) / zero / above-remaining.
Client parsing is UX-only; D.3 re-validates authoritatively.

## 3. Authorization & Tenant Isolation

Unchanged from D.3 boundary (verified in D.5.2-D projection suite):
anonymous/READ_ONLY/SUPPORT/AGENCY_STAFF/AGENCY_ADMIN → DENY; ADMIN own tenant → ALLOW;
ADMIN foreign tenant → indistinguishable NOT_FOUND; SUPER_ADMIN → existing
server semantics. The UI trusts NOTHING from the browser: orderId flows to
actions that derive tenant/role server-side. No client-side bypass exists.

## 4. UI Implementation

Inside the existing drawer's Refund section (no new modal framework):

| Element | Behavior |
|---|---|
| Status badge | Canonical NONE/PENDING/PARTIAL/REFUNDED/FAILED labels (existing presentation map) |
| Amounts | Captured / Refunded / Remaining refundable — always server-projection-derived |
| Initiator | Rendered ONLY when `refund.eligible`; labelled amount input (₹), "up to remaining" hint |
| Confirmation step | First click opens a panel showing order id, refund amount, remaining-after, fulfillment state, current refund state; explicit Confirm required; no timers |
| Flow | requestProductOrderRefund → executeProductOrderRefund → mandatory getCreatorOrderDetail refresh |
| PENDING state | Initiator absent; `role="status"` note "Refund in progress — reconciliation is handled by the payment provider."; no polling invented |
| FAILED state | Canonical badge + mapped safe message; initiator returns because server still reports headroom (D.5.1 contract) |
| Fulfillment disclosure | Informational line only: "already been shipped/delivered/returned…" or neutral state line + "Refund handling does not automatically change fulfillment status." No blocking policy invented; fulfillment never mutated |

Error mapping (`getRefundErrorMessage`): every documented D.3/D.4 code mapped
to a safe message (incl. REFUND_IN_PROGRESS, AMOUNT_EXCEEDS_REMAINING,
INVALID_STRATEGY, MISSING/INVALID_PAYMENT_ACCOUNT, INVALID_AMOUNT,
CONCURRENT_MODIFICATION); unknown codes → "Something went wrong. Please try
again." Provider/Prisma internals can never render. Failure wording reflects
the actual D.4 contract (FAILED writes only status → retryable).

Concurrency: double-submit proof locally (busy disables controls, exactly one
request sequence per intent); stale submissions surface the server rejection,
refresh truth, and replace displayed totals — stale refund amounts can never
persist after a rejected mutation (test-pinned).

Notice persistence design note: outcome notices are held at SECTION level, not
inside the initiator, because a truthful refresh may legitimately unmount the
initiator (e.g. REFUND_IN_PROGRESS → PENDING renders no action) — the message
must survive that transition.

## 5. Performance

List page untouched (no list-level refund queries). Drawer open: one lazy
detail request (≤2 bounded queries, unchanged). Initiation: exactly two
bounded server actions (request → execute). Outcome: one bounded truth
refresh. No polling/timers/provider-calls-at-render/N+1 introduced. No latency
claims made (not measured).

## 6. Credential Safety

Projection exposes only non-secret references already present pre-D
(razorpayOrderId/razorpayPaymentId/refundId as display refs) plus the new
derived boolean. Test-pinned across both suites: rendered output contains no
providerKey / providerSecret / encrypted credentials / paymentAccountId /
"tenantId". Decrypted credentials exist solely inside D.4's server memory.

## 7. Tests (focused D suites)

**`tests/unit/rccf72-18d52d-refund-projection.test.ts` (36→37 assertions incl.)**
- Eligibility table: NONE/PARTIAL-with-headroom/FAILED-with-headroom → eligible;
  PLATFORM_COLLECT, missing binding, no captured payment, non-COMPLETED order,
  REFUNDED, PENDING-in-flight, zero-headroom → not eligible.
- Projection key set pinned (no secret/identifier leakage); D.5.1 math pinned
  (remaining = captured − actual refunded).
- Tenant isolation re-pin (foreign ADMIN → NOT_FOUND).
- Parsing tables: exact conversions ("₹1,000"→100000, "0.07"→7…), all §8
  rejections incl. fractional paise and exceeds-remaining, exact-remaining OK,
  integer-paise guarantee.
- Error mapper covers every documented code; unknown/raw errors degrade safely.

**`tests/unit/rccf72-18d52d-refund-initiation-ui.test.tsx`**
- Eligibility rendering (available/unavailable/pending-note), amounts from
  server truth, confirmation panel contents (order id, ₹amount, Remaining
  after, fulfillment label, refund label) with NO execution before confirm,
  cancel path, request→execute called with integer paise + truth refresh,
  double-click → exactly one request sequence, REFUND_IN_PROGRESS → safe alert
  + refresh + canonical pending note, PROVIDER_ERROR → retry-safe message +
  FAILED badge + initiator still available, CONCURRENT_MODIFICATION → stale
  totals replaced by refreshed truth (initiator gone at ₹0), thrown errors →
  generic safe message, all §8 validation rejections client-side without any
  server call, fulfillment disclosure for pending/shipped/delivered/returned/
  unfulfilled without mutation, credential-safety scan of full rendered HTML.

**Guardrail modernization (per skill rule):** `rccf72-18d52a-order-truth-layer.test.ts`
pinned `order.refund` toEqual with five keys; assertion updated to the six-key
canonical shape (`eligible: false` for the PLATFORM_COLLECT fixture) — guardrail
preserved, modernized, recorded here.

## 8. Verification Matrix

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS (no findings in any D-touched file; repo warnings pre-existing) |
| `npx prisma validate` | PASS (schema untouched — refund fields already existed per D.5.1 audit) |
| `git diff --check` | PASS |
| Focused D suites | PASS — 64/64 (projection+parser 26, UI 38) |
| Adjacent regression (exact counts): D.5.2-A (36) + D.5.2-B (10) + D.5.2-C hardening (89) + C UI (56) + D.5.1 (— within file counts below) + D.4 + D.3 | **PASS — 274/274 across the 7 chained suites** |
| Full-suite failures elsewhere | None introduced (pre-existing protected-area failures documented in D.5.2-C closure remain identical in character: RCCF-70.4.3 dashboard, RCCF-71.x theme guardrails, RCCF-68 flake — untouched by D) |
| `npm run build` | **PASS** — compiled + type-checked + 160/160 routes generated |
| Responsive | flex-wrap/grid layouts reused from B/C conventions; input capped `max-w-[16rem]`; confirm buttons wrap; no horizontal overflow introduced at 320/390/768+ by construction |
| Accessibility | Labelled input (`getByLabelText`-pinned), named buttons, `role="status"` loading/pending notes, `role="alert"` errors, disabled states perceivable, Escape-close EditDrawer behavior untouched |

## 9. Protected-Worktree Verification

Pre-edit baseline captured (397 modified/untracked lines of status; index =
27 staged chain files). Post-implementation working-tree delta vs index =
EXACTLY the four D-modified files + two new D tests. `payment-account.actions.ts`
(D.3/D.4 contract) carries ZERO working-tree diff — the backend was consumed,
never edited. No reset/checkout/stash/clean/amend performed. Unrelated files
(incl. pre-existing untracked `docs/rccf-72.18d5-creator-commerce-fulfillment-audit-closure.md`)
left unstaged.

## 10. Exact Staged Files

```
src/actions/order.actions.ts                                  (D hunks: refund.eligible)
src/app/admin/orders/_components/order-presentation.ts        (D hunks: parser + error map)
src/app/admin/orders/_components/order-detail-drawer.tsx      (D hunks: refund section/initiator)
tests/unit/rccf72-18d52a-order-truth-layer.test.ts            (guardrail modernization hunk)
tests/unit/rccf72-18d52d-refund-projection.test.ts            (new)
tests/unit/rccf72-18d52d-refund-initiation-ui.test.tsx        (new)
docs/rccf-72.18d5.2d-refund-initiation-ui-closure.md          (new)
```

All previously staged D-chain work (D.4/D.5.1/D.5.2-A/B/C) preserved intact.

## 11. Deferred Items

S-3 download revocation · S-6 inventory enforcement · formal refund↔fulfillment
policy · notifications · cancellation lifecycle · WhatsApp lead capture ·
D.5.5 signed webhook E2E + failure-reason parsing · DIRECT_CREATOR activation.
No schema migration was needed or made; no refund-ledger table introduced.

## 12. Final State

- DIRECT_CREATOR = `future` (registry untouched; only orders ALREADY carrying
  the historical strategy value reach the refund path)
- Payment architecture = unchanged (D.3/D.4 consumed verbatim)
- Refund ledger semantics = unchanged (D.5.1 intact; initiation still reserves
  ONLY via status; failures still release headroom by construction)
- Fulfillment architecture = unchanged except drawer integration (disclosure only)
- Tenant isolation = preserved
- Protected work = untouched
- Commit = NOT CREATED
- Push = NOT PERFORMED
