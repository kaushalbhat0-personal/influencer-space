# IMPLEMENTATION-19 — Hero Finalization, Media Pipeline & UX Cleanup

**Date:** 2026-08-02
**Status:** Complete — tsc ✅ · 1647 unit tests ✅ · `npm run build` ✅ · Playwright production **22/22** ✅

## Verdict

The Hero is now the single, complete public identity. About is **gone** from the
entire product (registry, builder, runtime, storefront, templates, seeds,
generation AI, tests). Hero video uploads with a real progress bar and
auto-saves without refresh. The Media Library speaks the creator's language
(Uploading / Processing / Ready / Used / Unused / Failed) and tracks where every
asset is used.

## Phases delivered

| Phase | Outcome |
|---|---|
| A — Hero final layout | Media ALWAYS renders first (video → poster → placeholder). Profile picture overlaps the media 30–40% (`-mt-[30%] sm:-mt-[22%]`). Never above media. Name → Headline → Tagline → Bio → CTA → Socials. |
| B — Remove About | `about.default` removed from registry, builder sidebar/insert, templates, blueprints, business templates, seeds, `LayoutEngine`, `resolve-module`, `inspector`, `presentation`, generation world (`AboutComposer`, `AboutGenerator`, `AboutContentSchema`, `AboutQualityRule`, vocab/strategies/nav). Old layouts auto-migrate: `isDeprecatedSection()` drops About at render, flatten, and builder-load boundaries. |
| C — Hero media bug | Root cause: upload used a server action (no progress) + assets stuck at `QUEUED` forever (background processor never wired) + hero save required a manual click + router.refresh. Fixed: XHR upload endpoint (`/api/media/upload`) with real progress, **synchronous processing** (`processAssetNow` extracts dimensions/color from the in-memory buffer → asset is READY immediately), **auto-save** on upload complete (React async-state race fixed by passing the uploaded value directly), live preview via object URL. |
| D — Media Library UX | Friendly statuses (no QUEUED/PENDING/PROCESSING exposed). Upload progress bar + auto-refresh of the grid. Video cards show ▶ / duration / resolution / size. Hover: Preview · Copy URL. Detail: Name, Type, Size, Resolution, Duration, Storage Provider, Status, Created, Last Updated. |
| E — Asset references | `resolveAssetReferences` action maps each `AssetReference` to a human label ("Hero Video", "Product: <name>", "Gallery: <title>") + a deep link to the admin page. Used In links navigate directly. Deleting a referenced asset is blocked; Replace is offered. |
| F — Hero settings UX | Reorganized into **Hero Media · Creator Identity · Buttons · Live Badge · Social Links · Developer APIs**. No duplicated fields/uploads. Live Preview now shows name/profile/bio. |
| G — Profile page | Account Settings only (unchanged from 18B, re-verified: I1). |
| H — Storefront layout polish | Hero spans full width (removed the `max-w-2xl` wrapper that constrained every section). Each renderer owns its container; consistent vertical rhythm. |
| I — Builder parity | Builder + storefront share the same `ComponentRenderer`/`HeroRenderer`; the canvas shows the hero media, overlap, and spacing identically (I4 + J1). |
| J — Playwright | 5 new tests (J1–J5) + updated I3 (overlap classes) + updated 05 (Save Identity) + 07 (replace input selector). Full production suite: **22/22**. |

## Verification

- `npx tsc --noEmit` ✅
- `npx vitest run` → **73 files / 1647 tests, 0 failures** ✅
- `npm run build` → `✓ Compiled successfully` ✅
- `npx playwright test --project=production` → **22 passed** (6.5m) ✅
- Hero video upload: progress bar shown, auto-saved (no manual click), asset
  `READY`, storefront plays it (`readyState 4`, `paused:false`) ✅
- About no longer exists in the builder sidebar, canvas, or storefront ✅

## Data hygiene

- Backfilled pre-existing assets stuck at `QUEUED` → `READY`
  (`scripts/backfill-asset-processing.ts`).
- Re-uploaded the hero video (deduplicated to the existing asset) and restored
  the profile picture reference.
