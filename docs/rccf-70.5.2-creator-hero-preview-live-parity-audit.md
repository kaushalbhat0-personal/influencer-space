# RCCF-70.5.2.1 — Creator Hero: Preview/Live Parity Audit

Status: **READ-ONLY AUDIT** (no code modified).
Phase: RCCF-70.5.2.1 (of 70.5.2.1 → 70.5.2.5).
Follows: `docs/rccf-70.5-creator-hero-media-truth-and-preview-parity-audit.md`, `docs/rccf-70.5.1-creator-media-registration-integrity-closure.md`.
Date: 2026-08-16.

---

## 1. Executive verdict

The live storefront and the Builder preview already share ONE canonical Hero
pipeline: `websiteAggregate.build()` → `resolveHeroMediaForRuntime()` →
`LayoutEngine.composeSectionConfig()` → `HeroRenderer`. They cannot diverge from
each other by construction.

The **only** divergent path is the Dashboard's `SettingsLivePreview` — a
hand-rolled client mock that does NOT consume the canonical resolver, the
canonical renderer, or the container-query responsive contract. It renders a
different layout, omits fields the form edits, keeps stale media on screen, and
uses a manual media toggle that contradicts the deterministic media decision.

**Verdict:** live/live-preview parity is already guaranteed. Settings-preview
parity is NOT. The fix is to make `SettingsLivePreview` render the actual
`HeroRenderer` (non-actionable) driven by the canonical resolver — reusing the
same mechanism the Builder device frame already uses for container-query
parity. No schema change, no new Prisma query, no second resolver.

## 2. Architecture (verified)

```
DATABASE (Setting hero_data, Asset, Storage)
   │
   ▼
websiteAggregateService.build()  ── single enrichment authority
   ├─ resolves videoAssetId / posterAssetId → fresh storage URLs
   │    (NOT backgroundAssetId — see §6)
   └─ resolveHeroMediaForRuntime() → resolvedMedia / mediaType / mediaUrl /
        mediaPoster / rendererDecision baked into content.hero
   │
   ├──► PUBLISH: PublishedSnapshot (RCCF-01/02 bakes the full aggregate)
   │        └─► getStorefrontData(published) → StorefrontPage
   │
   ├──► PREVIEW (?preview=true): buildRuntimeSnapshot(draft layout + live content)
   │        └─► getStorefrontData(preview) → StorefrontPage
   │
   └──► BUILDER CANVAS: getLivePreviewData() → live aggregate
            └─► interactive-canvas: layoutEngine.resolve(snapshot w/ draft layout)
                 └─► device frame = @container/main
   │
   ▼
layoutEngine.resolve() → composeSectionConfig()
   └─ hero.* → Object.assign(config, content.hero) + cta/ctaSecondary mapping
   │
   ▼
DataBoundRenderer / ComponentRenderer (previewMode flags non-actionable renderers)
   │
   ▼
HeroRenderer  ← consumes ONLY resolvedMedia/mediaUrl/mediaPoster/rendererDecision
                  + title/name/tagline/bio/subtitle/CTAs/socialLinks/profile/
                    live badge/alignments, via responsiveAlignmentClass
                    (@sm/main:@lg/main: container-query on @container/main)
```

**DIVERGENT PATH (the target of this workstream):**

```
SettingsForm (admin/settings)  ── full client editor (hero_data fields)
   │  local state: videoUrl, posterUrl, videoAssetId, posterAssetId,
   │  backgroundUrl, backgroundAssetId, 4× alignment, name, profilePictureUrl,
   │  title, subtitle, tagline, bio, ctaText/ctaLink, ctaSecondaryText/Link,
   │  liveBadgeText, showLiveBadge
   ▼
SettingsLivePreview  ✗ hand-rolled phone-frame mock
   - manual device toggle (mobile/desktop)
   - manual media toggle (video/poster)
   - plain heroAlignmentClass (no @container/main, no container queries)
   - lastVideoRef/lastPosterRef keep showing CLEARED media
   - NO title, subtitle, CTAs, socialLinks, background
   - static 3× gray circles instead of social links
```

## 3. Live data flow (authoritative)

1. `src/app/[domain]/page.tsx:40` → `getStorefrontData(domain, isPreview)`.
2. `src/lib/storefront/storefront-loader.ts:91` published path → `getPublishedPageData`
   → baked `PublishedSnapshot` (zero business-table reads at render time).
   Preview path `:56-79` → live `buildWithDiagnostics` → `buildRuntimeSnapshot`.
3. `src/components/storefront/StorefrontPage.tsx:180` — `<main id="main-content"
   className="@container/main ...">` is the named container boundary.
4. `StorefrontPage.tsx:81` → `layoutEngine.resolve(...)`.
5. `src/lib/storefront/layout-engine/LayoutEngine.ts:203-210` — hero compose:
   `Object.assign(config, content.hero)`; maps `ctaText→cta`, `ctaSecondaryText→ctaSecondary`.
6. `StorefrontPage.tsx:208` → `DataBoundRenderer previewMode={isPreview}` →
   `src/lib/renderer/index.tsx` → `ComponentRenderer` → `HeroRenderer`.
7. `src/lib/registry/components/renderers.tsx:96-262` — `HeroRenderer` consumes
   ONLY `resolvedMedia / mediaUrl / mediaPoster / rendererDecision` for media
   (IMPLEMENTATION-21 BUG 3 rule) plus the full text identity, CTAs, socialLinks,
   profile, live badge, and container-query alignments. Video plays once then
   swaps to poster (IMPLEMENTATION-23).

## 4. Preview data flow (divergent)

- `src/app/admin/settings/page.tsx` → `SettingsService.getHeroData(tenantId)`
  → `SettingsForm` (client).
- `src/features/settings/components/settings-form.tsx` — local state for every
  editable hero field; the preview is fed ONLY `videoUrl, posterUrl, 4×alignment,
  profileUrl, name, tagline, bio, liveBadgeText, showLiveBadge`
  (`settings-form.tsx:411-424`).
- `src/features/settings/components/settings-live-preview.tsx` — phone-frame mock
  (see §2). No `resolveHeroMedia`, no aggregate, no `HeroRenderer`, no
  `@container/main`, no container-query classes.

## 5. Parity matrix

| Aspect | Live / Builder preview | Settings preview | Parity? |
|---|---|---|---|
| Media decision authority | `resolveHeroMediaForRuntime` (video→poster→background→placeholder) | manual video/poster toggle | ✗ |
| Renderer | `HeroRenderer` (only renderer) | hand-rolled mock | ✗ |
| Alignment classes | `responsiveAlignmentClass` on `@container/main` | plain `heroAlignmentClass` + device toggle | ✗ |
| Media aspect/overlap | `aspect-[16/9] @sm/main:aspect-[16/8]`, `-mt-[100px] @sm/main:-mt-[24%]` | phone frame, fixed 230px | ✗ |
| Title (headline) | shown | **not shown** | ✗ |
| Subtitle | shown | **not shown** | ✗ |
| CTA / secondary CTA | shown (anchors/buttons) | **not shown** | ✗ |
| Social links | rendered pills | static gray circles | ✗ |
| Background | rendered (kind=background) | **not shown** | ✗ |
| Live badge | shown | shown | ✓ |
| Name | shown | shown | ✓ |
| Tagline | shown | shown | ✓ |
| Bio | shown | shown | ✓ |
| Profile picture | shown | shown | ✓ |
| Clearing media | immediate placeholder | stale media lingers (`lastVideoRef/lastPosterRef`) | ✗ |
| Non-actionable | via `previewMode` on actionable renderers | mock has no actions (✓) but this must survive the rewrite | ✓(needs to survive) |
| Source of truth | aggregate-enriched `content.hero` | raw local form state | ✗ |

## 6. Background lifecycle decision (evidence)

- **Editor:** `settings-form.tsx:242-255` — background `MediaField` present.
  Save hook: `onUploadComplete={() => handleSaveBackground()}` (`:254`) — the
  callback **ignores the new value** (`handleSaveBackground` reads
  `backgroundUrl/backgroundAssetId` from a closure captured BEFORE React
  re-renders with the upload result; there is NO manual background Save button).
  **Result: the background likely never persists on first upload** — a stale
  closure bug. (Video/poster save correctly passes overrides:
  `settings-form.tsx:213,235`.)
- **Aggregate:** `website-aggregate.service.ts:220-221` copies
  `backgroundUrl/backgroundAssetId` raw; `:408-431` resolves `videoAssetId` /
  `posterAssetId` to fresh storage URLs but **NOT `backgroundAssetId`**. Raw
  `backgroundUrl` flows into `resolveHeroMediaForRuntime` (`:440`).
- **Production reality (from RCCF-70.5 audit):** no tenant has `backgroundUrl`
  set. The field is inert end-to-end.

Decision input for 70.5.2.2: either (a) fix + wire backgroundAssetId like
video/poster, or (b) remove the dead background field entirely. Both are small;
(a) keeps parity surface with the canonical resolver's `background` kind.

## 7. Security (verified clean)

- The preview is client-only and fed only the session tenant's own `hero_data`
  via server actions (`updateHeroData`/`updateHeroPartial`) that enforce
  `requireAuth` (SUPER_ADMIN or matching tenant) + `assertHeroVideoWrite`
  (RCCF-67.3: raw client video URLs rejected; video must reference an owned,
  ACTIVE, RCCF-59-validated asset — `settings.actions.ts:33-49`).
- `SettingsService.patchHeroData` uses parameterized `$executeRawUnsafe` with
  JSONB merge; no SQL injection (params bound).
- Media authorization hardened in RCCF-70.5.1 (`assertOwnedStorageKey`,
  server-derived `publicUrl`, `assetCommitted` orphan guard).
- No client tenant authority; no client-supplied media URL becomes the hero
  video authority; the only raw-URL surface is `backgroundUrl` (inert in
  production, and broken by §6 anyway).
- The preview rewrite must preserve non-actionability: no checkout/WhatsApp/
  booking/contact/newsletter/affiliate/mutation from the preview.

## 8. Exact files (change surface)

| File | Role |
|---|---|
| `src/features/settings/components/settings-live-preview.tsx` | ✗ mock to replace with canonical render |
| `src/features/settings/components/settings-form.tsx` | preview props wiring (+ background stale-closure fix) |
| `src/lib/registry/components/renderers.tsx` | `HeroRenderer` — add `previewMode` (non-actionable CTAs/social) |
| `src/lib/media/hero-media.ts` | canonical resolver — REUSED as-is (no change) |
| `src/components/shared/HeroMedia.tsx` | shared media — REUSED as-is (no change) |
| `src/modules/tenant/application/website-aggregate.service.ts` | backgroundAssetId resolution (decision-gated, §6) |

## 9. Smallest safe boundary

Reuse `HeroRenderer` inside the settings preview with the same `@container/main`
wrapper mechanism the Builder device frame already uses (`interactive-canvas.tsx:253-259`).
Build the props client-side by mirroring `content.hero` and calling the pure
`resolveHeroMediaForRuntime` on the form's raw state. Zero new server reads,
zero schema change, zero new resolver.

## 10. Tests required (70.5.2.4)

1. Resolver-driven preview props equal live `content.hero` inputs for each
   decision kind (video/poster/background/placeholder).
2. `HeroRenderer` `previewMode` renders non-navigating CTAs/social links
   (no `href` initiating checkout/WhatsApp/booking).
3. Settings preview no longer shows stale cleared media.
4. Existing RCCF-59/67/68/70.5 hero suites still pass; full `tsc`/build/vitest.

## 11. Files NOT to modify

Frozen: tenant resolution, capabilities, billing, checkout, Razorpay, WhatsApp,
affiliate, booking, media authorization, publishing, Builder state/actions,
`WebsiteAggregate`, `PublishedSnapshot`, `LayoutEngine`, `ComponentRenderer`,
`resolveHeroMedia`/`HeroMedia`/`HeroMediaKind` signatures, `src/config/hero.ts`.

## 12. Recommended plan

1. **70.5.2.2** — architecture decision (canonical truth + background decision).
2. **70.5.2.3** — implement (no commit): `HeroRenderer` `previewMode`;
   `SettingsLivePreview` → canonical render; form props wiring; background
   closure fix per §6 decision.
3. **70.5.2.4** — tests + full verification (no commit).
4. **70.5.2.5** — final read-only audit (honest "visually unverified" caveat).