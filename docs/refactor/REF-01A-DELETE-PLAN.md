# REF-01A — Delete Plan

## Phase 1: Safe Deletions (25 files, LOW risk)

### 1A — Dead Action Files (5 files)
```
src/actions/product.actions.ts
src/actions/upload.actions.ts
src/actions/team.actions.ts
src/actions/billing.actions.ts
src/actions/agency-provision.actions.ts
```

### 1B — Dead Feature Action Files (9 files)
```
src/features/products/actions.ts
src/features/gallery/actions.ts
src/features/faq/actions.ts
src/features/domains/actions.ts
src/features/courses/actions.ts
src/features/links/actions.ts
src/features/integrations/actions.ts
src/features/services/actions.ts
src/features/storefront/actions.ts
src/features/settings/actions.ts
```

### 1C — Dead Service Files (2 files)
```
src/features/gallery/service.ts
src/features/storefront/service-legacy.ts
```

### 1D — Transitive Dead (delete after product.actions.ts confirmed gone)
```
src/lib/products/service.ts
```

### 1E — Orphan UI Components (8 files)
```
src/components/ui/ScrollProgress.tsx
src/components/ui/NicheBackground.tsx
src/components/ui/GameCarousel.tsx
src/components/ui/AnimatedSection.tsx
src/components/ui/AnimatedList.tsx
src/components/ui/AnimatedCard.tsx
src/components/ui/LiveStatus.tsx
src/components/storefront/GalleryLightbox.tsx
```

## Phase 2: Migration + Deletions (7 files, MEDIUM risk)

### 2A — Merge workspace settings + delete
```
DELETE: src/features/settings/service.ts          ← after merge into services/settings.service.ts
DELETE: src/features/settings/actions.ts           ← (dead, already in Phase 1)
```

### 2B — Migrate showcase + delete website barrel
```
DELETE: src/lib/website/index.ts                   ← after showcase uses canonical source
DELETE: src/lib/website/publish.ts                 ← same
DELETE: src/lib/website/service.ts                 ← same
```

### 2C — Migrate provisioning + delete duplicate repo
```
DELETE: src/modules/.../publish-status-repository.ts ← after provisioning uses lib/publishing/repository.ts
```

## Phase 3: PublishStatus Type Consolidation

```
CREATE: src/types/publish.ts                       ← single canonical type
REMOVE: duplicate definitions from 5 files
UPDATE: all consumers to import from @/types/publish
```

## Total

- **25 files** — safe to delete immediately (Phase 1)
- **7 files** — delete after migration (Phase 2)
- **1 file** — create (Phase 3)
- **~15 files** — modify imports (Phase 2-3)
- **Net reduction:** ~2,000 lines removed
