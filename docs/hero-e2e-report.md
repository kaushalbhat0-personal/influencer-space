# Hero E2E Report

**IMPLEMENTATION-18A · 2026-08-01**

## Verdict

Hero is the only source of truth for media, links and integrations. Verified
end-to-end in the browser against the real creator (`testcreator1@gmail.com`).

## Playwright Hero E2E — 4/4 passed

| Test | Covers | Result |
|---|---|---|
| H1 — Hero settings: social links editor loads migrated links | Phase 1/4 (migration landed) | ✅ |
| H2 — Add a social link in Hero → renders on storefront (hero, links, footer) | Phase 4/6/7 (single source, live propagation) | ✅ |
| H3 — Links admin page is presentation-only, shows the same Hero links | Phase 6 (no duplicate CRUD) | ✅ |
| H4 — Hero poster upload persists | Phase 3 (upload → storage → preview) | ✅ |

Plus a video-upload probe (Phase 2): `input[accept*="video"]` → upload →
storage → `<video src=…supabase…>` preview appears, **0 console errors**.

## Full production suite — 13/13 passed

The existing 9-runtime tests (auth, dashboard, builder + publish, storefront,
runtime parity, live CMS, commerce, media, responsive) all still pass with the
Hero unification in place. No regression.

## Full verification commands

```
npx tsc --noEmit                         ✅
npm test                                  ✅ 1648 tests, 0 failures
npm run build                             ✅ Compiled successfully
npx playwright test --project=production  ✅ 13/13
npx tsx scripts/migrate-hero-social.ts --apply   ✅ 5 links migrated
```

## Evidence snapshots

- `playwright-report/forensics/h1-hero-settings.png`
- `playwright-report/forensics/h2-hero-social-saved.png`
- `playwright-report/forensics/h2-storefront-social.png`
- `playwright-report/forensics/h3-links-page.png`
- `playwright-report/forensics/h4-poster-upload.png`
- `playwright-report/forensics/h5-video-upload.png`

## Success criteria

- ✅ Hero owns all Hero content (title/subtitle/tagline/bio/badge/CTAs/poster/video/background/social links/integrations).
- ✅ Links module owns nothing (presentation only).
- ✅ Footer owns nothing (renders Hero links).
- ✅ Hero video works (upload/replace/delete/preview/fallback/validation).
- ✅ Poster works.
- ✅ Social links editable (one CRUD).
- ✅ No hardcoded URLs in the storefront.
- ✅ Single source of truth (`hero_data.socialLinks`).
- ✅ Builder untouched except presentation.
- ✅ Storefront reads aggregate only.
