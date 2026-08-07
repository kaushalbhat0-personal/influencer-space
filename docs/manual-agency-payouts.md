# Manual Agency Payouts — RCCF-IMPLEMENTATION-74

## Philosophy

Agency payouts are **manual and fully auditable** — no payout automation, no
Razorpay transfers, no split settlements. The Super Admin transfers the pending
balance by bank/UPI and records it.

## Workflow

```
Revenue Center → Settlements (partner's pending commission)
  → create settlement (from pending entries)      [PENDING]
  → Approve                                       [APPROVED]
  → "Mark paid (manual)"  (bank/UPI transfer outside the platform)
      → prompt for transfer reference (UTR / UPI ref / bank ref)
      → settlement PAID
        → commission entries cleared (clearedAt)
        → PartnerLedger SETTLEMENT_PAID = netAmount
        → audit log (actor, amount, reference)
```

## Implementation

- `updateSettlementAction(settlementId, "PAID", { transferRef, transferMethod: "manual" })`
  — the existing settlement runtime handles the transition + ledger + audit.
- The Revenue Center's APPROVED settlements expose a **"Mark paid (manual)"**
  button with a reference prompt.
- No payout provider is involved; `RAZORPAY_PAYOUTS_ENABLED` stays off.

## Why manual

- Agencies cannot be paid automatically without fund-account onboarding (next
  infrastructure work) and human sign-off.
- Every manual payout leaves an immutable `PartnerLedger` record + audit entry.

## Alternative (semi-automated, dry-run)

The `payout` runtime from IMPLEMENTATION-72 supports a queued →
approved → processing → paid lifecycle with a **dry-run default**. Use it when
fund accounts exist; until then, manual marking is the supported path.
