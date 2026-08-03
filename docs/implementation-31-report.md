# Unified Profile Acquisition Engine — IMPLEMENTATION-31

## 1. Architecture summary

Phase 1 of the Creator Intelligence initiative. A single **acquisition layer**
that normalizes profile data from every supported platform into the existing
`ContentSource`, feeding the unchanged `KnowledgeBuilder` → `PersonaEngine` →
`ExperienceProfileBuilder`. The input quality improves; the intelligence
pipeline is untouched. No LLM, no invented values, no duplicate profile models.

```
URL → PlatformAdapter → Normalized ContentSource → KnowledgeBuilder → PersonaEngine → ExperienceProfile
```

## 2. Platform adapter architecture

`src/lib/generation/acquisition/`:

- **`types.ts`** — `PlatformAdapter` interface (platform, name, capabilities,
  matches, acquire, extractHandle) + `AdapterCapabilities` + `AcquireResult`
  (source + diagnostics + adapter meta) + `AcquisitionDiagnostics`.
- **`adapters/youtube.ts`** — uses the EXISTING YouTube scraper (Google Data
  API) exactly as the prior flow; returns the same base `ContentSource` as
  `buildContentSourceFromYouTube`, threads raw channel meta, adds warnings on
  degradation.
- **`adapters/manual.ts`** — honest fallback for Instagram/TikTok/LinkedIn/X/
  Twitch/website: reports no rich capabilities, derives only the URL username.
- **`adapters/index.ts`** — registry (`getAdapterForUrl`); future connectors
  register here without pipeline changes.
- **`engine.ts`** — `ProfileAcquisitionEngine.acquire()` selects the adapter,
  runs it, applies enrichment once, builds diagnostics.

Adapters own validation, normalization, capability reporting, error handling
and platform parsing. They never throw for data gaps.

## 3. Normalization flow

1. `detectPlatform(url)` selects the platform (single source of truth).
2. Adapter `acquire()` → base `ContentSource` (empty/missing fields stay empty).
3. `applyEnrichment()` — deterministic, LLM-free:
   - text normalization (zero-width strip, whitespace collapse)
   - link discovery from the bio + dedupe into `links`
   - website hostname detection + classification (website/social/store)
   - social-link classification
   - keyword extraction (stopword-filtered, deduped)
   - hashtag extraction
   - language detection (script detection + conservative word-boundary stopwords;
     returns null rather than guess)
   - media summary (counts only real media)
4. Enriched `ContentSource` → `KnowledgeBuilder`.

## 4. Capability model

Each adapter advertises what it can legitimately provide — consumers never
assume every platform has followers/categories/recent content:

```
AdapterCapabilities { supportsDisplayName, supportsBio, supportsFollowers,
  supportsFollowing, supportsPostCount, supportsVerification, supportsWebsite,
  supportsRecentContent, supportsMedia, supportsCategories, supportsLanguages,
  supportsLocation, supportsExternalLinks }
```

YouTube advertises the fields its Data-API call + enrichment provide and
honestly reports `supportsRecentContent: false`. Manual advertises only
website/external-links/languages (from enrichment). `listCapabilities()` turns
this into a diagnostics surface. Richer connectors (Instagram API, premium
connectors) register later with no consumer changes.

## 5. Files changed

| File | Purpose |
|---|---|
| `src/lib/generation/acquisition/types.ts` | Adapter contract + capability model + diagnostics |
| `src/lib/generation/acquisition/enrichment.ts` | Deterministic enrichment (no LLM) |
| `src/lib/generation/acquisition/adapters/{youtube,manual,index}.ts` | Adapters + registry |
| `src/lib/generation/acquisition/engine.ts` | `ProfileAcquisitionEngine` |
| `src/lib/generation/intelligence/types.ts` | `ContentSource` + optional enrichment fields (additive) |
| `src/lib/onboarding/service.ts` | `importProfile` consumes the engine (single path) |
| `src/actions/onboarding.actions.ts` | Surfaces `acquisition` diagnostics |
| `src/app/dev/generation-experience/page.tsx` | Dev-only acquisition probe (`?profileUrl=`) |
| `src/app/onboarding/page.tsx` | Accessible acquisition status line in preview |
| tests | `acquisition/__tests__/*`, `implementation31.spec.ts` |

## 6. Runtime flow

```
importCreatorProfile(sourceUrl)
  → OnboardingService.importProfile
    → ProfileAcquisitionEngine.acquire(url, creatorName)
        → getAdapterForUrl(url)                 [detectPlatform]
        → adapter.acquire(url)                  [YouTube: existing scraper; else manual]
        → applyEnrichment(source)               [deterministic]
        → buildDiagnostics(...)
    → KnowledgeBuilder.build(enrichedSource)    [UNCHANGED]
    → PersonaEngine.detect / ExperienceProfileBuilder.build   [UNCHANGED]
  → runCreatorGeneration → provisioning → publishing
```

## 7. Diagnostics overview

`AcquisitionDiagnostics { platform, adapter, capabilities, populatedFields,
missingFields, warnings, enrichedSignals, durationMs }`. Honest gaps:
capability-supported fields that came back empty are listed in `missingFields`,
never fabricated. Surfaces in the onboarding preview (accessible text) and the
dev probe. Does not change onboarding behavior.

## 8. Performance notes

- Normalize once: acquisition runs a single adapter call + one enrichment pass;
  the enriched `ContentSource` is reused by all downstream consumers.
- No duplicate acquisition work (`normalize once` — verified by test).
- No LLM calls → no AI cost added.
- Diagnostics are O(fields) — negligible.
- YouTube keeps the exact single Data-API call (no extra requests).

## 9. Unit test summary

**26 tests** across two suites:
- **Enrichment (15):** text/handle normalization, link extraction + hostname +
  classification, hashtags, keywords (stopword/dedupe), language detection
  (script + English; null for empty/ambiguous — never guesses), `applyEnrichment`
  (no fabrication for empty sources, website/keywords/hashtags/language from a
  real bio, link merge, media only when present).
- **Adapters + engine + diagnostics (11):** YouTube capability honesty, base
  `ContentSource` **identical** to `buildContentSourceFromYouTube` (regression),
  additive enrichment, channel-meta threading, graceful fetch-failure with
  warning (never throws), Instagram/TikTok no-fabrication fallback, missing-field
  reporting, one-fetch-per-acquire.

Full suite: **82 files / 1752 tests**.

## 10. Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅
(fixed a build issue: acquisition modules are server-only, no `"use server"`
directives on sync exports).

## 11. Playwright Local

`R5` — **4/4 passed (45s)** against `http://localhost:3000`:
1. YouTube acquisition still resolves richly via the new engine (real YouTube
   Data-API call for `@MrBeast`; displayName + followers populated; persona
   pipeline runs on the normalized source).
2. Instagram URL normalizes with **no fabricated data** (only `links` populated;
   `bio`/`followers` absent; `website` honestly missing).
3. TikTok fallback stays empty/graceful (no bio/content/categories invented).
4. DOM reflects the runtime acquisition diagnostics (adapter/capabilities/line).

## 12. Playwright Production

`https://influencer-space-alpha.vercel.app` — **4/4 passed (32.7s)** (deployed
commit `5af0674`). Same verification against production.

## 13. Browser verification

The dev acquisition probe's DOM (`acq-platform`, `acq-adapter`, `acq-populated`,
`acq-missing`) matches the runtime diagnostics exactly, locally and in
production. YouTube → `youtube-data-api` with populated profile fields;
Instagram/TikTok → `manual` with only the URL-derived username + links. The
Browser DOM → Acquisition Engine → KnowledgeBuilder → Builder → Published
Storefront chain remains synchronized (acquisition is a pure input producer;
generation/publish unchanged).

## 14. Commit message suggestion

```
feat(acquisition): Unified Profile Acquisition Engine
- platform adapter contract + capability model (advertise, don't assume)
- ProfileAcquisitionEngine normalizes once into ContentSource + diagnostics
- deterministic enrichment (language/keywords/hashtags/links/website) — no LLM
- YouTube flow preserved (same scraper + base ContentSource, additive fields);
  honest manual fallback for Instagram/TikTok/LinkedIn/X/Twitch
- R5 Playwright (4) local & production; 26 unit tests
```
