# Financial Governance — RCCF-IMPLEMENTATION-72

## Audit trail (Phase 12)

Every financial action writes `AuditLog` with actor, timestamp, and amounts:

| Action | Audit entry |
| --- | --- |
| Subscription commission | `commission:subscription-created` (partner, workspace, plan, invoice, amount, shares) |
| Settlement created | via `createSettlementAction` (settlement service + ledger) |
| Settlement approved / paid / cancelled | via `updateSettlementAction` |
| Payout created | `payout:created` (settlement, partner, amount, by) |
| Payout approved / processed / retried | `payout:approved`, process/retry actions |

## Idempotency

- **Commission**: per-invoice check → `already-recorded`; webhook-level
  `BillingEvent.idempotencyKey` (unique).
- **Payout**: `idempotencyKey = payout_settlement_<id>` unique on
  `PayoutBatch`; duplicate settlement payouts rejected.
- **Webhooks**: subscription events deduped; product-order captures now write a
  durable `BillingEvent` (idempotency) + amount-verified.

## Amount integrity (Phase 0)

- `verifyPayment` now fetches the Razorpay payment and checks the captured
  amount vs the order amount.
- Product-order `payment.captured` webhook verifies the amount before
  completing + records idempotency.
- Invoice amount uses the **paid** amount (webhook), falling back to plan price.
- Fallback plan checkout no longer uses `amount: 0` (Razorpay rejects it).

## Reporting (Phase 14)

- **Platform**: `getPlatformRevenueSummary` — platform revenue, agency revenue,
  subscription count, pending settlements, paid payouts, top agencies.
- **Agency**: `getPartnerRevenueSummary` — lifetime, pending, available, paid,
  active clients, upcoming renewals.
- **Health** (Phase 13): `getRevenueRuntimeHealth` — commission / settlement /
  ledger / payout health (healthy / warning / broken) in the Revenue Center.

## Security (Phase 15)

- All commission/ledger/settlement/payout mutations are SUPER_ADMIN-gated.
- Agency revenue data is AGENCY/SUPER_ADMIN-gated.
- No client-controlled amounts (server-derived); no agency write access to
  rules/ledger/settlement/payout.
