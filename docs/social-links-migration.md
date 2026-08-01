# Social Links Migration

**IMPLEMENTATION-18A · Phases 4 & 10 · 2026-08-01**

## Goal

Move every existing hardcoded / duplicated creator link into `hero_data.socialLinks`
so Hero is the single source of truth. No data loss.

## Supported platforms

`youtube · instagram · x · facebook · linkedin · discord · telegram · whatsapp ·
kick · twitch · website · email · phone · custom` — all in `HERO_SOCIAL_PLATFORMS`.

## Migration script

`scripts/migrate-hero-social.ts` (idempotent; `--apply` commits):

For every website, it merges into `hero_data.socialLinks` (deduped by URL):

1. `Brand.socialLinks` (legacy profile social)
2. `AffiliateLink` rows (legacy Links-module storage)
3. hardcoded `hero_data.ctaLink` / `ctaSecondaryLink`
4. existing `hero_data.socialLinks` (kept)

Platform is inferred from the URL when not present (`platformOfUrl`).

## Migration run (evidence)

```
Hero Social Links migration — APPLYING
eee52d43-…-dab36119 → merged: 0 → 5 link(s)
    youtube    https://www.youtube.com/@FarahKhanK      ← Brand.socialLinks
    youtube    https://youtube.com/@SnaxGaming          ← hero CTA (hardcoded)
    instagram  https://instagram.com/farahkhankunder   ← AffiliateLink
    x          https://twitter.com/thefarahkhan         ← AffiliateLink
    instagram  https://instagram.com/snaxgaming         ← hero secondary CTA (hardcoded)
Migrated 1 tenant(s).
```

All 5 hardcoded Farah Khan URLs moved into Hero storage. No row deleted
(`Brand.socialLinks` kept as a migration fallback; `AffiliateLink` rows remain
in the DB but are no longer a storefront data source).

## Result

- Hero now owns 5 links (rendered on Hero, Links section, Footer).
- The storefront contains **no hardcoded creator URLs** — every link comes from
  `hero.socialLinks` (verified in the browser DOM: footer/links/hero all render
  the migrated URLs).
- Adding a link in the Hero form (E2E `H2`) immediately appears on the storefront.
