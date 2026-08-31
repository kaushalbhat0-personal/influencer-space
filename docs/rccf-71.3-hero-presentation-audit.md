# RCCF-71.3 — Hero Presentation Audit (READ-ONLY)

**Scope:** audit of Hero PRESENTATION capabilities only. No code, no Prisma, no
billing, no capability-authority, no hero ownership, no Builder-only CSS changes.
Hero CONTENT remains `Settings/hero_data`-owned (title, subtitle, CTA, social,
video, poster, content). The Builder may control PRESENTATION only.

**Audit date:** 2026-08-17 · **Inputs read:**
`docs/rccf-theme-hero-capability-audit.md`,
`docs/rccf-71.1-canonical-theme-foundation.md`,
`docs/rccf-71.2-growth-theme-experience.md`.

Classification key: **A** already supported · **B** supported but not exposed ·
**C** persisted but not reaching runtime · **D** needs safe additive runtime
extension · **E** not safely representable.

---

## 1. Current Hero Architecture (verified against source)

### 1.1 Authority and persistence
- `src/config/hero.ts` — `HeroDataType` owns ALL hero content: `videoUrl`,
  `posterUrl`, `backgroundUrl`, `name`, `profilePictureUrl`, `title`, `subtitle`,
  `tagline`, `bio`, CTAs, live badge, `socialLinks`, and the four media focal
  fields `videoDesktopAlignment` / `videoMobileAlignment` /
  `imageDesktopAlignment` / `imageMobileAlignment` (`"top" | "center" | "bottom"`).
- Persistence: Setting key `hero_data` (JSONB) via
  `src/actions/settings.actions.ts` (`updateHeroData` / `updateHeroPartial` /
  `updateHeroSocialLinks`). `heroPartialSchema` is zod-validated and accepts the
  four alignment enums (lines 83-86) plus all content fields. Hero video is
  asset-bound (`assertHeroVideoWrite`, RCCF-67.3). No presentation fields exist
  beyond media focal points.

### 1.2 Canonical runtime path
```
hero_data Setting
  → WebsiteAggregateService.build()            (website-aggregate.service.ts:447)
      → resolveHeroMediaForRuntime()           (src/lib/media/hero-media.ts:72)
          precedence: video → poster → image → background → placeholder
      → content.hero (+ resolvedMedia/mediaUrl/mediaPoster/…)
  → buildRuntimeSnapshot()                     (publishes whole aggregate into snapshot.content)
  → LayoutEngine.composeSectionConfig()        (LayoutEngine.ts:235)
      Object.assign(config, content.hero)  ← EVERY hero field (incl. alignment) flows to renderer props
  → HeroRenderer                              (renderers.tsx:96)
```
- The renderer consumes ONLY resolved media fields (IMPLEMENTATION-21): it never
  reads raw `videoUrl`/`posterUrl`/`backgroundUrl`/`*_AssetId`.
- `responsiveAlignmentClass(desktop, mobile)` (HeroMedia.tsx:30) maps
  `top/center/bottom` → `object-top/object-center/object-bottom` base +
  `@sm/main:object-*` named-container variant — parity between the Builder
  device frame, the `?preview=true` route and the published storefront.
- Hero section wrapper: `ExperienceSection variant="hero"` (section-runtime.tsx)
  with theme experience `hero` overrides (`divider: "none"`, `heroBlend: true`,
  per-theme background/surface) — a hardcoded theme layer, not a creator control.

### 1.3 Renderer facts (HeroRenderer, renderers.tsx:96-271)
- Content block: `mx-auto max-w-2xl px-4 pb-12 pt-2 text-center` (line 190) —
  **text alignment and content width are hardcoded**.
- Media overlay: fixed `absolute inset-0 bg-gradient-to-b from-black/50
  via-transparent to-zinc-950` (line 185) — **overlay is hardcoded**.
- Media alignment decision (line 133):
  `video → videoAlign; image → imageAlign; background → "object-center"`.
  The background fallback **ignores the saved image focal point** (audit §8.5).
- After the video ends, the poster `<img>` uses `imageAlign` (line 161-167).
- Layout: fixed two-row stack — media frame (`aspect-[16/9] @sm/main:aspect-[16/8]`)
  above an overlapping content block (`-mt-[100px] @sm/main:-mt-[24%] z-10`).
  A true vertical text composition is **structural**, not additive.
- Theme interaction: the heading `h1` consumes
  `font-[var(--brand-font-weight-heading,700)]`; buttons use `--radius-*` /
  `--button-*`; text/colors use `--text-*` / `--surface-*` vars (RCCF-71.1/71.2).
  Font family applies only inside `.theme-root` (`<main>` / Builder frame).

### 1.4 Preview surfaces
- **Builder canvas** (`interactive-canvas.tsx:341`) — renders the SAME
  `ExperienceSection` + `ComponentRenderer`/HeroRenderer with live aggregate
  (`getLivePreviewData`, which returns `content` including `content.hero`) +
  draft layout. Named `@container/main` device frame.
- **Preview route** (`storefront-loader.ts` → `StorefrontPage` with
  `isPreview`) — `bakedExperience ?? resolveExperienceForCapabilities(base,
  livePlan)`; hero renders from `snap.content.hero`.
- **Published storefront** — `StorefrontPage`; hero renders from immutable
  `snap.content.hero`.
- **Settings live preview** (`settings-live-preview.tsx`) — the CANONICAL
  `HeroRenderer` inside `@container/main` (320/1024 toggle), fed from the FORM's
  raw `hero_data` state via `resolveHeroMediaForRuntime` (client mirror). It
  does **not** carry theme vars or (future) theme-config presentation.
- **Legacy `[domain]/_components/hero-banner.tsx`** — dead code: no importers
  anywhere. Uses the same `responsiveAlignmentClass`. Ignore for future work.

---

## 2. Capability Matrix (A–E)

| # | Capability | Class | Evidence |
|---|---|---|---|
| 1 | **Horizontal text alignment** (left/center/right) | **D** | Hardcoded `text-center` (renderers.tsx:190). No field in `hero_data`, `HeroContent`, or renderer. No control anywhere. Safely additive: field + renderer `text-left/center/right` + fallback `center`. |
| 2 | **Vertical Hero composition** (top/center/bottom) | **E** | Hero is a fixed two-row stack (media frame + overlapping text block, `-mt-[100px]`). Anchoring text at top/center/bottom inside/beside the media requires a new hero layout model — not a safe additive field. Defer. |
| 3 | **Hero content width** (narrow/medium/wide) | **D** | Hardcoded `max-w-2xl` (line 190) / bio `max-w-xl` (line 215). No field. Safely additive: preset → `max-w-xl/2xl/3xl` + fallback `2xl`. |
| 4 | **Hero overlay** (none/soft/medium/strong) | **D** | Fixed gradient overlay (line 185). No field. Safely additive: strength preset → overlay class + fallback = current look. |
| 5 | **Overlay color/opacity** | **E** | No canonical representation exists: `hero_data` has none; the experience model has only a boolean `heroBlend` (theme-experience.ts:79); `ThemeSnapshot` carries no overlay color/opacity. Any value would be an invented field without runtime semantics (also matches the 71.2 deferral). Defer. |
| 6 | **Hero media positioning** (top/center/bottom) | **A** (video+image) / **B** (background fallback) | `videoDesktopAlignment/videoMobileAlignment/imageDesktopAlignment/imageMobileAlignment` fully supported: persisted, zod-validated, threaded via `Object.assign(config, content.hero)`, rendered via `responsiveAlignmentClass` (desktop+mobile). **Gap:** background fallback hardcodes `object-center` (line 133) and ignores the saved image focal point. Small fix: apply `imageAlign` to the background kind. |
| 7 | **Video/poster positioning behavior** | **A** | Deterministic and persisted: video → `videoAlign`; poster after video-end → `imageAlign`; poster-as-media → `imageAlign`. Note the intentional nuance that the poster reuses image alignment (design detail). |
| 8 | **Responsive desktop/mobile presentation** | **A** | `@container/main` named boundary on storefront `<main>`, Builder device frame, and settings preview; container-query variants flip identically; media alignment has desktop+mobile. Configurability is limited to focal points, but the responsive capability itself is strong and parity-verified (RCCF-RESPONSIVE-02/03). |
| 9 | **Growth capability gating** | **E** today / **D** plan | No Hero presentation control exists to gate. Precedent from 71.2: gate the whole appearance surface on the server-derived `premium_themes` entitlement (`builder-overview.actions.ts` → `capabilities.premiumThemes`) and at the `updateTheme` write boundary. Reuse that single gate — no new capability, no plan change. Overlay is a renderer field (not a capability layer), so there is nothing to degrade at runtime; the write-time gate is the only gate. |

**No C items** — nothing is persisted-but-ignored: the only persisted hero
presentation values (the four focal enums) DO reach the runtime. The two dead
appearance values from the theme audit (`borderRadius`, `layoutDensity`) were
fixed in 71.1 and are out of scope here.

---

## 3. Existing Fields

`HeroContent` (snapshot.ts:179) + `HeroDataType` (config/hero.ts:35):

- Content: `title`, `name`, `subtitle`, `description`, `tagline`, `bio`,
  `profilePictureUrl` (+assetId), `socialLinks`, `ctaText/ctaLink`,
  `ctaSecondaryText/ctaSecondaryLink`, `liveBadgeText`, `showLiveBadge`.
- Media: `videoUrl`/`videoAssetId`, `posterUrl`/`posterAssetId`,
  `backgroundUrl`/`backgroundAssetId`, plus resolved `resolvedMedia` /
  `mediaType` / `mediaUrl` / `mediaPoster` / `rendererDecision`.
- **Presentation (the only ones):** `videoDesktopAlignment`,
  `videoMobileAlignment`, `imageDesktopAlignment`, `imageMobileAlignment`
  (`"top"|"center"|"bottom"`).
- Theme hook-ins already present in renderer: `--brand-font-weight-heading`,
  `--radius-*`, `--button-*`, `--text-*`, `--surface-*`, `--section-spacing`.

## 4. Missing Fields (safe additive candidates)

- `textAlign?: "left" | "center" | "right"` (item 1).
- `contentWidth?: "narrow" | "medium" | "wide"` (item 3).
- `overlay?: "none" | "soft" | "medium" | "strong"` (item 4).
- Background-kind focal reuse of the existing image alignment (item 6 fix — no
  new field).

All three new fields must be optional with renderer fallbacks equal to the
current look (`center` / `medium` / the current `from-black/50` gradient), so
old snapshots render unchanged.

## 5. Minimal Implementation Plan (future, D items)

Persistence authority: `Website.themeConfig` (the documented appearance
persistence point, already threaded through `buildRuntimeSnapshot` in 71.1 and
the `updateTheme` gate in 71.2). This keeps `hero_data` content-only and honors
"Builder = presentation only"; it does NOT extend `hero_data`, does NOT create a
new model, and requires no Prisma change.

1. **New pure module** `src/lib/hero/presentation-options.ts` —
   `TEXT_ALIGN_OPTIONS` / `CONTENT_WIDTH_OPTIONS` / `OVERLAY_OPTIONS` + a pure
   `applyHeroPresentation(content: HeroContent, cfg: Record<string,string>)`
   that merges valid keys onto `content.hero` (no-op on undefined/invalid) —
   mirrors `experience-overrides.ts` from 71.2 (type-only imports, shared by
   server pipeline and Builder panel).
2. **Persistence** — `src/actions/theme.actions.ts` `updateTheme` accepts
   `heroTextAlign` / `heroContentWidth` / `heroOverlay`, validates against the
   registries (unknown values ignored), writes into `Website.themeConfig`,
   behind the existing `premium_themes` gate (Launch rejected).
3. **Snapshot/runtime** — `src/lib/storefront/build-snapshot.ts` merges the
   `themeConfig.hero*` keys onto `snapshot.content.hero` (additive optional;
   `CURRENT_SNAPSHOT_VERSION` stays 1). `publishing/service.ts` and
   `storefront-loader.ts` already pass `themeConfig` (71.1/71.2) — no new wiring.
4. **Renderer** — `renderers.tsx` `HeroRenderer`: consume `p.textAlign`
   (`text-left/center/right` + drop `mx-auto` when not center), `p.contentWidth`
   (`max-w-xl/2xl/3xl`), `p.overlay` (overlay strength presets); every fallback
   equals today's output. Fix item 6: background kind uses `imageAlign` instead
   of hardcoded `object-center`.
5. **Builder** — extend the 71.2 `appearance-panel.tsx` (or a sibling Hero
   Presentation section) in `website-panel.tsx`; locked state from the existing
   server-derived `capabilities.premiumThemes`; persist through `updateTheme`;
   emit `appearance:changed` (canvas already subscribes and refetches).
   `builder-overview.actions.ts` returns the current hero-presentation values.
   The panel imports none of `@/config/hero` / `settings.actions` (no content
   duplication).
6. **Canvas** — `interactive-canvas.tsx` merges `getLivePreviewData.themeConfig`
   hero keys onto its client `content.hero` (same rule as the server).

## 6. Files to Change (future implementation — none changed by this audit)

- `src/lib/hero/presentation-options.ts` (new)
- `src/actions/theme.actions.ts` (accept + validate + gate)
- `src/lib/storefront/build-snapshot.ts` (merge into `content.hero`)
- `src/lib/registry/components/renderers.tsx` (consume fields + background-focal fix)
- `src/features/builder/components/appearance-panel.tsx` / `website-panel.tsx`
  (controls)
- `src/actions/builder-overview.actions.ts` (return current values)
- `src/features/builder/canvas/interactive-canvas.tsx` (client merge)
- `src/types/snapshot.ts` (additive optional `HeroContent` fields)
- `tests/unit/rccf71-3-*.test.ts` (new guardrails)
- Optional parity surface: `src/features/settings/components/settings-live-preview.tsx`

## 7. Frozen Files / Boundaries (not to be touched)

- Prisma schema and migrations (persistence is `Website.themeConfig` JSON only).
- Billing / Razorpay / plan definitions / `capabilityService` / capability
  authority internals (reuse `premium_themes`, no new capability).
- Publishing business behavior, snapshot immutability, `CURRENT_SNAPSHOT_VERSION`
  (stays 1, additive optional fields only).
- Hero CONTENT ownership: `src/config/hero.ts`, `src/actions/settings.actions.ts`,
  `src/services/settings.service.ts`, `hero_data` JSONB — content fields untouched;
  Builder never writes these.
- `src/lib/media/hero-media.ts` — media precedence resolver (single authority).
- Auth, tenant resolution, `create.actions.ts` / provisioning.
- Builder content authority: Builder owns presentation metadata, not CMS content.
- Storefront snapshot-only rule: published pages never read live business tables.

## 8. Growth Behavior (future D items)

- **Launch** — Hero presentation panel locked (server-derived `premium_themes`),
  mirroring 71.2. Current hero rendering unchanged.
- **Growth** — all three presets (textAlign / contentWidth / overlay) exposed and
  fully applied through the canonical pipeline; media focal points already work.
- **Scale** — unchanged; everything available, advanced experiences on top.
- **Degradation** — overlay strength is a renderer field, not a capability-gated
  experience layer, so there is nothing to strip at runtime; the single gate is
  the `updateTheme` entitlement check (same stance as 71.2's heading weight).

## 9. Tests Required (future implementation)

- Registry/validation: unknown `hero*` keys ignored; `updateTheme` rejects
  non-premium; gate ordering identical to 71.2.
- Snapshot: merge into `snapshot.content.hero`; old snapshots (fields absent)
  render the exact current look (fallback assertions).
- Renderer: `textAlign`/`contentWidth`/`overlay` map to expected classes; no
  hardcoded `text-center`/`max-w-2xl` remain for these spots; background kind
  now honors the image focal point (item 6 fix).
- Parity: publish bake == preview loader == Builder canvas for identical inputs;
  `getLivePreviewData` returns `themeConfig`; canvas applies the same merge rule.
- Boundaries: the Builder panel imports none of `@/config/hero` /
  `settings.actions`; no plan/tier/quota in `build-snapshot`/renderers; no
  Prisma change; schema version stays 1.
- Responsive: 320/375/390/768/1200 frame widths; no horizontal overflow; both
  `<main>` and the canvas frame carry `.theme-root` + `@container/main`.
- Accessibility: WCAG contrast under the `strong` overlay; focus rings visible.

## 10. Preview/Live Parity Plan (future implementation)

- **Publish, preview route, Builder canvas** all resolve hero presentation from
  the SAME `Website.themeConfig` source through the SAME merge rule (step 5 of
  the plan), so canvas == `?preview=true` == published, exactly as 71.1/71.2 do
  for `themeConfig` values.
- **Settings live preview gap:** it feeds only `hero_data` form state, so it will
  not show textAlign/contentWidth/overlay unless those values are threaded in.
  Options: (a) thread the persisted `themeConfig.hero*` into
  `settings-live-preview.tsx` (it already renders the canonical `HeroRenderer`);
  or (b) document that the Builder canvas + preview route + published storefront
  are the hero-presentation parity surface while the Settings preview remains the
  content preview (mirrors the documented 71.1 stance that the settings preview
  does not carry theme-root vars). Recommend (a) since it is additive and
  reuses the canonical renderer.
- Reuse `src/lib/observability/runtime-parity.ts` signatures for a
  presentation-parity assertion in the new test file.

---

**RCCF-71.3 audit complete. Verdict: READY.**

The hero runtime is strong: media precedence, focal-point persistence, snapshot
baking, and responsive parity are all **A**. Three of the four candidate
presentation controls are **D** (safe additive — text alignment, content width,
overlay strength) with a clean persistence path via `Website.themeConfig` and no
frozen-surface impact; media background focal is a one-line **B→A** fix.
**E** items (vertical composition, overlay color/opacity) have no canonical
runtime representation and are correctly deferred. Next step when authorized:
implement §5 via the RCCF-71.3 closure ticket with the §9 guardrails.