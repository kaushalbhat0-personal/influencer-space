# Financial Governance — Audit 07

## Audit trail & versioning

| Finding | Status | Severity | Evidence |
| --- | --- | --- | --- |
| `AuditLog` written on super-admin pricing/commission/coupon actions + payment captured + webhooks | ✅ | — | `logAction` across `super-admin-pricing.actions.ts`, `super-admin-billing.actions.ts`, `billing/service.ts` |
| **Pricing versioning** — every runtime pricing change creates `PlanPricingVersion` (who/when/what) with rollback | ✅ | — | IMPLEMENTATION-71 |
| **No financial-adjustment versioning** for settlements/commissions/payouts | ❌ | High | no version table for ledger/settlement mutations; ledger rows written with `amount: 0` (settlement) |
| Commission/settlement mutations lack `logAction` (only in-memory event-bus publish) | ❌ | High | V-04 G-22 |

## Revenue reporting accuracy

| Finding | Status | Severity | Evidence |
| --- | --- | --- | --- |
| MRR/ARR = Σ ACTIVE/TRIALING `BillingSubscription` plan prices — matches the DB | ✅ | — | `revenue-service.ts:76,84` |
| Revenue windowed via `findMany(take:1000/5000)` → understated past the cap | ⚠️ | Medium | `revenue-service.ts:55-57,103` |
| **`commissionRevenue` is always 0** — commission never accrues (dead pipeline) | ❌ | Critical | `revenue-service.ts:59-61,78`; `commission/service.ts` throws |
| Invoice amount derived from **plan price, not the paid amount** → divergence risk | ⚠️ | Medium | `billing/service.ts:91,232` |
| No GST/tax stored on `ProductOrder` (flat 18% baked into amount, not persisted); `BillingInvoice.taxAmount` stays 0 | ⚠️ | Medium | `coupons.ts:89`; `repository.ts:115-126` |
| **Subscription attribution to agencies** — no table links a subscription to its managing agency | ❌ | High | see `docs/subscription-sharing.md` |

## Governance gaps

| Finding | Status | Severity | Recommendation |
| --- | --- | --- | --- |
| No reconciliation of paid amounts vs captured payments at `verifyPayment`/webhook | ❌ | High | Verify amount + fetch payment status server-side |
| Product-order webhook has no idempotency record | ❌ | High | Add `BillingEvent` (or a product-order idempotency key) for `payment.captured` |
| No refunds (governance + financial) | ❌ | High | `refunds.create` + `REFUNDED` invoice state + refund webhook handling |
| No dunning / renewal enforcement (PAST_DUE → cancelled job missing) | ❌ | High | cron + grace-period transition |
| No per-creator financial statements / GST documents | ❌ | Medium | invoice model extension |

## Security (Part 16) — what an agency/customer CANNOT do

| Attack | Status | Evidence |
| --- | --- | --- |
| Tamper with checkout amount | ✅ Blocked | amount = server product price + server coupon + server tax (`checkout.actions.ts:36-66`) |
| Tamper with planCode at checkout | ✅ Blocked | validated against the catalog (`billing/service.ts:367-368`); workspace ownership checked |
| Tamper with commission % | ✅ Blocked | only SUPER_ADMIN writes rules; agencies have no writer API |
| Tamper with DB coupons at checkout | ✅ Blocked (vacuously) | DB coupons aren't read at checkout at all (hardcoded map instead) |
| Replay `payment.captured` (product orders) | ⚠️ | no product idempotency row (status-flip idempotent, but no processed-payment record) |
| Capture a different amount than expected | ⚠️ | `verifyPayment` + webhook never compare captured amount to order amount |

## Part 14 verdict

Audit + versioning for **pricing** is strong. Financial **reporting** (MRR/ARR)
is present. The **revenue-split / attribution / settlement** layer is not
governed (nothing accrues, settlement is dead, amounts are 0/NaN) — this is the
single most important correctness gap for the target business model.
