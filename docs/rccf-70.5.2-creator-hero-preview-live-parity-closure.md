# RCCF-70.5.2.5 — Final Read-Only Audit: Hero Preview/Live Parity Closure

Status: **READ-ONLY VERIFICATION** (audit only; no further code changes).
Phases: 70.5.2.1 audit → 70.5.2.2 architecture decision → 70.5.2.3 implementation →
70.5.2.4 regression tests → 70.5.2.5 final audit. **Nothing committed** (per
instruction "Do not commit" for 70.5.2.3/.4).
Date: 2026-08-16.

---

## 1. What changed (exactly 4 source files + 1 new test + 1 audit doc)

| File | Change |
|---|---|
| `src/lib/registry/components/renderers.tsx` | `HeroRenderer` accepts `previewMode` (established pattern). In preview: CTAs + social links render as inert `<span>` (no `href`, no navigation). Live rendering unchanged. |
| `src/features/settings/components/settings-live-preview.tsx` | Replaced the hand-rolled phone-frame mock with the CANONICAL render: the runtime resolver (`resolveHeroMediaForRuntime`) on the form's raw state + the real `HeroRenderer` inside a `@container/main` frame whose width follows the device toggle (320/1024px). Removed the manual media toggle and the stale `lastVideoRef`/`lastPosterRef` caching. Now shows title, subtitle, CTAs, social links, background. |
| `src/features/settings/components/settings-form.tsx` | Passes the full hero field set to the preview; fixes the background stale-closure save (upload value passed as explicit overrides, mirroring video/poster). |
| `src/modules/tenant/application/website-aggregate.service.ts` | Resolves `backgroundAssetId` to a fresh storage URL exactly like `videoAssetId`/`posterAssetId` (was flowing raw). |
| `tests/unit/rccf70-5-2-hero-preview-parity.test.tsx` | 8 regression tests. |
| `docs/rccf-70.5.2-creator-hero-preview-live-parity-audit.md` | 70.5.2.1 read-only audit deliverable (12 sections). |

## 2. Parity matrix — after

| Aspect | Live / Builder | Settings preview | Parity |
|---|---|---|---|
| Media decision | `resolveHeroMediaForRuntime` | same resolver on form state | ✓ |
| Renderer | `HeroRenderer` | `HeroRenderer` (same component) | ✓ |
| Alignment classes | `responsiveAlignmentClass` on `@container/main` | same classes on `@container/main` frame (device-width driven) | ✓ |
| Title / subtitle / CTAs / social / background | rendered | rendered (previously absent) | ✓ |
| Clearing media | immediate placeholder | immediate placeholder (refs removed) | ✓ |
| Non-actionable | `previewMode` | `previewMode` → inert spans, no navigation | ✓ |
| Source of truth | aggregate-enriched `content.hero` | canonical resolver + same field mapping as `LayoutEngine` | ✓ |

## 3. Constraints honoured

- ✅ ONE canonical Hero truth — preview reuses the runtime resolver + the single
  renderer; no second implementation.
- ✅ No schema change, no migration (verified `prisma validate` / `generate`).
- ✅ No new Prisma query from the preview (client-side only; zero new server reads).
- ✅ No second resolver (`resolveHeroMedia` untouched; `hero-media.ts` unchanged).
- ✅ No client tenant authority, no client media URL authority.
- ✅ Preview non-actionable — cannot navigate, checkout, WhatsApp, booking,
  contact, newsletter, affiliate, or mutate.
- ✅ No Stitch changes; RCCF-59 validation remains authoritative.
- ✅ Nothing committed.

## 4. Verification (all green)

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — success.
- `npx prisma validate` — valid; `npx prisma generate` — success.
- `npx eslint` (4 touched files) — 0 errors, 2 pre-existing unused-var warnings
  (`setHeroSubtitle`, `CreatorVideo`).
- `git diff --check` — clean.
- Focused suites (hero-unification, rccf67-storefront-integrity,
  rccf59-storage-hero, rccf68-builder-responsive, rccf68-storefront-renderers,
  media-service, supabase provider, new rccf70-5-2) — **124 passed**.
- Full `vitest run` — **3139 passed / 0 failed** (incl. the previously flaky
  rccf68-retry-catalog-timeout).

## 5. Honest caveats

- **Visual parity is asserted at the code/contract level, not pixel level.** The
  jsdom tests verify the decision wiring, the non-actionable rendering, and the
  frame boundary; an actual browser pass (mobile/desktop toggle, video-once
  playback, container-query breakpoints at 320/384/512px) is recommended before
  shipping to creators.
- The settings preview renders `HeroRenderer` outside the full storefront theme
  (`--button-*` variables use their fallback values). This is intentional and
  matches the live renderer's fallbacks; theme-sourced button colors will be
  accurate once live.
- `socialLinks` shown in the preview come from the server-loaded `heroData`
  (edited on `/admin/links`); they refresh on save/route refresh, not live-typing.
- Production data untouched: the 21 orphaned hero storage objects (~70MB) were
  NOT deleted and remain unregistered, per RCCF-70.5 guidance.

## 6. Recommended follow-up (out of scope for 70.5.2)

1. Manual browser smoke test of `/admin/settings` live preview (mobile/desktop).
2. Optional: a future parity assertion that `LayoutEngine.composeSectionConfig`
   hero props and the preview's client-side mapping are produced by one shared
   pure function (LayoutEngine is frozen in 70.5.2; both now mirror each other
   and the test suite locks the contract).