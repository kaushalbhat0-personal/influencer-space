# Pricing Center — RCCF-IMPLEMENTATION-71

`/super-admin/pricing` — the Super Admin Pricing Center now manages
commercialization at runtime.

## Tabs

### Editor
Per-plan editing of every field:

- **Marketing & Pricing:** name, description, target audience, badge, CTA label
  + type, monthly price, annual price, trial days, grace period, comparison
  order, color accent, marketing highlights (one per line), and the
  hidden / enterprise / popular / best value / recommended flags.
- **Capabilities:** grouped checkboxes (Builder, Commerce, AI, Domains,
  Analytics, Branding, Developer, Support, Team, Storage, Content, Website,
  Marketplace) from the canonical entitlements catalog. Toggling a capability
  automatically maps it to its boolean feature grant on save.
- **Limits:** every numeric limit editable — products, gallery, services,
  courses, testimonials, FAQs, timeline, links, feed, games, bookings, storage,
  AI credits, clients, team members, API calls (`-1` = unlimited, `0` = off).
- **Scheduled pricing:** add future price changes with an effective date.
- **Preview:** a live card preview of the plan as it will render on the
  marketing page (mobile/desktop-friendly).
- **Save** writes scalars + `runtimeConfig` JSON, creates a version, audits, and
  revalidates `/pricing` + `/`. **Reset to defaults** restores registry values.

### Versions
Every save is versioned (`PlanPricingVersion`): who, when, and the change note.
One-click **Rollback** restores a previous payload and records a rollback
version.

### Coupons
Coupon foundation (Phase 10): code, label, scope, discount %, plan codes, max
uses, active flag. Stored canonically; checkout wiring is documented as future
work.

### Launch Programs
Launch programs (Phase 11): Early Adopter / Founding Creator / Founding Agency /
Lifetime / invite-only — code, name, discount, scope, plan codes, invite-only,
enrollee caps. Stored canonically.

### Analytics
- MRR / ARR (from active subscriptions)
- Trial active + trial → paid conversions
- Cancellations (churn count)
- Plan distribution with bars

## Server actions

`src/actions/super-admin-pricing.actions.ts`:
`savePlanConfig`, `rollbackPlanVersion`, `listPlanVersions`, `upsertCoupon`,
`upsertLaunchProgram`, `getPricingAnalytics`, `getPricingCenterData`,
`resyncBillingCatalog` (now also clears runtime overrides = true reset).

All are SUPER_ADMIN-gated, audited via `logAction`, and revalidate the pricing
surfaces.

## Change flow

```
Super Admin edits a plan → savePlanConfig
  → BillingPlan scalars + runtimeConfig JSON updated
  → PlanPricingVersion created (rollback/audit)
  → marketing / checkout / upgrade dialogs / public API reflect immediately
```
