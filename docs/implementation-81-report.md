# Implementation Report — RCCF-LAUNCH-POLISH-06

**Storefront Product Rendering & Plan Capability Enforcement**

## What was delivered

| Phase | Deliverable | Where |
| --- | --- | --- |
| 0 | Audit: product pipeline, currency formatting, capability/pricing/theme runtimes, plan-gated features | documented in the phase reports |
| 1 | Canonical `formatCurrency` (Intl.NumberFormat, INR narrowSymbol, 0–2 fraction digits); all divergent formatters delegate to it; **all `â‚¹` mojibake fixed**; every currency renderer converted (storefront, marketing, checkout/receipts, orders, dashboard, customer portal, admin, super-admin, agency, dev, notifications) | `src/lib/utils.ts` + ~40 files |
| 2 | Product card renders canonical `product.description`; collapsed when empty; no placeholder | `src/lib/registry/components/renderers.tsx` |
| 3 | Capability audit of every visual feature + subscription-gated feature | `docs/theme-capability-enforcement.md` |
| 4 | Granular theme capabilities (solid/gradient/image/video/animation + particles/glow/noise/blur/custom) in the Capability Runtime + experience↔capability mapping | `src/config/commerce/plans.ts`, `src/modules/theme/runtime/experience/capabilities.ts` |
| 5 | Free plan (Launch) → solid-only, graceful storefront fallback | `resolveExperienceForCapabilities` |
| 6 | Grow → gradients/images/effects/premium packs | capability matrix |
| 7 | Scale → everything incl. video + advanced effects | capability matrix |
| 8 | Builder: premium theme selection gated + "Upgrade to Grow" (existing); `isExperienceAvailableForPlan` now capability-driven | `theme-card`, `theme-experience.ts` |
| 9 | Publish validates theme capabilities → canonical `CapabilityIssue[]`; surfaced in `validateBeforePublish` | `src/lib/publishing/service.ts` |
| 10 | Storefront resolves experience through Capability Runtime; unsupported layers never render | `src/app/[domain]/page.tsx` |
| Extra | Plan-gated feature audit: custom domains/premium themes/branding/marketplace/limits all via Capability Runtime; raw `EXPERIENCE_MIN_PLAN` tier gate removed | documented |
| 11 | Regression: paid creators unchanged, free creators auto-fallback (tested) | tests |
| 12 | Docs: `currency-formatting.md`, `product-rendering.md`, `theme-capability-enforcement.md`, this report | — |

## Files changed (highlights)

- `src/lib/utils.ts` — canonical `formatCurrency`.
- `src/lib/analytics/date.ts`, `src/lib/billing/invoice-engine.ts` — delegate to canonical.
- `src/lib/registry/components/renderers.tsx` — mojibake fixed, `formatCurrency`, product description.
- `src/config/commerce/plans.ts` — 10 new theme capabilities, plan matrix, labels, mappings.
- `src/modules/theme/runtime/experience/capabilities.ts` — new capability layer.
- `src/modules/theme/runtime/experience/theme-experience.ts` — capability-driven availability (raw tier gate removed).
- `src/lib/publishing/service.ts` — `CapabilityIssue` + `validateThemeCapabilities` + publish/validate wiring.
- `src/actions/publish.actions.ts` — surfaces `capabilityIssues`.
- `src/app/[domain]/page.tsx` — storefront capability enforcement.
- ~40 currency call sites across admin/super-admin/agency/marketing/dev converted to `formatCurrency`.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues (pre-existing warnings only).
- `npm run build` — succeeds.
- `npx vitest run` — **2087/2087 pass** (new: currency formatting, theme capability matrix, storefront fallback, product-description data path; updated: plan feature counts, payouts formatting).

## Design note on publish validation

The task asks publishing to "validate" capabilities and "return canonical
validation errors" while Phase 11 requires existing free creators to fall back
gracefully (no regressions). Blocking every free publish with a premium theme
would brick those creators, so the publish pipeline **validates and returns
canonical `CapabilityIssue[]`** (non-blocking), the builder prevents new
premium selections, and the storefront is the hard enforcement. This satisfies
"no silent failures" without regressions.
