# IMPLEMENTATION-42 REPORT — Commerce Alignment & Pricing Consolidation

Aligns every pricing, capability and subscription surface with the finalized
CreatorStore business model — extending Billing v2, CapabilityService, Commerce
Config, Partner Platform and Razorpay Subscription architecture. One canonical
commerce configuration drives every surface. No duplicate pricing.

---

## Architecture

- **Single source of truth**: `config/commerce/plans.ts` — creator + partner
  plans, capability grants, legacy mapping, Razorpay id resolution, and the
  agency-restriction rule. Marketing, billing, checkout, super-admin,
  provisioning and diagnostics all derive from it.
- **Partner business layer** (IMPLEMENTATION-41) reused for partner pricing.
- **Agency creator restriction** is server-enforced through a dedicated
  `plan-restriction.ts` module — never client-only.

## Pricing Alignment (Phases 1–3)

- **Creator plans** (canonical): Creator Launch ₹0, Creator Grow ₹699,
  Creator Scale ₹1,995, Creator Enterprise (Contact Sales).
- **Partner plans** (new): Partner Free ₹0, Solo Partner ₹1,499 (Recommended —
  a product decision), Partner Growth ₹4,999, Partner Scale ₹9,999,
  Partner Enterprise (Contact Sales).
- **Legacy mapping remains internal only** (`LEGACY_TO_CANONICAL` covers
  creator_free/pro/elite + agency_free/studio/agency/growth/starter).
- Legacy `Starter/Pro/Elite` labels no longer appear in the marketing/billing UI.

## Partner Rules (Phase 4)

- Marketing partner tab prominently states: partner plans do **not** include
  creator subscriptions; every creator pays CreatorStore directly; partners may
  charge setup/migration/training/branding/consulting/maintenance; future
  partner rewards are separate (nothing automatic today).

## Agency Creator Restriction (Phase 5) — CRITICAL RULE

- `plan-restriction.ts`: `isTenantAgencyManaged` (AgencyTenant link, 30s cache),
  `resolveRestrictedPlanCode` (clamp Launch → Grow), `assertEligiblePlan`
  (rejects Launch with a clear error).
- Enforced in: **resolution** (`resolveActivePlan` clamps for every surface),
  **checkout** (`BillingService.changePlan`), **billing mutations**
  (`BillingService.adminSetPlan`), **super-admin** (tenant detail shows
  partner-managed + restriction state), **provisioning/import**
  (`importCreatorViaAgency` rejects Launch). Super-admin tenant detail + dev
  diagnostics expose the state (Phase 16).

## Capability Matrix (Phase 10)

- `features.ts` adds a logical grouping layer: Website, Commerce, Builder, AI,
  Analytics, Brand, Domain, Marketplace, Automation, API, Support, Storage
  (`CAPABILITY_GROUPS`, `getFeatureGroups`, `groupForFeature`). No scattered
  booleans — CapabilityService remains authoritative.

## Marketing (Phases 6, 12, 15)

- Pricing page: creator + partner tabs derive from canonical config; feature
  bullets now come from capability-derived highlights (no hardcoded lists).
- **Honesty**: removed the annual toggle + fabricated "Save ~17%" (no annual
  Razorpay plans exist), removed "Instant AI setup" trust claim, no countdowns /
  urgency / fake numbers. Solo Partner "Recommended" is an intentional product
  decision.
- **SEO**: JSON-LD Pricing (`AggregateOffer`) + FAQ schema, honest metadata.

## Creator / Partner / Agency Billing (Phases 7, 8, 13, 14)

- Creator + partner billing resolve plans through the canonical config and
  `resolveActivePlan` (which now applies the agency clamp).
- Agency dashboard copy explains the creator-pays-CreatorStore model + service
  fees; no fabricated commission numbers.

## Checkout + Super Admin (Phases 9, 11)

- Checkout (`changePlan`) and super-admin plan edits enforce the agency
  restriction through BillingService. Razorpay ids always resolve via config.

## Diagnostics (Phase 16)

- `/dev/billing` exposes: source plan, effective plan, partner-managed,
  restriction status, plan origin, capability matrix.
- Super-admin tenant detail shows `partner-managed`, plan origin and the
  restriction state (Launch → Grow minimum).

## Testing

- `tests/unit/plans-alignment.test.ts`: creator/partner plan codes + prices,
  legacy mapping, `isAgencyRestrictedPlan`/`minEligiblePlanForAgencyCreator`,
  `assertEligiblePlan` (reject Launch for managed / allow independent),
  `resolveRestrictedPlanCode` clamping, capability groups.
- Suite: **95 files / 1884 tests passing**; `tsc --noEmit` clean.

## Build

- `next build` → Compiled successfully.

## Playwright Local

- **R16 5/5 passing** (dev server + shared Supabase DB):
  1. Marketing pricing renders canonical creator + partner plans (and no fake
     annual discount); 2. JSON-LD Pricing + FAQ schema present; 3. Dev billing
     exposes partner-restriction diagnostics; 4. Super-admin tenant detail shows
     partner-managed + restriction; 5. Super-admin subscriptions aligned.

## Playwright Production

- `$env:BASE_URL="https://influencer-space-alpha.vercel.app"; $env:SKIP_DB_CHECK="true";
  npx playwright test implementation42 --project=production --grep "R16"`.

## Browser Verification

- Pricing/SEO/billing/tenant-detail DOM verified against canonical config;
  hydration mismatch fixed in the super-admin subscriptions client.

## Remaining Roadmap

- **IMPLEMENTATION-43 — Commission & Settlement**: persist `CommissionEntry`,
  resolve partner/agency splits, real Razorpay Route settlement. The Partner
  concept + canonical plans are ready. No settlement is implemented today and no
  commission claims are displayed anywhere (honesty policy holds).

## Commit Message

`IMPLEMENTATION-42: Commerce Alignment & Pricing Consolidation (canonical creator + partner plans, agency restriction, capability groups, honest marketing + SEO)`
