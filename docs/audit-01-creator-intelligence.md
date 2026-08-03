# AUDIT-01 — Creator Intelligence / AI Analysis Audit

Status: **Read-only audit** — no code was modified.
Date: 2026-08-04

---

## 1. High-level architecture diagram

```
UI (src/app/onboarding/page.tsx — "Analyze Profile")
  │  importCreatorProfile(sourceUrl)
  ▼
src/actions/onboarding.actions.ts
  │
  ├── createGenerationSession()           → session state machine (UI progress)
  │
  └── OnboardingService.importProfile()   (src/lib/onboarding/service.ts)
        │
        ├── detectPlatform(url)                    [youtube|instagram|tiktok|…|manual]
        ├── [youtube only] YouTubeScraperService.fetchChannelMetadata()
        │        └─ Google YouTube Data API v3 (channels?part=snippet,statistics)
        ├── buildContentSourceFromYouTube()  OR  buildContentSource()  ← EMPTY for non-YouTube
        │
        ▼
        KnowledgeBuilder.build(source)      (100% deterministic / heuristic)
        │   └─ CreatorProfiler, NicheDetector, BrandExtractor, AudienceProfiler,
        │      ContentAnalyzer, ContentClassifier, KeywordExtractor, SEOGenerator,
        │      ProductRecommender, SectionRecommender, ThemeSelector, SocialGraph
        │      → KnowledgeGraph
        ▼
        PersonaEngine.detect(graph)         → PersonaMatchResult { persona, score }
        ExperienceProfileBuilder.build()    → ExperienceProfile { …, confidence }
        │
        └── (back in action) NicheDetector.detect() re-run → categoryConfidence / requiresReview

DORMANT LLM LAYER (not wired into onboarding, no API keys):
  src/lib/ai/*          LlmIntelligenceEngine → OpenAIProvider (gpt-4o-mini), heuristic fallback
  src/lib/content/*     ContentStudio / HeroGenerator / SeoGenerator → aiEngine.getEngine().analyze()
  src/lib/generation/providers/*  6-provider multi-LLM runtime (never instantiated in src/)
  src/lib/generation/prompts/*    versioned prompt orchestrator (never invoked)
```

**Key finding:** the onboarding "AI analysis" pipeline is **100% deterministic/heuristic**.
It makes **zero LLM calls**. All LLM machinery exists but is either disabled (no
`OPENAI_API_KEY`) or dead code (never instantiated).

---

## 2. Runtime flow (actual implementation)

```
Profile URL
  → detectPlatform(url)                                  provision-pipeline.ts:157
  → YouTubeScraperService.fetchChannelMetadata(url)      youtube-scraper.service.ts:40  (YouTube ONLY)
  → ContentSource                                         buildContentSourceFromYouTube :186 | buildContentSource :168
  → KnowledgeBuilder.build(source)                       knowledge-builder.ts:44
       creator       = CreatorProfiler.profile           creator-profiler.ts:7     (niche + confidence)
       brand/audience/content/seo/theme/products/…       each heuristic extractor
       graph.confidence = average(7 sub-confidences)     knowledge-builder.ts:116
  → PersonaEngine.detect(graph)                          persona/engine.ts:14 → persona/registry.ts:24
       niche = graph.creator.niche
       candidates = detectorsForNiche(niche)             (fallback: default_creator, score 10)
  → ExperienceProfileBuilder.build(graph, persona, score) persona/engine.ts:24
       confidence = normalizeConfidence(score)            :125  (0.45–0.95 buckets)
  → NicheDetector.detect re-run (for UI category info)   onboarding.actions.ts:46
  → Generate path:
       PlanningContext → ExperiencePlan → LayoutComposer → WebsiteBlueprint → ArtifactEngine
  → Provision → Publish → session.complete(evaluationScore = experienceProfile.confidence,
                                            goldenValidationScore)               onboarding.actions.ts:322
```

Stage markers (`import_profile`, `knowledge_intelligence`, `persona_detection`, …) are
recorded for the UI progress experience; execution is synchronous inside
`runCreatorGeneration` (src/actions/onboarding.actions.ts:79).

---

## 3. Service dependency map

```
OnboardingService (src/lib/onboarding/service.ts:63)
  ├── KnowledgeBuilder          → CreatorProfiler, NicheDetector, BrandExtractor,
  │                                AudienceProfiler, ContentAnalyzer, ContentClassifier,
  │                                KeywordExtractor, SEOGenerator, ProductRecommender,
  │                                SectionRecommender, ThemeSelector, SocialGraph
  ├── PersonaEngine             → PersonaRegistry → ALL_DETECTORS (≈100 persona detectors)
  ├── ExperienceProfileBuilder
  ├── ExperiencePlanningEngine  → planners (hero/section/conversion/theme/navigation/…)
  ├── LayoutComposer            → WebsiteBlueprint
  └── ArtifactEngine            → storefront_json / theme_record / seo / builder_json …
YouTubeScraperService (src/services/youtube-scraper.service.ts) → Google Data API
NicheDetector (src/lib/generation/intelligence/niche-detector.ts) → NICHE_KEYWORDS (17 niches)
GoldenValidator (src/lib/generation/golden/validator.ts)          → GOLDEN_CREATORS (4 entries)
aiEngine (src/lib/ai/engine.ts)         → [LLM | Heuristic] — used by ContentStudio ONLY (unwired)
```

---

## 4. Input source inventory

| Source | Implemented? | What is actually captured | File |
|---|---|---|---|
| **YouTube** | ✅ (the only scraped platform) | channel id, title, description (500 chars), thumbnail, customUrl, subscriberCount | `src/services/youtube-scraper.service.ts:40` → Google Data API |
| **YouTube (richer)** | ✅ (separate provider, NOT in onboarding) | + bannerUrl, videoCount, viewCount, country, latest 8 videos w/ views+duration | `src/lib/providers/youtube/api.ts` |
| **Instagram** | ❌ for analysis (only an authenticated `/me/media` feed route) | nothing for classification | `src/app/api/instagram/route.ts` |
| **TikTok / LinkedIn / Twitch / Twitter / website** | ❌ | URL-derived username only | `buildContentSource` returns empty |
| **Bio / avatar / images / OCR / metadata** | ❌ for AI (no OCR, no image analysis) | bio/thumbnail only for YouTube | — |
| **Categories** | ⚠️ `source.categories` is a field but never populated by the scraper | always empty | `scoreAllNiches:85` |

**Deterministic (exists before analysis):** channel name, handle, bio, avatar, subscriber
count, channel ID (YouTube only). Everything else is **derived heuristically** (not AI).

---

## 5. AI call inventory

**In the onboarding analysis path: ZERO LLM calls.** All "intelligence" is rule-based.

| Component | LLM calls | Status |
|---|---|---|
| `OnboardingService.importProfile` / `generate` | 0 | live, deterministic |
| `KnowledgeBuilder`, `NicheDetector`, `PersonaEngine` | 0 | live, deterministic |
| `HeroGenerator.generate` (`src/lib/content/generators/hero.ts:27`) | 1 × `aiEngine.analyze()` | **no consumer** — not called anywhere |
| `SeoGenerator.generate` (`src/lib/content/generators/seo.ts:15`) | 1 × `aiEngine.analyze()` | **no consumer** |
| `LlmIntelligenceEngine.analyze` (`src/lib/ai/llm-engine.ts:55`) | up to 3 attempts (2 retries) | only reachable via the generators above |
| `ProviderManager` / `ProviderRouter` (`src/lib/generation/providers/`) | N/A | **never instantiated** in `src/` |

---

## 6. Prompt inventory

Three parallel, mostly-unused prompt systems:

1. **`src/lib/ai/prompts/v1.ts`** — `creator-intelligence` (the only prompt the LLM engine
   could actually use): SYSTEM + user prompt, inline JSON schema (19 fields), auto-registered
   in `PromptRegistry` (v1.0.0).
2. **`src/lib/content/prompts.ts`** — `registerContentPrompts()` registers 9 prompts
   (`content:hero|faq|seo|cta|newsletter|testimonials|pricing|links|contact`) embedding Zod
   schemas as JSON. **Never called** in `src/`.
3. **`src/lib/generation/prompts/`** — `VersionedPromptRegistry` + `PromptOrchestrator` +
   `TemplateEngine` ({{var}} interpolation) + `PromptValidator`; static definitions
   `hero.v1–v3`, `seo.v1–v2`, `branding.v1`, `products.v1`, `cta.v1`, `faq.v1`. **Never invoked.**

All prompts are TypeScript template strings. No `.md`/JSON prompt files exist. Three prompt
systems = maintenance debt (see §14).

---

## 7. Output schema documentation

**LLM schema (only one, not currently executed):** `CreatorIntelligenceSchema`
(`src/lib/ai/intelligence.ts:7`) — 19 fields:
`niche`, `subNiche|null`, `audience|null`, `brandPersonality|null`, `brandTone|null`,
`visualStyle|null`, `contentStyle|null`, `websiteGoal|null`, `monetization|null`,
`recommendedTheme`, `recommendedTemplate`, `recommendedSections[]`, `seoKeywords[]`,
`suggestedCta|null`, `trustSignals[]`, `contentPillars[]`, `confidence (0–1)`, `reasoning|null`.

**Heuristic twin** `AnalysisSchema` (`src/lib/ai/heuristic.ts:5`) — structurally identical.

**Live (deterministic) output types** (`src/lib/generation/intelligence/types.ts`, plain TS):
- `CreatorIntelligence` :31 — `{ name, username, bio, niche, subNiche[], platform, followers,
  engagement, contentFrequency, verified, confidence }`
- `KnowledgeGraph` :136 — `{ creator, brand, audience, products[], content, seo, theme,
  sections[], socialLinks[], businessModel, confidence }`
- `CreatorPersona` (`persona/types.ts:29`) — `{ id, name, niche, description, businessModel,
  typicalProducts[], contentStyle, audienceType, socialProofEmphasis, pricingEmphasis,
  defaultModules[], onboardingDefaults }`
- `ExperienceProfile` (`persona/types.ts:44`) — `{ persona, businessModel, creatorStage,
  commerceStage, brandStrength, audienceType, contentStyle, confidence }` ← primary consumer input

`formatConfidence(value)` (`intelligence/types.ts:307`): ≥90 very_high, ≥70 high, ≥50 medium,
≥30 low, else very_low.

---

## 8. Confidence calculation analysis

Confidence is **rule-based / heuristic**, layered across 4 independent stages (no AI):

| Layer | Formula | File |
|---|---|---|
| Niche confidence | `min(1, topNicheScore / 40)`; requiresReview if `< 0.4` or ambiguous (`top-second ≤ 25%`) | `niche-detector.ts:39-49` |
| Creator confidence | `0.3 base` + `+0.15 followers` + `+0.15 bio>20ch` + `+0.2 content≥5` + `+0.1 engagement` + `+0.1 posts`, cap 1 | `creator-profiler.ts:53-61` |
| Persona confidence | `normalizeConfidence(personaScore)` → ≥80→0.95, ≥60→0.85, ≥40→0.75, ≥20→0.6, else **0.45** | `persona/engine.ts:125-131` |
| Graph confidence | plain average of 7 sub-confidences (creator, brand, audience, content, seo, theme, businessModel) | `knowledge-builder.ts:116` |
| Blueprint confidence | `graph.confidence*0.3 + min(sections/10,0.3) + min(products/5,0.2) + seo 0.1 + theme 0.1` | `layout-composer.ts:72-79` |

The confidence **surfaced to the user** is `experienceProfile.confidence` (the persona bucket).
The **persona score** comes from keyword detectors matched by niche; an unmatched niche falls
back to `default_creator` with a flat `score = 10` → confidence `0.45`.

Golden validation (`golden/validator.ts:24`) is a separate, unrelated 8-dimension
regression check against 4 hardcoded creators (threshold 0.7). It does NOT read confidence.

---

## 9. Consumer map

| Consumer | File | Uses |
|---|---|---|
| Planning context | `src/lib/generation/planning-context/engine.ts:24` | KnowledgeGraph + ExperienceProfile → PlanningContext |
| Experience planning | `src/lib/generation/experience-plan/engine.ts:29` | ExperienceProfile (persona, pricing/social-proof emphasis, commerceStage) |
| Hero / copy generation | `composition/hero-composer.ts:6`, `section-composer.ts:10`, `content/vocabularies.ts:204` | `graph.creator.niche` → niche vocabulary |
| Theme recommendation | `intelligence/theme-selector.ts:12`, `composition/theme-composer.ts` | niche → THEME_PALETTES |
| Navigation | `experience-plan/planners/navigation-planner.ts`, `composition/navigation-composer.ts` | ExperiencePlan |
| SEO | `intelligence/seo-generator.ts`, `composition/seo-composer.ts:6` | niche + bio |
| Blueprint | `composition/layout-composer.ts:31` | KnowledgeGraph + ExperiencePlan |
| Artifacts → Builder defaults | `provision-pipeline.ts:128` → `builder_artifact` setting → `builder/artifact-loader.ts:17` | blueprint sections/theme |
| Provisioning | `provision-pipeline.ts:72` → `provisioning-service.ts:124` | generatedContent + generatedTheme + category |
| Publishing | `src/lib/publishing/service.ts:80` | builder layout + live CMS (not persona directly) |
| Analytics / beta dashboard | `features/analytics/service.ts:36`, `lib/beta/beta-dashboard-service.ts:93` | `evaluationScore`, `goldenValidationScore` |
| Session progress UI | `onboarding/page.tsx:194` | stage/progress experience |

Dependency shape: `ExperienceProfile` → Planning/Experience planners → Composer → Blueprint →
Artifacts → Provision/Publish/Builder. Persona/niche never persist into the published snapshot
directly (only generated copy/theme do).

---

## 10. Cost analysis

**Current AI cost: $0 per onboarding** (fully heuristic). The pipeline runs with no provider
keys and no LLM round-trips.

Where unnecessary cost WOULD occur (if enabled) — and current duplication:
- **3 duplicate prompt systems** (`src/lib/ai/prompts`, `src/lib/content/prompts.ts`,
  `src/lib/generation/prompts`) — the same intent (hero/SEO/creator intelligence) is defined
  three times; only one is reachable.
- **Duplicate analysis call sites:** `HeroGenerator` and `SeoGenerator` each call
  `aiEngine.analyze(input.profile)` independently (hero.ts:27, seo.ts:15) — one profile would
  be analyzed twice per generation (same prompt, two paid calls) with no shared cache between
  them.
- **Cache exists** (`intelligenceCache` in hero.ts:16; `src/lib/generation/intelligence/
  intelligence-cache.ts`) but only per-generator, not cross-generator.
- **Cost infrastructure is fully built but unused:** `MODEL_CAPABILITIES` per-token rates,
  `ProviderCostEstimator`, `GenerationCost`, `generation-budget-monitor`, `ProviderHealthTracker`
  (all in `src/lib/generation/providers/**`). The dashboards (`generation-cost-dashboard.ts`,
  `generation-reporting.ts`, `generation-analytics.ts`) are **hardcoded mock numbers**.

Opportunities (future): run analysis once per session and reuse its output across hero/SEO/
sections; route via the existing provider-fallback + rate-limiter; persist cost telemetry via
`platformTelemetry`.

---

## 11. Failure analysis

- **Provider failure (LLM path, currently unused):** `LlmIntelligenceEngine` retries
  `[429,500,502,503,504]` + timeouts with exponential backoff (2×2 attempts); JSON parse errors
  are NOT retried; falls back to `HeuristicIntelligenceEngine` on missing prompt, low confidence
  (<0.7), or exhausted retries (`llm-engine.ts:24-31,88-156`).
- **No OpenAI timeout** in the legacy provider (`providers/openai.ts` — plain fetch); generation
  providers use `AbortSignal.timeout(60s)`.
- **Partial/missing fields (live heuristic path):** missing bio/followers/content simply score
  zero; `NicheDetector` returns `niche="general"`, `confidence=0`, `requiresReview=true`
  (`niche-detector.ts:27-36`). The system does NOT fail — it degrades.
- **Low confidence:** `importCreatorProfile` still succeeds; returns `categoryRequiresReview`
  for the user to confirm; persona falls back to `default_creator`.
- **Golden validation** runs only for known URLs (`goldenDataset.isKnownUrl`); on mismatch it
  records regressions but does not block.
- **Publish retry** is workflow-owned (`retryPublish`, `RetryPolicy(3,100,1000)` with jitter);
  generation resumes from a checkpoint.
- **No crash path:** all heuristic extractors are total functions on empty input.

---

## 12. Case study — Cristiano Ronaldo → Persona: Creator, Confidence: Low

Traced through the implementation for an **Instagram URL** (his primary platform):

1. `detectPlatform("instagram.com/cristiano")` → `"instagram"` (`provision-pipeline.ts:157`).
2. Only YouTube has a scraper, so `buildContentSource(url, "instagram", name)`
   (`provision-pipeline.ts:168`) returns an **EMPTY source**: `bio:""`, `followers:0`,
   `content:[]`, `categories:[]`. ← **Root cause: no Instagram data source.**
3. `CreatorProfiler.profile(empty)` (`creator-profiler.ts:7`):
   - `NicheDetector.detect("")` → `getAllText` = `""` → all 17 niches score 0 → returns
     `{ niche: "general", score: 0, confidence: 0, requiresReview: true }`
     (`niche-detector.ts:27-36`).
   - `calculateConfidence(empty)` = `0.3` base, +0 followers/bio/content/engagement/posts = **0.3**
     (`creator-profiler.ts:53-61`).
4. `KnowledgeBuilder` (`knowledge-builder.ts:44`): `businessModel.confidence` = `0.3` (followers 0,
   `:116-120`); overall graph confidence ≈ average of sub-confidences ≈ **0.3**.
5. `PersonaRegistry.detect(graph)` (`persona/registry.ts:24`): `niche = "general"` → no detectors
   for `"general"` → **fallback `default_creator` with flat `score = 10`** (`:28-31`).
6. `ExperienceProfileBuilder.build(…, score=10)` (`persona/engine.ts:24`): `normalizeConfidence(10)`
   → 10 < 20 → **confidence 0.45** (`:125-131`). `creatorStage = "starting"` (followers 0, `:63`),
   `commerceStage = "none"`, `brandStrength = "none"`.
7. `importCreatorProfile` returns `persona = { id: "default_creator", name: "Creator" }`,
   `confidence = 0.45` (`onboarding.actions.ts:68-69`); `formatConfidence(0.45)` = **"low"**; the
   re-run `NicheDetector.detect` → `categoryConfidence = 0`, `categoryRequiresReview = true`
   (`onboarding.actions.ts:46-59`).

**Decision points producing the result:**
1. Platform handling — only YouTube is fetched (no Instagram/TikTok provider wired into
   `OnboardingService`).
2. Empty-source niche scoring — no text → `niche="general"`, confidence 0.
3. Creator-confidence floor of 0.3 with no signal.
4. Persona registry fallback to `default_creator` (score 10) for unknown niches.
5. `normalizeConfidence` bucketing maps score 10 → 0.45 → "low".

Note the **YouTube** variant would fare slightly better (channel meta + bio): niche might hit
`sports`/`fitness` keywords (conf ~0.3–0.5), creator confidence ~0.6, persona possibly a
`sports` detector — but his main Instagram identity still collapses to default Creator/Low.

---

## 13. Recommended extension points (extension over replacement)

**Safe, ready-made extension points (already built, just not wired):**
1. **Wire the existing `ContentStudio` / `HeroGenerator` / `SeoGenerator`** (`src/lib/content/`)
   into `artifact_generation` — they already call `aiEngine.getEngine().analyze()`. Hook them at
   the single `ArtifactEngine` generator seam (`integration/register-generators.ts:14`).
2. **Enable the multi-provider generation runtime** (`src/lib/generation/providers/`):
   `ProviderManager`/`ProviderRouter`/`ProviderFallback`/`ProviderRateLimiter`/cost estimator are
   complete and config-driven; wire `aiProviderFactory` (currently a no-op stub at
   `integration/provision-pipeline.ts:37`) with the existing `PROVIDER_PRIORITY` + per-tier
   `STRATEGIES`.
3. **Add platform scrapers behind the existing provider seam** — mirror `src/lib/providers/
   youtube/api.ts` (which already has the richer channel + latest-videos fetch) for
   Instagram/TikTok; extend `buildContentSource`/`buildContentSourceFromYouTube` in
   `provision-pipeline.ts` so non-YouTube sources stop being empty.
4. **Upgrade the confidence model incrementally** — keep `ExperienceProfile`/`KnowledgeGraph`
   as the source of truth, but let the LLM *enrich* (niche/audience/theme) rather than replace:
   use the existing `CreatorIntelligenceSchema` and route through `LlmIntelligenceEngine`'s
   built-in low-confidence fallback to `HeuristicIntelligenceEngine`.
5. **Expand `GOLDEN_CREATORS`** (currently 4 entries) — the validator + registry are
   config-driven and ready for more regression cases.
6. **Reuse `intelligenceCache`** at the session/aggregate level (not per-generator) to avoid
   duplicate analysis across hero/SEO.

**Keep untouched:** `GENERATION_STAGES` + session state machine, `ExperienceProfile`,
`WebsiteBlueprint`, provisioning, publishing, the builder artifact loader, the Construction/
Activity/Animation layers (27–30).

**Improve with care (not replacement):** dedupe the three prompt systems into the versioned
`PromptOrchestrator`; un-hardcode the cost dashboards onto `ProviderCostEstimator` + telemetry.

---

## 14. Technical debt

1. **Two disjoint LLM layers, neither active** — `src/lib/ai/*` (live consumers, disabled) vs
   `src/lib/generation/providers/*` (fully built, dead code). Duplicate OpenAI/Anthropic/
   provider abstractions.
2. **Three prompt systems** for the same content intents (only `creator-intelligence` reachable).
3. **Only YouTube is real; every other platform yields an empty `ContentSource`** — the single
   biggest quality ceiling for the "AI analysis".
4. **Per-generator AI duplication** (`HeroGenerator` + `SeoGenerator` each analyze the profile)
   with no shared cache → would double paid calls if enabled.
5. **Confidence is multi-source but disconnected** — niche confidence, creator confidence,
   persona-bucket confidence, graph average, and blueprint confidence are 5 different numbers
   that don't reconcile; the UI shows only `experienceProfile.confidence`.
6. **Cost/reporting modules are hardcoded mocks** (`generation-cost-dashboard`,
   `generation-reporting`, `generation-analytics`).
7. **No token/cost telemetry hooks** in the live path; `platformTelemetry` exists but isn't
   attached to providers.
8. `source.categories` is defined but never populated → the `+12` category signal is dead.
9. Legacy `OpenAIProvider` has **no timeout** (plain `fetch`).
10. Two richer YouTube implementations (`services/youtube-scraper.service.ts` vs
    `lib/providers/youtube/api.ts`) — onboarding uses the thinner one.

---

## 15. Suggested phased implementation roadmap

**Phase 0 — Wire the dormant LLM (low risk, immediate value)**
Hook `ContentStudio`/`HeroGenerator`/`SeoGenerator` into `ArtifactEngine`; point
`aiProviderFactory` at the existing `ProviderManager`; reuse `intelligenceCache` at session
scope. Result: AI copy on top of the unchanged heuristic pipeline, with graceful heuristic
fallback already built in.

**Phase 1 — Real input sources**
Add Instagram/TikTok scrapers behind the existing provider seam; populate `categories`;
wire the richer YouTube fetch. This alone fixes the Ronaldo-class case at the root.

**Phase 2 — Unify confidence**
Make `experienceProfile.confidence` a single, reconcilable composite (niche + persona + data
richness) produced in one place; keep the schema stable so consumers don't change.

**Phase 3 — AI-assisted classification (hybrid, not replacement)**
Run one LLM analysis per session through `LlmIntelligenceEngine` using the existing
`CreatorIntelligenceSchema`; merge with heuristic output (LLM wins where confidence high,
heuristic otherwise — the fallback already implements this contract).

**Phase 4 — Cost & observability**
Wire `ProviderCostEstimator` + `generation-budget-monitor` + `platformTelemetry`; replace
hardcoded dashboards; dedupe the three prompt systems into `PromptOrchestrator`.

Every phase extends existing systems; the `ExperienceProfile`/`KnowledgeGraph`/`WebsiteBlueprint`
contracts, generation stages, and the 27–30 presentation layers remain the single source of truth.
