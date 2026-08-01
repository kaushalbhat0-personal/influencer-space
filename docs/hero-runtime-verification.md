# Hero Runtime Verification

**IMPLEMENTATION-18A · Phases 6, 7, 8, 9 · 2026-08-01**

## Verdict

Builder, Links section, Footer and Storefront all consume **one** aggregate
(`websiteAggregate.build()`) that exposes `hero.socialLinks` / `hero.media` /
`hero.integrations` once. The Builder never edits or stores Hero content.

## Aggregate (Phase 8)

`websiteAggregate.build()` now exposes, once:

- `hero.socialLinks` — from `hero_data.socialLinks` (single source).
- `hero.media` — `posterUrl/videoUrl/backgroundUrl` + asset ids (resolved live).
- `hero.integrations` — Hero form is the only surface for API keys (stored on
  Tenant; not duplicated).
- `hero.bio` — Hero bio, falling back to Brand bio (migration-safe).
- `identity.socialLinks` — derives from `hero.socialLinks` when present.

## LayoutEngine (Phases 6 & 7)

- `links.*` → `resolvedData` built **only** from `content.hero.socialLinks`
  (AffiliateLink and Brand.socialLinks are no longer storefront sources).
- `footer.*` → `socialLinks` passed to the Footer renderer (Footer stores
  nothing).
- `hero.*` → `content.hero` merged, so the Hero renderer gets `socialLinks`.

## Renderers

- **HeroRenderer** — renders social-link pills below the CTAs.
- **LinksRenderer** — renders `resolvedData` (now Hero's links).
- **FooterRenderer** — renders Hero's social links above the copyright.

## Builder (Phase 9)

The Builder consumes the aggregate for the canvas and never writes Hero content
(IMPLEMENTATION-13/14 contract). E2E `04b` still proves Builder signature ==
Storefront signature, and the canvas reflects Hero changes on focus refetch.

## Verification

- Storefront DOM (browser truth): Hero shows 5 social pills; Links section shows
  5 links; Footer shows 5 links — all from `hero.socialLinks`.
- Adding a link in the Hero form (E2E `H2`) updates the storefront immediately.
- `scripts/runtime-data-audit.ts` still PASSES (aggregate parity unchanged).
