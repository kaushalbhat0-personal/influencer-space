# RCCF-72.18D.6.5 — DIRECT_CREATOR Production Activation & Post-Flip Verification — Closure

## 1. Executive Verdict

**A — ACTIVATED AND VERIFIED.** DIRECT_CREATOR flipped `future → active` after
all activation gates passed. Staged, NOT committed, NOT pushed.
PLATFORM_COLLECT: unchanged (`active` throughout; zero behavioral diff).

## 2. Explicit Policy Decisions (adopted this RCCF)

| Policy | Decision | Implementation |
|---|---|---|
| **1 — Digital refund entitlement** | FULL refund REVOKES digital download access; PARTIAL preserves it | Token+expiry cleared via `orderFulfillment.updateMany` gated on `type in [digital,course] AND downloadToken != null`, INSIDE the successful refund transaction — both the D.4 execution path (`executeProductOrderRefund`) and the D.5.5 webhook reconciliation path (finalStatus REFUNDED). Initiation/PENDING/FAILED never revoke. Idempotent: re-runs match zero rows. No schema change. |
| **2 — Refund ↔ fulfillment** | Creator-managed for launch | No auto cancel/reverse/return; no blocking rules; D.5.2-C state machine untouched. Documented (runbook §6). Test-pinned: refunds mutate only refund fields. |
| **3 — Inventory** | Creator-managed / deferred | No schema, no UX promise, no reservation primitives exist (D.6.4 audit). Risk documented: creators must manage physical stock themselves. Future dedicated RCCF. |

## 3. Registry Change

```diff
   id: "DIRECT_CREATOR",
-  description: "Future. The creator is …",
+  description: "Active. The creator is …",
…
-  status: "future",
+  status: "active",
```

Single canonical entry; MARKETPLACE/HYBRID remain `reserved`; PLATFORM_COLLECT
`active` untouched.

## 4–9. Flow Verification (all pre-flip gates re-run post-flip)

- **Payment flow:** verified creator → readiness(verified) → createDirectCheckout
  → creator's own Razorpay Payment Link (reconciliationRef attached) → capture.
  Post-flip proof: Case A test — checkout succeeds, order created with
  historical `paymentAccountId` binding + strategy DIRECT_CREATOR.
- **Payment Link reconciliation (D.6.1):** full suite green — normal/delayed/
  duplicate/wrong-link/wrong-amount/cross-tenant/failed→captured; exactly one
  completion·fulfillment·quota·event per financial occurrence.
- **Provider verification (D.6.2):** read-only `orders.all({count:1})` probe;
  classification lifecycle intact (401/403→failed · transient/malformed/decrypt
  → no-write); rotation→pending; disconnect→non-ready; stale-guard on updatedAt.
- **Refund safety (D.3/D.4/D.5.1/D.5.5):** ledger invariant
  `0 ≤ refundAmount ≤ captured` held across every suite; NONE→PENDING→
  PARTIAL/REFUNDED and PENDING→FAILED→retry intact; historical binding only.
- **Webhook security:** HMAC-SHA256 raw-body + timingSafeEqual + fail-closed
  secret; invalid signature ⇒ 401 zero-mutation; unknown events `{ok:true}`.
- **Tenant isolation:** cross-tenant checkout resolves "Product not found"
  (post-flip pinned); refund/address/fulfillment matrices unchanged from D-chain.

## 10–13. Fulfillment / Digital / Inventory / WhatsApp

Fulfillment: creator-managed vs refunds (Policy 2). Digital delivery: full-refund
revocation live end-to-end (execution + webhook paths; partial preserved).
Inventory: deferred, documented. WhatsApp: pure lead CTA — boundary guardrails
from D.6.4 remain green.

## 14. Production Configuration

Repo-side complete (.env.example placeholders for all five variables; fail-closed
webhook without secret; encryption key documented). **DEPLOYMENT TASKS** (cannot
be verified from repo): set production env values; configure Razorpay Dashboard
webhook URL with same secret + required events (`payment.captured`,
`payment.failed`, `refund.processed`, `refund.failed`, platform subscription
events); creators enter credentials through `/admin/payments` UI only.
Real-money sandbox E2E: not executable here — classified as deployment task per
Phase 12 rule; signed-harness coverage stands in as evidence.

## 15. Post-Flip Tests

| Suite | Result |
|---|---|
| D.2 → D.6.5 full chain (16 files) | **498/498 PASS** |
| New D.6.5 suite | 13/13 (policy 6 · webhook parity 1 · registry 1 · matrix 5) |
| tsc --noEmit | ✅ |
| eslint (touched files) | ✅ new files clean; d5.1/d55 pre-existing `any` findings unchanged (documented) |
| npm run build | ✅ |
| prisma validate | ✅ |
| git diff --check | ✅ |

Guardrail modernizations (per skill rule, disclosed):
`rccf72-18d63` §A + `rccf72-18d64` Case A/B now assert the POST-flip canonical
`status: "active"` (pre-flip revisions asserted `future` and are preserved in
git history); d4/d5.1/d55 tx stubs gained a stubbed `orderFulfillment.updateMany`
(POLICY 1 joins that transaction).

## 16. Regression — PLATFORM_COLLECT

Registry assertion active-only-for-platform unchanged; readiness branch returns
`ready` independent of creator accounts; platform checkout/billing suites
(rccf36/37/41/50/67/69) untouched by this diff and previously green.

## 17. Protected Work

Baseline preserved (418 entries). Index grew ONLY by D.6.5 items listed in §Staged
Files plus the disclosed modernization hunks to five existing staged test files.
Mixed-file discipline held: index-vs-worktree diffs inspected per file; no
unrelated hunk entered staging. No reset/stash/checkout/clean/rebase/amend used.

## 18. Remaining P2/P3

- Real-money Razorpay sandbox E2E (deployment task, Phase 12 rule).
- `validate-env.mjs` requiring `RAZORPAY_WEBHOOK_SECRET` at deploy time.
- P3 carry-overs from D.6.4: net-revenue metric, fulfillmentHealth volume nuance,
  stale-PENDING housekeeping report, inventory RCCF (future), SUPER_ADMIN
  description cosmetics none remaining.

## 19. Rollback

Revert the single registry entry to `status: "future"` (+description) — new
DIRECT_CREATOR checkouts close immediately (strategy gate), while existing
orders, historical `paymentAccountId` bindings, refund flows, and webhook
reconciliation continue operating safely. No data deletion involved.

## Git

Commit: **NOT CREATED** · Push: **NOT PERFORMED** · State: **READY FOR COMMIT**

## Final State

DIRECT_CREATOR: **active** · PLATFORM_COLLECT: **active**
