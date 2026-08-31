# RCCF-BUILDER-02 — Preview Route ThemeConfig Fidelity Fix Closure

**Status:** COMPLETE — verified.
**Date:** 2026-08-27
**Baseline HEAD:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8`
**origin/main:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8`

---

## 1. Executive Verdict

**PASS.** The P1-1 runtime-fidelity defect is closed. The authorized `?preview=true` storefront route now threads
`Website.themeConfig` into the canonical `buildRuntimeSnapshot` pipeline exactly like the Builder canvas, publish,
construction, and parity paths. Both previously-failing guardrail tests now pass; the focused Builder baseline is
fully green; all static gates pass; tenant isolation and unauthorized-preview fallback are unchanged.

Additionally, running the broader RCCF-71.x Builder/theme suites surfaced **4 pre-existing failures** (in
`rccf71-2-growth-theme-experience`, `rccf71-5-1-growth-visual-surfaces`, `rccf71-6-1-entitlement-status`) that pin a
**distinct, related gap**: the preview loader also does not bake the capability-filtered **theme experience
override** (`applyExperienceOverride` → `resolveExperienceForCapabilities`) into `renderingHints.experience`, which
publish and the canvas both do. This gap is **outside this RCCF's enumerated P1-1 scope** and is reported for the
next authorization (do-not-fix mandate respected).

---

## 2. Baseline SHA

| Item | Value |
|---|---|
| HEAD | `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` |
| origin/main | `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` |
| Staged (pre-existing) | `docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md` |
| Protected work (`src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts`) | Dirty before this RCCF; **untouched** |

---

## 3. Root Cause

`src/lib/storefront/storefront-loader.ts` (the authorized `?preview=true` route):

1. Its `prisma.website.findUnique` select omitted `themeConfig` (only `id, themePackageId, themeColors, themeFonts`).
2. Its `buildRuntimeSnapshot({...})` call therefore could not supply `themeConfig`.

Because `buildRuntimeSnapshot` (the canonical snapshot builder) threads `themeConfig` into
`themeResolver.resolveForSnapshot` (borderRadius / layoutDensity / headingWeight) and into `applyHeroPresentation`
(heroTextAlign / heroContentWidth / heroOverlay), the preview route rendered the theme **defaults** while the
Builder canvas and published storefront rendered the creator's persisted appearance. Two guardrail tests
(`rccf71-1-canonical-theme-foundation`, `rccf71-3-hero-presentation`) pinned this defect and were failing.

Comparison of callers (source-traced):

| Caller | Selects `themeConfig` | Passes `themeConfig` |
|---|---|---|
| Builder preview (`builder-preview.actions.ts`) | ✅ (`:40`) | ✅ (`:51`) |
| Publish (`publishing/service.ts`) | ✅ (`:174`) | ✅ (`:258`) |
| Construction (`construction.actions.ts`) | ✅ (`:88`) | ✅ (`:109`) |
| Parity (`runtime-parity.ts`) | ✅ (`:186`) | ✅ (`:207`) |
| **Preview route (`storefront-loader.ts`)** | ❌ (was) | ❌ (was) |

---

## 4. Exact Implementation

One file, two lines (the canonical pattern already established in `construction.actions.ts:88,109` and
`runtime-parity.ts:186,207`).

### A. Prisma select (`storefront-loader.ts`)

```diff
 select: { id: true, themePackageId: true, themeColors: true, themeFonts: true, themeConfig: true },
```

### B. Snapshot construction (`storefront-loader.ts`)

```diff
 themePackageId: website.themePackageId,
 themeColors: (website.themeColors ?? {}) as Record<string, string>,
 themeFonts: (website.themeFonts ?? {}) as Record<string, string>,
+themeConfig: (website.themeConfig ?? {}) as Record<string, string>,
```

No individual theme property is hand-mapped (no `borderRadius`, `layoutDensity`, `headingWeight`, `hero*`,
`experience*`, `font` literals). The **entire** `themeConfig` object flows through the canonical
`buildRuntimeSnapshot → themeResolver.resolveForSnapshot → LayoutEngine → ComponentRenderer` pipeline. No schema
change, no new env var, no new resolution path.

### C. Preserved

Authorization (`canPreviewTenant`), published fallback, content/layout/theme loading, colors, fonts, caching,
tenant isolation, publish flow, storefront payment behavior — all unchanged.

---

## 5. Files Changed

| File | Change |
|---|---|
| `src/lib/storefront/storefront-loader.ts` | +2 / −1 (select + `themeConfig` arg) |

**Only this file was modified by RCCF-BUILDER-02.**

---

## 6. Existing Guardrails That Now Pass

Previously failing (RCCF-BUILDER-01):

| Test | Result after fix |
|---|---|
| `tests/unit/rccf71-1-canonical-theme-foundation.test.ts` | **PASS** (25/25) |
| `tests/unit/rccf71-3-hero-presentation.test.ts` | **PASS** (44/44) |

Assertions were **not** modified.

---

## 7. Additional Test Results

### Focused Builder baseline (5 suites)

```text
npx vitest run \
  tests/unit/builder-core.test.ts \
  tests/unit/builder-presentation.test.ts \
  tests/unit/rccf71-1-canonical-theme-foundation.test.ts \
  tests/unit/rccf71-5-2-builder-preview-gutter.test.ts \
  tests/unit/rccf71-3-hero-presentation.test.ts

Test Files  5 passed (5)
     Tests  95 passed (95)
```

### Broader RCCF-71.x Builder/theme suites

```text
9 suites → 6 passed / 3 failed
Tests: 158 passed / 4 failed
```

The 4 failures are **pre-existing and unrelated to this change** (verified by source tracing — the preview loader
never contained `applyExperienceOverride`/`resolveExperienceForCapabilities`, and this RCCF added neither):

| Test | Assertion | Nature |
|---|---|---|
| `rccf71-2-growth-theme-experience.test.ts` "the preview loader bakes the override-applied experience into the preview snapshot" | `storefront-loader.ts` contains `applyExperienceOverride` + `experience,` | **Distinct gap** — preview route does not bake the capability-filtered experience override |
| `rccf71-2-growth-theme-experience.test.ts` "applyExperienceOverride is the single override entry point used by all three resolution sites" | `storefront-loader.ts` contains `applyExperienceOverride` | Same gap |
| `rccf71-5-1-growth-visual-surfaces.test.ts` "preview, publish, and storefront continue using the shared experience chain" | `storefront-loader.ts` contains `applyExperienceOverride` | Same gap |
| `rccf71-6-1-entitlement-status.test.ts` "keeps the canonical resolver chain for preview and publish" | `storefront-loader.ts` contains `resolveExperienceForCapabilities(` | Same gap |

These pin that the preview route should resolve
`resolveExperienceForCapabilities(applyExperienceOverride(experienceRegistry.resolve({...}), themeConfig), planCode)`
and pass it as `experience` into `buildRuntimeSnapshot` (→ `renderingHints.experience`), exactly as
`publishing/service.ts:219-234,262` does. That is a **separate mechanism** from the P1-1 `themeConfig` input and was
**not** in this RCCF's mandate ("Implement ONLY the P1-1 defect"). No tests were rewritten.

---

## 8. Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** (clean) |
| `npm run lint` | **PASS** (warnings only, no errors; `storefront-loader.ts` not flagged) |
| `npm run build` | **PASS** — compiled successfully; 160 static pages; no build errors |
| `npx prisma validate` | **PASS** — schema valid |
| `git diff --check` | **PASS** (only pre-existing CRLF notice on `tests/fixtures/test-seed.ts`) |

---

## 9. Runtime Verification

**Code-path verified; live browser session NOT available.** No authenticated Builder/preview session exists in this
environment (consistent with the RCCF-RELEASE-04 smoke finding — production admin login is not reachable with the
available test credentials, and no local dev server session is provisioned). The invariant is therefore verified by:

- The two guardrail tests now passing, which assert the exact canonical threading in `storefront-loader.ts`.
- Source trace confirming `storefront-loader.ts` now supplies the identical `themeConfig` shape
  (`(website.themeConfig ?? {}) as Record<string, string>`) used by publish/construction/parity.
- Source trace confirming `buildRuntimeSnapshot` (unchanged) consumes `themeConfig` for
  `borderRadius`/`layoutDensity`/`headingWeight`/hero presentation with the same resolver both preview and publish use.

Expected invariant after fix:

```
Builder Canvas ──┐
Preview Route ───┼── buildRuntimeSnapshot ── themeResolver ── LayoutEngine ── ComponentRenderer
Publish ─────────┘            └── Website.themeConfig threaded by ALL THREE
```

---

## 10. Security / Tenant Isolation Verification

| Guardrail | Status |
|---|---|
| Unauthorized `?preview=true` falls back to published snapshot | Unchanged — `canPreviewTenant` gate untouched; `previewAuthorized: false` path untouched |
| Tenant isolation | Unchanged — website lookup still `where: { tenantId: tenant.id }` derived from the slug tenant |
| No client-provided tenant ID influences the selected Website | Unchanged — no client tenant input added |
| No cross-tenant themeConfig read | The added select reads `themeConfig` only from the **same** `tenant.id`-scoped Website row |
| Published storefront behavior | Unchanged — published branch untouched |
| Builder canvas behavior | Unchanged — `builder-preview.actions.ts` untouched |
| Theme apply/preview behavior | Unchanged — `applyThemePackage` / `?theme=` untouched |
| No schema migration / no new env vars / no provider/payment/commerce change | Confirmed |

---

## 11. Protected-Work Verification

- `src/app/onboarding/page.tsx` — pre-existing dirty before this RCCF; **untouched**.
- `tests/fixtures/test-seed.ts` — pre-existing dirty before this RCCF; **untouched**.
- No other protected/unrelated file modified.

---

## 12. Git State

| Check | Result |
|---|---|
| `git status --short` | New modification: `src/lib/storefront/storefront-loader.ts` only |
| `git diff --stat` | `storefront-loader.ts | 3 +-` (plus pre-existing unrelated diff) |
| `git diff --cached --stat` | Unchanged — 1 pre-existing staged closure doc |
| Commit | NONE |
| Push | NONE |
| Staged new work | NONE |

---

## 13. Deferred Next RCCF

**RCCF-BUILDER-02B (recommended, needs authorization) — Preview-route theme experience baking.** In
`src/lib/storefront/storefront-loader.ts`, resolve and thread the capability-filtered experience override into
`buildRuntimeSnapshot`:

- select `themePackageId` (already selected) and `themeConfig` (now selected);
- `const base = experienceRegistry.resolve({ id, category: themeDef?.category ?? null, premium: themeDef?.premium ?? null })`;
- `const overridden = applyExperienceOverride(base, (website.themeConfig ?? {}))`;
- resolve the tenant's active plan and `const experience = resolveExperienceForCapabilities(overridden, planCode)`;
- pass `experience` into `buildRuntimeSnapshot`.

This exactly mirrors `publishing/service.ts:219-234,262` and the Builder canvas
(`interactive-canvas.tsx`), and will green the 4 pinned tests. It was deliberately **not** included here to respect
the "implement ONLY P1-1" mandate.

---

## 14. Final Conclusion

RCCF-BUILDER-02 is **COMPLETE**. Acceptance criteria all met:

- ✅ `storefront-loader.ts` selects `Website.themeConfig`
- ✅ Preview route passes canonical `themeConfig` into `buildRuntimeSnapshot`
- ✅ No individual theme properties hand-mapped
- ✅ `rccf71-1-canonical-theme-foundation.test.ts` passes
- ✅ `rccf71-3-hero-presentation.test.ts` passes
- ✅ Builder core/presentation/gutter guardrails remain green (95/95 focused)
- ✅ TypeScript passes
- ✅ ESLint passes with no new errors
- ✅ Production build passes
- ✅ Prisma validation passes
- ✅ diff-check passes
- ✅ Tenant isolation intact
- ✅ Unauthorized preview behavior intact
- ✅ Only `storefront-loader.ts` changed
- ✅ No commit, no push

HARD STOP observed. No automatic progression to RCCF-BUILDER-03 / 04 / THEME-01 / Stitch redesign.