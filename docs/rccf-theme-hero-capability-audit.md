# RCCF Theme & Hero Capability Audit

**Scope:** read-only audit of the existing repository.
**Implementation status:** no application code, plans, billing, capabilities, or publishing code was modified.
**Audit date:** 2026-08-17

## Executive Verdict

CreatorStore already has a credible end-to-end runtime for:

- Theme package selection and persistence.
- Theme token resolution for colors, surfaces, borders, buttons, and fonts.
- Preset gradient/mesh/pattern experiences with capability-based fallback.
- Hero media precedence, asset-backed media persistence, focal-point controls,
  identity, CTA, social links, and published snapshot delivery.
- Builder canvas and storefront rendering through the same LayoutEngine and
  registry renderer path.

The current Growth value is **not yet fully exposed through the Builder**. The
Builder primarily exposes theme-package preview/apply. Granular color, font,
radius, and density controls live in `/admin/appearance`; Hero controls live in
`/admin/settings`. Several of those controls are only partially connected to
the canonical runtime:

- `themeConfig.borderRadius` and `themeConfig.layoutDensity` persist, but the
  canonical snapshot builder does not read them.
- Theme token typography hierarchy, spacing, radius, elevation, and overlay
  fields exist in the theme definition, but the published `ThemeSnapshot`
  carries only a reduced color/font subset.
- The Appearance preview is a simplified `PreviewShell`, not the canonical
  Hero/Builder/storefront runtime.
- Theme Experience supports preset backgrounds/effects, but not creator-selected
  background images, background opacity, overlay strength, or per-section visual
  editing.
- Hero media and content are strong, but Hero overlay and horizontal text
  alignment are fixed rather than configurable.

**THEME AUDIT VERDICT: READY FOR IMPLEMENTATION**

The architecture is usable and has a clear single-runtime path. Implementation
should extend the existing authorities rather than introduce a second theme
model. The first implementation phase should close the proven persistence and
runtime gaps before adding new visual controls.

## 1. Current Theme Architecture

### 1.1 Theme definition authority

The current theme catalog is the new registry system:

```text
src/lib/theme/types-new.ts
  ThemeDefinition
    -> ThemeVariant
      -> ThemeDesignTokens
        -> colors, typography, spacing, motion, radius, elevation, borders

src/lib/theme/themes/index.ts
  createTheme() + built-in category theme modules
    -> src/lib/theme/providers/built-in.ts
      -> src/lib/theme/registry-new.ts
```

`ThemeDefinition` supports theme metadata, tier, variants, color tokens,
typography, spacing, motion, radius, elevation, borders, dark/light mode, and
marketplace metadata. The token model is richer than the current published
snapshot model.

There is also a legacy parallel preset system:

- `src/lib/theme/presets.ts`
- `src/lib/theme/service.ts`
- `src/lib/theme/index.ts`

That system is explicitly deprecated, but `updateTheme()` and the Appearance
surface still use parts of its shape (`primary`, `secondary`, `accent`, `font`,
`borderRadius`, `layoutDensity`). This is an architectural risk because the
new ThemeRegistry is canonical for package identity while legacy preset-shaped
objects still carry customization persistence.

### 1.2 Theme persistence

The Prisma `Website` record stores:

- `themePackageId`: selected canonical theme package.
- `themeColors`: JSON overrides.
- `themeFonts`: JSON overrides.
- `themeConfig`: JSON legacy/configuration values.

Relevant persistence paths:

- `src/actions/theme.actions.ts:80-118` — `applyThemePackage()` validates
  tenant authority, normalizes package ID, enforces theme tier, writes
  `Website.themePackageId`, and marks publishing changes pending.
- `src/actions/theme.actions.ts:22-78` — `updateTheme()` validates Growth+
  `premium_themes`, merges primary/secondary/accent into `themeColors`, maps a
  small font set into `themeFonts`, and writes `borderRadius` and
  `layoutDensity` into `themeConfig`.
- `src/modules/tenant/infrastructure/website-repository.ts:63-75` — generic
  theme update persistence.
- `src/services/settings.service.ts:118-147` — deprecated JSONB `theme_config`
  Setting path; separate from `Website.themeConfig`.

### 1.3 Theme runtime resolution

The canonical new resolver is:

```text
Website.themePackageId + themeColors + themeFonts
  -> buildRuntimeSnapshot()
    -> themeResolver.resolveForSnapshot()
      -> ThemeRegistry + selected light/dark variant + supported overrides
        -> PublishedSnapshot.theme
          -> LayoutEngine.buildTheme()
            -> CSS custom properties on storefront <main>
```

`src/lib/theme/resolver-new.ts` resolves package IDs, legacy slugs, variants,
fallbacks, and a reduced override object. It currently accepts color overrides
for primary, secondary, accent, background, foreground, muted, and typography
heading/body overrides.

`src/lib/storefront/layout-engine/LayoutEngine.ts:39-83` turns the reduced
snapshot theme into runtime variables including:

- Brand primary, secondary, accent.
- Root/base/card surfaces.
- Border and text colors.
- Primary/secondary/ghost/danger button tokens.
- Status/focus colors.
- Heading/body/mono/display font variables.

### 1.4 Theme Experience layer

`src/modules/theme/runtime/experience/` is a second layer above base theme
tokens, but it is not a second theme authority. It resolves visual experience
from the selected theme ID/category:

- `experience-registry.ts` maps explicit theme IDs or categories to named
  experiences.
- `theme-experience.ts` defines preset background kinds, decorations, motion,
  dividers, surfaces, hero blending, and section overrides.
- `background-runtime.tsx` renders solid, gradient, radial, multi-radial, mesh,
  aurora, and pattern treatments.
- `section-runtime.tsx` applies per-section background, decoration, surface,
  motion, divider, and hero blend.
- `capabilities.ts` filters the experience according to canonical capabilities.

This is preset-driven. It does not currently accept creator-authored background
image URLs, background opacity values, or arbitrary overlay settings.

## 2. Current Hero Architecture

Hero ownership is explicit and centralized in `src/config/hero.ts`:

```text
Setting key: hero_data
  -> SettingsService.getHeroData()/updateHeroData()/patchHeroData()
    -> WebsiteAggregateService.build()
      -> content.hero
        -> resolveHeroMediaForRuntime()
          -> LayoutEngine.composeSectionConfig() for hero.*
            -> HeroRenderer
```

### 2.1 Hero persistence and controls

`HeroDataType` supports:

- Video URL and asset ID.
- Poster URL and asset ID.
- Background image URL and asset ID.
- Creator name and profile image.
- Title, subtitle, tagline, bio.
- Primary and secondary CTA text/link.
- Live badge text/visibility.
- Social links.
- Desktop/mobile video alignment.
- Desktop/mobile image alignment.

`src/features/settings/components/settings-form.tsx` exposes these controls in
separate groups:

- Hero Video and asset-backed upload.
- Video focal point alignment.
- Hero Poster Image and focal point alignment.
- Hero Background Image upload.
- Creator identity.
- Buttons.
- Live Badge.

`src/actions/settings.actions.ts` validates the sparse payload, authenticates
against the tenant, enforces the Hero video asset boundary, writes the
`hero_data` JSONB setting, logs the action, and marks content changes pending.

### 2.2 Hero aggregate and media resolution

`WebsiteAggregateService` reads `hero_data`, maps it to `content.hero`, then
attaches the deterministic resolved media fields. The media precedence is:

1. Video URL -> `resolvedMedia: "video"`.
2. Poster URL -> `resolvedMedia: "image"`.
3. Background URL -> `resolvedMedia: "background"`.
4. Nothing -> `resolvedMedia: "placeholder"`.

`HeroRenderer` is prohibited from reading raw media URLs and consumes only the
resolved fields. This is a strong architecture boundary.

### 2.3 Hero rendering

`src/lib/registry/components/renderers.tsx:96-270` is the canonical Hero
renderer used by both Builder and storefront. It renders:

- Responsive media frame.
- Video with poster and one-play behavior.
- Poster/background image fallback.
- Fixed dark gradient media overlay.
- Profile image overlap.
- Live badge.
- Name, title, tagline, bio/subtitle.
- Primary and secondary CTA.
- Social links.
- Container-query responsive typography and overlap behavior.

The Hero is also reused by:

- `src/features/settings/components/settings-live-preview.tsx`.
- `src/features/builder/canvas/interactive-canvas.tsx`.
- Published storefront through `DataBoundRenderer`.

## 3. End-to-End Data Trace

### 3.1 Theme package and customization

```text
ThemeCard / AppearanceManager
  -> applyThemePackage() or updateTheme()
    -> Website.themePackageId/themeColors/themeFonts/themeConfig
      -> Builder preview reads themePackageId/themeColors/themeFonts
      -> Preview route reads same fields and buildRuntimeSnapshot()
      -> publishService.publish() reads themePackageId/themeColors/themeFonts
        -> buildRuntimeSnapshot()
          -> PublishedSnapshot.theme + renderingHints.experience
            -> getPublishedPageData()
              -> StorefrontPage
                -> LayoutEngine CSS variables + ExperienceSection
```

### 3.2 Hero

```text
SettingsForm / MediaField
  -> updateHeroData() or updateHeroPartial()
    -> Setting("hero_data")
      -> WebsiteAggregateService.build()
        -> content.hero + resolved media fields
          -> buildRuntimeSnapshot() at publish
            -> immutable PublishedSnapshot.content.hero
              -> LayoutEngine hero composition
                -> HeroRenderer
```

### 3.3 Builder draft and published output

```text
loadBuilderPages()
  -> builderStore.hydrate()
    -> BuilderStore pages/layout/config/presentation metadata
      -> builderStore.serialize()
        -> saveBuilderPages()
          -> publishWebsite()
            -> publishService.loadBuilderPages()
              -> buildRuntimeSnapshot()
                -> immutable PublishedSnapshot.layout
```

The Builder canvas resolves live aggregate content plus draft layout through the
same LayoutEngine shape and registry renderers. The published storefront reads
only the immutable snapshot, so unpublished changes do not leak to public users.

## 4. Capability Matrix

Classification key:

- **A** Fully supported and working.
- **B** Partially supported.
- **C** Builder/control exists but does not affect canonical runtime.
- **D** Runtime supports it but Builder cannot configure it.
- **E** Not supported.
- **F** Supported but incorrectly tier-gated.

| Capability | Classification | Current evidence and finding |
|---|---|---|
| 1. Theme backgrounds | **A for preset backgrounds; D for custom background authoring** | Theme Experience renders solid, gradient, mesh, radial, aurora, and pattern presets. Builder selects packages but cannot author background settings directly. |
| 2. Background images | **E for Theme Experience; A for separate Hero background image** | `ExperienceBackground` has no image kind or URL. `HeroDataType.backgroundUrl` is supported as Hero media fallback, not as a page/theme background layer. |
| 3. Background opacity | **E** | Alpha values are hardcoded in experience definitions/runtime CSS. No persisted opacity field or control exists. |
| 4. Overlays | **B** | Hero media overlay and `heroBlend` exist, but opacity/color/enablement are fixed in renderer/runtime. No creator control. |
| 5. Gradients | **A for preset experiences; D for custom gradient editing** | Experience runtime renders gradients and capability gates them. No Builder gradient stop/direction editor exists. |
| 6. Surface opacity | **B** | Glass/elevated/floating surfaces render with fixed CSS alpha/backdrop values. `ThemeDesignTokens` has surfaces but no surfaced opacity control; snapshot does not carry the full surface model. |
| 7. Hero image | **A** | Poster/image/background fallback is persisted, resolved, previewed, published, and rendered. The effective image path is poster/background rather than a fully separate configurable hero image layer. |
| 8. Hero image positioning | **A for poster/video; B for background fallback** | Desktop/mobile top/center/bottom alignment is persisted and consumed for video/poster. Background fallback uses `object-center`, not the saved image focal-point settings. |
| 9. Hero overlay | **B** | A fixed `bg-gradient-to-b from-black/50 ...` overlay is present. It is not configurable, persisted, or tier-aware as a creator setting. |
| 10. Hero text/title/subtitle | **A** | Hero settings persist identity and copy; aggregate maps them; LayoutEngine composes them; HeroRenderer publishes them. |
| 11. Hero alignment | **B** | Media focal point is configurable by desktop/mobile. Hero copy alignment is fixed to centered layout; no left/center/right control. |
| 12. Hero CTA | **A** | Primary/secondary CTA text and links persist, render in preview/live, and are inert in preview mode. |
| 13. Typography | **B** | Theme packages and Appearance support a small heading/body font set; snapshot/runtime emits font variables. Global body and many renderer classes still hardcode Inter, text sizes, and weights. |
| 14. Font hierarchy | **B** | Theme token definitions include heading weights, base size, and scale ratio, but the published snapshot omits them and renderers hardcode hierarchy. No Builder control exists. |
| 15. Brand/accent colors | **A for primary/secondary/accent** | Appearance controls persist these values; `buildRuntimeSnapshot` applies them; LayoutEngine emits CSS variables; renderers consume brand/button variables. Builder itself only selects package presets. |
| 16. Buttons | **B** | Canonical button variables exist and Hero/buttons consume them, but button radius, padding, typography, and many component-specific treatments remain hardcoded. |
| 17. Borders | **B** | Theme border color is emitted and used by many renderers. Border width/style and component-specific opacity are hardcoded; no direct control. |
| 18. Radius | **C** | Appearance has a radius slider and `updateTheme` persists `themeConfig.borderRadius`; the canonical snapshot builder ignores `themeConfig`, while published components use hardcoded `rounded-lg`/similar classes. |
| 19. Shadows | **D/E** | Runtime has fixed experience/CSS elevation and shadow styles, and token definitions include elevation. The Builder cannot configure shadows and published snapshots do not carry elevation tokens. |
| 20. Section spacing | **C** | Appearance persists `layoutDensity` and preview passes it to a simplified shell, but the canonical runtime does not read it. Section renderers use fixed padding such as `py-12`. |
| 21. Desktop/mobile responsive behavior | **A for runtime parity; B for configurability** | Builder and storefront use named container queries and responsive Hero/grid classes. Hero media alignment supports desktop/mobile; most layout behavior is fixed rather than creator-configurable. |
| 22. Theme presets | **A** | ThemeRegistry, built-in providers, categories, search, favorites, previews, tier labels, and apply flow are working. Legacy presets remain as technical debt. |
| 23. Theme persistence | **B** | Package/color/font persistence is canonical and publish-safe. `themeConfig` persists but is not included in the canonical snapshot path. Hero persistence is separate and strong. |
| 24. Preview/runtime parity | **B** | Builder canvas and settings Hero preview use canonical renderers/runtime. Appearance `PreviewShell` is a simplified mock and does not represent public Hero/storefront output. |
| 25. Published storefront parity | **B** | Applied package/colors/fonts/layout/Hero data reach immutable snapshots and public renderers. Radius, density, full token hierarchy, and custom appearance fields do not reach published output. |

## 5. Builder Control -> Runtime Mapping

| Existing control | Surface | State/persistence | Runtime effect | Audit result |
|---|---|---|---|---|
| Theme search/category/favorites | `ThemeCard` | Search/category/favorites are local browser state; theme choice is server-backed | Search/favorites do not affect storefront; apply changes `Website.themePackageId` | Useful discovery controls; favorites are local-only by design. |
| Theme preview | Builder `ThemeCard` + `BuilderWorkspace` | `previewThemeId` is client-only and excluded from save/publish | Canvas renders the selected preview package; no DB mutation | Fully useful and correctly temporary. |
| Apply theme | Builder `ThemeCard` | `applyThemePackage()` writes canonical package ID, then draft/save/publish flow handles output | Package changes canvas, preview, and future snapshot | Fully useful; server entitlement is authoritative. |
| Theme color presets | `/admin/appearance` | `updateTheme()` -> `Website.themeColors` | Primary/secondary/accent reach snapshot CSS vars | Useful, but not in Builder and not a full theme editor. |
| Custom primary/secondary/accent | `/admin/appearance` | Same as above | Public theme variables and buttons update after publish | Fully supported for these three colors. |
| Font selection | `/admin/appearance` | `themeFonts.heading/body` | Snapshot emits font vars; actual consumption is inconsistent | Partially useful; hierarchy/renderer consumption is incomplete. |
| Radius slider | `/admin/appearance` | `Website.themeConfig.borderRadius` | Appearance preview changes; canonical published runtime ignores it | Control exists but is effectively C for public output. |
| Layout density | `/admin/appearance` | `Website.themeConfig.layoutDensity` | Preview label/state changes; canonical runtime ignores it | Control exists but is C for public output. |
| Device toggle | Builder toolbar / preview surfaces | Local UI state or session persistence | Container query frame changes; renderers use responsive classes | Useful and parity-oriented. |
| Section presentation title/description | Builder properties | Builder slot config, autosaved with layout | LayoutEngine applies presentation metadata to render props | Fully supported for its narrow scope. |
| Section visibility/hide title/hide empty | Builder properties | Builder slot config, autosaved/published | LayoutEngine/section pipeline filters or changes heading | Fully supported. |
| Hero media upload | `/admin/settings` | `hero_data`, asset IDs validated server-side | Aggregate resolves media, canonical Hero renderer consumes it | Fully supported. |
| Hero media focal point | `/admin/settings` | `hero_data` desktop/mobile alignment fields | `responsiveAlignmentClass` affects media object position | Fully supported for video/poster; background fallback is limited. |
| Hero identity/copy | `/admin/settings` | `hero_data` | Aggregate -> snapshot -> HeroRenderer | Fully supported. |
| Hero CTA | `/admin/settings` | `hero_data` | HeroRenderer renders live links and inert preview spans | Fully supported. |
| Hero live badge | `/admin/settings` | `hero_data` | HeroRenderer renders badge and animation | Fully supported. |

## 6. Stitch Capability -> CreatorStore Mapping

| Stitch-style capability | CreatorStore status | Assessment |
|---|---|---|
| Opacity controls | No general persisted control | Missing. Runtime contains fixed alpha values but no creator authority. |
| Background images | Hero background image only | Partially mapped. There is no Theme Experience page-background image layer. |
| Overlay controls | Fixed Hero gradient and experience blending | Runtime concept exists; editing control is missing. |
| Hero background | Hero video/poster/background fallback | Strong media architecture, but not a separate configurable Hero background stack. |
| Hero text | Name, title, subtitle, tagline, bio | Strong and canonical. |
| Typography | Small Appearance font selector | Partial; no full hierarchy/scale/weight editor. |
| Colors | Primary/secondary/accent Appearance controls + theme packages | Strong for core brand colors. |
| Visual hierarchy | Preset renderers, section variants, fixed hierarchy | Present as authored system, not creator-configurable. |
| Responsive presentation | Container-query parity in Builder/storefront | Strong implementation; limited authoring controls. |
| Surface opacity/glass | Preset experience surfaces | Runtime-supported as named presets; no user-level values. |
| Gradient editing | Preset experience gradients | Runtime-supported; no custom stops or direction control. |
| Hero alignment | Media focal point only | Text alignment and composition controls missing. |
| Button styling | Theme-derived color variables, fixed shape/layout | Partial. Core color semantics work; shape/spacing controls do not. |
| Border/radius/shadow editing | Border color partial; radius legacy-only; shadows fixed | Partial and currently inconsistent with canonical output. |

## 7. Missing Capabilities

These capabilities are not currently supported as end-to-end, creator-editable
features:

1. Theme-level background image upload/selection.
2. Theme-level background image positioning and responsive focal points.
3. Background opacity control.
4. Overlay color, opacity, enable/disable, and per-layer ordering control.
5. Custom gradient stops, direction, and intensity.
6. Surface opacity and blur strength controls.
7. Hero overlay control.
8. Hero horizontal text alignment.
9. Hero text max-width and vertical positioning controls.
10. Full typography hierarchy: display, H1-H6, body, labels, weights, scale.
11. Published radius control.
12. Published layout density/section spacing control.
13. Published shadow/elevation token control.
14. Per-section visual overrides authored by the creator.
15. A single canonical appearance preview that uses the same full runtime as the
    Builder canvas and storefront.

## 8. Broken or Partial Capabilities

### 8.1 `borderRadius` is persisted but not published

`AppearanceManager` changes `theme.borderRadius`; `updateTheme()` writes
`Website.themeConfig.borderRadius`. `buildRuntimeSnapshot()` only receives
`themePackageId`, `themeColors`, and `themeFonts`. `ThemeSnapshot` has no radius
or config field. The public renderer therefore continues using hardcoded
`rounded-lg` and related classes.

Classification: **C**.

### 8.2 `layoutDensity` is persisted but not published

The same chain writes `themeConfig.layoutDensity`, but no canonical snapshot or
LayoutEngine path consumes it. Section padding remains fixed in renderer code.

Classification: **C**.

### 8.3 Full token definitions are reduced before publish

`ThemeDesignTokens` includes spacing, motion, radius, elevation, border width,
border style, overlay, font weights, base size, and scale ratio. The
`ResolvedSnapshotTheme`, `ThemeSnapshot`, and `buildRuntimeSnapshot()` retain
only a subset of colors and font family names. The richer token definitions are
therefore catalog metadata/runtime input, not full published theme authority.

Classification: **B/D**.

### 8.4 Appearance preview is not canonical

`AppearanceManager` renders `PreviewShell` with a placeholder avatar, text, two
bars, and one button. `PreviewShell` applies only `--accent`, `--primary`, and
`--secondary`; it does not render `HeroRenderer`, `LayoutEngine`, live content,
experience backgrounds, responsive section behavior, or published snapshot data.

The Builder canvas and `SettingsLivePreview` are much stronger: they use the
canonical renderers. The Appearance screen remains a separate simplified path.

Classification: **B**.

### 8.5 Hero background image is not a generic theme background

`backgroundUrl` is resolved as the lowest-priority Hero media fallback and then
rendered as an `<img>` with `object-center`. It is not an independently layered
background behind Hero text, and it does not receive the saved image focal-point
alignment controls.

Classification: **B**.

### 8.6 Typography variables are emitted but consumption is inconsistent

`LayoutEngine` emits `--brand-font-heading`, `--brand-font-body`, and related
variables. However, global `body` uses hardcoded Inter and renderers primarily
use Tailwind `font-bold`, `text-*`, and fixed tracking/line-height classes. The
font family control is therefore not a complete hierarchy authority.

Classification: **B**.

### 8.7 Surface and decorative effects are preset-authored, not editable

The runtime correctly resolves glass, elevated, floating, glow, decorations,
dividers, and animations. Their opacity, blur, shadow, and intensity values are
hardcoded in `globals.css` and experience runtime files. This is a product
choice, not a broken renderer, but it is not Stitch-level customization.

Classification: **D** for runtime capability; **E** for creator editing.

## 9. Growth-Tier Opportunities

The following opportunities use existing architecture and do not require a
second theme authority:

### Priority 1: close the existing persistence gaps

- Carry the existing `themeConfig` values into the canonical runtime snapshot,
  or deliberately remove the dead controls after product confirmation.
- Make radius and density affect the same LayoutEngine/renderer path used by
  Builder, preview, and storefront.
- Extend runtime token projection only with fields that already exist in
  `ThemeDesignTokens`; do not invent parallel CSS models.

### Priority 2: promote the canonical Builder as the Growth customization home

- Keep `ThemeCard` for package selection.
- Add eventual granular controls beside it using existing `BuilderWorkspace`,
  `builder-preview.actions`, `buildRuntimeSnapshot`, and server actions.
- Do not duplicate Hero ownership; Hero content remains in `hero_data` and its
  existing settings service/actions.

### Priority 3: add controlled visual layers, not arbitrary CSS

Use typed, validated fields for the existing runtime concepts:

- Background kind/image selection.
- Overlay color/opacity.
- Gradient stops/direction within safe limits.
- Surface intensity.
- Hero blend/overlay.
- Section spacing/radius presets.

These should resolve through the current Theme Experience and LayoutEngine
authorities, not through inline Builder-only rendering.

### Priority 4: replace the simplified Appearance preview

The highest-confidence parity improvement is to make Appearance preview use the
same canonical data/runtime path as Builder and storefront. This would reduce
false confidence before adding more controls.

### Tier-gating note

Current capability architecture is generally coherent:

- Creator Launch: solid background only.
- Creator Grow: gradients/images/animation/decorative effects.
- Creator Scale: video backgrounds and advanced/custom effects.

The audit did not find a proven incorrect capability grant. The main risk is
that the user-facing `Appearance` page gates the entire surface on
`premium_themes`, while granular experience capabilities are separately
resolved by `capabilityService`. Before implementation, verify whether each
future control should use `premium_themes` or its granular capability. Do not
add a new gate or change plan definitions during the UI work.

## 10. Recommended Implementation Order

1. **Canonical contract decision:** define the supported subset of
   `ThemeDesignTokens` that is allowed in the published snapshot. Resolve the
   current new-registry versus legacy-preset boundary.
2. **Fix proven dead controls:** wire `borderRadius` and `layoutDensity` through
   the existing canonical snapshot/runtime path, or remove those controls from
   the eventual scope. Do not leave misleading controls.
3. **Unify Appearance preview:** render the canonical Hero/Builder runtime with
   live aggregate data and the same theme resolution.
4. **Expose existing Growth runtime capabilities in Builder:** package
   experience preview, controlled background/effect options, and clear locked
   states based on canonical capability checks.
5. **Add Hero presentation controls:** overlay strength/color, horizontal text
   alignment, and any vertical composition controls only if they can be owned by
   Hero configuration without moving Hero data ownership.
6. **Add responsive validation:** verify 320/375/390/768/1024/1200 widths in
   Builder, settings preview, preview route, and published storefront.
7. **Run published parity tests:** compare runtime signatures and DOM/CSS token
   behavior for draft, preview, and live snapshot paths.
8. **Only then consider advanced Growth controls:** custom gradient stops,
   background image layers, surface opacity, and shadow/elevation presets.

## 11. Exact Files That Would Eventually Need Modification

This is an implementation planning list only. No files in this list were changed
by this audit.

### Theme contracts and runtime

- `src/lib/theme/types-new.ts`
- `src/lib/theme/resolver-new.ts`
- `src/types/snapshot.ts`
- `src/lib/storefront/build-snapshot.ts`
- `src/lib/storefront/layout-engine/LayoutEngine.ts`
- `src/lib/theme/tokens-new.ts` only if existing token projection needs a
  canonical helper; avoid inventing a second token layer.
- `src/modules/theme/runtime/experience/theme-experience.ts`
- `src/modules/theme/runtime/experience/capabilities.ts`
- `src/modules/theme/runtime/experience/background-runtime.tsx`
- `src/modules/theme/runtime/experience/section-runtime.tsx`
- `src/app/globals.css` for shared token-driven surfaces/radius/shadow rules.

### Persistence and server actions

- `src/actions/theme.actions.ts`
- `src/modules/tenant/infrastructure/website-repository.ts`
- `src/lib/storefront/storefront-loader.ts` if new persisted theme fields must be
  selected for preview.
- `src/lib/publishing/service.ts` only if the existing snapshot assembly needs
  an explicitly expanded input. Publishing behavior itself must remain intact.

### Builder and preview

- `src/features/builder/components/theme-card.tsx`
- `src/features/builder/components/website-panel.tsx`
- `src/features/builder/components/properties.tsx`
- `src/features/builder/components/workspace.tsx`
- `src/features/builder/canvas/interactive-canvas.tsx`
- `src/actions/builder-preview.actions.ts`
- `src/features/settings/components/settings-live-preview.tsx`
- `src/components/admin/PreviewShell.tsx` if the Appearance preview is unified.
- `src/app/admin/appearance/_components/appearance-manager.tsx`
- `src/app/admin/appearance/page.tsx`

### Hero controls and runtime

- `src/config/hero.ts`
- `src/actions/settings.actions.ts`
- `src/services/settings.service.ts`
- `src/features/settings/components/settings-form.tsx`
- `src/lib/media/hero-media.ts`
- `src/modules/tenant/application/website-aggregate.service.ts`
- `src/lib/registry/components/renderers.tsx`

### Tests

- `src/lib/storefront/layout-engine/__tests__/theme-tokens.test.ts`
- `src/lib/capabilities/__tests__/theme-capabilities.test.ts`
- `src/features/builder/__tests__/builder-store.test.ts`
- Existing Builder/theme tests under `tests/unit/`.
- New focused contract tests for snapshot inclusion, preview parity, and
  published CSS variable projection.

## 12. Frozen Files and Boundaries

The eventual implementation should not touch these architectural boundaries
unless a separate ticket explicitly authorizes it:

- Prisma schema and migrations.
- Billing plan definitions and payment/webhook logic.
- Capability authority internals and plan grants.
- Publishing business behavior, snapshot immutability, and publish metering.
- Hero ownership boundaries: do not move Hero content into Profile, Builder
  block config, or a second settings key.
- `src/lib/auth.ts`, middleware, tenant/session checks, and authentication.
- Builder content authority: Builder may own layout/presentation metadata, not
  live CMS content.
- Storefront snapshot-only rule: published pages must not read live business
  tables or reconstruct content.
- `src/actions/create.actions.ts` and canonical provisioning authority.

## 13. Risks and Regression Areas

1. **Two theme systems:** modifying legacy `ThemeService` or `ThemePresetRegistry`
   without migrating consumers can create divergent theme authorities.
2. **Dead persistence:** adding controls to `Website.themeConfig` without
   extending `buildRuntimeSnapshot` will recreate the current radius/density
   failure mode.
3. **Preview drift:** a Builder-only CSS implementation can look correct while
   the published snapshot omits the value. Every control needs a draft, preview,
   publish, reload, and live-storefront assertion.
4. **Snapshot size/backward compatibility:** expanding `ThemeSnapshot` requires
   optional fields and safe fallbacks for old snapshots.
5. **Tier fallback surprises:** capability resolution intentionally degrades
   premium experience layers to safe free output. A control must show the
   effective result, not only the requested result.
6. **Hero regression:** changing Hero media composition can break the carefully
   tested video/poster/background precedence and desktop/mobile focal points.
7. **CSS token underuse:** emitting more CSS variables does not help unless
   renderers consume them instead of hardcoded Tailwind classes.
8. **Accessibility:** opacity, overlays, gradients, and custom colors can reduce
   contrast. Enforce readable text contrast and visible focus states.
9. **Responsive regressions:** container queries are intentionally used to keep
   Builder frame and storefront parity. Do not replace them with viewport-only
   assumptions.
10. **Asset safety:** any future theme/hero image upload must reuse existing
    asset ownership, validation, and media resolution boundaries.
11. **Stale publish state:** theme writes mark changes pending; future controls
    must preserve the current draft-versus-published distinction.
12. **Tier mismatch:** the legacy theme tier mapping and granular capability
    runtime must be tested together before claiming Growth value.

## 14. Tests Required Before Implementation Closure

### Theme contract tests

- Theme package resolution from canonical ID and legacy slug.
- Color/font overrides survive `Website` persistence and snapshot assembly.
- Existing `themeConfig` values either appear in the snapshot/runtime or are
  explicitly rejected from the UI scope.
- Snapshot backward compatibility when new theme fields are absent.
- CSS variable projection for colors, fonts, borders, buttons, radius, spacing,
  and elevation where supported.

### Builder tests

- Preview does not persist or mark the draft dirty.
- Applying an unlocked theme persists only after server success.
- Locked theme preview is visible but cannot be applied.
- New appearance controls update Builder preview through the canonical runtime,
  not a Builder-only mock.
- Autosave and publish include applied theme values but never preview values.
- Desktop/mobile frame parity at 375, 768, and 1200 widths.

### Hero tests

- Video -> poster -> background -> placeholder precedence.
- Asset-backed video validation and tenant ownership.
- Desktop/mobile focal point mapping.
- Hero identity, CTA, live badge, and social link persistence.
- Hero overlay/alignment controls, if eventually added, reach the aggregate,
  snapshot, Builder, preview, and published renderer.

### Published parity tests

- Builder canvas, `/domain?preview=true`, and published storefront share the same
  theme/runtime signature for identical inputs.
- Published storefront reads the immutable snapshot only.
- Theme changes require publish before becoming public.
- Old snapshots render safely with missing optional theme fields.
- Capability fallback is deterministic for Launch, Grow, Scale, and no-plan cases.

### UI/UX checks

- Contrast remains WCAG-compliant after custom colors/overlays.
- Focus rings remain visible against custom backgrounds.
- Controls have labels, clear locked states, and useful helper text.
- Mobile Builder controls remain operable with touch targets at least 44px.
- Reduced motion continues to disable decorative experience animation.
- No horizontal overflow at 320px, 375px, 390px, and 768px.

## 15. Final Findings Summary

- CreatorStore has a strong Hero data and rendering pipeline.
- CreatorStore has strong preset theme runtime and capability fallback.
- The Builder currently provides package selection rather than Stitch-level
  granular visual editing.
- Appearance controls for radius and density are misleading because their
  values do not reach the canonical published runtime.
- Theme token definitions are richer than the published snapshot contract.
- Hero background media is supported, but it is not the same as a configurable
  page/theme background layer.
- The canonical Builder canvas is close to runtime parity; the Appearance
  `PreviewShell` is the main preview parity exception.
- Growth can become substantially more valuable without changing architecture,
  provided future work extends the existing ThemeRegistry, snapshot builder,
  capability runtime, Hero settings authority, and canonical renderers.

THEME AUDIT VERDICT: READY FOR IMPLEMENTATION
