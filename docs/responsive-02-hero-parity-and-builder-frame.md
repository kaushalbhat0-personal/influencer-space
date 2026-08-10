# RCCF-RESPONSIVE-02: Storefront Hero Mobile Parity — avatar bridging, black-band reduction, Builder device-frame breakpoint simulation

Date: 2026-08-11
Status: IMPLEMENTED (no commit — user decision pending)

## VERDICT

The storefront hero (test-creator-1, video hero) and the Builder mobile device
frame now render the **same breakpoint classes**. The live mobile hero
(320–480px) is now the compact "bridging" composition the Builder was
displaying, and the Builder's 375px frame renders the true base (mobile)
classes instead of the `sm:` desktop classes it previously showed.

- Avatar now bridges the hero media bottom by a consistent **20px** across
  320–480px (previously it floated up to 11px *above* the media bottom at 375px
  and only bridged below ~343px).
- The empty dark band below the hero content shrinks from **64px → 48px** on
  mobile (pb-16 → pb-12). Desktop (`@sm:`, ≥640px) keeps its existing pb-20
  design.
- **Zero horizontal overflow** at every tested width.
- Builder mobile/tablet/desktop frames now select breakpoint classes by the
  **frame width** (375/768/1200) via CSS container queries, matching the live
  storefront at the equivalent viewport.

## ROOT CAUSE

Tailwind viewport media queries (`sm:`, `lg:`) respond to the **outer browser
window**, not to the Builder device frame (a 375px-wide `scale()`-transformed
div inside a wide window). So the Builder's mobile frame rendered the `sm:`
desktop hero (aspect 16/8, `-mt-[24%]`, 144px avatar, pb-20) while the live
storefront at 375px correctly rendered the base mobile classes (aspect 16/10,
`-mt-[35%]`, 112px avatar, pb-16). Two consequences on live mobile:

1. **Avatar gap / no bridge.** Bridge (how far the avatar extends below the
   media bottom) = `avatar_h + 8px pt − overlap`. With a percentage overlap,
   bridge = `120 − 0.35W`, positive only below ~343px — so at 375–480px the
   avatar ended *above* the media bottom, floating with an 11px gap and no
   visual tie between the hero media and the identity content.
2. **Black band.** The hero section's own bottom padding (pb-16 = 64px) renders
   over the `to-black` tail of the hero gradient (`bg-gradient-to-br … to-black`)
   below the last content (socials). Measured as `gapAfterLastChild = 64px`
   (live) / 80px (builder `sm:pb-20`) in DOM probes. The heroBlend `h-40`
   gradient overlay (`section-runtime.tsx`) exists but is occluded by the hero's
   opaque gradient — it is not the band.

## BUILDER RENDER PATH

`src/features/builder/canvas/interactive-canvas.tsx` — `InteractiveCanvas`
builds a `PublishedSnapshot` from live content + `builderStore` draft, resolves
it via `layoutEngine`, and renders through the same
`ExperienceSection → ComponentRenderer` pipeline as the storefront. The device
frame is a plain `div` with `width: DEVICE_WIDTHS[device]` (375/768/1200) and
`transform: scale(zoom)`; `viewport={builderStore.canvas.device}` only feeds
`responsiveResolver` (responsive *props*, never Tailwind classes). Before this
fix the frame had **no breakpoint simulation** — `sm:`/`lg:` reflected the outer
window.

## LIVE RENDER PATH

`src/app/[domain]/page.tsx` / `[domain]/[slug]/page.tsx` →
`StorefrontPage` → `ExperienceSection → DataBoundRenderer` →
registry `HeroRenderer` (`renderers.tsx:68`). Live breakpoints are CSS viewport
media queries. `ComponentRenderer`'s `viewport` prop is separate and irrelevant
to class selection.

## WHERE THEY DIVERGE

| width | Builder frame (before) | Live (before) | Builder frame (after) | Live (after) |
|---|---|---|---|---|
| 375 | `sm:` — 16/8, −24%, 144px, pb-20, 62px bridge | base — 16/10, −35%, 112px, pb-16, **−11px gap**, 64px band | base — 16/9, −100px, 112px, pb-12, 20px bridge | same |
| 768 | `sm:` | `sm:` | `@sm:` | `@sm:` |
| 1200 | `sm:` (frame shrank to ~896px → no `lg:`) | `sm:`+`lg:` | `@sm:`+`@lg:` (frame kept at 1200px via `shrink-0`) | same |

Root cause of the divergence is single: **Tailwind breakpoints follow the outer
window, not the frame.**

## FIX IMPLEMENTED

Both sides converge by moving the hero's breakpoints from viewport media
queries to **CSS container queries** (Tailwind Labs official
`@tailwindcss/container-queries` plugin, since Tailwind v3 core has no container
queries):

1. `HeroRenderer` (`renderers.tsx`) — base (mobile) contract tuned so the avatar
   bridges at every mobile width, and all responsive classes switched to
   container variants:
   - Media: `aspect-[16/10]` → `aspect-[16/9]` (compact; 211px at 375px), kept
     `@sm:aspect-[16/8]`.
   - Overlap: `-mt-[35%]` (width %) → `-mt-[100px]` (**fixed px**, = 112px avatar
     + 8px pt − 20px bridge) → consistent 20px bridge across 320–480px. The old
     percentage only bridged below ~343px. `@sm:-mt-[24%]` unchanged.
   - Bottom padding: `pb-16` → `pb-12` (black band 64px → 48px);
     `@sm:pb-20` unchanged.
   - Avatar: `h-28 w-28` kept; `sm:h-36 sm:w-36` → `@sm:h-36 @sm:w-36`.
   - Typography: `sm:text-4xl lg:text-5xl` → `@sm:text-4xl @lg:text-5xl`;
     `sm:text-2xl` → `@sm:text-2xl`.
2. `@container` ancestor added on BOTH surfaces so the container-query variants
   resolve to the right width:
   - Live: `<main id="main-content">` in `StorefrontPage.tsx` (container width =
     viewport → `@sm:`/`@lg:` behave exactly like `sm:`/`lg:`).
   - Builder: the device frame div in `interactive-canvas.tsx` (container width =
     375/768/1200 → frame renders true device classes). Also added `shrink-0`
     so the 1200px desktop frame cannot shrink below the `@lg` threshold.
3. `tailwind.config.ts` — installed `@tailwindcss/container-queries` and pinned
   the `containers` theme to the screen breakpoints (`sm: 640px … 2xl: 1536px`).
   The plugin's DEFAULTS (`@sm`=384px, `@lg`=512px) would wrongly match phones
   (390px ≥ 384px), so they are aligned to the screen scale.
4. All hero render sites audited for a `@container` ancestor: live homepage and
   `[slug]` pages (both via `StorefrontPage`), Builder canvas frame.
   `SectionRenderer` is unused; no other path renders the storefront hero.

## FILES CHANGED

- `src/lib/registry/components/renderers.tsx` — `HeroRenderer` base mobile
  contract + container-query variants (part 1 + part 2).
- `src/components/storefront/StorefrontPage.tsx` — `@container` on `<main>`.
- `src/features/builder/canvas/interactive-canvas.tsx` — `@container` +
  `shrink-0` on the device frame.
- `tailwind.config.ts` — `@tailwindcss/container-queries` plugin + `containers`
  theme (screen-aligned breakpoints).
- `package.json` / `package-lock.json` — added `@tailwindcss/container-queries`
  (v0.1.1, devDependency).
- `tests/e2e/production/identity.spec.ts` — updated stale overlap class
  selector (`-mt-[30%]`/`-mt-[22%]` → `-mt-[100px]`/`-mt-[24%]`); the assertion
  was already failing on `main` before this fix.

## RESPONSIVE VERIFICATION

Playwright DOM probes (dev server :3002, cookie login, test-creator-1) after the
fix:

| viewport | media | overlap | avatar | bottom gap | bridge | overflow | h1 |
|---|---|---|---|---|---|---|---|
| 320 | 16/9 | −100px | 112px | 48px | **+20px** | 0 | 30px |
| 360 | 16/9 | −100px | 112px | 48px | +20px | 0 | 30px |
| 375 | 16/9 | −100px | 112px | 48px | +20px | 0 | 30px |
| 390 | 16/9 | −100px | 112px | 48px | +20px | 0 | 30px |
| 414 | 16/9 | −100px | 112px | 48px | +20px | 0 | 30px |
| 480 | 16/9 | −100px | 112px | 48px | +20px | 0 | 30px |
| 640 | 16/8 | −24% | 144px | 80px | −2px | 0 | 36px |
| 768 | 16/8 | −24% | 144px | 80px | −32px | 0 | 36px |
| 1200 | 16/8 | −24% | 144px | 80px | −136px | 0 | 48px |

Builder frames (window 1500px, frame widths 375/768/1200):

| frame | media | overlap | avatar | bottom gap | bridge |
|---|---|---|---|---|---|
| Mobile (375) | 16/9 | −100px | 112px | 48px | +20px |
| Tablet (768) | 16/8 | −24% | 144px | 80px | −24px |
| Desktop (1200) | 16/8 | −24% | 144px | 80px | −128px |

- Builder Mobile frame classes == live 375px classes (base). Tablet == live 768
  (`@sm`). Desktop == live 1200 (`@sm` + `@lg`). Parity achieved.
- Bridge = avatar bottom − media bottom (positive = bridges below media).
  Before the fix at 375px live: **−11px** (avatar above media) and 64px bottom
  band; now +20px and 48px.
- Screenshots for visual review (untracked): `screenshots/after-live-hero-375.png`,
  `screenshots/after-builder-mobile-frame.png` (user-provided evidence remains
  in `screenshots/`).

## TESTS

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (only pre-existing warnings in unrelated modules).
- `npm run build` — ✓ Compiled successfully; production CSS contains the
  `@container` utility and `@sm:`/`@lg:` container variants.
- `npm test` — 2148/2148 vitest passed.
- `npm run test:arch` — 13/13 passed.

## REMAINING RISKS

- **Builder frame content width ≠ device width by ~34px.** The canvas wraps
  section content in a `p-4` container, so inside the 375px frame the content is
  ~341px wide; breakpoint *selection* uses the frame width (correct), but text
  re-wraps slightly differently than on a true 375px device (builder mobile hero
  measured 567px vs 586px live). Cosmetic; not part of the class-parity
  contract.
- **Container-query pattern is scoped to the hero only.** Other sections
  (gallery, products, …) in the Builder mobile frame still use viewport
  breakpoints and will show their `sm:` look there. Extending the pattern to
  other renderers is the documented follow-up.
- **The mobile black band is reduced, not eliminated** (64px → 48px). It is
  inherent to a dark hero with bottom padding over the `to-black` gradient;
  eliminating it entirely would require a gradient change (design decision).
- `@container` on `<main>` is a new dependency on that element; verified against
  all current hero render paths (live homepage, `[slug]` pages, builder frame).

## UNRELATED FINDINGS

- `tests/e2e/production/identity.spec.ts:94` asserted overlap classes
  (`-mt-[30%]`/`-mt-[22%]`) that had been stale since IMPLEMENTATION-19/21 —
  the assertion was already failing on `main` before this change. Updated to the
  current classes.
- `npm audit` reports pre-existing vulnerabilities (unrelated to this change).
- Lint warnings (unused vars) exist in several unrelated modules
  (`src/modules/fulfillment/application/runtime.ts`, `alert-store.ts`,
  `provisioning-service.ts`, `recommendation-runtime`, `capabilities.ts`,
  `composition-engine.ts`, `settings.service.ts`) — pre-existing.
- Historical reports `docs/implementation-21-report.md` /
  `docs/implementation-22-report.md` document the old `aspect-[16/10]` /
  `-mt-[35%]` classes; left unchanged (historical record).

## GIT STATUS

Not committed (per instruction). Working tree:

```
 M package-lock.json
 M package.json
 M src/components/storefront/StorefrontPage.tsx
 M src/features/builder/canvas/interactive-canvas.tsx
 M src/lib/registry/components/renderers.tsx
 M tailwind.config.ts
 M tests/e2e/production/identity.spec.ts
?? screenshots/        (evidence + after-fix screenshots)
```

Probe artifacts (`tests/e2e/probe-hero*.spec.ts`, `playwright.probe-hero.config.ts`,
`playwright-report/hero2/`) removed.
