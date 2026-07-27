# REF-01C — Migration Plan

## Phase 1: Data Backfill (Database)

### 1A — Backfill Brand table from Settings data

```sql
-- Merge SET("influencer_data") into Brand
INSERT INTO "Brand" (id, "tenantId", name, tagline, bio, "avatarUrl", "socialLinks", "updatedAt")
SELECT
  gen_random_uuid(),
  s."tenantId",
  s.value->>'name',
  s.value->>'tagline',
  s.value->>'bio',
  s.value->>'profileImage',
  jsonb_build_object(
    'instagram', s.value->'social'->>'instagram',
    'youtube', s.value->'social'->>'youtube',
    'twitter', s.value->'social'->>'twitter',
    'tiktok', s.value->'social'->>'tiktok'
  ),
  NOW()
FROM "Setting" s
WHERE s.key = 'influencer_data'
  AND NOT EXISTS (SELECT 1 FROM "Brand" b WHERE b."tenantId" = s."tenantId");

-- Merge SET("brand_config") into Brand
INSERT INTO "Brand" (id, "tenantId", name, tagline, bio, "socialLinks", "updatedAt")
SELECT
  gen_random_uuid(),
  s."tenantId",
  s.value->>'name',
  s.value->>'tagline',
  s.value->>'bio',
  s.value->'social',
  NOW()
FROM "Setting" s
WHERE s.key = 'brand_config'
  AND NOT EXISTS (SELECT 1 FROM "Brand" b WHERE b."tenantId" = s."tenantId")
ON CONFLICT ("tenantId") DO UPDATE
  SET name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      bio = EXCLUDED.bio,
      "socialLinks" = EXCLUDED."socialLinks";
```

## Phase 2: Code — WebsiteContentAggregate Service

Create `src/lib/content/website-content-aggregate.ts`:
- Single assembler service
- Reads from: `BrandRepository`, `SettingsService`, `ProductRepository`, `GalleryRepository`, `LinkRepository`, `WebsiteRepository`
- Returns `WebsiteContent` (immutable, single type)

Update imports for all 6 repositories.

## Phase 3: Code — PublishingService Refactor

Replace `loadFromBuilder()` + `builderPagesToArtifact()` with:
```
PublishingService.publish():
  1. Call WebsiteContentAssembler.assemble(tenantId)
  2. Call BuilderService.load(websiteId) → LayoutSnapshot
  3. Construct Snapshot { metadata, layout, content }
  4. Write Snapshot to PublishSnapshot table
  5. Upsert PublishStatus
```

Remove:
- `builderPagesToArtifact()` — replaced by direct Snapshot construction
- `loadFromBuilder()` fallback chain — replaced by single assembler call
- `isLegacySnapshot()` — no longer needed

## Phase 4: Code — Storefront Reader Refactor

Replace `extractSlots()` two-path logic with:
```
Storefront page:
  1. Load Snapshot from published.service.ts
  2. Extract Snapshot.layout → LayoutEngine → ComponentRenderer (for layout)
  3. Extract Snapshot.content → inject into component configs via LayoutEngine
  4. SEO metadata from Snapshot.content.seo
  5. JSON-LD from Snapshot.content.identity
```

Remove:
- `getPublicPageData()` call from `getPublishedPageData()`
- `FallbackStorefront` component
- Legacy SEO paths in `buildStorefrontMetadata()`

## Phase 5: Code — Settings/Profile Page Refactor

Update `settings.actions.ts`:
- Remove `updateInfluencerData()` writes for `name`, `tagline`, `bio`, `profileImage` (these should go through Profile page to Brand table)
- Keep `updateInfluencerData()` for workspace-level fields only
- Deprecate `updateInfluencerData()` in favor of separate `updateProfile()` + `updateHero()` actions

Update `profile.actions.ts`:
- Ensure write to Brand table includes all identity fields
- Also update SET("influencer_data") for backward compatibility during migration

## Phase 6: Code — Remove Dead Code

After migration confirmed working:
- Remove `builderPagesToArtifact()`
- Remove `convertSnapshotToData()`
- Remove `isLegacySnapshot()`
- Remove `FallbackStorefront`
- Remove `sectionRegistry`
- Remove `getPublicPageData()` references
- Remove `SET("influencer_data")` writes (after Brand backfill confirmed)
