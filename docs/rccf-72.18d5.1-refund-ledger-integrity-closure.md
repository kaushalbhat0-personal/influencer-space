# RCCF-72.18D.5.1 — DIRECT_CREATOR Refund Ledger Integrity — Closure

**Type:** IMPLEMENTATION (financial correctness) — surgical, scoped to refund ledger
**Predecessor:** RCCF-72.18D.5 audit (Verdict B). Findings S-1 (P1) and S-2 (P1).
**DIRECT_CREATOR status:** `future` — DISABLED, unchanged. No registry edits.

---

## Progress Checkpoints

[COMPLETE] Phase 1 — Audit before editing
[COMPLETE] Phase 2 — Implementation
[COMPLETE] Phase 3 — Tests (new D.5.1 suite + D.3/D.4 test updates)
[COMPLETE] Phase 4 — Verification (tsc / lint / build / prisma validate / focused tests)
[COMPLETE] Phase 5 — Surgical staging + protected-work comparison

---

## Phase 1 — Audit Before Editing (findings)

### Current state machine (verified against code)

```
Writers of ProductOrder.refundAmount today:
  1. D.3 requestProductOrderRefund   payment-account.actions.ts:227-241
     reservation: refundAmount = cumulative + requested; status → PENDING;
     guard: { id, refundAmount: <stale-read>, refundStatus in [NONE,PARTIAL,FAILED] }
  2. D.4 success                     payment-account.actions.ts:440-467
     refundAmount = order.refundAmount (i.e. the reserved value re-written); refundId; PARTIAL/REFUNDED
  3. D.4 failure (×3 paths)          payment-account.actions.ts:411-414, 425-428
     refundStatus = FAILED; refundAmount LEFT AT RESERVED VALUE  ← S-2 leak
  4. Webhook processed/failed        api/webhooks/razorpay/route.ts:229-275
     gate: !refundId ; newRefundAmount = stored + provider amount (blind add)  ← S-1 double-count
     finalStatus from amount math only → FAILED branch unreachable when amount > 0
```

**Root cause:** `ProductOrder.refundAmount` conflates *reserved* and *actually refunded* money. Every downstream consumer (D.4 execution amount, webhook reconciliation, retry headroom) reads the conflated value and cannot decompose it.

### Contracts audited

| Component | File | Relevant fact |
|---|---|---|
| Razorpay adapter `refundPayment` | src/modules/payment-account/providers/razorpay.ts:54-74 | Takes rupees, converts to paise internally; returns `{success, providerRefundId?, status?, error?}`. No change required. |
| Adapter interface | src/modules/payment-account/providers/types.ts:47-61 | `PaymentRefundInput.amount` in rupees. No change. |
| Schema | prisma/schema.prisma:506-545 | `refundAmount Int?` paise cumulative; `refundStatus RefundStatus`; `refundId String?`. **No migration needed for chosen design.** |
| BillingEvent usage | route.ts:234-237, payment-account.actions.ts:298-305, 452-466 | Keys: `product_refund_initiated_<orderId>` (success marker), `product_refund_webhook_<refundId>` (webhook dedupe). Preserved as-is. |
| Production callers of D.3/D.4 | repo-wide grep (D.5 evidence) | **ZERO** non-test callers. Contract evolution is safe. |
| Existing tests | tests/unit/rccf72-18d2…(no action calls), rccf72-18d3…, rccf72-18d4… | d3/d4 exercise the changing functions → require authorized updates. |
| PLATFORM_COLLECT webhook path | route.ts:196-205 (`billingService.handleRefund`) | Untouched by this RCCF. |

### Chosen ledger semantics (the one unambiguous meaning)

> **`ProductOrder.refundAmount` = cumulative ACTUAL successfully refunded money in paise.**
> Written ONLY on confirmed success (synchronous adapter success or `refund.processed` webhook), never on initiation, never on failure.
> Invariant enforced at every writer: `0 <= refundAmount <= round(order.amount × 100)`.

Reservation is represented implicitly: **`refundStatus === "PENDING"` means exactly one refund request is in flight** (atomic mutual exclusion via conditional update on the status enum). The requested amount travels explicitly as a validated parameter to D.4 instead of being persisted into the ledger field.

Why smallest-safe: no new column, no migration, no auxiliary-event decomposition; every writer maintains the invariant independently; webhook needs no history reconstruction to compute truth.

---

## Phase 2 — Implementation

(sections below filled as completed)

### D.3 changes — requestProductOrderRefund

- Validation chain unchanged: authorization → tenant isolation → DIRECT_CREATOR-only → historical binding + account-tenant match → captured payment → COMPLETED order → positive integer paise → headroom vs ACTUAL `refundAmount`.
- Reservation write REMOVED. Atomic transition now:
  `update where { id, refundStatus: { in: ["NONE","PARTIAL","FAILED"] } } data { refundStatus: "PENDING" }`
  — mutual exclusion preserved (only one concurrent winner; loser observes PENDING → `REFUND_IN_PROGRESS`).
- `refundedAt` no longer written at initiation (only on success/webhook).
- Defense-in-depth note: an initiator racing an out-of-band webhook can pass validation with a stale read; the amount is re-validated against fresh state in D.4 before any provider call, so the ceiling cannot be breached.

### D.4 changes — executeProductOrderRefund

- Signature: `{ orderId: string; amount: number }` (paise). Required — no production callers exist.
- New validations after existing PENDING/binding checks:
  - input amount finite, floor, > 0 → else `INVALID_AMOUNT`;
  - stored `refundAmount` integrity: `0 <= x <= originalCaptured` → else `INVALID_AMOUNT` (+captureError);
  - headroom: `amount <= originalCaptured - refundAmount` → else `AMOUNT_EXCEEDS_REMAINING`.
- Execution uses EXACTLY the validated amount (converted to rupees for the adapter as before).
- Failure paths now write **only** `{ refundStatus: "FAILED" }` — `refundAmount` untouched ⇒ S-2 release satisfied trivially (nothing was ever reserved).
- Success transaction: `refundAmount: refundAmount + executedAmount`, `refundId`, `refundedAt`, status `REFUNDED` if newTotal ≥ original else `PARTIAL`; BillingEvent payload records requested/executed/newTotal under the unchanged key `product_refund_initiated_<orderId>`.

### Webhook changes — refund reconciliation block

- Duplicate protection FIRST: BillingEvent `product_refund_webhook_<refundId>` existence short-circuits both event types (order-level `refundId` alone is no longer treated as a skip barrier, so sequential legitimate partial refunds are not silently swallowed).
- `refund.failed`: NEVER touches `refundAmount`. Transitions `PENDING → FAILED`; `FAILED → FAILED` (idempotent re-record); leaves `PARTIAL/REFUNDED/NONE` untouched (a failure cannot downgrade settled state). BillingEvent `REFUND_FAILED` recorded. ⇒ S-1 FAILED→PARTIAL conversion eliminated.
- `refund.processed`: clamped add — `delta = min(providerAmount, original - refundAmount)`; if delta ≤ 0 → record event only (already settled). Else single transaction: `refundAmount += delta`, `refundId`, `refundedAt`, status `REFUNDED/PARTIAL` by ceiling. Handles all five prior states truthfully (incl. late-processed-after-sync-failure and unsolicited dashboard refunds).
- Signature verification, rate limiting, partner-commission branch, subscription events: untouched.

### State machine after fix

```
refund axis (DIRECT_CREATOR only):
NONE ──D.3(valid, atomic status-guard)──▶ PENDING ──D.4 success──▶ PARTIAL ──▶ REFUNDED
  ▲                                      │                            (amount = actual only)
  │                                      ├──D.4 fail──▶ FAILED (refundAmount UNCHANGED)
  │                                      │                 │
  │        D.3 may re-initiate ◀─────────┴─────────────────┘  (headroom restored by construction)
  └──────────────────── webhook failed: PENDING→FAILED only; never mutates amount
webhook processed: clamp-add once per unique refundId (BillingEvent dedupe)
Invariant at rest: 0 <= refundAmount <= originalCaptured
```

[COMPLETE] Phase 2 — Implementation

---

## Phase 3 — Tests

**New suite:** `tests/unit/rccf72-18d5.1-refund-ledger-integrity.test.ts` — 26 tests.

Part 1 — synchronous lifecycle (9): full refund · partial refund · second partial accumulates on actual ledger · ceiling enforced at initiation AND execution (+ exact-remaining end-to-end) · provider failure → FAILED · failure releases reservation (ledger untouched) · **ticket regression: full-fail → retry-FULL succeeds truthfully** · partial + failed remainder keeps only successful amount · partial → failed remainder → successful retry completes to REFUNDED.
Part 2 — authorization/binding (7, table-driven roles): AGENCY_ADMIN/AGENCY_STAFF/SUPPORT/READ_ONLY denied on BOTH actions · anonymous denied · foreign tenant FORBIDDEN · SUPER_ADMIN cross-tenant allowed (intentional) · PLATFORM_COLLECT rejected · cross-tenant PaymentAccount rejected before any provider call · historical account binding used (lookup by `order.paymentAccountId`; decrypted credentials of THAT account passed to adapter; no secret material in action results).
Part 3 — webhook reconciliation (8, signed route-level `POST` tests with real HMAC): processed-after-PENDING counts exactly once · duplicate processed adds nothing twice · duplicate failed corrupts nothing · **S-1 regression: refund.failed with amount>0 stays FAILED, ledger unchanged (was PARTIAL+double-count)** · late failed after synchronous failure is a no-op · late PROCESSED after synchronous failure recovers truthfully · clamp caps at captured ceiling · PLATFORM_COLLECT untouched by product reconcile.

**Authorized updates to predecessor suites:**
- `rccf72-18d3…test.ts`: Prisma-update mock now emulates the new conditional guard (`refundStatus IN [NONE,PARTIAL,FAILED]`). All 19 assertions unchanged and passing under the reservation-free semantics.
- `rccf72-18d4…test.ts`: default order ledger set to actual-refunded (`refundAmount: 0`); all invocations pass explicit `amount` (contract change — zero production callers existed); Tests 21/28 now express "cumulative completes" via seeded prior partial; Test 30 passes explicit zero. All 38 assertions pass.

**Ticket-scenario coverage map (all 20 required):** 1→P1#1 · 2→P1#2 · 3→P1#3 · 4→P1#4(+webhook clamp) · 5→P1#5 · 6→P1#6&8 · 7→P1#7 · 8→P1#8 · 9→P1#9 · 10→webhook dup-processed · 11→webhook dup-failed · 12→webhook failed>0 · 13→webhook late-failed-post-sync · 14→webhook processed-after-PENDING · 15→auth foreign-tenant · 16→auth cross-account · 17→auth strategy · 18→roles table+anonymous · 19→SUPER_ADMIN · 20→historical binding.

## Phase 4 — Verification results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS — zero errors |
| `npm run lint` | PASS — warnings-only; identical pre-existing set; none in changed files |
| `npm run build` | PASS — compiled successfully, 160 routes generated |
| `npx prisma validate` | PASS — schema valid (**no migration required**) |
| Focused refund suites (D.2+D.3+D.4+D.5.1) | **93/93 PASS** |
| Adjacent suites (fulfillment, rccf38 order metering, rccf71-4-5 webhook guard) | 36/36 PASS |
| `git diff --check` / `git diff --cached --check` | PASS (pre-existing CRLF notices on two fixture files only) |

No database was contacted; no destructive command run.

### Design refinement discovered during test hardening

The original per-order success marker (`product_refund_initiated_<orderId>`) blindly short-circuited execution — which would have blocked a legitimate SECOND partial cycle after a first succeeded (ticket scenario 3). Fixed: the marker is now **state-aware** (marker + non-PENDING status ⇒ alreadyProcessed duplicate-click; marker + PENDING ⇒ fall through as a new cycle), and the marker write became an **upsert** so multi-cycle completions update it instead of violating the unique key. Webhook BillingEvents remain append-only create with per-refundId keys.

**Documented residual:** a strictly-concurrent double-execution against the same PENDING cycle remains theoretically possible (no claim column exists without migration). Exposure is unchanged from pre-D.5.1 behavior for fresh initiations, requires simultaneous authenticated creator/SUPER_ADMIN calls, and DIRECT_CREATOR is disabled — accepted for this RCCF; recommend a schema claim field in D.5.2+ if desired.

[COMPLETE] Phase 3 — Tests
[COMPLETE] Phase 4 — Verification

## Phase 5 — Surgical Staging & Protected Work

Baseline (`git status --short` + `git diff --stat`, captured pre-implementation): 70 modified files (~1373 insertions of pre-existing RCCF work incl. staged D.4 content in `payment-account.actions.ts`, webhook route, payment-account module trio, d4 test) + large untracked set. Post-implementation comparison: identical except the six D.5.1 files below. No protected file was reset/staged/reverted.

**Staged for RCCF-72.18D.5.1 (exact set):**
```
docs/rccf-72.18d5.1-refund-ledger-integrity-closure.md   (new)
tests/unit/rccf72-18d5.1-refund-ledger-integrity.test.ts (new)
tests/unit/rccf72-18d3-product-refund-initiation.test.ts (newly indexed — mock updated by this RCCF)
tests/unit/rccf72-18d4-product-refund-execution.test.ts  (delta folded onto already-staged D.4 add)
src/actions/payment-account.actions.ts                   (delta folded onto already-staged D.4 base)
src/app/api/webhooks/razorpay/route.ts                   (delta folded onto already-staged D.4 base)
```

Mixed-file note: the last three entries carried PRE-EXISTING staged D.4 hunks in the index before this session. `git add` folded the D.5.1 deltas onto that already-staged state — protected D.4 work is preserved intact inside those hunks and nothing unrelated entered the index (verified via `git diff --cached --stat`: every listed file is refund-scope).

Deliberately NOT staged: `tests/unit/rccf72-18d2-product-order-refund-binding.test.ts` (untouched, previous RCCF artifact), `docs/rccf-72.18d5-creator-commerce-fulfillment-audit-closure.md` (previous RCCF artifact), all other baseline modifications/untracked files.

[COMPLETE] Phase 5 — Surgical staging + protected-work comparison
