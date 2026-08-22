# RCCF-72.18D.6.4 — Final Pre-Activation Policy, Fulfillment, Digital Delivery & Security Audit — Closure

## 1. Executive Verdict

**A — AUDIT COMPLETE, ZERO P0/P1 BLOCKERS.** Staged, NOT committed, NOT pushed.
**DIRECT_CREATOR remains `future`.** One surgical cleanup implemented (dead
`"PAID"` predicate); three business-policy items formally classified as
POLICY DECISION REQUIRED with recommended safe defaults — none invented in code.

## 2. Remaining Findings (Phase 19 classification)

| ID | Finding | Class | Evidence / disposition |
|---|---|---|---|
| S-3 | Digital downloads survive refunds (token TTL/limit-scoped only; refund never touches fulfillment) | **P2 — POLICY DECISION REQUIRED** | Behavior pinned by test (`resolveDownloadToken` resolves after full refund). Recommended default for D.6.5+: full refund revokes download access by clearing `downloadToken` in the D.4 success path (smallest fix, ~1 line). NOT implemented — changes customer entitlement. |
| S-4 | Refund ↔ fulfillment rules undefined (refund neither blocks on nor mutates fulfillment state) | **P2 — POLICY DECISION REQUIRED** | Current design = disclosure-only UI (D.5.2-D intent preserved). Refunds are creator-authorized; fulfillment continues independently. Recommended default: document "creator-managed policy" for launch. |
| S-6 | Inventory enforcement absent (`requiresInventory` is metadata-only; Product has NO quantity column) | **P2 — explicitly deferred** | No schema fields exist; no UX promises inventory control (repo scan clean). Risk: physical overselling is operationally creator-managed. |
| P3 | Dashboard revenue sums COMPLETED amounts incl. ₹0 orders; no refund netting; fulfillmentHealth volume includes non-completed | P3 | ₹0 contributes 0 to sums (numerically harmless); net-revenue metric = future feature. Deferred. |
| P3 | Stale PENDING orders accumulate (abandoned links/lost webhooks) | P3 | Harmless by construction: no quota (reserved only at completion), no inventory, excluded from revenue (COMPLETED-only), each checkout mints a fresh link so no duplicate-payment hazard. Documented; no auto-deletion/timeout invented. |

**P0: NONE. P1: NONE.**

## 3. Audit Results by Phase

- **P2-1 account switch:** refunds load credentials ONLY from `order.paymentAccountId`
  (guardrail-pinned); wrong-account credentials make Razorpay reject the unknown
  payment id → fail-closed; money can NEVER land in the wrong account. Creator
  can strand old refunds by switching accounts — documented loss mode (runbook §7),
  not a misdirection risk. Historical binding structurally correct.
- **S-3 digital delivery:** see table; current behavior proven by tests.
- **S-4 fulfillment/refund:** state machine independent of refunds by design;
  concurrency guard (D.5.2-C) intact; disclosure-not-blocking preserved.
- **S-6 inventory:** see table.
- **Shipping address (Phase 6):** tenant-isolated (`getOrderShippingAddress`
  returns not-found cross-tenant — test); projected only behind the
  physical-product gate (source contract); survives delivery/refund (address row
  untouched by both); contains no payment data.
- **WhatsApp (Phase 7):** WHATSAPP/BOTH render a pure wa.me anchor — zero
  order/payment surface (module source-scan guardrail); destination server-resolved
  via `safeUrl` (scheme-rejecting); message URL-encoded, display-price only;
  preview mode inert. rccf66/rccf68 suites continue to pin renderer behavior.
- **₹0/free (Phase 8):** free completions flow through canonical
  `completeProductOrder`; revenue sums unaffected (0-contribution); analytics
  count COMPLETED only. No material error.
- **PAID vocabulary (Phase 9):** live dead predicate found ONLY in
  `dashboard/service.ts` (two IN-clauses) → removed this RCCF (behavior-identical:
  PAID was never written). All other matches were invoice-domain statuses or comments.
- **Stale PENDING (Phase 10):** see P3 table.
- **Reconciliations (Phases 11–14):** reconfirmed via suites — D.6.1 signed-webhook
  identity/duplicate/delayed/wrong-amount matrix, D.5.1 ledger invariant +
  atomic webhook apply-cycle, D.5.5 signature/fail-closed contract, D.6.2
  verification lifecycle incl. rotation/transient-no-write/stale-guard. Zero regressions.
- **Tenant/role matrix (Phase 15):** covered across rccf69, d52a/d52c, d62 suites
  (creator ALLOW own/DENY other; AGENCY_*/SUPPORT/READ_ONLY/SUPER_ADMIN-no-tenant/
  anonymous DENY on mutations; address reads membership-scoped per D.5.2-A design).
- **Customer experience (Phase 16):** completion flows through the single
  boundary; failures surface sanitized provider reasons; delayed webhooks are
  idempotent; refund states display truthfully (D.5.2-D projection).
- **Deployment config (Phase 17):** `.env.example` carries all five payment vars as
  placeholders (D.6.3); real values verified present locally, never printed.
  `validate-env.mjs` requiring `RAZORPAY_WEBHOOK_SECRET` remains an ACTIVATION-TIME
  (D.6.5) deployment-behavior change — deliberately not altered here.
- **Activation simulation (Phase 18):** Cases A–E pinned (d63 suite + d64 additions:
  disconnected-transitivity, missing-settlement, registry tokens).

## 4. Implementation

| File | Change |
|---|---|
| `src/features/dashboard/service.ts` | Remove dead `"PAID"` from two status filters → `"COMPLETED"` (behavior-identical; file was clean vs HEAD) |
| `tests/unit/rccf72-18d64-final-preactivation-audit.test.ts` (**NEW**) | 19 tests: S-3 behavior pins (4), shipping-address isolation/disclosure (2), WhatsApp boundary (3), ₹0/PAID guardrails (4), activation sims (4), historical-binding source contracts (2) |
| `docs/rccf-72.18d6.4-final-preactivation-policy-security-audit-closure.md` (**NEW**) | This closure |

## 5. Tests & Verification

- Full focused chain D.2→D.6.4: **15 files, 485/485 passed**
- Gates: tsc ✅ · eslint ✅ · build ✅ · prisma validate ✅ · git diff --check ✅
- Pre-existing full-suite items unchanged (15 × RCCF-70.x/71.x guardrails — evidence D.6.1 §10)
- Registry check: `git diff HEAD -- registry.ts` = **0 lines**; DIRECT_CREATOR `future`, PLATFORM_COLLECT `active`

## 6. Protected Work

Baseline preserved (415 dirty entries). Only files touched: one previously-clean
dashboard service file (whole-file staging safe) + new files. All staged D-chain,
D.6.1–D.6.3 blobs intact. No destructive git operations anywhere.

## 7. Exact Staged Files

```
src/features/dashboard/service.ts
tests/unit/rccf72-18d64-final-preactivation-audit.test.ts
docs/rccf-72.18d6.4-final-preactivation-policy-security-audit-closure.md
```

## 8. Activation Recommendation

**NO P0/P1 blockers remain.** With the three POLICY DECISION REQUIRED items
(S-3 digital-access-after-refund, S-4 fulfillment/refund rules, S-6 inventory)
explicitly accepted as creator-managed defaults OR resolved by decision,
**RCCF-72.18D.6.5 may proceed as a tiny audit + explicit registry flip + post-flip
verification**, exactly as scoped.

Commit: **NOT CREATED** · Push: **NOT PERFORMED**
