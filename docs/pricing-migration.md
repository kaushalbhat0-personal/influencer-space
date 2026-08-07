# Pricing Migration — RCCF-IMPLEMENTATION-70

## What changed

### 1. Plan restructure (Phase 1)

| Plan | Before | After |
| --- | --- | --- |
| Creator Launch | free "no credit card" | **free, 15-day trial** framing |
| Creator Growth | ₹699 "Creator Grow" | ₹699 **"Creator Growth"**, Most Popular |
| Creator Scale | ₹1,995 | **₹1,999**, Best Value |
| Creator Enterprise | in config | **hidden from comparison**, shown only under Enterprise Solutions |
| Partner Free | "Partner Free" | **"Partner Launch"**, 15-day trial |
| Solo Partner | ₹1,499 | **₹2,999**, Recommended |
| Partner Growth | shown publicly | **hidden** (legacy code kept for resolution) |
| Partner Scale | ₹9,999 | **₹7,999**, Best Value |
| Partner Enterprise | duplicate cards | single **"Enterprise Partner"**, Enterprise Solutions |

### 2. Registry-driven marketing (Phases 2–4, 7)

- `CommercePlanConfig` extended with `marketingDescription`, `targetAudience`,
  `marketingHighlights`, `comparisonOrder`, `annualPrice`, `trialDays`,
  `hidden`, `enterprise`, `popular`, `bestValue`, `featureOverrides`.
- Marketing page + comparison + JSON-LD read ONLY the registry.
- `marketingHighlights` are curated real-feature lists; a unit test enforces
  every highlight is backed by a real capability keyword.

### 3. Tiered limits (Phase 5)

- New capability-catalog entries for real modules: `max_services`,
  `max_courses`, `max_testimonials`, `max_faq`, `max_timeline`, `max_links`,
  `max_feed`, `max_games`, `max_bookings`, `ai_credits`.
- Per-plan `featureOverrides` give Launch 3-per-module, Growth unlimited core
  modules, Scale API/team/storage bumps, and partner tiers scaled clients/
  websites. The comparison and `capabilityService.limit` now reflect real
  differentiation.

### 4. Super Admin Pricing Center (Phase 6)

- New `/super-admin/pricing` page lists every plan's full marketing config
  (name, price, annual, badge, trial, flags, audience, highlights) + catalog
  sync status.
- **Re-sync catalog** action persists the registry → `BillingPlan` (incl. a new
  `marketing` JSON column + migration `20260807000001_billing_plan_marketing`).

### 5. Annual + trial + agency messaging (Phases 10, 11, 13)

- Monthly/Yearly toggle with automatic savings (~17%).
- "15-Day Free Trial · No credit card required" framing on Launch plans.
- Partner philosophy panel (recurring commission, client management, multiple
  websites).

## Migration safety

- **Codes unchanged** — `partner_free`, `partner_solo`, `partner_growth`,
  `partner_scale`, `partner_enterprise`, `creator_*` all keep their codes;
  `LEGACY_TO_CANONICAL` untouched. No subscription, checkout, or billing code
  changes required.
- **Billing runtime unchanged** — plans still resolve via `getPlan`/`getPlanByCode`;
  only names/prices/limits changed (display + future enforcement).
- **Entitlement runtime unchanged** — `resolvePlanEntitlements` reads the same
  capability grants; new limits are additive.
- **DB** — one additive, nullable `marketing JSONB` column; zero downtime;
  `prisma generate` refreshed; existing rows unaffected.
- **Marketing** — components refactored to registry selectors; no behavior
  regressions (verified: full suite green).

## Rollback

- Revert the `COMMERCE_PLANS` entries (names/prices/flags) — all consumers read
  the registry, so reverting the file restores the old display.
- The `marketing` column is nullable and unused by billing; safe to keep or drop
  via a reverse migration.

## Verification

`tsc --noEmit` ✅ · `next build` ✅ · **101 files / 1992 tests** ✅ · no new lint
warnings · existing pricing runtime / billing / entitlement runtime unchanged.
