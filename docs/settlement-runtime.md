# Settlement Runtime — RCCF-IMPLEMENTATION-72

## Fixes applied (Phase 6) to `src/lib/settlement/service.ts`

| Bug (AUDIT-07) | Fix |
| --- | --- |
| Selected only `status: "cleared"` entries (never exists → no settlement possible) | Selects `status: "pending"` |
| Cast `amount` → `.partnerShare` (NaN totals) | Selects `partnerShare` directly; totals sum partnerShare |
| Ledger rows written with `amount: 0` | `SETTLEMENT_CREATED` = netAmount, `SETTLEMENT_PAID` = netAmount, `SETTLEMENT_CANCELLED` = −netAmount |
| `createSettlement`/`updateStatus` had zero callers | Wired to super-admin actions (`createSettlementAction`, `updateSettlementAction`) + Revenue Center UI |

## Lifecycle

```
pending commission entries
  → createSettlement (partner or explicit entry ids)   [PENDING]
  → APPROVED (approvedBy/At)
  → createPayoutForSettlement                           [payout.queued]
  → (payout processing)
  → settlement PAID → entries cleared (clearedAt) + SETTLEMENT_PAID ledger
  or CANCELLED → entries released
```

Valid transitions (unchanged): PENDING → READY/REJECTED/CANCELLED; READY →
APPROVED/…; APPROVED → PROCESSING/CANCELLED; PROCESSING → PAID/FAILED;
FAILED → PENDING; PAID → ARCHIVED.

## Wiring

- `src/actions/revenue-runtime.actions.ts` — create / approve / create-payout.
- Super Admin Revenue Center — partner-id input, approve + create-payout
  buttons per settlement.
