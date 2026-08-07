# Audit 07 — Commerce Revenue Model & Payment Architecture

**READ ONLY** — no code changed. This audit is the implementation blueprint for
the target business model: **CreatorStore is a SaaS, not a marketplace.
Creators keep 100% of product revenue; CreatorStore earns subscriptions,
add-ons, and agency revenue share on subscriptions — never transaction fees.
Money for creator sales goes directly into the creator's account.**

## Executive verdict

| Question | Answer |
| --- | --- |
| Can CreatorStore become a true SaaS with **0% transaction fees**? | **Architecturally yes** — the schema reserves the fields (`Tenant.razorpayAccountId`, `ProductOrder.routeTransferId`, `WebsiteAgency.razorpayAccountId`) but **no code path uses them**. The platform is currently the single Merchant of Record. |
| Can creators receive payments directly? | **Not today.** Single platform Razorpay key; no Route / transfers / linked accounts anywhere in `src/`. |
| Can agencies earn recurring subscription revenue only? | **Intended, but broken.** The commission path exists (billing → `processCommission` → ledger) but is dead: wrong attribution column, empty in-memory engines, no DB rules, no real payout. |
| Can the commission runtime support subscription revenue sharing? | **Partial.** `CommissionEntry` already has `partnerId/planCode/subscriptionId`; `CommissionRule` supports partner → plan → default; `PartnerLedger` is DB-backed. But attribution + rule hydration + settlement + payout are missing/broken. |
| Does the Razorpay integration support the model? | **No.** Only `orders.create` (products) and `subscriptions.create` (plans) are real; refunds/transfers/routes/linked-accounts are absent or stubbed. |
| What is the safest migration strategy? | Phase the model in **per-creator opt-in** (DIRECT_CREATOR), keep PLATFORM_COLLECT as the default for existing creators, and never touch existing subscription/invoice integrity. |

## Required diagrams

### Creator Product Sale (today)

```
Customer
  ↓  (Razorpay Checkout modal, order_id)
Creator Website ([domain]/page → BuyNowButton)
  ↓  createCheckout → ProductOrder(PENDING) → razorpay.orders.create
Razorpay (platform account — MoR)
  ↓  payment.captured webhook → ProductOrder(COMPLETED)
Platform account
  ↓  (NO transfer / NO payout / NO settlement)
creator ships?  →  no fulfillment code, no address, no download delivery
```

### CreatorStore Subscription (intended)

```
Creator
  ↓  subscriptions.create (plan_id) → BillingSubscription(TRIALING)
CreatorStore receives payment (MoR = CreatorStore)
  ↓  payment.captured / subscription.charged → ACTIVE, BillingInvoice(PAID)
Revenue share
  ↓  processCommission (agency-managed creators)
Agency receives configurable % (subscription revenue ONLY)
Creator keeps 100% product revenue
```

### Agency Lifecycle (intended)

```
Creator ──linkCreator()──▶ Agency (AgencyTenant)
  ↓
Creator subscribes (BillingSubscription on the CREATOR's workspace)
  ↓
Subscription revenue shared → CommissionEntry(partnerId, planCode, subscriptionId)
  ↓
PartnerLedger (DB-backed) → Settlement → Payout (Razorpay transfers)
```

## Part-by-part summary

| Part | Status |
| --- | --- |
| 1. Billing architecture | ⚠️ Runtime pricing (IMPLEMENTATION-71) + solid Billing v2 state machine; renewals/dunning missing |
| 2. Payment flow | ⚠️ Product checkout live; subscription checkout live (real API); fallback order broken (`amount: 0`) |
| 3. Merchant of Record | ❌ Platform is the only MoR; no per-creator accounts or transfers |
| 4. Razorpay integration | ⚠️ orders + subscriptions real; refunds/transfers/routes/linked accounts absent |
| 5. Agency revenue model | ❌ Commission pipeline dead (attribution wrong, engines empty, settlement dead, payouts stubbed) |
| 6. Creator revenue | ❌ No digital/physical fulfillment, no receipts, no payouts |
| 7. Shipping | ❌ No address/tracking/courier fields on any order |
| 8. Commerce runtime (DIRECT_CREATOR) | ❌ Not supported by any code; schema-only fields |
| 9. Future compatibility (DIRECT/PLATFORM/MARKETPLACE/HYBRID) | ⚠️ Schema reserves fields; no runtime support |
| 10. Partner subscription sharing | ❌ Not buildable without fixes (4 blockers) — see `docs/subscription-sharing.md` |
| 11. Add-ons | ❌ Config-only capability keys; not purchasable |
| 12. Creator subscription ownership | ✅ Creator owns their subscription (account = creator workspace); agency is NOT billing owner |
| 13. Agency lifecycle | ⚠️ Linking + invites work; revenue + leave/migrate flows missing |
| 14. Financial governance | ⚠️ Audit + versioning strong; MRR/ARR present; revenue-split attribution broken |
| 15. Super Admin config | ⚠️ Platform/agency/referral splits configurable at runtime; engine in-memory (not durable), no per-creator edit |
| 16. Security | ⚠️ Amounts/plans server-derived (good); amount-not-verified, no product webhook idempotency, invoice-from-price |
| 17. Migration risk | See `docs/implementation-roadmap-commerce.md` |
| 18. Production readiness | See scores below |

## Production readiness scores (0–100)

| Area | Score |
| --- | --- |
| Billing (v2 state machine, runtime pricing, idempotent webhooks) | 82 |
| Payments (checkout live; no refunds/dunning/transfers) | 58 |
| Commerce (products/orders live; no fulfillment/payouts/shipping) | 55 |
| Partner revenue (commission/ledger/settlement/payout) | 30 |
| Creator revenue (direct-to-creator, receipts, delivery) | 25 |
| Agency revenue (subscription share) | 30 |
| Subscriptions (trial→active live; renewals/dunning missing) | 70 |
| Financial reporting (MRR/ARR/audit strong; attribution broken) | 60 |
| Security (server-derived amounts; residual gaps) | 74 |
| Scalability (indexes, caches, runtime pricing) | 78 |

See the companion docs for full evidence: `payment-flow`, `creator-revenue`,
`partner-revenue`, `razorpay-audit`, `subscription-sharing`,
`financial-governance`, `implementation-roadmap-commerce`.
