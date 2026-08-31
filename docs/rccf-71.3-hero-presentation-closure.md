# RCCF-71.3 — Hero Presentation

Scope ticket for the Hero presentation presets identified by the
`docs/rccf-71.3-hero-presentation-audit.md` (verdict READY): text alignment,
content width and overlay strength (audit Priority-1 D-capabilities), plus the
background focal-point fix (audit item 6, B→A). Implemented over the canonical
runtime — Builder panel → `updateTheme` → `Website.themeConfig` →
`buildRuntimeSnapshot` / canvas merge → `snapshot.content.hero` →
`HeroRenderer`. Hero CONTENT remains `hero_data` / Settings owned; no new
capability, no Prisma/billing change, no plan strings in the client, no second
Hero authority.

## Capabilities implemented

### Hero text alignment (audit: D → implemented)
`left` / `center` / `right` via `heroTextAlignClass` — controlled preset
classes on the hero content block: `text-left mr-auto` / `text-center mx-auto`
(default, EXACTLY today's look) / `text-right ml-auto`. CTA/social rows and the
avatar keep their existing centering (no structure/layout change).

### Hero content width (audit: D → implemented)
`narrow` / `medium` / `wide` via `heroContentWidthClass` — `max-w-xl` /
`max-w-2xl` (default, EXACTLY today's look) / `max-w-3xl`. Bounded presets;
`wide` never exceeds `max-w-3xl` (no full-width hero, no overflow).

### Hero overlay strength (audit: D → implemented)
`none` / `soft` / `medium` / `strong` via `heroOverlayClass` — controlled
gradient presets with today's gradient (`bg-gradient-to-b from-black/50
via-transparent to-zinc-950`) preserved as the `medium` default/fallback.
`none` renders no overlay. No arbitrary color/opacity control (explicit
user product decision).

### Background focal point (audit: B → A fix)
The background fallback media now honors the SAVED image focal point
(`imageDesktopAlignment` / `imageMobileAlignment`) instead of the hardcoded
`object-center`. `alignment = resolvedMedia === "video" ? videoAlign :
imageAlign` — video/poster/background all respect the creator's positioning.
No new field.

## Exact persistence path
```
Builder AppearancePanel                          (src/features/builder/components/appearance-panel.tsx)
  → updateTheme(tenantId, { heroTextAlign | heroContentWidth | heroOverlay })   (src/actions/theme.actions.ts)
  → Website.themeConfig JSON  (heroTextAlign / heroContentWidth / heroOverlay)
  → publishingService.markChangesPending
```
`updateTheme` is the single entry point:
1. gates the whole appearance surface (including hero presentation) on the
   canonical `premium_themes` entitlement — the gate runs BEFORE the writes
   (Launch → rejected),
2. validates the three keys against the canonical `HERO_TEXT_ALIGN_VALUES` /
   `HERO_CONTENT_WIDTH_VALUES` / `HERO_OVERLAY_VALUES` Sets — unknown values are
   ignored (never stored, never rendered),
3. writes into the EXISTING `Website.themeConfig` JSON column (no schema
   change, no new model).

## Exact snapshot path
```
buildRuntimeSnapshot(input)                      (src/lib/storefront/build-snapshot.ts)
  ├─ applyHeroPresentation(input.aggregate.hero, input.themeConfig)      → content.hero
  └─ applyHeroPresentation(input.homepageAggregate.hero, ...)            → homepageContent.hero
      (pure rule from src/lib/hero/presentation-options.ts — valid keys only,
       content fields NEVER touched)

LayoutEngine.composeSectionConfig(snapshot)      (src/lib/storefront/layout-engine/LayoutEngine.ts)
  → Object.assign(config, content.hero)          → hero.* section config carries textAlign/contentWidth/overlay

renderers.tsx HeroRenderer
  → heroTextAlignClass(p.textAlign)   → text-left mr-auto | text-center mx-auto | text-right ml-auto
  → heroContentWidthClass(p.contentWidth) → max-w-xl | max-w-2xl | max-w-3xl
  → heroOverlayClass(p.overlay)       → gradient preset | null (none)
      (every helper falls back to the EXACT current look on undefined/unknown)
```
Snapshot `HeroContent` gains ONLY optional fields (`textAlign?`,
`contentWidth?`, `overlay?`); `_version` stays `1`. Old snapshots (fields
absent) and unknown values render exactly today's Hero appearance.

## Builder → runtime mapping (parity rule)
The SAME pure merge rule (`applyHeroPresentation` from
`src/lib/hero/presentation-options.ts`) runs on both sides of the wire:

1. **Publish** (`src/lib/publishing/service.ts`) — threads
   `themeConfig: websiteThemeConfig` into `buildRuntimeSnapshot`.
2. **Preview route** (`src/lib/storefront/storefront-loader.ts`) — threads
   `themeConfig: (website.themeConfig ?? {})` into `buildRuntimeSnapshot`.
3. **Builder canvas** (`src/features/builder/canvas/interactive-canvas.tsx`) —
   applies `applyHeroPresentation(liveContent.hero, themeConfig)` into
   `contentForRender` BEFORE `layoutEngine.resolve`.
4. **Settings preview** (`src/app/admin/settings/page.tsx` reads
   `Website.themeConfig`, normalizes via the canonical Sets → `SettingsForm` →
   `SettingsLivePreview` → canonical `HeroRenderer`).

## Parity evidence
- `publish == preview route == canvas == settings preview` all resolve the
  persisted `heroTextAlign` / `heroContentWidth` / `heroOverlay` from the single
  registry via the single merge helper (guarded by tests).
- Old snapshots (no themeConfig hero keys) keep hero content unchanged and
  render today's centered / `max-w-2xl` / current-gradient look.
- The Builder overview action returns the current values
  (`heroTextAlign: dbConfig.heroTextAlign ?? "center"`, etc.) so the panel
  re-renders selection from persisted state.

## Tier behavior
- **Launch** — `premium_themes` gate rejects the mutation; the panel renders
  LOCKED (from the server-derived `capabilities.premiumThemes` flag). No
  client-side plan/capability authority.
- **Growth / Scale** — the three controls persist and flow through the whole
  pipeline. Nothing about the presets is tier-specific beyond the existing
  premium gate; no new capability, no plan definition change.

## Tests — `tests/unit/rccf71-3-hero-presentation.test.ts` (44)
- registry + pure merge: option values, value Sets, class mappings with exact
  current defaults, overlay null-for-none, strong-overlay readability,
  literal JIT classes, `applyHeroPresentation` valid-only merge, no mutation,
  no-op on invalid/unknown, module purity (no plan codes / prisma / directives).
- snapshot baking: themeConfig merged onto `content.hero` and
  `homepageContent.hero`, invalid values never baked, old-snapshot compat
  (content untouched), LayoutEngine `Object.assign` composition carries the
  presets, schema stays version 1 with optional-only fields.
- `updateTheme`: validation of all three keys, persistence into
  `themeConfig`, premium gate ordering BEFORE the writes, no hero_data
  authority import.
- renderer: resolves through the shared helpers, hardcoded centered wrapper and
  fixed overlay gone, background focal fix (B→A) in place.
- parity: publish + preview route thread themeConfig, canvas merges via
  `applyHeroPresentation`, settings page/form/preview thread the persisted
  values, overview + panel + website-panel wiring.
- frozen surfaces: `settings.actions` gains NO presentation fields, snapshot
  builder imports no `@/config/hero`, `presentation-options` is the single
  merge authority imported by every consumer, no plan codes in the new client
  surfaces, `_version: 1` unchanged.
- responsive: canvas frame widths (375/768/1200), settings preview
  `@container/main` (320/1024), wrapping chips, bounded content widths.

## Verification gate (all green)
- `npx tsc --noEmit` — clean (one cast fixed to `as unknown as`).
- `npx vitest run tests/unit/rccf71-1-canonical-theme-foundation.test.ts
  tests/unit/rccf71-2-growth-theme-experience.test.ts
  tests/unit/rccf71-3-hero-presentation.test.ts` — 130 passed.
- `npx vitest run` (full suite) — 3448 passed / 0 failed (224 files). (One
  unrelated flaky DB-seed test failed once on an earlier run, then passed in a
  clean full-suite rerun.)
- `npm run build` — green; full route table produced.
- `npx prisma validate` — schema valid.
- `npx prisma generate` — Prisma Client generated.
- `npx eslint <touched files>` — 0 errors (3 pre-existing warnings, none from
  71.3: unused `LayoutSnapshot` in `interactive-canvas.tsx`, unused
  `setHeroSubtitle` in `settings-form.tsx`, unused `CreatorVideo` in
  `renderers.tsx`).
- `git diff --check` — no whitespace errors (only the pre-existing CRLF notice
  on `src/lib/observability/runtime-parity.ts`, untouched by 71.3).

## Files changed (71.3)
New:
- `src/lib/hero/presentation-options.ts` — SINGLE pure registry + merge helper
  (option lists, value Sets, `heroTextAlignClass` / `heroContentWidthClass` /
  `heroOverlayClass`, `applyHeroPresentation`).
- `tests/unit/rccf71-3-hero-presentation.test.ts` — 44 guardrails.

Edited (additive, no frozen surface touched):
- `src/types/snapshot.ts` — `HeroContent.textAlign?` / `contentWidth?` /
  `overlay?` (optional only).
- `src/lib/storefront/build-snapshot.ts` — merge themeConfig hero keys onto
  `content.hero` + `homepageContent.hero` via `applyHeroPresentation`.
- `src/lib/registry/components/renderers.tsx` — HeroRenderer consumes the
  controlled presets (fallback = current look); background focal fix.
- `src/actions/theme.actions.ts` — accept/validate/persist
  `heroTextAlign` / `heroContentWidth` / `heroOverlay` behind the existing
  `premium_themes` gate.
- `src/actions/builder-overview.actions.ts` — `appearance` gains the three
  current values with defaults.
- `src/features/builder/components/appearance-panel.tsx` — three Hero
  Presentation control groups (locked state inherited).
- `src/features/builder/components/website-panel.tsx` — passes the three values.
- `src/features/builder/canvas/interactive-canvas.tsx` — applies
  `applyHeroPresentation` to `contentForRender` before resolving.
- `src/app/admin/settings/page.tsx` — reads `Website.themeConfig`, normalizes
  via the canonical Sets, passes `heroPresentation`.
- `src/features/settings/components/settings-form.tsx` — accepts + threads
  `heroPresentation` into the preview.
- `src/features/settings/components/settings-live-preview.tsx` — accepts
  `textAlign` / `contentWidth` / `overlay` and passes them into the canonical
  `HeroRenderer` props.

## Frozen surfaces (verified untouched)
- Prisma schema / migrations (no schema change; hero presentation persists into
  the existing `Website.themeConfig` JSON column).
- Billing / Razorpay, plan definitions, capability authority internals
  (`capabilityService`, `BACKGROUND_KIND_CAP`, `resolveExperienceForCapabilities`
  unchanged), `premium_themes` gate semantics.
- Auth, tenant resolution, publishing business logic, snapshot immutability
  (`_version` stays `1`).
- Hero content ownership: `src/config/hero.ts`, `src/actions/settings.actions.ts`
  (its `heroPartialSchema` still validates only the content/focal fields — no
  presentation fields added), `src/lib/media/hero-media.ts` resolver.
- Builder content authority; `HeroRenderer` structure/layout unchanged
  (presentation classes only); legacy `hero-banner.tsx` still dead code.

## Deferred capabilities (audit E items, documented — not implemented)
- **Vertical composition** (audit item 2) — avatar/identity vertical placement
  and spacing presets are not safely projectable without a Hero structure
  change; deferred.
- **Overlay color / opacity** (audit item 5) — explicit user product decision:
  Growth exposes controlled overlay STRENGTH presets only; no arbitrary
  color/opacity control.
- **Background image controls** (upload/positioning UI beyond the existing
  focal fields) — the background fallback now honors the existing image focal
  point; new background image management is out of scope for Hero presentation.

## Risks
- **CTA/social rows stay centered when text is left/right aligned.** The
  content-block alignment changes text classes and block anchoring only; the
  avatar, live badge and CTA/social flex rows keep their existing centering
  (structure/layout preserved by design). Documented behavior, not a defect.
- **Tailwind JIT emission.** Preset classes are literal strings in
  `presentation-options.ts`, so JIT emits them wherever the module is bundled;
  guarded by a test that the literals are present verbatim.
- **Settings preview reads fresh themeConfig per page load.** The settings page
  is `force-dynamic` and reads `Website.themeConfig` directly, so a creator
  must reload the settings page to see Builder-persisted hero presentation —
  consistent with the existing settings (content) save model.

RCCF-71.3 complete. Verdict: A — READY FOR NEXT PHASE (vertical composition /
overlay color & opacity remain deferred per the audit's E-track).