# Commerce Roadmap

Canonical plans and pricing live in `src/config/commerce/plans.ts`. This page
reflects their status. Markers: ✅ completed · 🚧 in progress · 🟦 planned.

## Current Plans (canonical creator matrix)

| Plan | Code | Price | Razorpay plan | Status |
|---|---|---|---|---|
| Creator Launch | `creator_launch` | ₹0 | — | ✅ |
| Creator Grow | `creator_grow` | ₹699/mo | `plan_TLTGQBU1EXkseF` (config) | ✅ |
| Creator Scale | `creator_scale` | ₹1,995/mo | `plan_TLTH45wQlPdW7v` (config) | ✅ |
| Creator Enterprise | `creator_enterprise` | Manual sales | — | ✅ (manual) |

Razorpay plan ids are **configuration only** — code references internal codes
via `razorpayPlanIdFor(code)`.

## Future Add-ons

| Add-on | Status | Grant |
|---|---|---|
| AI Credits | 🟦 | `ai_credits` capability / usage ledger |
| Storage Packs | 🟦 | `storage_pack` capability |
| Theme Packs | 🟦 | `theme_packs` capability |
| API Integrations | 🟦 | `api_integrations` capability |
| White Label | 🟦 | `white_label` capability (Scale+) |
| Priority Support | 🟦 | `priority_support` capability |

## Future Marketplace

- 🟦 Theme/template marketplace sales between creators.
- 🟦 Payouts via the existing `PayoutService` (providers currently stubs).
- 🟦 Revenue split via the existing `CommissionService`/`CommissionPolicy`.

## Future AI Credits

- 🟦 Per-creator AI usage ledger (persisted) → monthly grant.
- 🟦 Consumed through `CapabilityService` limits; never a direct feature switch.

## Future Storage Packs

- 🟦 Add-on grants raising the `storage_gb` limit from the base plan.

## Future Referrals

- 🟦 Affiliate/referral grants; `AffiliateLink` click tracking exists.

## Future Enterprise

- 🟦 Manual sales only (`creator_enterprise`, `manual: true`), dedicated support.

## Future Tax

- 🟦 GST engine beyond the flat 18% checkout calculation; populate
  `BillingInvoice.taxAmount`.

## Future Billing UX

- 🚧 Upgrade/downgrade/cancel buttons wired to `BillingService` (currently
  redirect/toast).
- 🟦 Invoice center download, cancellation self-serve, proration display.
