# Hybrid Intelligence Enrichment Engine — IMPLEMENTATION-32

## 1. Architecture summary

Phase 2 of the Creator Intelligence Initiative. A **Hybrid Intelligence
Enrichment Engine** that fills knowledge gaps with a single, low-cost AI call —
only when deterministic confidence is insufficient. Deterministic intelligence
always wins; AI only enriches. The acquisition pipeline, KnowledgeBuilder,
PersonaEngine, ExperienceProfileBuilder and all downstream systems are untouched.

```
ContentSource → Deterministic Enrichment → KnowledgeBuilder → PersonaEngine
  → ExperienceProfile
  → Hybrid Intelligence Enrichment (below threshold) → IdentityProfile
  → Planning → Composition → Artifacts → Provisioning → Publishing
```

**Deterministic First. AI Second. Knowledge First. Generation Last.**

## 2. Hybrid Intelligence architecture

`src/lib/generation/intelligence/enrichment/`:

- **`config.ts`** — entity types, enrichment config (AI trigger threshold,
  prompt id/version, one-call guard, cache TTL, confidence-upgrade cap),
  evidence contributor weights, deterministic merge policy.
- **`types.ts`** — `IdentityProfile`, `IdentityEnrichmentInput`, diagnostics.
- **`confidence.ts`** — evidence-based confidence contributors + weighted
  composite (extends, never discards, existing confidence).
- **`merge.ts`** — deterministic merge layer (config-driven policy).
- **`hash.ts`** — stable normalized-source SHA-1 for cache keys.
- **`provider.ts`** — wires the EXISTING provider stack (ProviderManager +
  router/fallback/rate-limiter/health/cost) from env keys; never MockProvider.
- **`prompt.ts`** — renders the existing versioned `creator-intelligence-enrichment`
  prompt through the existing PromptOrchestrator.
- **`engine.ts`** — `HybridIntelligenceEnrichmentEngine.enrich()`.

## 3. IdentityProfile schema

Canonical, immutable enriched intelligence (raw acquisition stays in
ContentSource; deterministic intelligence stays in KnowledgeGraph):

```
IdentityProfile {
  entityType: EntityType | null          // 19 configured entity types
  persona: { id, name } | null
  industry: string | null
  primaryNiche: string | null
  secondaryNiches: string[]
  audience: { description, interests[] } | null
  brand: { position, communicationStyle, visualStyle } | null
  contentStyle / businessModel: string | null
  themeRecommendation: { themeId, confidence } | null
  sectionRecommendations: string[]
  confidence: number                     // composite, 0..1
  evidence: IdentityEvidence[]
  ai: { used, provider, model, promptVersion, cacheHit, latencyMs, cost,
        confidenceBefore, confidenceAfter }
  diagnostics: EnrichmentDiagnostics
}
```

## 4. Merge strategy

Config-driven (`MERGE_POLICY`):
- Deterministic values win (`persona`, `primaryNiche`, `industry`).
- AI fills missing fields only (`entityType`, `audience`, `brand`,
  `contentStyle`, `businessModel`, `secondaryNiches`, theme/sections, ...).
- AI may upgrade confidence, capped (`maxAiConfidenceUpgrade: 0.2`).
- AI never overwrites verified/deterministic facts.
- Conflicts are recorded in `mergeDecisions` — never silent.

## 5. Confidence model

Evidence-based, weighted contributors (extends existing confidence):

| Contributor | Weight | Source |
|---|---|---|
| Deterministic Intelligence (graph confidence) | 0.35 | deterministic |
| Profile Completeness | 0.20 | deterministic |
| Persona Match (existing bucket normalization) | 0.20 | deterministic |
| Platform Coverage (capabilities vs populated) | 0.10 | deterministic |
| Keyword Quality | 0.05 | deterministic |
| Cross-Signal Agreement (deterministic vs AI niche) | 0.10 | ai |
| AI Enrichment (AI confidenceAdjustment) | 0.20 | ai |

`composite = Σ(score·weight) / Σ(weight)`. The existing `graph.confidence` and
persona bucket values are included verbatim — never discarded.

## 6. Provider integration

The onboarding pipeline now consumes the **existing** generation provider
system (first consumer in `src/`). `provider.ts` builds a lazy singleton
`ProviderManager` from env keys; routing uses the existing `PROVIDER_PRIORITY`
(`deepseek → google → openai → anthropic`, i.e. DeepSeek Chat → Gemini Flash →
GPT-4o Mini → Claude Haiku with each provider's default model) with the built-in
fallback, rate limiter, health tracking and cost estimator. No new provider
abstraction, no hardcoded provider selection. `MockProvider` is never registered
(its canned output would fabricate profile data). When no keys are configured,
enrichment is skipped and the deterministic pipeline continues.

## 7. Prompt specification

`creator-intelligence-enrichment.v1` (added to the existing versioned prompt
registry via `registerPromptDefinitions`). Structured `json_object` output,
`maxTokens: 700`, `temperature: 0.2`. It receives ONLY the compact known
context (platform, displayName, username, bio, verified, followers, website,
keywords, hashtags, languages, categories, niche, persona, confidence, missing
fields, capabilities) — never webpages/HTML/screenshots, never asks to browse.
It is explicitly instructed to enrich only, never regenerate deterministic
facts, and to output the exact enrichment JSON schema.

## 8. Cache architecture

Reuses the existing `ProviderCache` (over a shared `InMemoryGenerationCache`).
The engine passes a stable `cacheKey = identity:<sourceHash>:<promptVersion>`
(sourced from a normalized-SHA-1 of the ContentSource). A write-through stores
the successful AIResponse under the same key the router reads
(`prompt:<provider>:<hash>`), so duplicate enrichment short-circuits at zero
cost. No duplicate cache infrastructure.

## 9. Cost analysis

- Maximum ONE AI enrichment call per onboarding (config guard).
- High deterministic confidence → skip AI entirely (zero cost).
- Cache hit → zero cost, reuses the prior enrichment.
- Per-call cost reported from the provider's AIResponse (`cost`) plus
  estimate/cost tables already in the existing `ProviderCostEstimator`.
- No provider keys configured today → zero calls (deterministic only).

## 10. Diagnostics overview

`EnrichmentDiagnostics`: `aiUsed`, `provider`, `model`, `cacheHit`,
`promptVersion`, `latencyMs`, `cost`, `confidenceBefore`, `confidenceAfter`,
`fieldsEnriched`, `fieldsPreserved`, `mergeDecisions`, `notes`. Surfaced in the
dev probe (`identity-line`, `id-notes`, ...) and the onboarding action payload.

## 11. Runtime flow

```
importProfile(sourceUrl)
  → ProfileAcquisitionEngine.acquire()           [IMPLEMENTATION-31]
  → KnowledgeBuilder.build() / PersonaEngine / ExperienceProfileBuilder
  → HybridIntelligenceEnrichmentEngine.enrich()
      deterministic composite confidence
        ≥ threshold → SKIP AI (identity = deterministic)
        < threshold → single call via ProviderManager (cache-checked)
            fail/no keys → deterministic fallback (never blocks)
            ok → parse → merge (deterministic wins) → IdentityProfile
  → runCreatorGeneration → provisioning → publishing
```

## 12. Files changed

| File | Purpose |
|---|---|
| `intelligence/enrichment/{config,types,confidence,merge,hash,provider,prompt,engine,validate}.ts` | Enrichment engine |
| `prompts/definitions/creator-intelligence-enrichment.ts` + `definitions/index.ts` | Enrichment prompt in existing registry |
| `onboarding/service.ts` | `importProfile` enriches → `IdentityProfile` on the result |
| `actions/onboarding.actions.ts` | Surfaces `identity` summary |
| `app/dev/generation-experience/page.tsx` | Identity + AI panel in the dev probe |
| `generation/golden/{types,registry}.ts` | Expanded dataset (10 entries) + entityType anchors |
| tests | `enrichment/__tests__`, `golden/__tests__/golden-regression`, `implementation32.spec.ts` |

## 13. Unit test summary

- **Enrichment (19):** confidence contributors + composite (never exceeds 1, AI
  contributor only when used), merge strategy (deterministic persona preserved,
  AI fills missing, confidence capped, unconfigured entity types rejected),
  hash stability, prompt rendering + schema, engine behavior (high-confidence
  skip → no call; low-confidence → exactly one call; provider failure →
  deterministic fallback; unparseable output → continue; stable cache key per
  source), provider routing (empty factory → failure; scripted provider +
  cache-hit prevents the duplicate call), Ronaldo + MrBeast golden regression.
- **Golden regression (4):** dataset contains the 10 representative entries;
  rich sources never collapse to `default_creator`; enriched entityType targets
  reproduce; Ronaldo regression resolved (not default, entityType athlete,
  niche sports, confidence > 0.5).
- Full suite: **84 files / 1775 tests**.

## 14. Build summary

`npx tsc --noEmit` ✅ · `npm run build` → `✓ Compiled successfully` ✅

## 15. Playwright Local

`R6` — **4/4 passed (44s)** against `http://localhost:3000`:
1. High-confidence YouTube creator (MrBeast, real API) skips AI; notes record
   the confidence decision.
2. Low-confidence Instagram profile → AI eligible; graceful `ai:no_providers`
   fallback (no keys); never blocks.
3. IdentityProfile renders and stays synchronized with the acquisition/persona
   runtime.
4. Ronaldo low-confidence pre-enrichment state surfaced (Creator / low conf).

## 16. Playwright Production

`https://influencer-space-alpha.vercel.app` — **4/4 passed (37.5s)** (deployed
commit `c208434`).

## 17. Browser verification

The dev probe's `identity-line`/`id-ai`/`id-notes` DOM matches the runtime
enrichment diagnostics exactly, locally and in production: high-confidence
profiles record the deterministic skip; low-confidence profiles record AI
eligibility + graceful fallback. Browser DOM → Generation Runtime → Acquisition
Engine → KnowledgeBuilder → Hybrid Intelligence → IdentityProfile → Planning →
Builder → Published Storefront remain synchronized (enrichment is a pure
enhancement; generation/publish unchanged).

## 18. Performance notes

- No additional work on high-confidence skips or cache hits.
- Normalize + hash once; one prompt render; one serialization.
- Single manager singleton (no duplicate provider initialization).
- Evidence/merge are O(fields); diagnostics O(fields).
- No timers, no polling; the one AI call is the only added latency, and only for
  low-confidence profiles with credentials configured.

## 19. AI cost analysis

| Scenario | AI calls | Cost |
|---|---|---|
| Deterministic confidence ≥ 0.5 | 0 | $0 |
| Cache hit (same normalized source) | 0 | $0 |
| Low confidence, providers configured | 1 | ~$0.001 (DeepSeek) |
| Low confidence, no keys / all fail | 1 attempt → failure | $0 (no network) |
| Per onboarding (maximum) | **1** | capped |

The `maxAiCallsPerOnboarding` guard + threshold + cache + provider cost tables
keep spend minimal and observable.

## 20. Commit message suggestion

```
feat(intelligence): Hybrid Intelligence Enrichment Engine
- one AI call max, only below a configurable confidence threshold
- wires onboarding into the existing provider stack (deepseek→google→openai→
  anthropic), reuses prompt registry + ProviderCache (write-through)
- IdentityProfile (canonical), evidence-based confidence, deterministic merge
- golden dataset expanded (Ronaldo/MrBeast/Nike/...); Ronaldo regression resolved
- R6 Playwright local & production; 23 unit + 4 golden-regression tests
```
