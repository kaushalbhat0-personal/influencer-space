# Partner Ledger — RCCF-IMPLEMENTATION-72

## Activation (Phase 5)

The DB-backed `PartnerLedger` (`src/lib/ledger/partner-ledger.ts`) is now written
inside the commission transaction. Every subscription renewal/activation creates
a `COMMISSION_EARNED` entry with a balance chain:

```
balanceBefore ← last balanceAfter
balanceAfter  = balanceBefore + partnerShare
```

- **Append-only / immutable** — entries are never mutated; corrections are new
  entries (`COMMISSION_ADJUSTMENT`, `SETTLEMENT_CANCELLED` negative).
- **Commission ID + settlement ID** references link every ledger row to its
  source.

## Why the in-memory ledger is no longer the source

The old `commissionLedger` (in-memory, zeros unless manually rehydrated) was
what the agency UI read. Now:
- Commission writes go to the DB ledger (transactional).
- Agency revenue reads come from the DB (`getPartnerRevenueSummary`).

## Balance semantics

| Concept | Source |
| --- | --- |
| Lifetime earned | Σ `COMMISSION_EARNED` |
| Pending (unsettled) | Σ `CommissionEntry.status = pending` not in a settlement |
| Paid out | Σ `SETTLEMENT_PAID` |
| Available | lifetime − paid |

## Governance (Phase 12)

Every commission + ledger write is audited via `logAction` (actor, invoice,
plan, amount, shares) and emits `ledger.updated` events through the Event
Runtime.
