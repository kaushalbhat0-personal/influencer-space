# IMPLEMENTATION-46 — Commerce Audit Report

**Phase 1: Complete Commerce Audit**  
**Date:** 2026-08-05  
**Status:** AUDIT COMPLETE

---

## 1. Executive Summary

The canonical commerce registry exists at `src/config/commerce/plans.ts` and is architecturally sound. However, **two parallel legacy registries** continue to operate alongside it, plus **22+ UI/API/billing surfaces** still expose legacy terminology (Starter/Pro/Elite) and hardcoded prices. The canonical registry defines the correct plans; the rest of the platform hasn't fully adopted it.

---

## 2. Duplicate Plan Registries (Phase 2 — BLOCKING)

### 2.1 `src/lib/capabilities/plans.ts` — SECONDARY REGISTRY

**File:** `src/lib/capabilities/plans.ts:1-389`

Defines a parallel `PlanDefinition[]` array with **6 legacy entries** still primary:

| Legacy Code | Display Name | Price |
|---|---|---|
| `creator_free` | **Starter** | ₹0 |
| `creator_pro` | **Pro** | ₹999 |
| `creator_elite` | **Elite** | ₹2999 |
| `agency_free` | Free | ₹0 |
| `agency_studio` | Studio | ₹1999 |
| `agency_agency` | Agency | ₹4999 |

The canonical plans ARE also injected at runtime (lines 371-389), but the legacy entries remain the primary sort order and display names. Functions like `getPlansByFamily("creator")` return BOTH legacy + canonical entries, producing **9 creator plans** instead of 4.

**Consumer impact:** The `SignupForm.tsx` plan selection step uses `getPlansByFamily()` which returns **Starter + Pro + Elite + Creator Launch + Creator Grow + Creator Scale + Creator Enterprise** — that's 7 plans where there should only be 4.

### 2.2 `src/lib/capabilities/constants.ts` — DUPLICATE CONSTANTS

**File:** `src/lib/capabilities/constants.ts:1-137`

- `PLAN_CODES` (line 4-13): Lists only legacy codes, no canonical
- `PLAN_FAMILIES` (line 1): Uses `"agency"` not `"partner"`
- `UPGRADE_PATHS` (line 113-122): Hardcoded legacy plan transitions
- `LEGACY_PLAN_MAP` (line 131-137): Maps `STARTER→creator_free`, `PRO→creator_pro`, etc.
- `DEFAULT_CREATOR_PLAN` (line 126): `"creator_free"` (should canonicalize to `"creator_launch"`)

### 2.3 `src/lib/capabilities/plan-resolution.ts` — DUPLICATE DISPLAY MAPPING

**File:** `src/lib/capabilities/plan-resolution.ts:39-48`

Hardcoded legacy display names:
```
creator_free → "Free"
creator_pro  → "Pro"
creator_elite → "Elite"
agency_free  → "Free"
agency_studio → "Studio"
agency_agency → "Agency"
```

The `PLAN_TO_TIER` mapping (lines 19-37) also maps legacy codes only.

---

## 3. Consumer Inventory (Phases 3-19)

### 3.1 Marketing Website (Phase 7)

| File | Line(s) | Issue |
|---|---|---|
| `src/components/marketing/Pricing/faq.tsx` | 12 | "Creator Pro, Elite, and all Agency plans" — legacy plan names in FAQ |
| `src/lib/marketing/content.ts` | 187 | "Creator Pro, Elite, and all Agency plans" — duplicate FAQ hardcodes |
| `src/lib/marketing/content.ts` | 209 | "Starter plan...Pro plan at Rs.999/month" — hardcoded prices+plan names |
| `src/lib/marketing/content.ts` | 249 | "Starter plan is free" — legacy name |
| `src/app/pricing/page.tsx` | 5-6,20-49 | Derives from canonical COMMERCE_PLANS ✓ (OK) |
| `src/components/marketing/Pricing/data.ts` | 9-121 | Derives from canonical `getCreatorCommercePlans()` ✓ (OK) |

### 3.2 Legal/Policy Pages (Phase 7)

| File | Line(s) | Issue |
|---|---|---|
| `src/app/terms/page.tsx` | 72-73,83 | "Starter plan", "Pro plan is ₹999/month" — hardcoded legacy names + prices |
| `src/app/refund/page.tsx` | 14,16 | "Pro plan (₹999/month)", "Pro features" — hardcoded legacy names + prices |

### 3.3 Creator Onboarding (Phase 3)

| File | Line(s) | Issue |
|---|---|---|
| `src/components/auth/signup/SignupForm.tsx` | 7 | Imports from `@/lib/capabilities` (legacy registry) not canonical commerce |
| `src/components/auth/signup/SignupForm.tsx` | 55 | Uses `DEFAULT_CREATOR_PLAN` = `"creator_free"` for creator persona |
| `src/components/auth/signup/SignupForm.tsx` | 176 | `getPlansByFamily("creator")` returns BOTH legacy + canonical entries |
| `src/components/auth/signup/SignupForm.tsx` | 263 | "Free Forever plan" text when `DEFAULT_CREATOR_PLAN` — should be "Creator Launch" |
| `src/components/auth/signup/SignupForm.tsx` | 194 | Price display `plan.price === 0 ? "Free"` — doesn't account for enterprise (null price) |

### 3.4 Partner/Agency Onboarding (Phase 4)

| File | Line(s) | Issue |
|---|---|---|
| `src/app/agency/generate/_components/creator-import-client.tsx` | 7 | `PLANS` = `["creator_launch", "creator_grow", "creator_scale"]` — uses canonical codes ✓ |
| `src/app/agency/generate/_components/creator-import-client.tsx` | 11 | Default planCode = `"creator_grow"` — enforces agency minimum ✓ |
| `src/app/agency/generate/_components/creator-import-client.tsx` | 56 | Display: `p.replace("creator_", "").toUpperCase()` — shows "LAUNCH", "GROW", "SCALE" (mixed case, not canonical display names) |

### 3.5 Creator Billing (Phase 5)

| File | Line(s) | Issue |
|---|---|---|
| `src/app/admin/billing/page.tsx` | 40-41 | Fallback: `planCode: "creator_free"` with `name: "Creator Launch"` — code conflicts with name |
| `src/app/admin/appearance/page.tsx` | 46-47 | Hardcoded: "Pro subscription", "Upgrade to Pro" — uses legacy name as feature gate messaging |
| `src/app/admin/themes/_components/theme-marketplace-client.tsx` | 155-156 | Filter dropdown: `<option value="starter">Starter</option>`, `<option value="pro">Pro</option>` — legacy tier labels |
| `src/lib/theme/types-new.ts` | 33-34 | ThemeTier labels: `starter: "Starter"`, `pro: "Pro"` — legacy tier labels |

### 3.6 Super Admin (Phase 8)

| File | Line(s) | Issue |
|---|---|---|
| `src/app/super-admin/page.tsx` | 66 | "Pro Subs" stat card label (metric is billing v2 ✓, label is legacy ✗) |
| `src/app/super-admin/subscriptions/page.tsx` | 38 | "Pro / Agency" metric label — legacy terminology |
| `src/services/super-admin.service.ts` | 14,56 | `activeProSubscriptions` field name — uses legacy "Pro" in API contract |

### 3.7 Backend — Billing Service (Phase 19)

| File | Line(s) | Issue |
|---|---|---|
| `src/lib/billing/service.ts` | 22,32 | Fallback `planCode: "creator_free"` — uses legacy code as default |
| `src/lib/billing/mapper.ts` | 82 | Fallback: `planCode: (plan?.code as string) ?? "creator_free"` |
| `src/lib/billing/invoice-engine.ts` | 8 | Fallback: `planCode: (inv.planCode as string) ?? "creator_free"` |
| `src/lib/billing/subscription-engine.ts` | 41-57 | Hardcoded **legacy plan code arrays**: `["creator_pro", "creator_elite"]`, `["creator_free", "creator_pro", "creator_elite"]`, `["agency_studio", "agency_agency"]`, `["agency_free", "agency_studio", "agency_agency"]` |

### 3.8 Backend — Feature Billing

| File | Line(s) | Issue |
|---|---|---|
| `src/features/billing/service.ts` | 17 | Fallback: `code: "creator_free"`, `name: "Free Forever"` — legacy name+code |
| `src/features/billing/service.ts` | 42 | Usage limit: `limit: 999` — hardcoded placeholder limit, not derived from plan |

### 3.9 Backend — Billing v2 Module

| File | Line(s) | Issue |
|---|---|---|
| `src/modules/billing/application/plan-source.ts` | 92 | Fallback `"creator_free"` |
| `src/modules/billing/application/service.ts` | 408 | Fallback `"creator_free"` |

### 3.10 Backend — API/Webhooks/Registration

| File | Line(s) | Issue |
|---|---|---|
| `src/app/api/webhooks/razorpay/route.ts` | 91 | Fallback `"creator_pro"` — **HIGH RISK**: webhook fallback defaults to paid plan |
| `src/app/api/auth/register/route.ts` | 101 | Fallback `"creator_free"` |
| `src/actions/onboarding.actions.ts` | 328 | Hardcoded `planCode: "creator_free"` for provisioning input |
| `src/actions/domain.actions.ts` | 45 | Fallback `"creator_free"` |

### 3.11 Demo & Test Data

| File | Line(s) | Issue |
|---|---|---|
| `src/lib/demo/seeds.ts` | 259 | Demo template products: "Starter Plan" (₹999), "Pro Plan" (₹4999) — low risk, just demo data |
| `src/lib/testing/seed.ts` | 57 | Seeding: `prisma.billingPlan.findFirst({ where: { code: "creator_pro" } })` — uses legacy code |
| `src/features/billing/__tests__/billing.test.ts` | 32-60 | Tests use `creator_free`, `creator_pro`, name "Pro", price 999 |
| `src/modules/billing/application/__tests__/plan-source.test.ts` | 39-90 | Tests use `creator_pro`, `creator_free`, names "Starter", "Pro" |
| `src/lib/capabilities/__tests__/plan-resolution.test.ts` | 9-115 | Tests validate legacy code behavior extensively |

### 3.12 Theme Marketplace (Phase 10)

| File | Line(s) | Issue |
|---|---|---|
| `src/lib/theme/types-new.ts` | 33-34 | ThemeTier enum labels: `starter: "Starter"`, `pro: "Pro"` — exposed as marketplace filter labels |
| `src/lib/theme/themes/creator.ts` | 124 | Theme name "Creator Pro" — this is a theme product name, acceptable as-is |

---

## 4. Legacy Plan Code Usage by Severity

### 🔴 CRITICAL — Must fix immediately

| Location | Legacy Code | Risk |
|---|---|---|
| `src/app/api/webhooks/razorpay/route.ts:91` | `creator_pro` fallback | Webhook defaults to paid plan; could incorrectly bill users |

### 🟠 HIGH — Consumer-visible legacy names

| Area | Legacy Terms |
|---|---|
| Signup plan selector (`SignupForm.tsx`) | Shows Starter/Pro/Elite + canonical duplicates |
| Terms of Service (`terms/page.tsx`) | "Starter plan", "Pro plan ₹999" |
| Refund Policy (`refund/page.tsx`) | "Pro plan ₹999", "Pro features" |
| Appearance page (`appearance/page.tsx`) | "Pro subscription", "Upgrade to Pro" |
| Theme marketplace filter (`theme-marketplace-client.tsx`) | "Starter", "Pro" dropdown options |
| Marketing FAQ (`faq.tsx`, `marketing/content.ts`) | "Creator Pro, Elite, all Agency" |
| Marketing content (`marketing/content.ts`) | "Starter plan", "Rs.999/month" |

### 🟡 MEDIUM — Super Admin / internal labels

| Area | Legacy Terms |
|---|---|
| Super Admin dashboard (`super-admin/page.tsx`) | "Pro Subs" label |
| Super Admin subscriptions (`super-admin/subscriptions/page.tsx`) | "Pro / Agency" label |
| API contract (`super-admin.service.ts`) | `activeProSubscriptions` field name |
| Theme tier system (`theme/types-new.ts`) | "Starter", "Pro" tier labels |

### 🟠 HIGH — Backend fallback codes

| File | Fallback | Impact |
|---|---|---|
| `lib/billing/service.ts` | `creator_free` | All billing responses default to legacy code |
| `lib/billing/mapper.ts` | `creator_free` | Subscription mapping defaults to legacy |
| `lib/billing/invoice-engine.ts` | `creator_free` | Invoice engine defaults to legacy |
| `lib/billing/subscription-engine.ts` | Hardcoded arrays | Upgrade/downgrade paths use legacy plan codes |
| `modules/billing/application/plan-source.ts` | `creator_free` | Admin subscription resolution |
| `modules/billing/application/service.ts` | `creator_free` | Billing service module |
| `features/billing/service.ts` | `creator_free` + "Free Forever" | Feature billing data shape |
| `actions/onboarding.actions.ts` | `creator_free` | Provisioning default |
| `actions/domain.actions.ts` | `creator_free` | Domain check default |
| `api/auth/register/route.ts` | `creator_free` | Registration default |

### 🟢 LOW — Acceptable / Non-commerce "Pro"

| Location | Content | Classification |
|---|---|---|
| `lib/theme/themes/creator.ts` | "Creator Pro" theme name | Theme product name, OK |
| `lib/demo/seeds.ts` | "FitLife Pro", "Pro-level", "Pro Plan" (₹4999) | Demo brand/data names, OK |
| `lib/generation/golden/registry.ts` | "Stock Market Pro", "Coding Bootcamp Pro" | Golden template names, OK |
| `lib/generation/intelligence/theme-selector.ts` | "Source Serif Pro" | Font name, OK |
| `features/settings/.../settings-form.tsx` | "BGMI Pro" | Placeholder text, OK |
| `modules/tenant/.../showcase.service.ts` | "Pro gaming highlights" | Descriptive text, OK |
| `app/super-admin/demo-studio/page.tsx` | "{name} Pro" | Demo studio label, OK |

---

## 5. Hardcoded Prices

| Location | Value | Context |
|---|---|---|
| `src/lib/capabilities/plans.ts:64,117,223,276` | 999, 2999, 1999, 4999 | Legacy plan prices in duplicate registry |
| `src/app/terms/page.tsx:73,83` | ₹999 | Hardcoded in legal text |
| `src/app/refund/page.tsx:14` | ₹999/month | Hardcoded in refund policy |
| `src/lib/marketing/content.ts:209` | Rs.999/month | Hardcoded in marketing FAQ |
| `src/features/billing/__tests__/billing.test.ts:54,60` | 999 | Test data |
| `src/features/billing/service.ts:42` | 999 | Usage "limit" placeholder (not a price but still hardcoded) |

---

## 6. Canonical Commerce Runtime Status

The canonical registry at `src/config/commerce/plans.ts` correctly defines:

| Code | Display Name | Price | Family |
|---|---|---|---|
| `creator_launch` | Creator Launch | ₹0 | creator |
| `creator_grow` | Creator Grow | ₹699/mo | creator |
| `creator_scale` | Creator Scale | ₹1,995/mo | creator |
| `creator_enterprise` | Creator Enterprise | Contact Sales | creator |
| `partner_free` | Partner Free | ₹0 | partner |
| `partner_solo` | Solo Partner | ₹1,499/mo | partner |
| `partner_growth` | Partner Growth | ₹4,999/mo | partner |
| `partner_scale` | Partner Scale | ₹9,999/mo | partner |
| `partner_enterprise` | Partner Enterprise | Contact Sales | partner |

The `LEGACY_TO_CANONICAL` mapping correctly bridges:
```
creator_free → creator_launch
creator_pro  → creator_grow
creator_elite → creator_scale
agency_free  → partner_free
agency_studio → partner_solo
agency_agency → partner_growth
agency_growth → partner_scale
agency_starter → partner_solo
```

Functions `capabilitiesForPlan()`, `featuresForPlan()`, `isAgencyRestrictedPlan()`, and `minEligiblePlanForAgencyCreator()` are correct and ready.

---

## 7. Files That Already Properly Use Canonical Commerce

| File | Status |
|---|---|
| `src/config/commerce/plans.ts` | ✓ Canonical registry |
| `src/app/pricing/page.tsx` | ✓ Derives from COMMERCE_PLANS |
| `src/components/marketing/Pricing/data.ts` | ✓ Derives from `getCreatorCommercePlans()`/`getPartnerCommercePlans()` |
| `src/app/agency/generate/_components/creator-import-client.tsx` | ✓ Uses canonical plan codes + enforces agency minimum |

---

## 8. Migration Summary

### TOTAL CONSUMERS NEEDING MIGRATION: **28 files**

| Category | Count |
|---|---|
| Duplicate registries to consolidate | 3 (capabilities/plans.ts, constants.ts, plan-resolution.ts) |
| Marketing/Legal pages | 4 (faq.tsx, content.ts, terms, refund) |
| Creator onboarding/billing | 4 (signup, billing page, appearance, theme marketplace) |
| Super Admin | 3 (dashboard, subscriptions, service) |
| Backend billing/service | 8 (billing service, mapper, invoice-engine, subscription-engine, feature billing, plan-source, billing service module, onboarding actions) |
| API/Webhook | 3 (razorpay webhook, register route, domain actions) |
| Theme system | 1 (types-new.ts) |
| Test files | 3 (billing test, plan-source test, plan-resolution test) |
| Seeding/demo | 2 (testing seed, demo seeds) |

### Files ALREADY canonical (no changes needed): **5 files**

---

## 9. Risk Assessment

| Risk | Area | Severity |
|---|---|---|
| Webhook falls back to `creator_pro` | `razorpay/route.ts:91` | 🔴 Critical |
| Signup shows 7+ plan options (legacy + canonical) | `SignupForm.tsx` | 🟠 High |
| Terms/Refund pages have hardcoded legacy prices | `terms`, `refund` | 🟡 Medium |
| Backend services default to `creator_free` | Multiple files | 🟡 Medium |
| Duplicate registries diverge over time | `capabilities/plans.ts` | 🟡 Medium |
| Tests validate legacy behavior | Test files | 🟢 Low (informational) |
| Demo seed data uses legacy names | `demo/seeds.ts` | 🟢 Low |

---

## 10. Agency Rule Verification

**Rule:** Agency-created creators → Minimum Creator Grow → Creator Launch unavailable.

| Surface | Status |
|---|---|
| `src/config/commerce/plans.ts:315-333` — `isAgencyRestrictedPlan()` / `minEligiblePlanForAgencyCreator()` | ✓ Enforced server-side |
| `src/app/agency/generate/_components/creator-import-client.tsx:7,11` — PLANS excludes `creator_launch`, defaults to `creator_grow` | ✓ Enforced client-side |
| Signup form — no agency-aware plan restriction visible | ⚠️ Not checked |

---

## 11. Next Steps

1. **Consolidate registries** — Remove legacy entries from `lib/capabilities/plans.ts`, make it a thin wrapper over `COMMERCE_PLANS`
2. **Fix webhook fallback** — Change `creator_pro` → use canonical code or derive from subscription
3. **Fix signup plan selector** — Import from `getCreatorCommercePlans()` / `getPartnerCommercePlans()` only
4. **Fix all backend fallback codes** — `creator_free` → `creator_launch` (or derive from canonical)
5. **Fix subscription engine** — Dynamic plan code arrays from canonical registry
6. **Fix marketing content** — Replace "Starter"/"Pro"/"Elite" with canonical names
7. **Fix legal pages** — Derive from canonical registry, remove hardcoded prices
8. **Fix theme tier labels** — Remove "Starter"/"Pro", map to canonical tiers
9. **Fix Super Admin labels** — "Pro Subs" → "Paid Subscriptions", "Pro / Agency" → "Paid Plans"
10. **Update tests** — Align with canonical codes and names
11. **Run `tsc --noEmit` + `next build`** after all changes
