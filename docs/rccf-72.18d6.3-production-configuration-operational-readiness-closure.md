# RCCF-72.18D.6.3 — Production Configuration, Operational Readiness & Creator Migration Gate — Closure

## 1. Executive Verdict

**A — IMPLEMENTED AND VERIFIED.** Staged, NOT committed, NOT pushed.

The operational/configuration boundary for a controlled DIRECT_CREATOR launch is
now prepared: production configuration is fully documented with placeholders,
the legacy-`configured` creator migration path is proven safe (explicit
re-verification, no data migration), last-verification visibility is surfaced,
webhook operational requirements are pinned to actually-handled events, and an
activation-boundary simulation proves the future D.6.5 flip will engage the
existing safety gates rather than bypass them.

## 2. DIRECT_CREATOR Status

`COMMERCE_STRATEGY_REGISTRY.DIRECT_CREATOR.status === "future"` — verified
against HEAD (`git diff HEAD -- registry.ts` = 0 lines; asserted by test).
PLATFORM_COLLECT remains `active`, byte-untouched.

## 3. Audit Findings

### Configuration inventory (Phases 2–3)

| Variable | Required? | Runtime surface | Secret? | Failure mode if absent | Doc status |
|---|---|---|---|---|---|
| `RAZORPAY_KEY_ID/SECRET` | Yes (platform) | PLATFORM_COLLECT orders/subscriptions (`lib/razorpay.ts`, billing provider) | YES | Platform checkout/billing fails | ✅ pre-existing |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Yes (platform) | Browser checkout (`checkout.actions`) | No (public id) | PLATFORM_COLLECT checkout cannot initialize client | ❌ was missing → **added** |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | `/api/webhooks/razorpay` HMAC verification | YES | Webhook fails CLOSED (500) — no unauthenticated mutations possible | ❌ was missing → **added** |
| `TOKEN_ENCRYPTION_KEY` | Yes | AES-256-GCM encrypt/decrypt of creator credentials + bank number (`lib/crypto.ts`) | YES | Decrypt failures block verification/refunds fail-closed | ✅ pre-existing |
| `RAZORPAY_PAYOUTS_ENABLED` | Optional | Partner payouts runtime only — NOT DIRECT_CREATOR | No | Payouts feature flag off | out of scope |
| Creator key pairs | Per-creator, at runtime | Creator Razorpay account via adapter | YES (encrypted at rest) | verification fails closed | never in source/env ✅ |

Conceptual boundaries kept separate: platform keys ≠ creator keys ≠ webhook
secret ≠ encryption key.

### Existing-creator migration (Phase 6)
- Writers of `configured`: ZERO remain in source (post-D.6.2 runtime writes only
  `verified`/`failed`; guardrail test pins this). `configured` exists only as
  legacy data.
- Migration path = explicit creator action on `/admin/payments`: Verify → real
  probe → `verified`. Requires account `active` (legacy configured rows have
  `status: "active"` ✓). Rotation → `pending`; disconnect → non-ready;
  tenant-scoped throughout. **No DB mutation/migration needed or performed.**

### Verification lifecycle / rotation (Phases 5–9)
Covered by the D.6.2 contract and re-pinned here: save→pending→verify→verified;
rotation invalidates; disconnect non-ready; transient outage preserves verified;
historical orders stay bound to their original PaymentAccount through every
mutation path (D.4 binding untouched).

### Webhook operational requirements (Phase 10)
Handled events (route-verified): `payment.captured`, `payment.failed`,
`refund.processed`, `refund.failed`, `subscription.*`, `order.paid`.
**Required Dashboard subscriptions:** payment.captured, payment.failed,
refund.processed, refund.failed (+ subscription events/order.paid for platform
billing). **Optional/unhandled:** `payment_link.paid` (payment.captured is
authoritative; unknown events are accepted `{ok:true}`, zero mutation).
Empty secret ⇒ 500 fail-closed; signature timing-safe; redelivery idempotent.

### Observability/security (Phase 11)
captureError diagnostics carry classifications, provider reference ids and
tenant-safe ids only. Secrets excluded from results/logs/events/errors —
test-pinned across d62/d63 suites. No leaks found in touched paths.

## 4. Implementation

| File | Change |
|---|---|
| `.env.example` | Add `NEXT_PUBLIC_RAZORPAY_KEY_ID` + `RAZORPAY_WEBHOOK_SECRET` placeholders w/ boundary comments (placeholders only) |
| `src/app/admin/payments/_components/payments-client.tsx` | Surface `lastVerifiedAt` ("Last verified: <local datetime>") — safe operational visibility, no polling |
| `tests/unit/rccf72-18d63-production-readiness-gate.test.ts` (**NEW**) | Registry truth, migration matrix, activation simulation, configuration guardrails (18 tests) |
| `docs/runbooks/direct-creator-payments-runbook.md` (**NEW**) | Operator runbook: verify-failure classification table, rotation, outage, webhook outage/redelivery, pending-order investigation, refund retry, historical-binding policy |
| `docs/runbooks/direct-creator-production-checklist.md` (**NEW**) | Production readiness checklist (Application/Configuration/Onboarding/Operations/Rollback) with deploy tasks marked |

## 5. Activation Simulation (Phase 14) — without activation

1. Verified creator + all prerequisites + strategy `future` → readiness
   reports **ready** (eligible) BUT `createDirectCheckout` **refuses**
   ("not available yet") — status alone does not open money flow.
2. Fixture-simulated flip (`future→active` at strategy layer only; registry
   SOURCE untouched): the SAME verified-ready state flows through and checkout
   succeeds — proving the boundary becomes operational on flip.
3. Fixture flip + UNVERIFIED (legacy configured) creator → still refused
   ("not ready") — activation cannot bypass readiness.
4. PLATFORM_COLLECT readiness identical to before (ready independent of creator
   accounts).

## 6. Test Matrix & Results

- New suite: **18 tests** (registry 2 · migration matrix 5+3 lifecycle ·
  simulation 4 · config guardrails 3 · plus rotation/disconnect/migration-flow).
- Full focused chain D.2→D.6.3: **14 files, 466/466 passed**.
- Gates: tsc ✅ · eslint(touched) ✅ · build ✅ · prisma validate ✅ ·
  git diff --check ✅ (only pre-existing CRLF warnings on untouched fixtures).
- Pre-existing full-suite failures (15, RCCF-70.x/71.x guardrails): unchanged,
  classified PRE-EXISTING per D.6.1 §10 evidence; unrelated to this diff.

## 7. Protected Work

Baseline preserved (411 dirty entries; staged D-chain/D.6.1/D.6.2 intact).
Mixed-file handling:
- `.env.example` carried a protected unstaged MCP-tooling hunk → staged via
  index-level blob construction (`git hash-object` + `update-index --cacheinfo`)
  so the INDEX contains HEAD + ONLY the Payments-section hunk; the protected
  MCP hunk remains unstaged in the working tree (verified: staged-vs-HEAD diff
  shows exclusively the Payments block).
- `payments-client.tsx` index held D.6.2 content; worktree delta vs index is
  exclusively the D.6.3 lastVerifiedAt hunk (diff-inspected) → whole-file add safe.
No reset/stash/checkout/restore/clean/amend/rebase used anywhere.

## 8. Exact Staged Files

```
.env.example                                                          (surgical index stage)
src/app/admin/payments/_components/payments-client.tsx                (d62+d63 content)
tests/unit/rccf72-18d63-production-readiness-gate.test.ts             (new)
docs/runbooks/direct-creator-payments-runbook.md                      (new)
docs/runbooks/direct-creator-production-checklist.md                  (new)
docs/rccf-72.18d6.3-production-configuration-operational-readiness-closure.md  (this doc)
```

## 9. Deferred Items

- `validate-env.mjs`: adding RAZORPAY_WEBHOOK_SECRET to its required list is
  recommended at activation time (deploy-behavior change → belongs to D.6.5's
  rollout, not documentation-only D.6.3).
- Automated staleness re-verification scheduling — explicitly out of scope (no polling).
- Admin surface for SUPER_ADMIN cross-tenant verification — deliberately not broadened.
- Razorpay Dashboard webhook endpoint creation itself — deploy task (checklist §Operations).

## 10. Activation Statement

**DIRECT_CREATOR remains `future`.** The final `future → active` financial
activation belongs exclusively to the separately authorized RCCF-72.18D.6.5,
for which this RCCF provides the configuration inventory, runbook, checklist
and simulated-proof that existing gates will engage correctly.

Commit: **NOT CREATED** · Push: **NOT PERFORMED**
