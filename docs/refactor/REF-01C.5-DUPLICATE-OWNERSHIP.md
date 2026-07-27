# REF-01C.5 — Duplicate Ownership

## Fields with Multiple Owners

| Field | Owner 1 | Owner 2 | Owner 3 | Recommended Canonical |
|-------|---------|---------|---------|---------------------|
| **Creator Name** | Brand.name (Profile page) | Setting.influencer_data.name (Settings page) | Tenant.name (provisioning) | **Brand.name** |
| **Creator Tagline** | Brand.tagline (Profile page) | Setting.influencer_data.tagline (Settings page) | — | **Brand.tagline** |
| **Creator Bio** | Brand.bio (Profile page) | Setting.influencer_data.bio (Settings page) | — | **Brand.bio** |
| **Avatar URL** | Brand.avatarUrl (Profile page) | Setting.influencer_data.profileImage (Settings page) | — | **Brand.avatarUrl** |
| **Banner URL** | Brand.bannerUrl (Profile page) | — | — | **Brand.bannerUrl** (no duplicate) |
| **Social Links** | Brand.socialLinks (Profile, array) | Setting.influencer_data.social (Settings, flat) | Setting.brand_config.socialLinks (provisioning) | **Brand.socialLinks** |
| **Product Data** | Product table | PublishedSnapshot.content.products (always []) | — | **Product table** (snapshot should freeze) |
| **Gallery Data** | GalleryImage table | PublishedSnapshot.content.gallery (always disabled) | — | **GalleryImage table** (snapshot should freeze) |
| **Link Data** | AffiliateLink table | — | — | **AffiliateLink table** (no duplicate) |
| **SEO Title** | Setting.seo.title | PublishedSnapshot.content.seo (always "") | CreatorIntelligence.seoKeywords | **Setting.seo.title** |
| **Theme Colors** | Website.themeColors | Setting.theme_config | DesignTheme.tokens | **Website.themeColors** |
| **Hero Title** | Setting.hero_data.title | Builder Block.config.title | — | **Setting.hero_data.title** (builder position only) |
| **Navigation** | Website.themeConfig.navigation | Computed from builder pages | — | **LayoutSnapshot** (computed) |

## Active Duplicate Violations

| Domain | Violation | Impact |
|--------|-----------|--------|
| Identity | Profile page writes to Brand table; Settings page writes to Setting.influencer_data. Storefront reads from Setting.influencer_data. Changes in Profile page NEVER appear on storefront. | **CRITICAL** — user-facing data loss |
| Products | Snapshot products always empty — snapshot never freezes product state. Storefront reads live from Product table. | **MEDIUM** — no rollback support |
| Gallery | Snapshot gallery always disabled — same as products. | **MEDIUM** — no rollback support |
| Theme | 3 storage locations for colors with different read paths. Dashboard and storefront may show different colors. | **HIGH** — inconsistent UX |
| Hero | Title/subtitle written to Settings but never rendered by HeroBanner. Builder Hero section has its own config. | **MEDIUM** — dead settings fields |
