# REF-01C.5 — End-to-End Field Flow Audit

## Identity

| Field | Dashboard Writes | Repository | Aggregate | Snapshot | Storefront Reads | Status |
|-------|-----------------|------------|-----------|----------|-----------------|--------|
| name | Profile, Settings, Provisioning | BrandRepository + Setting(influencer_data) | WebsiteAggregate.identity.name | PublishedSnapshot.content.identity.name | **ILLEGAL** — reads from `Setting(influencer_data)` via `getPublicPageData()` | ⚠ Duplicate |
| tagline | Profile, Settings, Provisioning | BrandRepository + Setting(influencer_data) | WebsiteAggregate.identity.tagline | PublishedSnapshot.content.identity.tagline | **ILLEGAL** — reads from `Setting(influencer_data)` via `getPublicPageData()` | ⚠ Duplicate |
| bio | Profile, Settings, Provisioning | BrandRepository + Setting(influencer_data) | WebsiteAggregate.identity.bio | PublishedSnapshot.content.identity.bio | **ILLEGAL** — reads from `Setting(influencer_data)` via `getPublicPageData()` | ⚠ Duplicate |
| avatar | Profile, Settings, Provisioning | BrandRepository + Setting(influencer_data) | WebsiteAggregate.identity.avatarUrl | PublishedSnapshot.content.identity.avatarUrl | **ILLEGAL** — reads from `Setting(influencer_data)` via `getPublicPageData()` | ⚠ Duplicate |
| banner | Profile | BrandRepository | WebsiteAggregate.identity.bannerUrl | PublishedSnapshot.content.identity.bannerUrl | **BROKEN** — `PublicProfile` does NOT include bannerUrl; never reaches storefront | ❌ Broken |
| social links | Profile, Settings, Provisioning | BrandRepository + Setting(influencer_data) | WebsiteAggregate.identity.socialLinks | PublishedSnapshot.content.identity.socialLinks | **ILLEGAL** — reads from `Setting(influencer_data).social` via `getPublicPageData()` | ⚠ Duplicate |

## Hero

| Field | Dashboard Writes | Repository | Aggregate | Snapshot | Storefront Reads | Status |
|-------|-----------------|------------|-----------|----------|-----------------|--------|
| title | Settings | SettingsService (SET hero_data) | WebsiteAggregate.hero.title | PublishedSnapshot.content.hero | **BROKEN** — HeroBanner renders video/poster ONLY; title never displayed | ❌ Broken |
| subtitle | Settings | SettingsService (SET hero_data) | WebsiteAggregate.hero.subtitle | PublishedSnapshot.content.hero | **BROKEN** — loaded into PublicHeroData but HeroBanner doesn't render it | ❌ Broken |
| video | Settings | SettingsService (SET hero_data) | WebsiteAggregate.hero.videoUrl | PublishedSnapshot.content.hero | **ILLEGAL** — reads via `getPublicPageData().hero` | ⚠ Duplicate |
| poster | Settings | SettingsService (SET hero_data) | WebsiteAggregate.hero.posterUrl | PublishedSnapshot.content.hero | **ILLEGAL** — reads via `getPublicPageData().hero` | ⚠ Duplicate |
| CTA | Settings | SettingsService (SET hero_data) | WebsiteAggregate.hero.ctaText | PublishedSnapshot.content.hero | **BROKEN** — loaded but no consumer renders it | ❌ Broken |

## Products

| Field | Dashboard Writes | Repository | Aggregate | Snapshot | Storefront Reads | Status |
|-------|-----------------|------------|-----------|----------|-----------------|--------|
| all | Products page | ProductRepository | WebsiteAggregate.products | PublishedSnapshot.content.products | **ILLEGAL** — reads from `Product` table via `getPublicPageData()` AND `DataResolver` | ⚠ Duplicate |

## Gallery

| Field | Dashboard Writes | Repository | Aggregate | Snapshot | Storefront Reads | Status |
|-------|-----------------|------------|-----------|----------|-----------------|--------|
| all | Gallery page | GalleryRepository | WebsiteAggregate.gallery | PublishedSnapshot.content.gallery | **ILLEGAL** — reads from `GalleryImage` table via `getPublicPageData()` AND `DataResolver` | ⚠ Duplicate |

## Links

| Field | Dashboard Writes | Repository | Aggregate | Snapshot | Storefront Reads | Status |
|-------|-----------------|------------|-----------|----------|-----------------|--------|
| all | Links page | LinkRepository | WebsiteAggregate.links | PublishedSnapshot.content.links | **ILLEGAL** — reads from `AffiliateLink` table via `getPublicPageData()` AND `DataResolver` | ⚠ Duplicate |

## SEO

| Field | Dashboard Writes | Repository | Aggregate | Snapshot | Storefront Reads | Status |
|-------|-----------------|------------|-----------|----------|-----------------|--------|
| title | SEO page | SettingsService (SET seo) | WebsiteAggregate.seo.title | PublishedSnapshot.content.seo | **DUAL PATH** — snapshot first, then legacy fallback via `buildStorefrontMetadata()` | ⚠ Duplicate |
| description | SEO page | SettingsService (SET seo) | WebsiteAggregate.seo.description | PublishedSnapshot.content.seo | **DUAL PATH** — same as title | ⚠ Duplicate |

## Theme

| Field | Dashboard Writes | Repository | Aggregate | Snapshot | Storefront Reads | Status |
|-------|-----------------|------------|-----------|----------|-----------------|--------|
| colors | Builder/Appearance | WebsiteRepository + Setting(theme_config) | WebsiteAggregate.theme | PublishedSnapshot.layout.theme | **DUAL PATH** — snapshot.theme first, then niche fallback from legacy | ⚠ Duplicate |
| fonts | Builder/Appearance | WebsiteRepository | WebsiteAggregate.theme.fonts | PublishedSnapshot.layout.theme | Hardcoded to "Inter" in storefront | ❌ Broken |

## Navigation

| Field | Dashboard Writes | Repository | Aggregate | Snapshot | Storefront Reads | Status |
|-------|-----------------|------------|-----------|----------|-----------------|--------|
| sections | (computed) | (none) | (none) | (none) | **BROKEN** — `convertSnapshotToData()` always returns `navigation: []`; nav rebuilt from `legacy.*.length` | ❌ Broken |
