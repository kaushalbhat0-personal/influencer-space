# Runbook — DIRECT_CREATOR Payments (Razorpay) Operations

Scope: creator-direct (DIRECT_CREATOR) PaymentAccount lifecycle, verification,
webhooks, refunds and reconciliation. Platform-collect subscription billing is
out of scope except where noted.

Status references — `PaymentAccount.verificationStatus`:
`unverified | pending | configured(legacy) | verified | failed`.

---

## 1. Creator cannot verify credentials

The Verify action (`/admin/payments`) performs ONE read-only authenticated
Razorpay probe (`GET /v1/orders?count=1`). Outcomes:

| Result shown | Classification | Meaning | Operator action |
|---|---|---|---|
| "Provider rejected these credentials" / "(insufficient permission)" | `credential_failed` → status `failed` | PERMANENT: Razorpay answered 401/403. Keys are wrong, revoked, or the account is disabled. | Creator re-copies key pair from Razorpay Dashboard (Settings → API Keys), re-saves, verifies again. No retry will fix it. |
| "Payment provider is temporarily unavailable. Try again shortly." | `transient` → NO state change | 429/5xx/network/timeout. Nothing is known about the keys. A previously `verified` state is intentionally preserved. | Wait and retry. If persisting >30 min, check Razorpay status page before touching configuration. |
| "Verification could not be completed" | `unknown` → NO state change (diagnostic captured server-side) | Malformed/unexpected provider answer. | Retry once; if repeated, capture correlation from server diagnostics (no secrets) and escalate. |
| "Stored credentials could not be decrypted. Please re-save your keys." | local decrypt failure → NO state change | Our ciphertext/env issue (e.g. `TOKEN_ENCRYPTION_KEY` rotated). | Creator re-saves keys; verify again. |

Never communicate key material in any channel. Diagnostics never contain secrets.

## 2. Creator rotates credentials

```
save new keys → verificationStatus = pending (old proof invalidated)
             → Verify → probe → verified
```

Any save that includes a key id or secret demotes an existing `verified` state.
There is no path where rotated credentials remain trusted without a fresh probe.

## 3. Razorpay outage

Transient failures never mutate persisted state: a creator whose account reads
`verified` keeps that state through outages; readiness stays eligible only while
state is `verified`. Do NOT manually edit statuses during an outage.

## 4. Webhook outage / redelivery

Endpoint `POST /api/webhooks/razorpay` (HMAC-SHA256 over raw body; missing or
wrong secret ⇒ 401; unconfigured secret ⇒ 500 fail-closed).

- Deliveries are idempotent (BillingEvent unique keys per payment/refund).
- After an outage, Razorpay retries are safe: duplicates collapse to no-ops.
- Required Razorpay Dashboard subscriptions: `payment.captured`,
  `payment.failed`, `refund.processed`, `refund.failed`
  (+ platform subscription events for PLATFORM_COLLECT billing:
  `subscription.*`, `order.paid`).
- `payment_link.paid` is NOT handled (payment.captured is authoritative);
  unknown events are accepted with `{ok:true}` and no mutation.

## 5. Payment Link paid but order still PENDING

Reconciliation boundary (D.6.1): capture resolves the order via
`providerReference` (plink id) or the checkout-persisted
`providerMetadata.reconciliationRef`, then completes through the canonical
`completeProductOrder()`.

Investigation order (read-only):
1. Confirm the webhook delivery arrived (Razorpay dashboard event log).
2. Confirm signature class: 401 responses mean secret mismatch — check
   `RAZORPAY_WEBHOOK_SECRET` matches the Dashboard value exactly.
3. Server diagnostics for `direct-creator-reconciliation` carry provider
   payment/link ids and reason codes (`amount_mismatch`, `strategy`, `state…`).
4. Amount mismatches NEVER complete orders — compare captured paise vs
   `ProductOrder.amount × 100`.
Redelivery of the same event after fixing config is safe (idempotent).

## 6. Refund failure

State machine (D.3/D.4/D.5.1): initiation sets `refundStatus = PENDING`;
execution writes PARTIAL/REFUNDED on success or FAILED on failure.
`refundAmount` counts ONLY actually refunded paise (never reservations;
invariant `0 ≤ refundAmount ≤ originalCapturedPaise`).

- FAILED → safe to retry: initiate again (headroom was never consumed by the
  failure) and execute.
- **Digital entitlement (D.6.5 POLICY 1): a FULL refund revokes the customer's
  digital download link** (token cleared in the same transaction as the ledger
  update — execution path and webhook reconciliation both). PARTIAL refunds,
  initiation, PENDING and FAILED states never revoke access. Fulfillment
  status itself is creator-managed and is not auto-mutated by refunds.
- Webhook reconciliation (`refund.processed`/`refund.failed`) is the source of
  truth for money that actually moved; it clamps to the remaining ceiling and
  dedupes per provider refund id.
- Refunds always use the historically bound `order.paymentAccountId` — never
  the creator's current account row selection.

## 7. Historical PaymentAccount replacement

Orders keep their original `paymentAccountId` binding forever. Rotating or
replacing a creator's current credentials does NOT re-point historical orders.
If a creator connects a DIFFERENT Razorpay account, refunds of old orders will
fail closed at the provider (unknown payment id) — correct behavior; funds can
never move from the wrong account. Manual data surgery is NOT authorized.
