# RCCF-RESPONSIVE-03: Builder-Wide Responsive Breakpoint Implementation

Date: 2026-08-11
Status: IMPLEMENTED — not committed (per task rules)

## VERDICT

PASS

Named-container breakpoint parity is implemented and empirically verified at
every width. The Builder device frame and the live storefront now select the
same breakpoint classes/layouts for all confirmed Builder-risk areas (Pricing,
Courses, Services, Games, ContentFeed grids; HeroMedia alignment; Hero), and
the RCCF-02 hero geometry is unchanged. All checks green: tsc, lint, build,
2148/2148 vitest, 13/13 arch, 4/4 storefront identity e2e (incl. the
Builder↔storefront hero-media parity test).

## ROOT CAUSE

Builder device frames are scaled `div`s (`width: 375/768/1200` +
`transform: scale()`), so Tailwind viewport media queries (`sm:`, `lg:`) evaluate
against the outer browser window, not the simulated frame width. RCCF-02 fixed
the Hero by moving it to container queries (`@container` + `@sm:`/`@lg:`).
RCCF-03 extends that architecture to the confirmed Builder-risk areas and makes
the container boundary **named** (`@container/main`) so nested containers can
never hijack the breakpoint source.

## CHANGES IMPLEMENTED

### `src/lib/registry/components/renderers.tsx`
- **PricingRenderer** — `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` →
  `grid gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-3`. Base grid behavior
  unchanged.
- **CoursesRenderer** — same conversion.
- **ServicesRenderer** — same conversion.
- **GamesRenderer** — same conversion.
- **ContentFeedRenderer** — `grid grid-cols-2 gap-3 sm:grid-cols-3
  lg:grid-cols-4` → `grid grid-cols-2 gap-3 @sm/main:grid-cols-3
  @lg/main:grid-cols-4`. Base `grid-cols-2` kept.
- **HeroRenderer** — all RCCF-02 container variants renamed to the named
  container: `@sm:…` → `@sm/main:…`, `@lg:…` → `@lg/main:…` (aspect, overlap,
  avatar size, padding, h1/h2 typography). Geometry unchanged:
  `aspect-[16/9]`, `-mt-[100px]`, `h-28 w-28`, `pb-12`, `@sm/main:aspect-[16/8]`,
  `@sm/main:-mt-[24%]`, `@sm/main:h-36 w-36`, `@sm/main:pb-20`,
  `@sm/main:text-4xl @lg/main:text-5xl`, `@sm/main:text-2xl`.
- Testimonials' inert `sm:grid-cols-2` (L460, overridden by inline
  `gridTemplateColumns`) intentionally left untouched.

### `src/components/shared/HeroMedia.tsx`
- `desktopObjectClasses` (`sm:object-top/center/bottom`) →
  `@sm/main:object-top/center/bottom`. Mobile alignment (base `object-*`),
  helper API (`responsiveAlignmentClass`), callers and `object-fit` unchanged.
  Callers audited: `HeroRenderer` (inside live `<main>` / Builder frame — both
  now `@container/main`) and the **unused** `HeroBanner` component
  (`src/app/[domain]/_components/hero-banner.tsx`, no importers — unaffected);
  `settings-live-preview.tsx` uses the non-responsive `heroAlignmentClass` and is
  unaffected.

### `src/components/storefront/StorefrontPage.tsx`
- `<main id="main-content">` container root renamed `@container` →
  `@container/main`. Boundary unchanged (still the storefront content boundary).

### `src/features/builder/canvas/interactive-canvas.tsx`
- Device-frame container root renamed `@container` → `@container/main`. Frame
  width (`DEVICE_WIDTHS`) and `shrink-0` behavior preserved; boundary unmoved.

### `src/features/onboarding/components/construction-preview.tsx`
- The `<main className="space-y-2">` that wraps the rendered storefront
  sections (`ComponentRenderer`) is now `<main className="@container/main
  space-y-2">` — a single named container mirroring the live storefront root.
  This fixes the RCCF-02 side-effect where the hero (container-query based) had
  no container ancestor in the construction preview and therefore always
  rendered base (mobile) layout. No other layout change.

## BREAKPOINT PARITY

Empirical DOM probe (named-container mechanism using the EXACT converted
classes, plus the real hero) — Live viewport vs Builder device frame:

| Section | Live 375 | Builder 375 | Live 768 | Builder 768 | Live 1200 | Builder 1200 |
|---|---|---|---|---|---|---|
| Pricing/Courses/Services/Games (`@sm/main:grid-cols-2 @lg/main:grid-cols-3`) | **1** col | **1** col | **2** cols | **2** cols | **3** cols | **3** cols |
| ContentFeed (`grid-cols-2 @sm/main:grid-cols-3 @lg/main:grid-cols-4`) | **2** cols | **2** cols | **3** cols | **3** cols | **4** cols | **4** cols |
| HeroMedia alignment (`object-top @sm/main:object-bottom` probe) | 50% 0% (base) | 50% 0% (base) | 50% 100% (desktop) | 50% 100% | 50% 100% | 50% 100% |
| Hero media aspect | 16/9 | 16/9 | 16/8 | 16/8 | 16/8 | 16/8 |
| Hero overlap | −100px | −100px | −184px | −176px* | −288px | −280px* |
| Hero avatar | 112px | 112px | 144px | 144px | 144px | 144px |
| Hero bottom gap | 48px | 48px | 80px | 80px | 80px | 80px |
| Hero bridge | +20px | +20px | −32px | −24px* | −136px | −128px* |

Container root diagnostics: `container-type: inline-size`, `container-name:
main` on both live `<main>` and the Builder frame.

*Builder tablet/desktop hero geometry differs by a few px from live only because
the frame's inner `p-4` padding makes the content ~32px narrower than the frame
(a pre-existing cosmetic artifact). Breakpoint **selection** is identical (uses
the frame width). No class/layout divergence.

## CONSTRUCTION PREVIEW

- `<main>` inside `ConstructionPreview` is now a named `@container/main`
  (`container-type: inline-size`, `container-name: main` verified via DOM).
- At the measured preview width (377px on the dev route) it correctly resolves
  base/mobile variants (1-col grid) — the container, not the browser, is the
  breakpoint source. At a desktop-width preview the `@sm/main:`/`@lg/main:`
  variants will apply, so the previously-mobile-stuck hero now tracks the
  preview width.
- No hero was revealed in the dev-route snapshot at probe time (data-dependent),
  but the container mechanism is verified identical to the live `<main>` case.

## HERO REGRESSION

RCCF-02 geometry fully preserved and verified unchanged:
- 375px: aspect 16/9, overlap −100px, avatar 112px, pb-12 (48px gap), bridge
  +20px, h1 30px — Live == Builder.
- 768px: aspect 16/8, overlap −24%, avatar 144px, pb-20 (80px), h1 36px.
- 1200px: aspect 16/8, overlap −24%, avatar 144px, pb-20 (80px), h1 48px.
No overflow at any width; Builder frames respond to frame width (375/768/1200).

## TESTS

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (pre-existing warnings only, unrelated modules).
- `npm run build` — `✓ Compiled successfully`. Production CSS contains
  `.@container\/main` (`container-type: inline-size; container-name: main`) and
  named container rules `@container main (min-width: 640px)` and
  `@container main (min-width: 1024px)`.
- `npm test` — 2148/2148 vitest passed.
- `npm run test:arch` — 13/13 passed.
- `npx playwright test tests/e2e/production/identity.spec.ts` (SKIP_DB_CHECK,
  BASE_URL=:3002) — **4/4 passed**, including I3 (storefront hero overlapping
  profile picture) and I4 (Builder loads the same hero media as the storefront).

## FILES CHANGED

- `src/lib/registry/components/renderers.tsx` — 5 grid conversions +
  hero named-container variants.
- `src/components/shared/HeroMedia.tsx` — desktop alignment → `@sm/main:object-*`.
- `src/components/storefront/StorefrontPage.tsx` — `@container` → `@container/main`.
- `src/features/builder/canvas/interactive-canvas.tsx` — `@container` → `@container/main`.
- `src/features/onboarding/components/construction-preview.tsx` — added
  `@container/main` to the sections `<main>`.
- (Untracked, from the audit task) `docs/responsive-03-builder-breakpoint-audit.md`.

## REMAINING RISKS

- **ConstructionPreview width is layout-driven** — it shows desktop variants
  only when the preview is rendered ≥640px wide; a narrow preview correctly shows
  mobile. Confirmed correct mechanism, but whether the real onboarding page
  renders it wide is page-layout dependent (not verified end-to-end with a
  revealed hero).
- **`HeroBanner` (dead code)** still consumes `responsiveAlignmentClass`; if it
  is ever wired up outside a `@container/main` ancestor, desktop alignment would
  silently fall back to mobile. Documented; not implemented (unrelated).
- **Frame `p-4` content padding** keeps in-frame content ~32px narrower than the
  device width (cosmetic geometry only; breakpoint selection uses frame width).
- **Any future storefront render site must have a `@container/main` ancestor**,
  or container variants degrade to base. Today all are covered (live `<main>`,
  Builder frame, ConstructionPreview).

## UNRELATED FINDINGS

- `src/app/[domain]/_components/hero-banner.tsx` (`HeroBanner`) is exported but
  has no importers anywhere (dead component); it carries its own viewport class
  `sm:h-[40vh]` and would face the same Builder-risk if ever used. Documented,
  not changed.
- `src/components/storefront/ProductGrid.tsx` and
  `src/components/public/ProductGrid.tsx` are also unused.
- `npm audit` reports pre-existing vulnerabilities (unrelated).

## GIT STATUS

Not committed, not pushed (per task rules). Working tree:

```
 M src/components/shared/HeroMedia.tsx
 M src/components/storefront/StorefrontPage.tsx
 M src/features/builder/canvas/interactive-canvas.tsx
 M src/features/onboarding/components/construction-preview.tsx
 M src/lib/registry/components/renderers.tsx
?? docs/responsive-03-builder-breakpoint-audit.md   (audit report, untracked)
```

All temporary probes and logs removed (`probe-r03.spec.ts`,
`playwright.probe-r03.config.ts`, `probe-r03-out.txt`, `build-r03.log`,
`test-results/`, `playwright-report/`).
