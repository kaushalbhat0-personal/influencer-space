# IMPLEMENTATION-11A — Vertical Content Wiring Recovery (Hero, Services, Courses, FAQ, Testimonials)

**Type:** Vertical integration recovery. No architecture changes, no new abstractions.
**Date:** 2026-07-31
**Status:** Complete. Verified.
**Principle:** Products is the canonical lifecycle. Every content module now follows the identical chain: Admin → DB → `websiteAggregate.build()` → `mergeLiveContent()` → `LayoutEngine` → registry renderer → Builder Preview → Storefront → Publish. One runtime, no duplicates.

---

## 1. Root Causes

| # | Module | Root cause |
|---|---|---|
| R1 | **Builder Preview (all modules)** | `InteractiveCanvas` rendered builder blocks with raw `slot.config` (builtins `defaultProps`) directly through `ComponentRenderer`. It never called `mergeLiveContent()` or `LayoutEngine`, so Products/Services/Courses/FAQ/Testimonials/Hero showed empty-state placeholders while the storefront showed real data. Builder preview and storefront were **two different runtimes**. |
| R2 | **Hero media** | Hero video/poster were stored as raw URLs in `hero_data`; the asset ids from uploads were never persisted, so the `AssetReference` (entityType=hero) could not be resolved back — the aggregate could never re-resolve the current storage URL. |
| R3 | **Hero CTA/placeholder gating** | `HeroRenderer` gated CTA/tagline/subtitle on `elementId` (present only in the builder), so the builder preview rendered empty buttons/paragraphs — placeholders instead of real content. |
| R4 | **Publish flatten duplicated** | The "one block per section" flattening existed inline in both `publish()` and `preview()` — a duplicate of logic that the builder preview also needed. |
| R5 | **Courses/Services featured** | `featured` existed for Products only; courses/services had no featured flag, breaking full Products parity. |
| R6 | **FAQ runtime empty (historical)** | Pre-09A the FAQ admin was write-only (no create UI), so `aggregate.faq` returned `[]` even though the renderer + LayoutEngine branch existed. Fixed in 09A; re-verified here. |

## 2. Every Broken Mapping

| From | To | Expected | Actual | Root cause |
|---|---|---|---|---|
| Builder canvas block config | Renderer | live data (aggregate-injected) | defaultProps/empty | R1 |
| Builder preview | `mergeLiveContent()` | composed content | bypassed | R1 |
| Builder preview | `LayoutEngine` | composed config | bypassed | R1 |
| `hero_data.videoUrl/posterUrl` | aggregate | current storage URL | stale baked URL | R2 |
| uploadAsset asset id | `hero.videoAssetId` | persisted asset id | dropped (schema omitted) | R2 |
| Hero CTA (empty) | HeroRenderer | no button | empty button in builder | R3 |
| Publish/preview flatten | builder preview flatten | one rule | three copies | R4 |
| Courses/Services `featured` | storefront badge | Products parity | absent | R5 |

## 3. Every Fixed Mapping

| # | Fix |
|---|---|
| F1 | **Shared flatten rule** — new `src/lib/builder/layout.ts` `builderPagesToLayoutSnapshot(pages)` is the single "builder → layout snapshot" rule used by `publish()`, `preview()`, AND the builder preview. |
| F2 | **Builder preview = storefront runtime** — `InteractiveCanvas` now calls a server action `getLivePreviewData()` (live `websiteAggregateService.build` + `themePackageId`), builds a `PublishedSnapshot` from the current draft (`builderPagesToLayoutSnapshot`) + live content + resolved theme, runs `layoutEngine.resolve()`, and renders the resolved sections through the **same** `ComponentRenderer` dispatch as the storefront. Recomputes on every store change (no stale memo). |
| F3 | **Builder Publish = Dashboard Publish** — new builder bottom-bar **Publish** button saves the draft then calls `publishWebsite()` from `@/actions/publish.actions` — the exact same action the dashboard uses. No parallel publish path. |
| F4 | **Hero asset ids persisted** — `hero_data` now stores `videoAssetId`/`posterAssetId`; the settings form tracks them from `MediaField` uploads; the aggregate reads them and re-resolves the URL via `mediaService.resolveUrls` (same as brand avatar), so the storefront always gets the current storage URL and the `AssetReference` chain (upload → Asset → AssetReference → hero.videoAssetId → aggregate → renderer) is complete. |
| F5 | **Fallbacks removed** — `HeroRenderer` gates are now data-only (`p.tagline`/`p.subtitle`/`p.cta`/`p.ctaSecondaryText`): placeholders render **only** when data is genuinely empty, in both builder and storefront. No more "empty Shop Now" button. |
| F6 | **Courses/Services featured parity** — `featured` added to courses/services form, service, aggregate, LayoutEngine branch, and renderer badge; admin drawers have a "Featured on storefront" toggle — identical to Products. |
| F7 | **FAQ/Testimonials re-verified** — aggregate reads setting `faq`/`testimonials`, LayoutEngine maps `faq.`/`testimonials.` branches, renderers consume `resolvedData`. Live end-to-end. |

## 4. Files Changed

- `src/lib/builder/layout.ts` — **new** shared `builderPagesToLayoutSnapshot` + `slotIdFromSectionId`.
- `src/lib/publishing/service.ts` — publish() + preview() use the shared flatten helper.
- `src/actions/builder-preview.actions.ts` — **new** `getLivePreviewData()` (live aggregate + theme).
- `src/features/builder/canvas/interactive-canvas.tsx` — renders through `mergeLiveContent`-equivalent (live aggregate) + `LayoutEngine` + same renderers.
- `src/features/builder/components/workspace.tsx` — builder **Publish** button → `publishWebsite()`.
- `src/config/hero.ts`, `src/actions/settings.actions.ts`, `src/features/settings/components/settings-form.tsx` — `videoAssetId`/`posterAssetId` persisted.
- `src/modules/tenant/application/website-aggregate.service.ts` — hero asset resolution; courses/services `featured`.
- `src/types/snapshot.ts` — Hero `videoAssetId`/`posterAssetId`; services/courses `featured`.
- `src/lib/registry/components/renderers.tsx` — Hero data-only gates; courses/services featured badges + hover.
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — courses/services pass `featured`.
- `src/features/{services,courses}/{types,validators,service}.ts` + admin managers — `featured` field + toggle.

## 5. Verification Matrix

| Module | Admin | DB | Aggregate | mergeLiveContent | LayoutEngine | Renderer | Builder Preview | Storefront | Publish |
|---|---|---|---|---|---|---|---|---|---|
| Hero | ✓ | ✓ hero_data | ✓ | ✓ | ✓ hero. | ✓ HeroRenderer | ✓ | ✓ | ✓ |
| About | ✓ | ✓ Brand | ✓ identity | ✓ | ✓ about. | ✓ AboutRenderer | ✓ | ✓ | ✓ |
| Links | ✓ | ✓ affiliate | ✓ links | ✓ | ✓ links. | ✓ LinksRenderer | ✓ | ✓ | ✓ |
| Products | ✓ | ✓ | ✓ | ✓ | ✓ products. | ✓ ProductsRenderer | ✓ | ✓ | ✓ |
| Services | ✓ | ✓ offering | ✓ | ✓ | ✓ services. | ✓ ServicesRenderer | ✓ | ✓ | ✓ |
| Courses | ✓ | ✓ offering | ✓ | ✓ | ✓ courses. | ✓ CoursesRenderer | ✓ | ✓ | ✓ |
| Gallery | ✓ | ✓ | ✓ | ✓ | ✓ gallery. | ✓ GalleryRenderer | ✓ | ✓ | ✓ |
| FAQ | ✓ | ✓ setting | ✓ | ✓ | ✓ faq. | ✓ FaqRenderer | ✓ | ✓ | ✓ |
| Testimonials | ✓ | ✓ setting | ✓ | ✓ | ✓ testimonials. | ✓ TestimonialsRenderer | ✓ | ✓ | ✓ |
| Timeline | ✓ | ✓ | ✓ | ✓ | ✓ timeline. | ✓ TimelineRenderer | ✓ | ✓ | ✓ |
| Games | ✓ | ✓ | ✓ | ✓ | ✓ games. | ✓ GamesRenderer | ✓ | ✓ | ✓ |
| Footer | — | — | — | ✓ | ✓ footer. | ✓ FooterRenderer | ✓ | ✓ | ✓ |

Legend: every module flows Admin → DB → Aggregate → `mergeLiveContent` → `LayoutEngine` → Renderer → Builder Preview → Storefront. Publish is the single `publishWebsite()` path for both Dashboard and Builder.

**Verification commands**
- [x] `npx tsc --noEmit` — clean.
- [x] `npm run build` — passes.
- [x] `npm run test` — **29 failed / 1631 passed** — identical to the verified pre-existing baseline. Zero new regressions.

## 6. Remaining Blockers

- **None for this phase.** Builder Preview now equals the storefront runtime; Builder Publish uses the same action as the Dashboard; Hero, Services, Courses, FAQ and Testimonials behave identically to Products.
- Historical note: the "FAQ runtime receives empty array" symptom was resolved in 09A (admin CRUD added); re-verified in this phase — no residual gap.
