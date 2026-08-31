# RCCF-71.2 — Growth Theme Experience

Scope ticket for exposing the EXISTING Theme Experience capabilities and
controlled Growth typography through the Builder, over the canonical RCCF-71.1
foundation. No second theme model, no Builder-only CSS, no plan/capability
changes. Hero presentation (audit Priority 2) is intentionally deferred to the
dedicated RCCF-71.3 ticket.

## Capabilities implemented

### Priority 1 — Theme Visual Experience (existing runtime)
- **Background preset** — a creator pins one of 8 background presets that the
  `ExperienceBackground` runtime already renders: `solid`, `none`, `midnight`
  (solid + centered glow), `gradient`, `radial`, `mesh`, `aurora`, `pattern`.
  No new CSS; every preset maps to an existing `ExperienceBackgroundKind`.
- **Surface preset** — a creator pins one of 9 surfaces that `surfaceClass`
  already renders: `flat`, `minimal`, `elevated` (free) + `glass`, `soft-glow`,
  `gradient-border`, `floating`, `luxury`, `neon` (premium).

### Priority 3 — Typography (canonical snapshot/runtime)
- **Font selection** — heading/body font (Geist / Inter / IBM Plex / JetBrains
  Mono) reuses the existing `themeFonts` → `FONT_MAP` → `--brand-font-*`
  pipeline (RCCF-71.1). The Builder panel persists the chosen key through the
  shared `updateTheme` action.
- **Heading weight** — controlled heading weight (`500`/`600`/`700`/`800`)
  threaded additively through `Website.themeConfig.headingWeight` →
  `ResolvedSnapshotTheme.typography.headingWeight` → `ThemeSnapshot` →
  LayoutEngine `--brand-font-weight-heading` → renderers. The hero `h1` and
  `SectionHeading` `h2` consume `font-[var(--brand-font-weight-heading,700)]`,
  so old snapshots render unchanged (700 fallback) and the `font-semibold`
  subtitle hierarchy is preserved (only the bold heading spots respond).

## Exact persistence path
```
Builder AppearancePanel
  → updateTheme(tenantId, { experienceBackground | experienceSurface | headingWeight | font })   (src/actions/theme.actions.ts)
  → Website.themeConfig JSON  (experienceBackground / experienceSurface / headingWeight)
  → Website.themeFonts        (font → FONT_MAP → heading/body)
  → publishingService.markChangesPending  (snapshot flagged stale)
```
`updateTheme` is the single entry point. It:
1. gates the whole appearance surface on the canonical `premium_themes`
   entitlement (Launch → rejected),
2. validates `experienceBackground` / `experienceSurface` against the existing
   `BACKGROUND_PRESETS` / `SURFACE_PRESETS` registries and `headingWeight`
   against `HEADING_WEIGHT_VALUES` — unknown values are ignored (never stored),
3. writes into the EXISTING `Website.themeConfig` / `Website.themeFonts`
   columns (no schema change, no new model).

## Exact snapshot path
```
buildRuntimeSnapshot(input)                               (src/lib/storefront/build-snapshot.ts)
  ├─ themeConfig.headingWeight → overrides.typography.headingWeight
  ├─ themeResolver.resolveForSnapshot(...)                (src/lib/theme/resolver-new.ts)
  │     → ResolvedSnapshotTheme.typography.headingWeight
  └─ snapshot.theme.typography.headingWeight              (src/types/snapshot.ts, additive optional)

LayoutEngine.buildTheme(snapshot)                         (src/lib/storefront/layout-engine/LayoutEngine.ts)
  → "--brand-font-weight-heading": t.headingWeight        (emitted only when present)

renderers.tsx  hero h1 + SectionHeading h2
  → font-[var(--brand-font-weight-heading,700)]           (700 fallback for old snapshots)
```
The experience (background/surface) is NOT a `ThemeSnapshot` field — it is
baked into `snapshot.renderingHints.experience` at publish and (now) at
preview, exactly as RCCF-02 established.

## Builder → runtime mapping (experience override)
The override is applied to the theme's resolved base experience BEFORE
capability resolution, at all THREE rendering sites:

1. **Publish** (`src/lib/publishing/service.ts`)
   `applyExperienceOverride(base, websiteFull.themeConfig)`
   → `resolveExperienceForCapabilities(overridden, activePlan)`
   → baked into `snapshot.renderingHints.experience`.
2. **Preview route** (`src/lib/storefront/storefront-loader.ts`)
   `applyExperienceOverride(base, website.themeConfig)`
   → `resolveExperienceForCapabilities(overridden, livePlan)`
   → baked into the preview `snapshot.renderingHints.experience`.
3. **Builder canvas** (`src/features/builder/canvas/interactive-canvas.tsx`)
   `applyExperienceOverride(base, themeConfig)` (client state from
   `getLivePreviewData`) → `resolveExperienceForCapabilities(overridden,
   previewPlanCode)`.

`applyExperienceOverride` (`src/modules/theme/runtime/experience/experience-overrides.ts`)
is the single override entry point: it pins the chosen background/surface onto
the base experience and, when a page background is chosen, drops per-section
`background` overrides so the preset wins everywhere (surface/decoration/
motion/divider character is preserved). It is a pure, dependency-free module
(type-only imports) so both the server pipeline and the Builder client panel
can import it without pulling the capability runtime into the client bundle.

`StorefrontPage.tsx` now prefers the baked experience in BOTH published and
preview paths (`bakedExperience ?? resolveExperienceForCapabilities(base,
plan)`), so the storefront performs zero plan/billing reads at render time and
old snapshots fall back to the safe minimal look.

## Tier / capability behavior
- **Launch** — the whole appearance surface is locked: `updateTheme` rejects
  with the canonical `premium_themes` gate; the Builder panel renders a locked
  card with a plain-language explanation and an upgrade link to `/admin/billing`.
- **Growth** — all controls exposed. A premium preset the plan cannot fully
  render is still gracefully downgraded by `resolveExperienceForCapabilities`
  (e.g. a free plan degrades `aurora` → `solid`, `glass` → `flat`; a Growth
  plan preserves `aurora` + `glass`). The Capability Runtime remains the single
  visual authority — no client-side plan comparison.
- **Scale** — preserved (every Growth control is available; Scale keeps its
  existing advanced themes/experiences on top).

Locked state is driven by the SERVER-derived `capabilities.premiumThemes` flag
computed in `getBuilderOverview` via `entitlementService.has(planCode,
"premium_themes")`. The panel never compares plan strings client-side.

## Preview / live parity evidence
- The Builder canvas resolves the experience with the SAME
  `applyExperienceOverride` + `resolveExperienceForCapabilities` rule as the
  preview loader and publish, keyed on the SAME `Website.themeConfig` /
  `planCode` (`getLivePreviewData`).
- After an appearance change, the panel emits `appearance:changed`; the canvas
  subscribes and refetches `getLivePreviewData`, so the preview reflects the
  persisted appearance exactly like the preview route and publish.
- `themeConfig`/`themeFonts`/`headingWeight` thread through the SAME
  `themeResolver.resolveForSnapshot` overrides in `buildRuntimeSnapshot`
  (server) and the canvas (client) — the RCCF-71.1 parity rule is preserved.
- Storefront main and the Builder canvas both carry `.theme-root` +
  `@container/main`, so the canonical `--brand-*` / `--brand-font-weight-heading`
  vars apply identically.

## Responsive verification
- The Builder device frame widths are unchanged (`mobile: 375`, `tablet: 768`,
  `desktop: 1200`) and the canvas keeps the `@container/main` boundary, so
  container-query breakpoints (`@sm/main:` / `@lg/main:`) respond to the FRAME
  width — the mobile frame renders the same base classes as the live 375px
  storefront.
- The right properties rail stays at the frozen `defaultWidth={260}`; the
  appearance panel chips use `flex-wrap` so they never overflow the rail at
  320/375/390.
- No new fixed pixel widths were introduced; horizontal overflow is unchanged.
- Guardrails: `tests/unit/rccf71-2-growth-theme-experience.test.ts` asserts the
  frame widths, the rail width, the wrapping chips, the `@container/main`
  breakpoints, and that both surfaces carry `.theme-root`.

## Tests
`tests/unit/rccf71-2-growth-theme-experience.test.ts` — 61 guardrails:
- background preset: override behavior, per-section drop, runtime-kind
  coverage, bake/preview/canvas/StorefrontPage threading, old-snapshot
  fallback, free vs Growth capability resolution, validation, no-parallel-model.
- surface preset: override behavior, runtime-surface coverage, free vs Growth
  resolution, validation, no-op safety, single-authority export, no plan codes,
  no plan/tier/quota in the pipeline, premium gate ordering, schema version.
- font selection: `FONT_MAP` persistence, LayoutEngine var emission, canvas
  resolver overrides, snapshot parity, shared options module, no plan codes,
  gate ordering, server-derived overview value.
- heading weight: snapshot baking, LayoutEngine emission, old-snapshot fallback,
  resolver ownership, canvas threading, renderer var consumption (no hardcoded
  `font-bold` on the two heading spots), additive `ThemeSnapshot` field,
  validation, gate ordering, no plan codes, panel surfacing.
- Builder UX: locked-from-server-prop, canonical `updateTheme` persistence,
  `appearance:changed` emit + canvas subscription, event-bus declaration,
  overview capability derivation, panel rendering guard, tenantId threading.
- responsive: frame widths, rail width, wrapping chips, `@container/main`
  breakpoints, both surfaces carry `.theme-root`.
- single authority: presets in the experience module, single override helper
  used by all three sites, persistence into the existing `Website.themeConfig`
  JSON, panel does not duplicate hero content (Builder = presentation only).

## Verification gate (all green)
- `npx tsc --noEmit` — clean.
- `npx vitest run tests/unit/rccf71-1-canonical-theme-foundation.test.ts
   tests/unit/rccf71-2-growth-theme-experience.test.ts` — 86 passed.
- `npx vitest run` (full suite) — 3404 passed / 0 failed (223 files). The
  previously-noted `rccf68-retry-catalog-timeout` flake held this run.
- `npm run build` — green; full route table produced.
- `npx prisma validate` — schema valid.
- `npx prisma generate` — Prisma Client generated.
- `npx eslint <touched files>` — 0 errors (5 pre-existing warnings, none from
  71.2: unused imports `LayoutSnapshot` / `runWorkflow` / `CreatorVideo` and
  two pre-existing `react-hooks/exhaustive-deps` warnings in `workspace.tsx`).
- `git diff --check` — no whitespace errors (only a pre-existing CRLF notice on
  `src/lib/observability/runtime-parity.ts`, a file 71.2 did not touch).

## Files changed (71.2)
New:
- `src/lib/theme/font-options.ts` — shared font + heading-weight option sets.
- `src/modules/theme/runtime/experience/experience-overrides.ts` —
  `BACKGROUND_PRESETS`, `SURFACE_PRESETS`, `applyExperienceOverride` (pure).
- `src/features/builder/components/appearance-panel.tsx` — Builder appearance UI.
- `tests/unit/rccf71-2-growth-theme-experience.test.ts` — 61 guardrails.

Edited (additive, no frozen surface touched):
- `src/modules/theme/runtime/experience/index.ts` — re-export presets + helper.
- `src/actions/theme.actions.ts` — accept/validate the new overrides; shared
  `FONT_MAP`; new controls persist behind the existing `premium_themes` gate.
- `src/lib/theme/resolver-new.ts` — `typography.headingWeight` override.
- `src/lib/storefront/build-snapshot.ts` — thread `headingWeight` through the
  resolver; emit into `snapshot.theme.typography`.
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — emit
  `--brand-font-weight-heading` when present.
- `src/types/snapshot.ts` — `ThemeSnapshot.typography.headingWeight?` (additive).
- `src/lib/publishing/service.ts` — apply override before capability resolution.
- `src/lib/storefront/storefront-loader.ts` — bake override-applied experience
  into the preview snapshot.
- `src/components/storefront/StorefrontPage.tsx` — prefer baked experience in
  both paths.
- `src/features/builder/canvas/interactive-canvas.tsx` — apply override; thread
  `headingWeight`; subscribe to `appearance:changed`.
- `src/lib/builder/events/types.ts` — `appearance:changed` event type + payload.
- `src/lib/registry/components/renderers.tsx` — hero `h1` + `SectionHeading`
  `h2` consume `font-[var(--brand-font-weight-heading,700)]`.
- `src/actions/builder-overview.actions.ts` — return `appearance` current values
  + server-derived `capabilities.premiumThemes`.
- `src/features/builder/components/website-panel.tsx` — render `AppearancePanel`.
- `src/features/builder/components/properties.tsx` — thread `tenantId`.
- `src/features/builder/components/workspace.tsx` — pass `tenantId` to the
  properties rail (desktop + mobile).

## Frozen surfaces (verified untouched)
- Prisma schema / migrations (no schema change; override keys persist into the
  existing `Website.themeConfig` JSON column).
- Billing / Razorpay, plan definitions, capability authority internals
  (`capabilityService`, `BACKGROUND_KIND_CAP`, `resolveExperienceForCapabilities`
  unchanged).
- Auth, tenant resolution, publishing business logic, snapshot immutability.
- Builder content authority, Hero content ownership (`hero_data` / Settings) —
  the appearance panel imports none of `@/config/hero` / `settings.actions` and
  never touches hero content fields.
- `ThemeSnapshot` schema version remains `1` (additive optional fields only).

## Deferred capabilities (documented, not implemented)
- **Hero presentation (audit Priority 2)** — text alignment, vertical
  composition, hero overlay strength/color, hero background/image positioning.
  Deferred to the dedicated RCCF-71.3 Hero Presentation ticket per the agreed
  sequence. Hero content remains in `hero_data` / Settings (Builder = visual
  presentation only).
- **Background image / background opacity / image positioning & focal point** —
  `ExperienceBackground` has no `image` kind and no opacity field; the runtime
  cannot represent these today. Documented as deferred rather than inventing a
  parallel model (capability inspection rule).
- **Theme-level overlay color / opacity / intensity** — the experience model
  exposes only a per-section `heroBlend` boolean; there is no theme-level
  overlay field. Deferred (not safely representable in the existing runtime).
- **Type scale (`baseSize` / `scaleRatio`)** — renderers hardcode `text-3xl` /
  `text-2xl` / `text-xl` sizes; a controllable type scale is not safely
  projectable without a renderer-wide heading-size system. Deferred.
- **Custom gradient-stop editing** — deferred per the explicit user product
  decision (Growth exposes existing preset experiences only).
- **Heading weight beyond the two canonical heading spots** — limited to the
  hero `h1` and `SectionHeading` `h2` (the `font-bold` heading spots) so the
  `font-semibold` subtitle hierarchy and per-renderer heading variation are
  preserved. A broader heading-weight system would require a renderer heading
  refactor; deferred.

## Risks
- **Override vs per-section theme character.** When a creator pins a page
  background, per-section `background` overrides are dropped so the preset wins
  everywhere; decoration/motion/divider/surface section character is preserved.
  This is the intended semantic (the creator explicitly chose the page
  background) and is documented in `applyExperienceOverride`.
- **`appearance:changed` refetch.** The canvas refetches `getLivePreviewData`
  (the same aggregate the storefront uses) on the event; under rapid changes
  this is debounced only by `useTransition`. The aggregate is already the
  canvas's existing refetch path, so the cost is unchanged from a focus refetch.
- **Preview plan resolution moved earlier.** The preview loader now resolves
  the live plan and bakes the experience, so `StorefrontPage` preview no longer
  reads the plan at render. This is functionally equivalent (server request)
  and strengthens preview→publish parity; old preview snapshots without a baked
  experience fall back to the live-plan resolution.

RCCF-71.2 complete. Verdict: A — READY FOR NEXT PHASE (RCCF-71.3 Hero Presentation).