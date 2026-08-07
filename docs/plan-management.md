# Plan Management — RCCF-IMPLEMENTATION-70

## The plan model (`CommercePlanConfig`)

| Field | Meaning |
| --- | --- |
| `code` | Stable internal key (never rename — legacy codes map via `LEGACY_TO_CANONICAL`) |
| `name` | Display name |
| `price` / `annualPrice` | Monthly / annual (10× monthly = ~17% saving) |
| `capabilities` | Boolean grants (CommerceCapability) |
| `featureOverrides` | Per-plan numeric limits (products, gallery, AI credits, team, …) |
| `marketingDescription` | Value-focused pitch (card + JSON-LD) |
| `targetAudience` | Who the plan is for |
| `marketingHighlights` | Curated feature list — every item maps to a real capability/module |
| `badge` / `popular` / `bestValue` / `recommended` | Most Popular / Best Value / Recommended badges |
| `comparisonOrder` | Left-to-right order in the comparison |
| `ctaType` / `ctaLabel` | signup / checkout / contact routing |
| `trialDays` | Free-trial length (Launch plans) |
| `hidden` | Retired tiers (e.g. Partner Growth) — excluded from marketing, kept for legacy resolution |
| `enterprise` | Contact-sales tier — shown only under Enterprise Solutions |

## Editing a plan

1. Edit the entry in `src/config/commerce/plans.ts` (name, price, badge,
   highlights, limits, flags).
2. Run the unit suite — `tests/unit/commerce-registry.test.ts` validates codes,
   lineup, prices, limits, annual savings and that every highlight is backed by
   a real capability keyword.
3. In the Super Admin **Pricing Center** (`/super-admin/pricing`) click
   **Re-sync catalog** — this persists the plan + `marketing` JSON to the
   `BillingPlan` table (seed `seedBillingCatalog`).

## Change discipline

- **Never hardcode a price/feature/bullet in a component.** Every surface reads
  the registry.
- **Never rename a plan code.** Add new codes + legacy mapping instead.
- **Keep `partner_growth`** (hidden) so existing subscribers and legacy codes
  keep resolving; it is simply not shown publicly.
- **Enterprise plans** carry `hidden: true` + `enterprise: true` — they are
  excluded from the comparison matrix and JSON-LD, and shown only in the
  Enterprise section.

## Propagation paths

| Change | Propagates to |
| --- | --- |
| price / annualPrice | pricing cards, JSON-LD, checkout (via `getPlan`) |
| name / badge / description / targetAudience | pricing cards, comparison header, JSON-LD |
| marketingHighlights | pricing cards, upgrade copy |
| featureOverrides | comparison matrix, `capabilityService.limit`, usage display |
| capabilities | capability engine, entitlements |
| hidden / enterprise | marketing exclusion + Enterprise section |

## Future: runtime editing without redeploy

The `BillingPlan.marketing` JSON column + Pricing Center sync make the DB a full
mirror. To move from "edit registry → re-sync" to "edit DB at runtime", switch
the marketing data layer to read `BillingPlan` (one-line change in `data.ts`)
and add a super-admin save action writing `marketing` — the schema and sync path
are already in place.
