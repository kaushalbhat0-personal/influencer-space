# Creator Onboarding & Intelligence Pipeline — RCCF-AUDIT-03

**Date:** 2026-08-05  
**Status:** COMPLETE — Read-Only Audit

---

## 1. Current Onboarding Architecture

### Entry Points — 4 Distinct Flows

| # | Flow | Entry | Auth | Onboarding Required? |
|---|---|---|---|---|
| 1 | **Self-Serve Creator** | `/signup` → `/onboarding?url=` | Public → Auth | Yes (5-step wizard) |
| 2 | **Partner-Created Creator** | Agency imports → `/claim-invite?token=` | Public | **No** (pre-provisioned) |
| 3 | **Manual Wizard** | `/admin/create` | Admin/Agency | No (post-auth; uses blueprint selection) |
| 4 | **Demo Seed** | `/signup` with demo_seed strategy | Public | Uses AI pipeline |

### Route Flow Diagram

```
PUBLIC ENTRY POINTS
├── /signup (SignupForm — 4 steps: persona → plan → account → provisioning → success)
│   ├── creator → /onboarding?url=&persona=creator&plan=
│   └── agency → /agency/dashboard (skip onboarding)
│
├── /admin/login (NextAuth signIn)
│
├── /claim-invite?token=&email= (Partner invitation)
│   └── claimCreatorInvitation() → signIn → /admin/dashboard (skip onboarding)
│
└── /api/auth/register (POST — creates user, billing account, subscription)

AUTHENTICATED ENTRY POINTS
├── /onboarding (5-step wizard: welcome → import → preview → generating → complete|error)
│   ├── importCreatorProfile(sourceUrl) → AI analysis
│   ├── runCreatorGeneration() → 13-stage pipeline
│   ├── retryPublish() (if publish failed)
│   └── /admin/dashboard (on success)
│
└── /admin/create (4-step wizard: industry → style → review → generating → done)
    └── /builder or /[slug] (on success)
```

### Middleware Lifecycle Guard

| State | Route | Redirect |
|-------|-------|----------|
| VISITOR | `/admin/*` | → `/signup` |
| AUTHENTICATED (no tenant) | `/onboarding` | Allowed |
| READY (has tenant) | `/onboarding` | → `/admin/dashboard` |
| AGENCY_ADMIN | Any non-agency route | → `/agency` |
| SUPER_ADMIN | Any non-super-admin route | → `/super-admin` |

---

## 2. Intelligence Pipeline — 13 Stages

```
Source URL → Profile Acquisition → Knowledge Graph → Persona Detection
→ Hybrid AI Enrichment → Evidence Intelligence → Relationship Intelligence
→ Website Blueprint → Storefront Composition → Provisioning → Builder → Publishing → Golden Validation
```

### Import Source Matrix

| Source | Status | Confidence | AI Calls | Extracts |
|--------|--------|-----------|----------|----------|
| **YouTube** | Active | 50-80% | 1 (enrichment if conf < 0.5) | Channel metadata, subscribers, links, products, palette |
| **Manual** | Active | 90% | 0 | Name only → minimal profile |
| **Demo Seed** | Active (dev only) | 95% | 0 | Full pre-built profile |
| **Google Business** | Experimental | 30-45% | 1 | Business name from Maps URL |
| **Instagram** | **Not implemented** | — | — | — |
| **TikTok** | **Not implemented** | — | — | — |
| **Twitch** | **Not implemented** | — | — | — |
| **Website** | **Not implemented** | — | — | — |
| **LinkedIn** | **Not implemented** | — | — | — |
| **X/Twitter** | **Not implemented** | — | — | — |

### Required Fields — Current

| Field | Actually Required? | Can Be Optional? |
|-------|-------------------|------------------|
| Email | Yes (account creation) | No |
| Password (8+ chars) | Yes (account creation) | No |
| Name | Yes (display name) | Could default from profile |
| Source URL (YouTube) | **Artificially required** | **Yes — could be optional** |
| Category | Semi-required (dropdown w/ review) | Could auto-detect |
| Plan Code | Yes (defaults to creator_launch) | No |

**Key finding:** YouTube URL is currently the primary import path. There is no "Skip AI" or "Import later" option. Creators MUST paste a URL or they can't proceed. The manual strategy exists as a fallback in code but isn't exposed as a UI option at `/onboarding`.

---

## 3. Dead Code Inventory

| Area | Files | Status |
|------|-------|--------|
| **Entire `src/lib/import/`** | 5 files (adapters/youtube, manual, demo-seed; types; index) | **Dead** — self-declared `@deprecated`, re-exports from `@/lib/acquisition` |
| **Legacy pipeline** | `OnboardingService.generate()` | Partially dead — runs as fallback but overlaps with IMP31-38 inline path |
| **Duplicate YouTube logic** | `inferProducts()`, `inferPalette()`, `extractHandle()` | Duplicated in 2 locations (acquisition + import) |
| **Unimplemented strategies** | instagram, twitch, website, tiktok | Declared as types but no adapters exist |
| **Section recommender** | `getSectionsForNiche()` | Returns identical array for every niche — dead configuration |
| **Dual adapter registries** | `AcquisitionRegistry` (legacy) + IMP31 `ADAPTERS` | 4 vs 2 adapters — should consolidate |

---

## 4. Technical Debt

| Item | Impact |
|------|--------|
| Two parallel adapter registries | Maintenance burden, drift risk |
| Two parallel pipeline systems | Debugging complexity, possible divergence |
| YouTube forced as primary source | Limits adoption for creators without YouTube |
| No "skip AI" UX | Frustration for creators who want manual setup |
| No "import later" UX | No path to add social profiles post-onboarding |
| Session polling (1500ms interval) | Unnecessary load for fast stages |
| Golden validation score | Only works for known test URLs — not production-useful |

---

## 5. Opportunities (Recommended Architecture)

### Import Provider Registry

Wrap the existing `PlatformAdapter` interface into a proper registry:

```typescript
interface ImportProvider {
  id: string;              // "youtube", "instagram", "website", "linkedin"
  label: string;           // "YouTube", "Instagram", "Website"
  icon: string;            // Component name
  adapter: PlatformAdapter;
  capabilities: AdapterCapabilities;
  inputType: "url" | "handle" | "domain" | "file";
  placeholder: string;     // "Paste your YouTube channel URL"
}
```

This enables adding Instagram, LinkedIn, Twitch without changing the pipeline.

### Feasibility Assessment

| Source | Feasibility | Requires | Effort |
|--------|-------------|----------|--------|
| **Instagram** | High | Instagram Basic Display API or scraping | Medium |
| **Website (URL)** | High | HTML metadata + Open Graph extraction | Low |
| **LinkedIn** | Medium | LinkedIn page scraping (no official API for creators) | Medium |
| **Twitch** | Medium | Twitch API (Helix) — channel metadata | Medium |
| **X/Twitter** | Low | X API v2 (paid tier) | High |
| **Manual AI** | High | Free-text input → AI extraction (reuse enrichment engine) | Low |

### Manual AI Onboarding (recommended first addition)

Allows creators to type a free-text description of themselves instead of pasting a URL. The existing `HybridIntelligenceEnrichmentEngine` can process arbitrary text through the same prompt pipeline. This requires:
1. A new `ManualAIAdapter` implementing `PlatformAdapter`
2. A textarea UI at the `/onboarding` import step as an alternative to URL input
3. No other pipeline changes needed

---

## 6. Test Coverage

| Area | Coverage |
|------|----------|
| `onboarding.actions.ts` | **Heavy test coverage** — multiple test files verify the full pipeline |
| `SignupForm.tsx` | Unit-tested |
| Registration API | Unit-tested |
| `claimCreatorInvitation` | Unit-tested |
| Session management | Unit-tested |
| Provisioning | Unit-tested (transaction rollback, member add, workspace create) |
| Intelligence pipeline | Unit-tested (enrichment, evidence, relationship, composition) |
| **AI enrichment edge cases** | Well-tested (caching, fallback, 0-confidence, max-upgrade cap) |

---

## 7. Production Verification

- [x] All 4 entry points verified functional
- [x] 13-stage pipeline verified in unit tests
- [x] Session lifecycle (create → start → stage update → complete/fail → retry) verified
- [x] Partner invitation flow verified (provision → invite → claim → dashboard)
- [x] Middleware redirects verified for all lifecycle states
- [x] Polling interval functions correctly
- [x] Error states: profile import failure, generation failure, provisioning failure, publish failure — all handled with retry/recovery paths

---

## 8. Recommendations

1. **Add Manual AI onboarding** — lowest effort, highest impact. Text input → AI extraction. Removes YouTube dependency.
2. **Add Website import** — Open Graph + metadata extraction. Very low effort.
3. **Add Instagram adapter** — high demand from creators.
4. **Consolidate adapter registries** — merge `AcquisitionRegistry` into IMP31 `ADAPTERS`.
5. **Remove `src/lib/import/` dead code** — 5 files, self-declared deprecated.
6. **Expose "Skip AI" / "Start Blank" option** — bypass the URL requirement.
7. **Reduce polling interval** — 1500ms → 3000ms for slow stages, or switch to event-driven (already has `subscribeSessionEvents`).

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| YouTube API rate limits | Medium | Manual fallback already exists |
| AI provider outage | Low | Deterministic path skips AI when confidence >= 0.5 |
| Session corruption | Low | Full audit trail via `HistoryEvent[]`, retry with `maxRetries: 3` |
| Partner invitation expiry | Low | Invitations have expiry; creator can request re-send |
| Unimplemented adapters | Medium | Falls through to Manual adapter gracefully |
