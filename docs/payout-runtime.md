# Payout Runtime — RCCF-IMPLEMENTATION-72

## Activation (Phase 7) — `src/lib/payouts/runtime.ts`

DB-backed payout lifecycle replacing the in-memory + stub-provider service.

### Lifecycle

```
APPROVED settlement
  → createPayoutForSettlement   [pending / queued]  (reserves commission entries)
  → approvePayout               [approved]          (manual approval, actor recorded)
  → processPayout               [processing] → provider → [paid] or [failed]
  → retryFailedPayout           [failed → pending]
```

### Real Razorpay Payouts, behind a flag

- `RAZORPAY_PAYOUTS_ENABLED=1` + a `fundAccountId` on the batch → real
  `razorpay.payouts.create` (UPI, commission purpose).
- **Default: sandbox/dry-run** — `payoutsEnabled()` is false, so payouts are
  recorded as `paid` with `dry-run:` references and **no money moves**.
- On success the linked settlement is marked PAID (entries cleared).
- **No automatic payouts** — every payout requires manual approval
  (`approvePayout`) before it can process.

### Provider (real call, typed cast)

```ts
const payouts = (razorpay as unknown as { payouts: { create(...): Promise<{id}> } }).payouts;
await payouts.create({ fund_account_id, amount: net*100, currency, mode: "UPI", purpose: "commission", ... });
```

### Actions + UI

- `createPayoutAction(settlementId)`, `approvePayoutAction`, `processPayoutAction`,
  `retryPayoutAction` (SUPER_ADMIN-gated, audited, revalidate).
- Super Admin Revenue Center payout queue (queued / approved / processing /
  paid / failed) with Approve → Process → Retry.

### Remaining (documented follow-up)

- **Agency fund-account onboarding** (bank/UPI KYC) → stores the
  `fundAccountId` on the payout batch. Until then payouts run in dry-run.
- Enabling `RAZORPAY_PAYOUTS_ENABLED` only after fund accounts exist.
