# CreatorStore Architecture Invariants

These invariants are **permanent architectural rules**. Every code review, every feature, every refactor must respect them. Violations are blocking defects.

---

## Invariant 1 — One PublishedSnapshot

There is exactly one snapshot format. No legacy format. No artifact format. No runtime format detection.

**Enforcement:** `PublishedSnapshot` type is frozen. Any access to snapshot fields outside `layout|content|theme|navigation|renderingHints` is a type error.

---

## Invariant 2 — One PublishingService

`PublishingService.publish()` is the only producer of PublishedSnapshot. No other service may serialize, construct, or persist snapshots.

**Enforcement:** `PublishRepository.createPublish()` is the only code path that writes to `PublishSnapshot` or upserts `PublishStatus`.

---

## Invariant 3 — One Rendering Pipeline

There is exactly one rendering pipeline: `PublishedSnapshot → LayoutEngine → StorefrontDocument → ComponentRenderer`. No fallback renderer, no legacy section renderer, no second pipeline.

**Enforcement:** `page.tsx` is a renderer only. It loads the snapshot, calls `LayoutEngine.resolve()`, and renders the `StorefrontDocument`. No transformation, no business logic, no runtime format detection.

---

## Invariant 4 — Builder Edits Layout Only

Builder owns ONLY layout (page/section order, visibility, spacing, theme overrides, responsive config, animation, template selection). Builder NEVER owns business content: hero data, products, gallery, links, SEO, identity, or any business data.

**Enforcement:** `BuilderService.save()` writes to `Page`, `Section`, `Block` tables only. No direct writes to `Product`, `GalleryImage`, `Setting`, or `Brand` tables.

---

## Invariant 5 — Dashboard Owns Publishing

Dashboard is the only place where publishing is initiated. Publishing is triggered through `PublishingService.publish()`. No other component may create snapshots or increment versions.

**Enforcement:** `publish.actions.ts` is the only action file that calls `PublishingService.publish()`. Builder has no publish button.

---

## Invariant 6 — Storefront Never Queries Business Tables

Storefront rendering NEVER reads from `Product`, `GalleryImage`, `AffiliateLink`, `Setting`, `Brand`, or any business table directly. All business data comes from `PublishedSnapshot.content`.

**Enforcement:** `page.tsx` imports no repositories, no business services, no Prisma beyond tenant resolution. `ComponentRenderer` imports no Prisma.

---

## Invariant 7 — LayoutEngine Is Pure

`LayoutEngine.resolve()` has zero side effects. No Prisma, no repositories, no services, no fetch, no cache, no environment variables, no tenant lookups, no feature flags. Pure transformation: `PublishedSnapshot → StorefrontDocument`.

**Enforcement:** `LayoutEngine.ts` imports only from `@/types/snapshot` and `@/types/storefront`. No `@/lib/prisma`, no `@/modules/`, no `@/services/`.

---

## Invariant 8 — Snapshots Are Immutable

A snapshot is NEVER updated after creation. Every publish creates a completely new row in the `PublishSnapshot` table. Version rollback means pointing `PublishStatus.liveVersion` to a previous snapshot.

**Enforcement:** `PublishRepository.createPublish()` only creates, never updates an existing snapshot. No code path mutates a stored snapshot.

---

## Invariant 9 — Repositories Own Persistence

All database access goes through repositories. No raw Prisma queries in actions, services, or UI components. Repositories are the single boundary between business logic and persistence.

**Enforcement:** Every Prisma model has exactly one repository. Direct `prisma.*` calls outside repository files are prohibited.

---

## Invariant 10 — No Second Pipeline

No feature may introduce a second rendering pipeline, a second publishing pipeline, a second snapshot format, or a second source of truth for any domain. If a new feature needs to render data, it must extend the existing pipeline.

**Enforcement:** Any new rendering path must be approved by architecture review. Introducing a parallel pipeline without approval is a blocking defect.

---

## Violation Process

1. Any code review that identifies an invariant violation marks it as a blocking defect.
2. The violating code must be refactored to comply before the feature can merge.
3. Temporary compatibility layers are not permitted — if the architecture doesn't support the feature, the architecture must be extended through the canonical patterns.
