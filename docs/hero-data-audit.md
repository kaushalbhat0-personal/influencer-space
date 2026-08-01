# Hero Data Audit

**IMPLEMENTATION-18A · Phase 1 · 2026-08-01**

## Verdict

Every place Hero data could live was located. Duplicates (social links in
`Brand.socialLinks`, `AffiliateLink` rows, and hardcoded Hero CTA URLs) were
consolidated into **hero_data.socialLinks** — the single source of truth owned
by Hero.

## Where Hero data existed (audit)

| Data | Storage before | Storage after | Notes |
|---|---|---|---|
| Title / Subtitle / Tagline | `Setting.hero_data` | same | Hero |
| Bio | `Brand.bio` | `hero_data.bio` (falls back to `Brand.bio`) | Hero owns bio |
| Live Badge | `hero_data` | same | Hero |
| CTA buttons | `hero_data.ctaText/ctaLink/ctaSecondaryText/ctaSecondaryLink` | same | Hero |
| Hero Poster | `hero_data.posterUrl/posterAssetId` | same | Hero |
| Hero Video | `hero_data.videoUrl/videoAssetId` | same | Hero |
| Hero Background | — | `hero_data.backgroundUrl/backgroundAssetId` | Hero |
| Social / Streaming links | **duplicated**: `Brand.socialLinks` + `AffiliateLink` rows + hardcoded `ctaLink`/`ctaSecondaryLink` | `hero_data.socialLinks` | **single source** |
| API keys (YouTube/Instagram) | `Tenant.youtubeApiKey/instagramApiKey` | same | Hero form is the only surface |
| Links section render | `content.links` (AffiliateLink) + `identity.socialLinks` (Brand) | `hero.socialLinks` | presentation only |
| Footer render | static | `hero.socialLinks` | stores nothing |

## Duplicates removed

1. `Brand.socialLinks` — still read as a **migration fallback** only; once
   `hero.socialLinks` is populated the aggregate prefers Hero.
2. `AffiliateLink` rows — no longer a storefront data source; migrated into
   `hero.socialLinks`.
3. Hardcoded CTA URLs (`youtube.com/@SnaxGaming`, `instagram.com/snaxgaming`) —
   migrated into `hero.socialLinks`.
4. `identity.socialLinks` — now derives from `hero.socialLinks` when present.

## Current state (tenant `testcreator1@gmail.com`)

`hero_data.socialLinks` (after migration):

```
youtube   https://www.youtube.com/@FarahKhanK
youtube   https://youtube.com/@SnaxGaming
instagram https://instagram.com/farahkhankunder
x         https://twitter.com/thefarahkhan
instagram https://instagram.com/snaxgaming
```

These 5 links render on the **Hero**, the **Links section** and the **Footer**
(verified in the browser DOM).
