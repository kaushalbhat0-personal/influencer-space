# REF-01C — Duplicate Content Systems

## Duplicate Storage Locations

| Content | Location 1 | Location 2 | Location 3 | Location 4 | Action |
|---------|-----------|-----------|-----------|-----------|--------|
| **Creator Name** | `Brand.name` | `Tenant.name` | `SET("influencer_data").name` | — | Consolidate to `Brand.name`; deprecate `SET("influencer_data").name` |
| **Creator Tagline** | `Brand.tagline` | `SET("influencer_data").tagline` | — | — | Consolidate to `Brand.tagline` |
| **Creator Bio** | `Brand.bio` | `SET("influencer_data").bio` | — | — | Consolidate to `Brand.bio` |
| **Avatar URL** | `Brand.avatarUrl` | `SET("influencer_data").profileImage` | — | — | Consolidate to `Brand.avatarUrl` |
| **Social Links** | `Brand.socialLinks` (array) | `SET("influencer_data").social` (flat) | `SET("brand_config").socialLinks` (array) | — | Consolidate to `Brand.socialLinks` |
| **Brand Colors** | `Website.themeColors` | `DesignTheme.tokens` | `SET("theme_config")` | `SET("brand_config")` | Consolidate to `Website.themeColors` |
| **Hero Title** | `SET("hero_data").title` | `Block.config.title` | — | — | Keep `SET("hero_data")` as canonical; builder overrides merged at publish |
| **Hero Video** | `SET("hero_data").videoUrl` | `Block.config.videoUrl` | — | — | Keep `SET("hero_data")`; builder overrides merged |
| **SEO Title** | `SET("seo").title` | `CreatorIntelligence.seoKeywords` | — | — | Consolidate to `SET("seo")` for user-editable SEO |

## Duplicate Service/Reader Paths

| Function | Path 1 | Path 2 | Action |
|----------|--------|--------|--------|
| Load products for storefront | `getPublicPageData().products` (reads `SET("influencer_data")` → WRONG) | `findStorefrontProducts()` (reads `Product` table → CORRECT) | Fix: `getPublicPageData()` should NOT return products; only storefront loaders should |
| Load profile for storefront | `getPublicPageData().profile` (reads `SET("influencer_data")`) | `profileService.getProfile()` (reads `Brand` table) | Consolidate: storefront reads from `Brand` table via `WebsiteContentAssembler` |
| Load hero for storefront | `getPublicPageData().hero` (reads `SET("hero_data")`) | Builder page hero section (reads `Block.config`) | Keep `SET("hero_data")` as canonical source; builder overrides merged during aggregation |
| Load SEO for storefront | `extractSeoFromPages()` (reads snapshot) | `buildStorefrontMetadata()` (reads legacy profile) | Consolidate: use `WebsiteContentAssembler.seo` as primary, snapshot as fallback |

## Dead Serialization Code

| File | Method | Reason for Death |
|------|--------|-----------------|
| `src/features/storefront/service.ts` | `convertSnapshotToData()` | Always returns `navigation: []` — dead code path |
| `src/features/storefront/service-legacy.ts` | Entire file | Zero importers — dead |
| `src/lib/storefront/sections.tsx` | `registerDefaultSections()` | External from storefront except FallbackStorefront |
| `src/lib/storefront/registry.ts` | `sectionRegistry` | Only used by FallbackStorefront |
| `src/services/public.service.ts` | `getPublicPageData()` | Legacy — always fetched alongside snapshot; should be removed after aggregate migration |
| `src/lib/builder/artifact-loader.ts` | `storefrontToBuilderPages()` | Artifact loading removed from builder (FIX-01); dead |

## Data Loss Points

| Point | What's Lost | Impact |
|-------|-------------|--------|
| `builderPagesToArtifact()` L46 | `products = []` | Products not frozen in snapshot |
| `builderPagesToArtifact()` L47 | `gallery = {enabled: false}` | Gallery not frozen in snapshot |
| `builderPagesToArtifact()` L48 | `seo = {title:"", description:""}` | SEO not frozen in snapshot |
| `builderPagesToArtifact()` L27-33 | `website.title = ""` | Creator name not in snapshot |
| `builderPagesToArtifact()` L42 | Only first slot per section | Multi-slot sections collapse to one |
| `convertSnapshotToData()` L65 | `navigation: []` | Navigation always empty |
