# Subscription Revenue Runtime — RCCF-IMPLEMENTATION-72

The recurring revenue engine for CreatorStore's SaaS business model.

## Model

```
Creator ── AgencyTenant ──▶ Agency
   │                          │
   ↓                          │
Creator subscribes (₹699)     │
   ↓                          │
CreatorStore Billing (MoR)    │
   ↓                          │
Revenue Split Runtime         │
   ├─ platform share          │
   └─ agency share ───────────┘
Creator keeps 100% of product revenue (never touched).
```

## Activation chain

```
Billing webhook (activate/renew)
  → recordSubscriptionCommission(workspaceId, planCode, subscriptionId, invoiceId, amount)
     ├─ resolvePartnerForWorkspace: Workspace → tenantId → AgencyTenant.agencyId
     ├─ resolveSplit: CommissionRule(partner→plan→default) → AgencyTenant.revSharePercent
     │                 → CommissionPolicy.agencyDefaultShare → 80/20 default
     ├─ computeSubscriptionSplit(amount, src) → platformShare + partnerShare
     ├─ $transaction: CommissionEntry(pending) + PartnerLedger(COMMISSION_EARNED, balance chain)
     ├─ events: subscription.created/renewed/upgraded, commission.created, ledger.updated
     └─ audit: logAction(commission:subscription-created)
```

## What was activated (previously dead)

| Block | Before (AUDIT-07) | After |
| --- | --- | --- |
| Attribution | `Workspace.agencyId` (null on creator workspaces) | AgencyTenant join (reused) |
| Rule source | in-memory `ruleEngine`, never hydrated | DB `CommissionRule` cascade + policy/relationship fallback (request-cached) |
| `processCommission` | throws on empty engine, caller swallows | `recordSubscriptionCommission` transactional, idempotent, errors surfaced |
| Ledger | in-memory `commissionLedger` zeros | DB `PartnerLedger` balance chain (append-only) |
| Settlement | selects `cleared` (never exists) | selects `pending` entries |
| Payout | stub providers | DB-backed runtime + real Razorpay Payouts behind a flag |
| Units | paise/rupees mismatch | rupees end-to-end, rounded to paise |

## Attribution (Phase 1)

`resolvePartnerForWorkspace` maps `BillingSubscription.workspaceId → Workspace.tenantId → AgencyTenant.agencyId`. It reuses `AgencyTenant` (no duplicated relationship); `Workspace.agencyId` (the agency's own workspace) is correctly ignored.

## Split (Phase 4)

`computeSubscriptionSplit(amount, src)` → platform/agency shares summing to the amount, rounded to paise. Agency percent resolution order:
1. `CommissionRule` — partner-specific → plan-specific (`metadata.planCode`) → default.
2. `AgencyTenant.revSharePercent` (per-creator, default 20).
3. `CommissionPolicy.agencyDefaultShare` (default 30).
4. 80/20 hardcoded default.

Only platform + agency — **no creator share**. Creators own their product revenue; the split applies to subscriptions only.

## Migration safety (Phase 17)

- Zero breaking changes: no schema changes, no plan-code changes, no billing rewrite.
- Existing creators without an agency produce `skipped: "no-partner"` — no commission, no behavior change.
- Commission is idempotent per invoice (`already-recorded`).
- Pricing runtime, Runtime Context, entitlements untouched.
