# RCCF-RESPONSIVE-03: Builder-Wide Responsive Breakpoint Audit

Date: 2026-08-11
Status: AUDIT COMPLETE — no code changes made (probe artifacts removed)

## VERDICT

BUILDER RESPONSIVE PARITY: **PARTIAL**

- **No observable divergence in current production data.** Every seeded storefront
  (cristiano-ronaldo, test-creator-1/2/4, 3-all-day) renders only: hero, gallery,
  products, timeline, links/contact/faq, footer. Empirical DOM comparison of
  Builder 375/768/1200 vs Live 375/768/1200 for those sections shows identical
  grid columns and layouts. The hero (the only section with a strong
  breakpoint-dependent composition) is already container-aware and verified
  Builder == Live (RCCF-RESPONSIVE-02).
- **Real code-level Builder risk remains** for 5 registered sections and one
  shared primitive, plus one RCCF-02 side-effect:
  1. Pricing, Courses, Services, Games, ContentFeed emit viewport `sm:`/`lg:`
     grid classes that WILL resolve incorrectly inside the Builder device frame.
  2. `HeroMedia`'s `sm:object-*` alignment classes share the same risk.
  3. The hero (now `@sm:`/`@lg:`) renders base-only in the onboarding
     `ConstructionPreview`, which lacks a `@container` ancestor.
- The divergence mechanism is **empirically proven** (see ROOT CAUSE): a
  `sm:grid-cols-2` element renders 1 column live at 375px but 2 columns inside
  the Builder mobile frame.

## ROOT CAUSE

The Builder device frame is a **scaled `div`** (`width: 375/768/1200` +
`transform: scale()`), not a real viewport. Tailwind viewport media queries
(`sm:`, `lg:`, …) evaluate against the **outer browser window** (1500px), so any
viewport-prefixed class inside the frame selects the layout for 1500px, not for
the frame width.

Empirical proof (runtime DOM probe, injected element `grid grid-cols-1 sm:grid-cols-2`):

| context | window width | frame width | columns |
|---|---|---|---|
| Live storefront @ 375px | 375 | — | **1** (`sm:` inactive) |
| Builder mobile frame @ 375px | 1500 | 375 | **2** (`sm:` active) |

The hero was fixed (RCCF-02) by moving its breakpoints to **container queries**
(`@sm:`/`@lg:` + a `@container` ancestor on live `<main>` and the Builder frame).
The sections below still use raw viewport breakpoints, so the same defect class
applies to them whenever a creator adds them.

## BREAKPOINT AUDIT

Scope: every component rendered inside the Builder device frame
(`ExperienceSection` → `ComponentRenderer` → registry renderer → shared
primitive), plus the live-only storefront shell, and builder chrome.

| Area | Breakpoint usage | Classification | Builder risk | Evidence |
|------|------------------|----------------|--------------|----------|
| Hero layout (`renderers.tsx:117-184`) | `@sm:aspect-[16/8]`, `@sm:-mt-[24%]`, `@sm:pb-20`, `@sm:h-36/w-36`, `@sm:text-4xl`, `@lg:text-5xl`, `@sm:text-2xl` | **C** (container-aware) | None | Probe: Builder mobile frame == Live 375 (RCCF-02); mechanism proof |
| Hero media alignment (`HeroMedia.tsx:17-21,32`) | `sm:object-top/center/bottom` via `responsiveAlignmentClass` | **B** (Builder-risk, latent) | Medium — diverges only when desktop alignment ≠ mobile alignment | Static; same mechanism as grid proof |
| Pricing (`renderers.tsx:635`) | `sm:grid-cols-2 lg:grid-cols-3` | **B** | High — 2 cols in mobile frame vs 1 col live | Static + mechanism proof |
| Courses (`renderers.tsx:671`) | `sm:grid-cols-2 lg:grid-cols-3` | **B** | High | Static + mechanism proof |
| Services (`renderers.tsx:720`) | `sm:grid-cols-2 lg:grid-cols-3` | **B** | High | Static + mechanism proof |
| Games (`renderers.tsx:906`) | `sm:grid-cols-2 lg:grid-cols-3` | **B** | High | Static + mechanism proof |
| ContentFeed (`renderers.tsx:944`) | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` | **B** | High — 3 cols in frame vs 2 cols live | Static + mechanism proof |
| Gallery (`renderers.tsx:249`) | none (inline `gridTemplateColumns`) | **A/D** | None for parity (fixed cols, identical both surfaces) | Probe: 3 cols live==builder at 375/768/1200 |
| Products (`renderers.tsx:298`) | none (inline `gridTemplateColumns`) | **A/D** | None for parity (fixed cols) | Probe: 3 cols live==builder at all widths |
| Testimonials (`renderers.tsx:460`) | `sm:grid-cols-2` | **D** (inert — overridden by inline style) | None | Static (inline wins) |
| Timeline / Links / Footer / FAQ / Contact / Newsletter (`renderers.tsx`) | none | **A** | None | Static |
| Spotify / YouTube / Discord / Instagram (`renderers.tsx`) | none (fixed `grid-cols-3` Instagram) | **A** | None | Static |
| Theme runtime (`section-runtime.tsx`, `background-runtime.tsx`, `decoration-runtime.tsx`, `motion-runtime.tsx`, `divider-runtime.tsx`) | none | **A** | None | Grep: zero breakpoint classes |
| Shared primitives: `SectionHeading`, `ViewAllLink`, `CreatorImage`, `CreatorVideo`, `BuyNowButton` | none | **A** | None | Grep |
| StorefrontNav (`StorefrontNav.tsx:69,98`) | `hidden md:block` / `md:hidden` | **A** (intentional; live-only, not rendered in Builder) | None (Builder shows no nav at all — fidelity gap, not class divergence) | Grep + builder canvas has no nav |
| TrustIndicators (`TrustIndicators.tsx:41-42`) | `sm:px-6 lg:px-8`, `sm:grid-cols-2 lg:grid-cols-3` | **A** (live-only) | None | Grep |
| StorefrontPage `<main>` (`StorefrontPage.tsx:143`) | `md:pb-0`, `@container` | **A** / C | None | Static |
| Admin UI (`MediaFieldMulti`, `MediaPickerDialog`) | `sm:grid-cols-5`, `sm:grid-cols-4` | **A** (admin viewport, not in device frame) | None | Grep |
| Builder chrome (`panel.tsx:32`) | `window.innerWidth` (panel drag) | **A** (Builder UI, not section content) | None | Static |
| Responsive props (`ComponentRenderer viewport`) | builder=device; live=desktop (`data-bound.tsx:14` default) | **B** (latent) | None today (no config stores responsive objects) | Grep: `setValue` has no callers |
| Global CSS (`globals.css:55`) | `@media (prefers-reduced-motion: reduce)` only | **A** | None | Grep |
| Responsive hooks (`useMediaQuery`/`useViewport`/etc.) | none exist | **A** | None | Grep |

## CONFIRMED AFFECTED SECTIONS

Sections with a confirmed Builder/live divergence (or guaranteed divergence if
added) — all share the identical proven mechanism:

1. **Pricing** — `sm:grid-cols-2 lg:grid-cols-3` (no inline override)
2. **Courses** — `sm:grid-cols-2 lg:grid-cols-3`
3. **Services** — `sm:grid-cols-2 lg:grid-cols-3`
4. **Games** — `sm:grid-cols-2 lg:grid-cols-3`
5. **ContentFeed** — `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`
6. **Hero media alignment** (shared primitive) — `sm:object-*`; latent
   (only visible when video/image desktop alignment differs from mobile).
7. **Hero in `ConstructionPreview`** — RCCF-02 side-effect: the hero's `@sm:`/
   `@lg:` have no `@container` ancestor on the onboarding preview, so it renders
   base (mobile) layout there even on desktop.

Note: no current production storefront uses items 1-5 on its home page, so the
divergence is not yet visible on any live site — but it is guaranteed at the
code level for any creator who adds them.

## SAFE SECTIONS

Should NOT be migrated to container queries:

- **Gallery, Products** — no viewport classes (inline `gridTemplateColumns`).
  (Separate, non-parity observation: they are not responsive to breakpoints at
  all — fixed `columns` prop — but Builder and Live render identically.)
- **Testimonials** — `sm:grid-cols-2` is inert (inline override wins).
- **Timeline, Links, Footer, FAQ, Contact, Newsletter** — no breakpoints.
- **Spotify, YouTube, Discord, Instagram** — no responsive grids.
- **StorefrontNav, TrustIndicators** — live-only shell; intentionally respond to
  the real browser viewport and are never rendered inside the device frame.
- **Admin UI, builder chrome** — rendered at the admin/window viewport.

## SHARED ROOT CAUSES

1. **Scaled-div device frame** — the Builder frame is not a viewport, so
   Tailwind viewport media queries evaluate against the outer window. This is
   the single architectural cause of every divergence.
2. **Viewport classes emitted directly in section renderers** — 5 renderers in
   `renderers.tsx` hard-code `sm:`/`lg:` grid classes. There is **no shared grid
   primitive** to fix; the classes are inline per renderer.
3. **`HeroMedia` shared primitive** emits `sm:object-*` alignment classes — a
   single shared helper (`responsiveAlignmentClass`) is the highest layer for
   the hero alignment risk.
4. **Latent responsive-prop divergence** — `ComponentRenderer` resolves the
   `viewport` prop (builder=device, live=desktop) via `responsiveResolver`; no
   config currently stores responsive objects, so this is dormant.
5. **No `@container` at every render surface** — `ConstructionPreview` renders
   sections outside any container, breaking container variants there.

## RECOMMENDED ARCHITECTURE

Establish the **`@container` boundary as the single responsive root for
storefront sections** (extend the RCCF-02 pattern, do not invent a new one):

1. Keep `@container` on live `<main>` (container width == viewport) and the
   Builder device frame (container width == 375/768/1200). This already makes
   `@sm:`/`@lg:` behave like `sm:`/`lg:` on live and like the frame width in the
   Builder — proven by the hero.
2. Convert ONLY the confirmed Builder-risk classes to container variants:
   - The 5 grids in `renderers.tsx`: `sm:grid-cols-2 lg:grid-cols-3` →
     `@sm:grid-cols-2 @lg:grid-cols-3` (ContentFeed likewise → `@sm:grid-cols-3
     @lg:grid-cols-4`).
   - `HeroMedia.desktopObjectClasses`: `sm:object-*` → `@sm:object-*`.
3. Add a `@container` ancestor to the **onboarding `ConstructionPreview`**
   section wrapper so converted variants keep desktop behavior there (and fix
   the existing hero base-only rendering there).
4. Use **named containers** (`@container/main` on both roots, variants written
   `@sm/main:…` / `@lg/main:…`) so any future nested `@container` cannot
   capture the nearest-container lookup.
5. `containers` theme already mirrors the screen breakpoints (640/768/1024/…)
   — no Tailwind config change needed.

Do NOT: create a shared grid primitive, use an iframe device frame, add JS
viewport detection, or convert safe/live-only components. The container-query
boundary is the smallest reusable architecture and requires only mechanical
class swaps at the confirmed sites.

## IMPLEMENTATION SCOPE

Files/components that would need modification in the next RCCF implementation
(not modified now):

- `src/lib/registry/components/renderers.tsx` — convert grid classes:
  PricingRenderer (L635), CoursesRenderer (L671), ServicesRenderer (L720),
  GamesRenderer (L906), ContentFeedRenderer (L944). Optional: delete the inert
  `sm:grid-cols-2` on TestimonialsRenderer (L460).
- `src/components/shared/HeroMedia.tsx` — `desktopObjectClasses` → `@sm:object-*`
  (3 lines); no signature change (`responsiveAlignmentClass` callers unchanged).
- `src/features/onboarding/components/construction-preview.tsx` — add
  `@container/main` to the wrapper around `ComponentRenderer` (L136-147) so
  container variants (incl. the already-converted hero) render desktop layouts.
- Optional hardening (same PR): name the containers on `StorefrontPage.tsx`
  `<main>` and `interactive-canvas.tsx` frame as `@container/main`, and update
  the hero's `@sm:`/`@lg:` to `@sm/main:`/`@lg/main:`.
- No change: `StorefrontNav.tsx`, `TrustIndicators.tsx`, admin UI, builder
  chrome, theme runtime.

## RISKS

- **Missing `@container` ancestor ⇒ silent base-only rendering.** Any surface
  that renders a converted section without a container ancestor will always show
  mobile layout. Verified real case: hero in `ConstructionPreview` today.
- **Nearest-container capture.** A future nested `@container` inside a section
  would hijack the variants; named containers mitigate.
- **Builder frame `p-4` content padding** makes in-frame content ~32px narrower
  than the device width (cosmetic geometry, does not affect breakpoint
  selection which uses the frame width).
- **Live behavior must stay identical** — conversion is only safe for components
  that render exclusively inside `@container` ancestors (all storefront sections
  render via `StorefrontPage <main>`; verified).
- **`@sm:`/`@lg:` never match when there is no container** — if a section is
  ever reused by an admin/template preview without a container, desktop styling
  silently disappears (low likelihood today: `SectionRenderer` is unused).

## REMAINING UNKNOWNS

- The 5 grid sections have no production storefront using them, so Builder-vs-
  Live divergence for them could not be observed end-to-end — only the shared
  mechanism was proven. Verification in the next RCCF should add the sections to
  a scratch site or unit-render them.
- Whether `ConstructionPreview` actually reveals hero sections in real onboarding
  flows (data-dependent) — the base-only rendering is code-guaranteed if it does.
- No `xl:`/`2xl:` usage exists anywhere in storefront renderers today; future
  sections using them face the same mechanism.
- Whether any creator config will ever store responsive-object props (the
  `responsiveResolver` viewport path) — dormant today; if used, live (desktop-
  resolved) would diverge from Builder (device-resolved).

## GIT STATUS

`git status` — clean (matches committed `28c0466` RCCF-RESPONSIVE-02). Audit
created and removed transient probes only (`probe-audit*.spec.ts`,
`playwright.probe-audit.config.ts`, `scripts/_audit-*.ts`); no source files were
modified and nothing was committed.
