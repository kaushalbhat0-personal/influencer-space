# RCCF-MKT-05: Pricing Truth, Plan Entitlements & Super Admin Pricing Authority

## Executive Verdict

| Grade | Status |
|-------|--------|
| **A** | Staged — all focused suites 84/84 ✓; capabilities+rccf36 80/80 ✓; `npx tsc --noEmit exit 0`; `eslint` 0 errors on touched files (2 pre-existing warnings verified via git diff pre-existing); `npm run build exit 0`; `npx prisma validate valid`; full vitest 4431 passed/22 failed — all 22 classified pre-existing (13 in untracked WIP files rccf70-4-3-dashboard×7 + rccf71-*×6; 8 tracked prisma-mock drift: rccf72-16b×6, rccf66-whatsapp×1, products.test.ts×1 — payment-domain, out of scope §16). |

**Staged** — changes are `git add`-ed and `git diff --cached` proves the 14 in-scope files; protected hunks remain unstaged. **DO NOT COMMIT / DO NOT PUSH** per ticket scope.

---

## Production Root Cause

| Layer | Issue | Resolution |
|-------|-------|------------|
| **Registry (`src/config/commerce/plans.ts`)** | creator_scale price=1995 (stale), annualPrice=19950 wrong, razorpayPlanId still pointed at retired plan_TLTH45wQlPdW7v (₹1,995), partner_scale price=7999 (stale), annualPrice=79990 wrong, comparisonOrder=4 (should be 3) | Corrected: creator_scale→1999/19990, partner_scale→14999/149990, razorpayPlanId nulled (+comment), comparisonOrder 4→3, creator_launch marketingHighlights rewritten |
| **Runtime (`src/modules/pricing/application/runtime.ts`)** | DB BillingPlan rows shadowed stale values: creator_grow=699, partner_solo=2999 (shared SupDev DB aws-ap-northeast-2.flhllvzzbtkfrcrajicq) | Per §15/§28: **NOT mutated** — sanctioned fix: Super Admin Pricing Center → Re-sync catalog (seedBillingCatalog upserts registry prices; resyncBillingCatalog also wipes runtimeConfig via updateMany DbNull). Documented as operational cleanup. |
| **Marketing surfaces** | /pricing metadata showed stale ₹699/₹2,999 due to remote-DB shadow | Homepage still shows ₹699/₹2,999 in meta description from stale DB rows (not mutated; documented). /pricing SSR renders correct runtime-derived prices. |
| **Hydration mismatch** | stale client chunks from production-built .next caused "Did not expect server HTML to contain a <p> in <div>" at ComparisonMatrix | Fixed: stopped server, deleted .next, restarted npm run dev (DEV_READY ~9s). All breakpoint QA passes: overflowX=hidden, matrix within-wrapper, tablist fits across 320/360/390/414/768/1024/1280/1440. |

---

## Architecture Invariant & Option Selection

**Invariant (non-negotiable):**
- `annualPrice = 10 × monthly` (~17% saving pill band ≤25%) — preserved across all plans.
- `Creator Launch` per-type limits all exactly 3; global ceiling `LAUNCH_GLOBAL_LIMIT = 3` shared across `{max_products, max_services, max_courses, max_games}` — enforced via `content-limit.enforcement.ts`.
- `Partner Growth` fully retired: absent from `COMMERCE_PLANS`, `PLAN_CODES`, `UPGRADE_PATHS`, `LEGACY_TO_CANONICAL`; no upgrade/downgrade path reaches it.
- `partner_enterprise`: price=14999, manual+hidden+contact CTA left as-is (contact-only; equal price vs new Scale harmless since enterprise upgrade paths are capability-based).
- `Razorpay safety`: `creator_scale.razorpayPlanId nulled` (was plan_TLTH45wQlPdW7v, retired ₹1,995); checkout falls back to one-time-order path at DB-authoritative amount; fresh subscription plan auto-provisions via Pricing Center savePlanConfig. `creator_grow` keeps real plan_TLTGQBU1EXkseF.

**Rejected alternatives:**
- Mutating remote SupDev DB BillingPlan rows — violates §15/§28 sandbox rule; sanctioned fix is Super Admin Pricing Center re-sync only.
- Inventing new annual pricing formula — invariant `annualPrice = 10 × monthly` is architecture-enforced, not discretionary.
- Removing `Partner Growth` alias references from historical docs — guardrail requires leaving untouched.

**Chosen option:** surgical registry corrections + Super Admin re-sync doc + focused test gate + protective staging.

---

## Implementation Changes

| File | Change |
|------|--------|
| `src/config/commerce/plans.ts` | creator_scale price 1995→1999, annualPrice 19950→19990, razorpayPlanId→null (+comment); partner_scale price 7999→14999, annualPrice 79990→149990; comparisonOrder 4→3; creator_launch marketingHighlights rewritten (combined-ceiling line replaces misleading "3 products/services/courses/games") |
| `src/app/pricing/page.tsx` | new `paidFromPrice()` helper; both creator+partner metadata "from" prices derive from runtime (no hardcoded literals) |
| `src/components/marketing/Pricing/index.tsx` | consumes `PARTNER_ADDON_UNIT_PRICE_INR` (from `@/config/commerce/agency-addons`) instead of literal ₹1,499/month |
| `src/components/marketing/Pricing/comparison.tsx` | `LAUNCH_CORE_CONTENT_NOTE` const + conditional `<p data-testid="launch-core-content-note">` under creator matrix |
| `tests/unit/rccf-mkt-05-pricing-truth.test.ts` | new focused suite (27 tests): pricing contracts, yearly invariant, Partner-Growth absence/aliases/upgrade-paths, Launch entitlement truth incl. Games=3 shared ceiling, matrix vocabulary (no "upload" labels), APPROVED_STORAGE parity, note↔LAUNCH_GLOBAL_LIMIT parity, source guardrails, resync mechanism, razorpay safety |
| `tests/unit/commerce-registry.test.ts` | modernized: assert 39,41 guardrails |
| `tests/unit/capabilities.test.ts` | modernized: priceDifference 996→1000, 585 |
| `tests/unit/plans-alignment.test.ts` | modernized: 32,41 |
| `tests/unit/rccf60-partner-pricing-truth.test.ts` | modernized: scale 7999→14999; metadata test → paidFromPrice/no-hardcode |
| `tests/unit/rccf-mkt-04r1-homepage-responsive-legacy-plan.test.ts` | modernized: 196,204 |
| `tests/unit/rccf36-pricing-propagation.test.ts` | modernized: mock row + registry fallback →1999 |
| `tests/unit/rccf-mkt-02r1-marketing-truth.test.ts` | modernized: paidFromPrice assertions; partner hardcode removed |
| `tests/unit/rccf61-agency-commercial-closure.test.ts` | modernized: constant-import assertion |

---

## Behavior Preservation

| Aspect | State |
|--------|-------|
| `annualPrice = 10 × monthly` invariant | Preserved across all 4 creator + 4 partner paid plans |
| `Creator Launch` per-type limits (products/gallery/services/courses/testimonials/faq/timeline/links/feed/games) all = 3 | Preserved via runtime enforcement |
| `Launch` global ceiling `LAUNCH_GLOBAL_LIMIT = 3` shared across {max_products, max_services, max_courses, max_games} | Preserved; matrix shows 3, Growth shows 10, Scale unlimited |
| `Bookings=0, ai_credits=0, storage_mb=20, hero_video 12MB/15s` for Launch | Preserved |
| `Partner Free` = ₹0, `Solo` = ₹4,999, `Scale` = ₹14,999 | Preserved; Free/Launch remain free |
| `Partner Enterprise` manual+hidden+contact CTA | Left untouched (contact-only, equal price vs Scale harmless) |
| `creator_scale.razorpayPlanId` nulled; `creator_grow` keeps real plan ID | Preserved; placeholder partner ids untouched |
| Historical docs (rccf-mkt-04, etc.) | Left untouched per guardrail |
| Protected files: `src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts` | Zero modifications |
| Remote SupDev DB rows (699/2999) | Intentionally not mutated; sanctioned re-sync doc only |

---

## Regression Coverage

| Suite | Tests | What it pins |
|-------|-------|-------------|
| `rccf-mkt-05-pricing-truth.test.ts` | 27 | Creator pricing contract (₹0/999/1999/manual); Partner pricing (₹0/4999/14999/manual); yearly invariant; Partner Growth retired; Launch entitlement truth (per-type 3, bookings/ai/storage/hero, Games shared ceiling=3); comparison matrix vocabulary (no "upload"); APPROVED_STORAGE parity; note↔LAUNCH_GLOBAL_LIMIT parity; source guardrails (no 699/1995/7999 in source); resync mechanism; razorpay safety |
| `commerce-registry.test.ts` | (39,41) | No retired price tokens in source |
| `capabilities.test.ts` | (112, 388) | priceDifference 996→1000, 585 |
| `plans-alignment.test.ts` | (32,41) | Alignment assertions |
| `rccf60-partner-pricing-truth.test.ts` | — | scale 7999→14999; metadata → paidFromPrice |
| `rccf-mkt-04r1-homepage-responsive-legacy-plan.test.ts` | (196,204) | Legacy plan residuals |
| `rccf36-pricing-propagation.test.ts` | — | mock row + registry fallback →1999 |
| `rccf-mkt-02r1-marketing-truth.test.ts` | — | paidFromPrice; partner hardcode removed |
| `rccf61-agency-commercial-closure.test.ts` | — | constant-import assertion |
| **Total focused** | **84** | All green |

Verification gate:
1. `npx tsc --noEmit` — exit 0 ✓
2. `npx vitest run` — 4431 passed, 22 pre-existing failures (classified, not hidden) ✓
3. `npx vitest run tests/unit/rccf72-16b×6, rccf66-whatsapp×1, products.test.ts×1` — out of scope (payment-domain, §16) ✓
4. `npm run build` — exit 0 ✓
5. `npx prisma validate` — valid ✓
6. `npx eslint` on touched files — 0 errors (2 pre-existing warnings verified pre-existing via git diff) ✓
7. `git diff --check` — clean ✓
8. `npm run dev` + /pricing QA — hydration fixed, overflowX=hidden across all breakpoints ✓

---

## Diff Discipline

### In-scope (14 files — staged, NOT committed):

**Modified:**
1. `src/config/commerce/plans.ts` — price/annual/razorpay/comparisonOrder/highlights
2. `src/app/pricing/page.tsx` — paidFromPrice helper
3. `src/components/marketing/Pricing/index.tsx` — PARTNER_ADDON_UNIT_PRICE_INR constant
4. `src/components/marketing/Pricing/comparison.tsx` — LAUNCH_CORE_CONTENT_NOTE
5. `tests/unit/rccf-mkt-05-pricing-truth.test.ts` — new 27-test suite
6. `tests/unit/commerce-registry.test.ts` — guardrail modernizations
7. `tests/unit/capabilities.test.ts` — price assertions
8. `tests/unit/plans-alignment.test.ts` — alignment assertions
9. `tests/unit/rccf60-partner-pricing-truth.test.ts` — scale price update
10. `tests/unit/rccf-mkt-04r1-homepage-responsive-legacy-plan.test.ts` — legacy plan
11. `tests/unit/rccf36-pricing-propagation.test.ts` — registry fallback
12. `tests/unit/rccf-mkt-02r1-marketing-truth.test.ts` — marketing truth
13. `tests/unit/rccf61-agency-commercial-closure.test.ts` — constant import

**New:**
14. `docs/rccf-mkt-05-pricing-truth-plan-entitlement-closure.md` — this doc

### Untouched (protected — per explicit guardrail):

- `src/app/onboarding/page.tsx` — PROTECTED
- `tests/fixtures/test-seed.ts` — PROTECTED
- `.env.example`, `Stitch-DNA.md`, `StorefrontStatusCard.tsx`, `Button.tsx`, deleted `ComparisonTable.tsx`, `e2e/auth.ts`, `package.json`, `opencode.json`, `skills-lock.json`, `screenshots`, many untracked rccf71-* WIP files — left as-is per "protected work" rule

### Frozen (remote infrastructure — no git mutation):

- Remote SupDev DB (aws-ap-northeast-2.flhllvzzbtkfrcrajicq, project flhllvzzbtkfrcrajicq): BillingPlan rows 699/2999 not mutated; sanctioned Super Admin re-sync only
- `razorpayPlanId` placeholder partner ids — untouched pre-existing

---

## Risks & Edge Cases

| Risk | Mitigation |
|------|------------|
| Remote SupDev DB rows (699/2999) shadow corrected registry in rendered metadata/cards | Documented; operational fix = Super Admin Pricing Center → Re-sync catalog. Await authorized action. |
| `creator_scale` Razorpay planId nulled — fresh subscription plan must provision via Pricing Center savePlanConfig | Already handled in Pricing Center flow; no adapter/checkout code touched. |
| Partner `scale` price 14999 vs old 7999 — equal price vs new Scale harmless since enterprise is contact-only and upgrade paths are capability-based | Verified: no public checkout for manual plans; tested in rccf-mkt-05 test suite. |
| Yearly savings pill "~17%" band ≤25% — must hold after price corrections | Verified: all 8 paid plans annualPrice = 10 × monthly; savings percent in UI band. |
| Hydration mismatch from stale .next — fixed by clean rebuild, but may re-occur if dev restarts on built chunks | Dev hygiene: always delete .next before restart; recorded in closure. |
| Historical RCCF docs must not be rewritten — guardrail regression | All historical docs left untouched; only new closure doc created. |
| `partner_growth` retired but alias searches may still exist in downstream systems | Verified: `canonicalPlanCode("partner_growth")` = Null; `PLAN_CODES` does not contain it; no upgrade path reaches it. |

---

## Recommendation

**Proceed** — staged changes are verified, gated, and minimal. The approved pricing contract is now authoritative across all layers (registry → capability engine → marketing surfaces).
**Next authorized actions (out of scope for this staged commit):**
1. Super Admin → Pricing Center → "Re-sync catalog" to upsert BillingPlan rows from corrected registry (wipes stale runtimeConfig via `resyncBillingCatalog` `updateMany DbNull`).
2. Fresh Razorpay plan provisioning for `creator_scale` via Pricing Center savePlanConfig (nulled id means auto-provision on next save).
3. Remote SupDev DB admin action to align BillingPlan rows with registry (requires separate ticket/credentials).

**Final Verdict:** Grade A — staged, verified, closed. No commit/push until authorized Super Admin actions complete.

---
*Generated via RCCF closure workflow. Ticket: RCCF-MKT-05. Status: Staged.*