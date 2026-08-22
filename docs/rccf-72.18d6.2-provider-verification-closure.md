# RCCF-72.18D.6.2 — Provider Credential Verification & Activation Risk Gate — Closure

## 1. Executive Verdict

**A — IMPLEMENTED AND VERIFIED.** Staged, NOT committed, NOT pushed.

Razorpay creator credentials can now be genuinely provider-verified through a
safe, read-only, authenticated API probe; the result is persisted with an
optimistic-concurrency guard; transient provider failures never fabricate or
destroy verification state; and the DIRECT_CREATOR readiness contract is now
fail-closed on REAL verification (`verified`), not format validation
(`configured`). DIRECT_CREATOR itself remains `status: "future"` — untouched.

## 2. Current DIRECT_CREATOR Status

`COMMERCE_STRATEGY_REGISTRY.DIRECT_CREATOR.status === "future"` — unchanged;
registry file has zero diff vs HEAD; all `status === "active"` gates untouched.

## 3. Audit Findings

### Provider verification capability (Phase 3)
- Official Razorpay docs (`razorpay.com/docs/api/authentication`, `/docs/api/payments`, `/docs/api/orders`): **every** Razorpay API authenticates via Basic Auth `key_id:key_secret`; there is NO dedicated "auth check" endpoint.
- Canonical safe probe implemented: authenticated **read-only** minimal fetch — SDK `orders.all({ count: 1 })` → `GET /v1/orders?count=1`.
  read-only ✓ · non-financial (creates nothing) ✓ · idempotent ✓ · low-risk ✓.
  No ₹1 payments, no test refunds, no order creation, no payouts (§22 honored).

### Credential lifecycle (Phase 6)
| Event | Resulting state |
|---|---|
| First save of keys | `pending` (existing behavior, unchanged) |
| Successful verify | **`verified` + `lastVerifiedAt`** (new, evidence-backed) |
| Key ID or secret changed | save writes `pending` → re-verification required |
| Disconnect/delete | `disconnected` + `unverified` → non-ready |
| Later provider-side revocation | explicit re-verify surfaces it; no background polling (per §21); readiness consumes persisted state only |

### Verification state vocabulary (Phase 5)
Schema column `verificationStatus String // unverified | pending | verified | failed`
plus runtime value `configured`. Domain type already contains `"verified"`;
`lastVerifiedAt` column already exists. **NO schema change / migration required.**
Transient outcomes are intentionally NOT persisted (no new "unknown" state):
an outage proves nothing, so nothing is written and fail-closed readiness holds.

### Activation boundary (Phases 8/10)
Outcome A applies (verification IS available). Eligibility is strictly per-tenant:
DIRECT_CREATOR strategy + account active + `verificationStatus === "verified"` +
decrypt success + settlement details. One creator verifying does NOT affect any
other tenant. The strategy-level activation remains a separate authorized RCCF.

### Historical PaymentAccount behavior (Phase 7)
- Q1/Q2: credentials live on the bound PaymentAccount row; D.4 refunds read that row at execution time. If keys are rotated for the SAME Razorpay account, historical refunds keep working; if a DIFFERENT account is connected, provider rejects unknown payment ids → refund fails closed (money can never move to the wrong place). Correctness is provider-enforced.
- Q3 immutability while orders exist: **not required** — blocking edits would strand refunds after legitimate key revocation.
- Q4 versioning: **not required** — in-place mutation + re-verification + provider-side rejection is the safest minimal architecture. No implementation added.

### Security (§16)
Decryption strictly server-side/in-memory; results carry only `{success, verified}` /
classification enums; audit payloads/events/errors contain no key material
(test-asserted across results, logAction calls, event-bus payloads, captureError).

### Tenant isolation (§17)
Verification always resolves the SESSION tenant's own row. Creator A cannot
verify B. AGENCY_*/SUPPORT/READ_ONLY denied. SUPER_ADMIN without a tenant
context is denied (ownership boundary deliberately not broadened).

### Failure handling (§19)
401/403 → permanent `failed`; 429/5xx/network/timeout → `transient` ⇒ NO write
(a valid `verified` is never destroyed by an outage); malformed 200 → `unknown`
⇒ no write + server-side diagnostics; decrypt failure ⇒ our-storage problem ⇒
no write, safe client message. Commerce readiness fails closed in every case.

### Concurrency (§18)
Optimistic-concurrency guard using the EXISTING `updatedAt` column: the row
version is snapshotted BEFORE provider I/O and the persistence write is
conditioned on it — a credential rotation racing the probe can never receive a
stale `verified`. (A test exposed an initial evaluation-order bug in the guard;
fixed by snapshotting `readVersion` pre-probe.) No new schema field needed.

### Performance (§21/§25 measured shape)
One verification = exactly **1** provider API call + **1** DB read + **1**
guarded DB write (test-pinned). Zero calls on storefront/checkout paths —
checkout consumes persisted readiness only; verification happens solely on the
explicit admin action.

## 4. Implementation

| File | Change |
|---|---|
| `src/modules/payment-account/providers/types.ts` | Add `PaymentAccountStatusResult.classification`: `"verified" \| "credential_failed" \| "transient" \| "unknown"` (optional → other adapters unaffected) |
| `src/modules/payment-account/providers/razorpay.ts` | `getAccountStatus` now performs the real Basic-Auth probe via `orders.all({count:1})` with full failure classification |
| `src/modules/payment-account/application/runtime.ts` | `verifyPaymentAccount`: guarded decrypt, classification-driven persistence, pre-probe version snapshot guard, transient no-write; `computePaymentReadiness`: DIRECT_CREATOR verification requirement now `verified` (label "Provider credentials verified"); PLATFORM_COLLECT branch untouched |
| `src/app/admin/payments/_components/payments-client.tsx` | Truthful success message ("Provider credentials verified.") |

## 5. Tests

- New: `tests/unit/rccf72-18d62-provider-credential-verification.test.ts` — **37 tests**: adapter matrix (11), lifecycle (8), activation gates (8 incl. per-status param), security/authz (7), measurement (1), plus decrypt/stale/disconnect coverage.
- Modernized stale guardrails (old `configured` contract): `payment-account.test.ts` (SDK-mocked adapter truth), `rccf69-commerce-integrity.test.ts` (truth section rewritten to D.6.2 contract: verified only from real auth; outage writes nothing).
- Regression: D.2/D.3/D.4/D.5.1/D.5.2-A/D.5.2-C-hardening/D.5.5/**D.6.1** + rccf67/rccf38/commerce-strategy/fulfillment/customer-success/revenue-runtime → **all green** (396/396 focused chain run + 70 adjacent).

## 6. Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx eslint` (all touched files) | ✅ exit 0 |
| `npm run build` | ✅ exit 0 |
| `npx prisma validate` | ✅ schema valid |
| `git diff --check` | ✅ exit 0 |
| Focused suites | ✅ 396/396 (+70 adjacent) |
| Full suite | Same 15 pre-existing 70.x/71.x guardrail failures documented in the D.6.1 closure §10 (files unrelated to this diff; classified PRE-EXISTING with identical evidence) |

## 7. Protected Work

Baseline captured before edits (406 dirty entries; D.6.1 staged content intact).
Mixed-discipline files touched here (`runtime.ts`, `types.ts`, `razorpay.ts`)
carry prior staged D-chain content; index-vs-worktree diffs show ONLY D.6.2
hunks atop them. `payments-client.tsx` was clean vs HEAD; its single-block edit
is fully D.6.2. No reset/stash/checkout/restore/clean/amend/rebase used anywhere.

## 8. Exact Staged Files

```
src/modules/payment-account/providers/types.ts
src/modules/payment-account/providers/razorpay.ts
src/modules/payment-account/application/runtime.ts
src/app/admin/payments/_components/payments-client.tsx
tests/unit/rccf72-18d62-provider-credential-verification.test.ts   (new)
tests/unit/payment-account.test.ts                                  (modernized)
tests/unit/rccf69-commerce-integrity.test.ts                        (modernized)
docs/rccf-72.18d6.2-provider-credential-verification-closure.md     (this doc)
```

## 9. Deferred Items

- Re-verification scheduling/staleness policy beyond explicit triggers (e.g., N-day re-check) — needs product decision; no polling added.
- Per-operation SUPER_ADMIN override for verifying arbitrary tenants — deliberately not broadened.
- Stripe/PhonePe/etc. adapter verification (registry reserves them; none active).
- UI surfacing of `lastVerifiedAt` (column persisted; display deferred).

## 10. Activation Recommendation

**Can DIRECT_CREATOR be activated after D.6.2? YES — technically unblocked**, contingent on the standard final audit:

- P1-1 closed by D.6.1 (Payment Link reconciliation, signed E2E).
- P1-2 closed by D.6.2 (real provider verification + fail-closed gate).
- Remaining prerequisite: an operational decision to migrate existing
  configured-only creators through one explicit re-verification (their stored
  `configured` state no longer satisfies readiness — by design).

The flip `future → active` is **NOT performed here**; it remains a separate,
explicitly authorized RCCF with its own audit.

## 11. Final State

- Commit: **NOT CREATED** · Push: **NOT PERFORMED**
- `DIRECT_CREATOR`: **future**
