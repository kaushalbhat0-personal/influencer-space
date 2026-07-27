# REF-01A — Implementation Order

## Commit 1: Safe Deletions (Phase 1A + 1B + 1C)

Delete 16 dead action/service files. Verify build passes.

**Files:** (product.actions, upload.actions, team.actions, billing.actions, agency-provision.actions, 9 feature actions, features/gallery/service.ts, features/storefront/service-legacy.ts)

**Verification:**
```bash
npx next build
grep -r "product.actions" src/  # should return 0
grep -r "upload.actions" src/   # should return 0
# ... verify all deleted
```

## Commit 2: Transitive Death + Orphans (Phase 1D + 1E)

**Files:** `lib/products/service.ts`, all 8 orphan UI components

**Verification:**
```bash
npx next build
```

## Commit 3: PublishStatus Type Consolidation (Phase 3)

**Files:**
- Create `src/types/publish.ts`
- Update all 5 definition files to import from single source
- Remove inline definitions

**Verification:**
```bash
npx next build
# Verify only one PublishState type exists
```

## Commit 4: Website Barrel Migration (Phase 2B)

**Files:**
- Update `showcase/service.ts` to import from canonical source
- Delete `lib/website/index.ts`, `lib/website/publish.ts`, `lib/website/service.ts`

**Verification:**
```bash
npx next build
```

## Commit 5: PublishStatus Repository Merge (Phase 2C)

**Files:**
- Move unique functionality from `modules/.../publish-status-repository.ts` to `lib/publishing/repository.ts`
- Update `provisioning-service.ts` to use new source
- Delete modules repo

**Verification:**
```bash
npx next build
# Verify provisioning still works
```

## Commit 6: Settings Service Merge (Phase 2A)

**Files:**
- Merge workspace-settings from `features/settings/service.ts` into `services/settings.service.ts`
- Delete `features/settings/service.ts`

**Verification:**
```bash
npx next build
# Verify settings page works
```

## Rollback Strategy

Each commit is atomic. Rollback = `git revert <commit-hash>`.

No data loss risk — all deletions are action/service files, not database tables. The only data-related change is the PublishStatus type consolidation which is a compile-time type change, not a DB migration.
