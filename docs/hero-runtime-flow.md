# Hero Runtime Flow

**IMPLEMENTATION-18B · 2026-08-01**

## The unified flow

```
Hero settings (/admin/settings)
   → updateHeroPartial / updateHeroData / updateHeroSocialLinks
   → hero_data (Setting JSONB)          ← the ONLY creator-identity + media + links store
   → websiteAggregate.build()
   → identity { name, tagline, bio, avatarUrl } from hero
   → hero { title, name, profilePictureUrl, socialLinks, media, ... } from hero
   → LayoutEngine.resolve()             ← composes hero + about + links + footer sections
   → ComponentRenderer → DOM
```

## Runtime verification chain (browser truth)

| Step | Evidence |
|---|---|
| Admin Hero Save → Database | E2E H2 (social link), H4 (poster), I2 (identity card) |
| Database → Aggregate | storefront renders Hero-owned `name`/profile picture/social links |
| Aggregate → Builder | E2E 04b — Builder signature == Storefront signature |
| Publish | E2E 03 publishes; storefront live after |
| Storefront | hero renders name, overlapping avatar, tagline, bio, CTA, socials; links + footer render Hero socials |
| Profile page | no longer affects the storefront (E2E I1 — Account Settings only) |

## Files

- `src/config/hero.ts` — identity + media + social data model (single source).
- `src/actions/settings.actions.ts` — writers.
- `src/modules/tenant/application/website-aggregate.service.ts` — identity from Hero.
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — hero/about/links/footer composition from the aggregate.
- `src/lib/registry/components/renderers.tsx` — Hero renderer (overlapping avatar), About, Links, Footer.
- `src/features/profile/*` — Account Settings only.
