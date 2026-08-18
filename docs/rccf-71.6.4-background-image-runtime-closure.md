# RCCF-71.6.4 — Background Image Runtime + Growth/Scale Theme Completion Closure

## 1. Executive Verdict

**Grade: A− (staged, not committed)**

`theme_background_image` is now REAL end-to-end for Creator Growth and Creator
Scale: capability → preset → server authorization → persistence → override
injection → capability resolution → runtime renderer → baked publish snapshot.
Launch stays fully denied (capability + server + runtime), Growth and Scale
share the SAME Theme Experience level (no Scale-only visual differentiation),
and video/custom effects remain unexposed. The full automated verification gate
is green (tsc, 3577/3577 unit tests, eslint, `npm run build`, `git diff
--check`). One latent server-gate defect (see §5) was found and fixed. Changes
are staged — **no commit was made** per ticket instruction. Authenticated
browser visual QA remains as the final confirmation step (§13).

## 2. Context / Ticket Requirements

- Growth and Scale share the SAME Theme Experience capability level this phase.
  Scale's differentiation = `custom_domain` + existing business/infrastructure
  capabilities, NOT theme visuals.
- **Deferred:** `theme_background_video`, `theme_effects_custom` — no UI, no
  renderer, no Scale-only presets.
- Implement complete Background Image for Growth+Scale across one authority
  path, reusing the existing canonical asset/media infrastructure (no new
  upload/storage). If no safe asset source existed → STOP and report.
- Capability security: Launch denied, Growth/Scale allowed, enforced
  SERVER-side; direct ThemeConfig mutation must respect the capability; **no**
  `if planCode === "creator_growth"` style checks.
- Runtime parity: Builder canvas = preview = publish snapshot = published
  storefront, via `Website.themeConfig → applyExperienceOverride() →
  resolveExperienceForCapabilities() → runtime`.
- Rendering: behind section content, readable, controlled opacity, overlay/tint
  from theme tokens, no layout impact, works with surface treatments, safe
  fallback, no horizontal overflow, reduced-motion safe.

## 3. Architecture Invariant & Option Selection

**Invariant:** the canonical Capability Runtime is the single authority for what
a plan may visually render. Every visual layer flows through
`applyExperienceOverride()` (creator overrides) → `resolveExperienceForCapabilities()`
(plan gating) — never a raw plan-code branch in application logic.

**Option selected — extend the existing Theme Experience architecture:**

1. Add `image` to `ExperienceBackgroundKind` + optional `url`/`opacity` on
   `ExperienceBackground`.
2. Map `image → theme_background_image` in `BACKGROUND_KIND_CAP` (reuses
   `requiredCapabilitiesForBackground` → the exact gate the server action uses).
3. Add an `image` preset to `BACKGROUND_PRESETS`; `applyExperienceOverride`
   injects the creator's persisted URL + opacity when the image preset is
   active.
4. Add an `image` branch to `background-runtime.tsx` (the only new renderer —
   one renderer, used by all surfaces).
5. Server-gate `experienceBackgroundImage(+AssetId+Opacity)` in `updateTheme`
   through `requiredCapabilitiesForBackground(BACKGROUND_PRESETS.image.background)`
   and validate URLs/opacity via a new pure `image-config.ts` module.
6. Reuse the existing canonical media pipeline (`MediaField` + asset upload +
   library pick) — no new storage, no new upload service.

**Rejected alternatives:**

- *Reuse hero `backgroundUrl`/`backgroundAssetId` as the theme background:*
  rejected — Hero content is frozen/owned by the Hero feature; the theme
  background must be an independent, creator-controlled surface.
- *New upload/storage service:* rejected — `MediaField`/Asset infra already
  exists and satisfies the ticket's "reuse, don't invent" mandate.
- *New background preset system / second theme config:* rejected — the existing
  preset + themeConfig path already threads Builder→preview→publish→storefront.
- *Separate image renderer per surface:* rejected — one `ExperienceBackground`
  image branch covers all sections.

## 4. Capability Matrix (Growth/Scale boundary)

| Layer | Creator Launch | Creator Grow | Creator Scale |
|---|---:|---:|---:|
| Solid background | Yes | Yes | Yes |
| Background image (this ticket) | **No** | Yes | Yes |
| Gradient/mesh/aurora/radial/pattern | No | Yes | Yes |
| Surfaces (premium) | No | Yes | Yes |
| Video background | No | No | No (deferred) |
| Custom effects | No | No | No (deferred) |
| Theme Experience level | — | Growth level | **Growth level (identical)** |

Growth and Scale resolve the **exact same** Theme Experience; Scale differs only
through its existing `custom_domain` + business/infrastructure capabilities.

## 5. Server Security Verification (+ latent defect fixed)

- `updateTheme()` gates `experienceBackground: "image"` **and** its direct keys
  (`experienceBackgroundImage`, `experienceBackgroundImageAssetId`,
  `experienceBackgroundImageOpacity`) through the SAME capability set
  `requiredCapabilitiesForBackground(BACKGROUND_PRESETS.image.background)` =
  `[advanced_builder, theme_background_solid, theme_background_image]`. A
  Launch creator cannot inject an image by sending the key alone.
- Unsafe URLs (`javascript:`, `data:`, `blob:`, control chars, >2048 chars) are
  never stored; opacity is clamped to a 5–90 percentage string.
- Empty value clears the persisted keys (Remove path).
- **Latent defect found & fixed:** `entitlementService.has()` (used by
  `theme.actions`' `rejectMissing`) mapped capability ids → feature keys via
  `CAPABILITY_TO_FEATURE`, which did NOT include the `theme_background_*` /
  `theme_effects_*` granular keys. As a result the server gate could never
  resolve those capabilities and would deny Growth/Scale even though
  `capabilityService.can()` grants them (probe: `entitlementService.has("creator_grow",
  "theme_background_image") === false` vs `capabilityService.can(...) ===
  {allowed:true}`). Added the identity mappings to `CAPABILITY_TO_FEATURE` in
  `src/lib/capabilities/entitlements.ts`. This restores the intended server
  enforcement for the pre-existing background/surface gates as well (71.2/71.5.1
  surfaces now resolve correctly through the same helper).
- Client lock is presentation-only; server checks are authoritative.
- No raw plan-code comparison added anywhere (guardrail test asserts
  `theme.actions.ts` contains the shared preset gate and no `planCode === ...`).

## 6. Asset Mechanism Decision

Reused the existing canonical media infrastructure — no new storage/upload:

- `MediaField` (upload + "Choose from Library" + Replace/Remove) drives the
  Builder Appearance panel image selection, wired with `entityType="theme"`,
  `entityId={tenantId}`, `entityField="experienceBackgroundImage"` so uploads
  create proper `AssetReference`s and removal dereferences them.
- `folder="general"` — the existing `MediaValidator` allowed-folder set has no
  "theme" folder; "general" is a valid existing folder (no validator change).
- Persisted values are `experienceBackgroundImage` (URL),
  `experienceBackgroundImageAssetId`, `experienceBackgroundImageOpacity` in the
  existing `Website.themeConfig` JSON — the exact field the canonical pipeline
  already threads. No schema change, no new table.

## 7. Implementation Changes

| File | Change |
|---|---|
| `src/modules/theme/runtime/experience/theme-experience.ts` | Added `"image"` to `ExperienceBackgroundKind`; added optional `url` + `opacity` to `ExperienceBackground`. |
| `src/modules/theme/runtime/experience/capabilities.ts` | Mapped `image → theme_background_image` in `BACKGROUND_KIND_CAP` (feeds `requiredCapabilitiesForBackground` + `resolveExperienceForCapabilities`). |
| `src/modules/theme/runtime/experience/image-config.ts` | NEW pure module: `isSafeAssetUrl`, `isValidImageOpacity`, `parseImageOpacity`, `IMAGE_OPACITY_MIN/MAX/DEFAULT`. Shared by action + runtime + tests. |
| `src/modules/theme/runtime/experience/experience-overrides.ts` | Added `image` preset to `BACKGROUND_PRESETS`; `applyExperienceOverride` injects persisted URL + opacity for the image preset and still drops per-section backgrounds. |
| `src/modules/theme/runtime/experience/background-runtime.tsx` | NEW `image` branch: safe solid fallback when no URL; `<img>` `object-cover` at controlled opacity + `--surface-root` tint gradient, `overflow-hidden`, `pointer-events-none`, `aria-hidden`, lazy/async, `clampOpacity`. |
| `src/modules/theme/runtime/experience/index.ts` | Exported `parseImageOpacity` + image-config helpers. |
| `src/actions/theme.actions.ts` | Accepted + gated + validated `experienceBackgroundImage(-AssetId/-Opacity)`; single shared gate for preset and direct keys; empty clears. |
| `src/actions/builder-overview.actions.ts` | Exposed persisted image URL/assetId/opacity in the appearance payload. |
| `src/features/builder/components/appearance-panel.tsx` | New "Image" chip (via presets); when active, renders `MediaField` + opacity slider; `image` swatch added. |
| `src/features/builder/components/website-panel.tsx` | Threaded the new appearance fields into `AppearancePanel`. |
| `src/lib/capabilities/entitlements.ts` | Added `theme_*` identity mappings to `CAPABILITY_TO_FEATURE` (fixes server gate — see §5). |
| `tests/unit/rccf71-6-4-theme-background-image.test.ts` | NEW — 18 guardrail cases (16 ticket-specified + 2 runtime clamp checks). |
| `tests/unit/theme-actions.test.ts` | Modernized stale RCCF-11 gate tests to the canonical `advanced_builder` gate + added image server-gate cases. |
| `src/lib/capabilities/__tests__/theme-capabilities.test.ts` | Added `entitlementService.has()` parity regression test. |
| `tests/unit/rccf71-1-canonical-theme-foundation.test.ts` | Updated stale guardrail to assert the current canonical `advanced_builder` gate (premium_themes appearance gate migrated by 71.6.2). |
| `tests/unit/rccf71-2-growth-theme-experience.test.ts` | Added `image` to the runtime-rendered kinds guardrail set. |

## 8. Builder / Preview / Publish / Storefront Parity

Unchanged canonical chain, now carrying the image:

```text
Website.themeConfig (experienceBackground: "image",
                     experienceBackgroundImage, ...Opacity)
  → applyExperienceOverride(base, themeConfig)     [injects kind: "image", url, opacity]
  → resolveExperienceForCapabilities(overridden, planCode)
        [Growth/Scale: image kept · Launch: solid, url dropped]
  → ExperienceBackground runtime (Builder canvas + preview + published)
```

- Builder canvas: `interactive-canvas.tsx` (already `applyExperienceOverride` →
  `resolveExperienceForCapabilities`).
- Preview loader: `storefront-loader.ts` (same two-step, bakes `experience`).
- Publish: `publishing/service.ts` (same two-step, bakes into snapshot
  `renderingHints.experience`).
- Storefront: `StorefrontPage.tsx` consumes the baked experience — zero plan
  reads at render time; Launch snapshots carry the solid fallback.
- Guardrail test pins the same resolved background for the baked snapshot on
  Growth (image + url) and Launch (solid, no url).

## 9. Behavior Preservation

- Launch renders exactly as before (solid-only; image never leaks).
- Existing Growth background/surface presets are byte-for-byte unchanged
  (guardrail asserts preset kinds); the image preset was appended, none were
  rewritten.
- Per-section background overrides are still dropped when a page background
  preset is chosen (image wins everywhere); decoration/motion/divider/surface
  section character preserved.
- The image is `position:absolute; inset:0` → no layout impact; `object-cover` +
  `overflow-hidden` → no horizontal overflow; static image → reduced-motion
  safe; missing URL → safe solid fallback (never a broken render).
- Publish/snapshot architecture untouched; no Prisma/schema/migration change.

## 10. Growth/Scale Boundary

- Growth and Scale resolve identical Theme Experiences (test asserts
  `scale.background` equals `grow.background`).
- No Scale-only visual presets, no Scale-only renderer, no `theme_background_video`
  or `theme_effects_custom` exposure (tests assert no preset, no `BACKGROUND_KIND_CAP`
  video key, and `creator_grow` still lacks `theme_effects_custom`).
- `custom_domain` untouched (frozen).

## 11. Frozen Surfaces Confirmed Untouched

Prisma/schema/migrations · billing lifecycle · subscription resolver · RCCF-71.6.1
entitlement status · RCCF-71.6.2 Partner entitlement · authentication · Hero
content ownership (`hero_data`) · Builder canvas/device widths · publishing
architecture · snapshot architecture · existing Growth visual behavior (except
the additive image integration) · `custom_domain` implementation · Enterprise.
`entitlements.ts` was modified only to add the missing `theme_*` identity
mappings (the canonical capability surface, required for the ticket's
server-side authorization mandate).

## 12. Regression Coverage

- **`tests/unit/rccf71-6-4-theme-background-image.test.ts`** — 18 tests:
  preset kind + exact required caps `[advanced_builder, solid, image]`; Launch
  denied (capability level); Growth+Scale allowed (same level); Launch runtime →
  solid with URL dropped; Growth runtime → image + url + opacity preserved; Scale
  runtime identical to Growth; missing-URL safe fallback; per-section background
  cleared; baked snapshot parity (Growth image, Launch solid); renderer `<img>`
  behind content + overflow guard + skip-when-no-URL; opacity clamp render;
  `isSafeAssetUrl` matrix; `isValidImageOpacity`/`parseImageOpacity` bounds;
  Growth presets unchanged; video unexposed; custom effects unexposed; no raw
  plan-code comparisons in `theme.actions.ts`/`capabilities.ts`.
- **`tests/unit/theme-actions.test.ts`** — 6 tests: Launch rejected
  (`advanced_builder`), Growth allowed, cross-tenant rejected, image preset/direct
  key reject with the SAME error (single authority), Growth persists image preset +
  URL + opacity, unsafe URL never stored.
- **`theme-capabilities.test.ts`** — added `entitlementService.has()` parity
  regression (Launch denied, Growth/Scale granted) locking the §5 fix.
- **Updated guardrails** — `rccf71-1` (canonical gate assertion), `rccf71-2`
  (preset kinds now include `image`).
- Dependent suites green: 71.2, 71.5.1, 71.6.2, theme-capabilities,
  build-snapshot/storefront/publishing paths (full suite 3577/3577).

## 13. Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` (full) | ✅ 236 files / 3577 tests passed |
| Focused `rccf71-6-4*` + touched suites | ✅ 37 passed (theme-actions, theme-capabilities, 71.6.4) |
| `npm run build` | ✅ succeeded |
| `npx eslint` (all touched files) | ✅ clean |
| `git diff --check` | ✅ no whitespace errors (CRLF info warnings only) |
| `npx prisma validate` / `generate` | N/A — no schema change |
| Authenticated browser QA (Growth/Scale/Launch) | ⏳ **Pending** — requires the seeded QA accounts + dev server; recommended as the final confirmation before staging/commit. Existing valid QA asset flow is in place (MediaField + library); fallback behavior for the renderer is covered by unit tests. |

## 14. Risks & Edge Cases + Recommendation

**Risks:**
- Image URL relies on the existing asset pipeline's public URL; a deleted/expired
  asset yields a broken `<img>` — mitigated by the safe solid fallback only when
  `url` is absent, so a live-but-broken URL still shows an empty layer (acceptable;
  the tint gradient still renders). Consider pre-render existence checks if this
  matters later.
- The opacity slider writes on every input step (auto-save) — consistent with the
  existing Appearance auto-save pattern; no extra debounce added to keep scope tight.
- `entitlements.ts` mapping is a one-time correctness fix; the parity regression
  test prevents future drift.

**Recommendation:** **Proceed (staged).** Implementation, security, and the full
automated gate are complete and green; Growth/Scale/Launch runtime parity is
pinned by tests. Perform the authenticated browser visual QA (§13) as the final
confirmation, then commit when instructed. No commit was made in this session.