# Creator Identity Ownership Map

**IMPLEMENTATION-18B · 2026-08-01**

## The single owner

| Field | Owner | Stored in | Edited at | Rendered |
|---|---|---|---|---|
| Creator Name | **Hero** | `hero_data.name` | `/admin/settings` → Creator Identity | Hero H1 · About · Footer |
| Tagline | **Hero** | `hero_data.tagline` | `/admin/settings` → Creator Identity | Hero · About |
| Bio | **Hero** | `hero_data.bio` | `/admin/settings` → Creator Identity | Hero · About |
| Profile Picture | **Hero** | `hero_data.profilePictureUrl/AssetId` | `/admin/settings` → Creator Identity | Hero (overlapping) · About |
| Hero Title / Subtitle | **Hero** | `hero_data.title/subtitle` | `/admin/settings` → Hero Details | Hero headline |
| CTA buttons | **Hero** | `hero_data.ctaText/ctaLink/ctaSecondary*` | `/admin/settings` → Call To Actions | Hero |
| Live Badge | **Hero** | `hero_data.liveBadgeText/showLiveBadge` | `/admin/settings` → Hero Details | Hero |
| Hero Media (video/poster/background) | **Hero** | `hero_data.*Url/*AssetId` | `/admin/settings` → Hero Media | Hero |
| Social / Streaming links | **Hero** | `hero_data.socialLinks` | `/admin/settings` → Social Links (and `/admin/links`, presentation-only) | Hero · Links section · Footer |
| API keys | **Hero** (surface) | `Tenant.youtubeApiKey/instagramApiKey` | `/admin/settings` → Developer Integrations | — |

## Profile now owns (Account Settings only)

| Field | Stored in |
|---|---|
| contactEmail, phone, timezone, language, country, location | `Setting.account_data` |
| businessName, gst, taxId, payoutPreference, currency, categories | `Setting.account_data` |
| notifications (email/push) | `Setting.account_data` |

Profile no longer touches any storefront-visible field.

## Removed duplication

- `Profile` page: removed name, tagline, bio, profile picture, social links editors (now Hero).
- `profileService.updateProfile`: no longer writes `Brand.name/tagline/bio/avatarUrl/socialLinks`.
- `About`: no data — renders `identity` from the aggregate (Hero-owned).

## Migration (no data loss)

`scripts/migrate-hero-social.ts --apply` copies `Brand` identity (name, tagline,
bio, avatarUrl/AssetId) into `hero_data` when Hero doesn't have it. The
aggregate prefers Hero and falls back to Brand only until migrated.
