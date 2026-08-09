# Implementation Report — RCCF-LAUNCH-TRACK-06

**Theme Workflow Completion & Builder Commerce Audit**

## What was delivered

| Phase | Deliverable | Where |
| --- | --- | --- |
| 0 | Full theme-lifecycle audit: every mutation path, preview modes, buy-now-in-preview, decorative z-order/opacity, capability/entitlement, super-admin selectors, catalog duplicates | this report + `theme-workflow.md` |
| 1 | **Marketplace browse-only**: removed apply/mutation, "Applied"/"Current" badges, `currentThemeId`/`tenantId` props; replaced with "Open in Builder" → `/builder?theme=<id>` | `theme-marketplace-client.tsx`, `admin/themes/page.tsx` |
| 2/3/4/10 | **Builder = canonical theme editor**: `?theme=` opens previewed; apply = draft + autosave + `markChangesPending`; publish-status refreshed after apply so "Publish required" shows; live only changes on Publish | `workspace.tsx` |
| 5 | **Entitlement fix (launch blocker)**: builder now receives the canonical plan CODE; Grow/Scale unlock all premium themes in the picker (was display-name → free → locked) | `builder-overview.actions.ts`, `workspace.tsx`, `theme/tiers` + tests |
| 6 | Decorative layer polish: opacity bumped to 5% (target 5–10%); confirmed content `z-10`, decorations `pointer-events-none` behind cards, dialogs `z-50` | `decoration-runtime.tsx`, `background-runtime.tsx` |
| 7 | Catalog audit: palette-swap clusters + duplicate display names documented; merge deferred (preserve IDs, no migration risk) | `theme-catalog.md` |
| 8 | Preview parity: builder + storefront share the resolver/experience path; marketplace palette cards documented (real-token gradient) | — |
| 9 | **Buy Now preview guard (launch blocker)**: `previewMode` threaded Canvas→ComponentRenderer→ProductsRenderer→BuyNowButton; preview shows "Checkout available on your live website", never calls `createCheckout` | `renderer/index.tsx`, `renderers.tsx`, `buy-now-button.tsx`, `interactive-canvas.tsx`, registry types |
| 11 | Super Admin: subscriptions plan selector loads from `getRuntimePlansByFamily` (no hardcoded list); no legacy plan enums remain in live UI | `subscriptions/page.tsx`, `subscriptions-client.tsx` |
| 12 | Polish: button/input token contrast (from TRACK-05), decoration opacity target | — |
| Docs | `theme-workflow.md`, `theme-marketplace.md`, `builder-theme-publish.md`, `theme-catalog.md`, `builder-commerce-preview.md`, this report | — |

## Key fixes

1. **Builder theme picker locked every premium theme for Grow/Scale** — fixed by
   passing `subscription.code` (canonical) instead of the display name.
2. **Buy Now in the Builder created real orders** — fixed with a `previewMode`
   guard; preview is fully inert (no Prisma, no Razorpay).
3. **Marketplace mutated websites** — now browse-only; the Builder is the only
   theme editor and theme changes are unpublished draft changes requiring Publish.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues (pre-existing warnings only).
- `npm run build` — succeeds.
- `npx vitest run` — **2104/2104** pass (5 new entitlement-regression tests).

## Regression safety

- No redesign of Builder/Marketplace/Theme/Pricing/Capability/Publish runtimes.
- The storefront is unchanged (`previewMode` defaults false).
- Capability enforcement unchanged — server apply still authoritative.
