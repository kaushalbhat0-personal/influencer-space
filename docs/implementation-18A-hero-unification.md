# Implementation 18A — Hero Media & Integrations Unification

**Status: COMPLETE**
**Date: 2026-08-01**
**Type: Product completion (no redesign)**

## The contract delivered

Hero is the **single source of truth** for every Hero-owned field:

```
Title · Subtitle · Tagline · Bio · Live Badge · CTA buttons
Hero Poster · Hero Video · Hero Background · Social Links · Streaming Links · API Integrations
```

Nothing else owns these. The Links module is **presentation only** (it renders
Hero's social links). The Footer renders Hero's links and stores nothing. The
Builder never edits Hero content — it edits presentation only.

## What changed

| Area | Before | After |
|---|---|---|
| Hero data model | `video/poster/title/CTA/liveBadge` only | + `socialLinks[]` (14 platforms), `bio`, `background` |
| Social links source | duplicated: `Brand.socialLinks` + `AffiliateLink` rows + hardcoded CTA URLs | **hero_data.socialLinks** (one array) |
| Links module | separate `AffiliateLink` CRUD + storage | **presentation only** — renders `hero.socialLinks` |
| Footer | static copyright only | renders `hero.socialLinks` |
| Hero renderer | CTA + media only | + social-link pills |
| Aggregate | `hero` without links | `hero.socialLinks`, `hero.bio`, `hero.backgroundUrl`, `hero.backgroundAssetId` |
| Links admin page | AffiliateLink CRUD | same `SocialLinksEditor` writing hero_data (single CRUD) |
| API keys | on Tenant (edited in Hero form) | unchanged — Hero form is the only surface |

## Files

- `src/config/hero.ts` — `HeroSocialLink`, `HERO_SOCIAL_PLATFORMS` (14 platforms), extended `HeroDataType`.
- `src/actions/settings.actions.ts` — schema accepts `socialLinks`/`bio`/`background`; new `updateHeroSocialLinks`.
- `src/features/settings/components/settings-form.tsx` — Social Links editor, Bio, Hero Background.
- `src/features/links/components/social-links-editor.tsx` — the ONE social-link CRUD surface.
- `src/app/admin/links/page.tsx` — presentation-only (Hero social links).
- `src/modules/tenant/application/website-aggregate.service.ts` — exposes `hero.socialLinks` etc.
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — Links section + Footer read `hero.socialLinks` only.
- `src/lib/registry/components/renderers.tsx` — Hero social pills, Footer social links.
- `src/types/snapshot.ts` — `HeroSocialLink`, extended `HeroContent`.
- `scripts/migrate-hero-social.ts` — one-time migration (no data loss).
- `tests/unit/hero-unification.test.ts`, `tests/e2e/production/hero.spec.ts`.

## Verification

- `npx tsc --noEmit` ✅
- `npm test` ✅ 1648 tests, 0 failures
- `npm run build` ✅ (`✓ Compiled successfully`)
- Playwright production ✅ **13/13** (9 regression + 4 Hero)
- Storefront renders the migrated 5 social links in **Hero, Links and Footer** (browser DOM evidence).

## Reports

- `hero-data-audit.md`
- `hero-media-audit.md`
- `social-links-migration.md`
- `hero-runtime-verification.md`
- `hero-e2e-report.md`
