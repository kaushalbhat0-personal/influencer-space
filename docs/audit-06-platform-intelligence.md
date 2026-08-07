# Audit-06 — Platform Intelligence Integration

RCCF-AUDIT-06 · Launch Readiness Initiative.

**Type:** Read-only audit. No implementation, no refactoring, no runtime
changes. Documentation only.

**Objective:** Audit every platform runtime and verify that all intelligence is
fully integrated across CreatorStore — eliminate isolated intelligence and
ensure every runtime contributes wherever appropriate.

## 1. Scope

Runtimes audited: Identity, Experience, Theme, Blueprint, Commerce, Finance,
Success, Knowledge, Goals, Recommendation — across 15 areas (Onboarding,
Dashboard, Builder, Website Generation, Storefront, Commerce, Success,
Knowledge, Goals, Recommendation, Super Admin, Events, Performance, Mobile,
Launch Gaps).

## 2. Headline finding

There are **two disconnected worlds**:

1. **Legacy generation stack** (`src/lib/generation/`, `src/lib/onboarding/`,
   `src/lib/creation/`, `src/lib/storefront/`) — drives onboarding, generation,
   the create wizard and storefront data. Fully wired but **writes creator
   intelligence and never reads it back**.
2. **Intelligence runtimes** (`src/modules/{knowledge,goals,recommendation}-runtime/`
   + `src/lib/creator-success/runtime.ts`) — the EPIC-04/05/06 stack. Well
   integrated on admin surfaces, **absent from onboarding, generation and
   (mostly) storefront**.

Proof of the wall: a search of `src/lib` for
`knowledge_completion | creator_goals | goals-runtime | knowledge-runtime |
recommendation-runtime | goalProfileService | knowledgeScoreService |
recommendationRuntime` returns **zero matches**. The new runtimes live entirely
in `src/actions`, `src/app`, `src/features/{dashboard,builder}` and `src/modules`.

## 3. Runtime scorecard

Scored 0–10 per dimension. Total /50.

| Runtime | Architecture | Integration | Coverage | Isolation¹ | Future-ready | Total /50 |
| --- | --- | --- | --- | --- | --- | --- |
| Identity (enrichment) | 8 | 4 | 3 | 7 | 7 | **29** |
| Experience (visual) | 9 | 9 | 8 | 2 | 9 | **37** |
| Theme | 9 | 9 | 9 | 2 | 9 | **38** |
| Blueprint (all stacks) | 7 | 2 | 2 | 9 | 6 | **26** |
| Commerce | 6 | 4 | 4 | 7 | 6 | **27** |
| Finance | 9 | 9 | 9 | 2 | 9 | **38** |
| Success | 8 | 3 | 3 | 7 | 8 | **29** |
| Knowledge | 9 | 6 | 6 | 5 | 9 | **35** |
| Goals | 9 | 6 | 6 | 5 | 9 | **35** |
| Recommendation | 9 | 5 | 5 | 5 | 9 | **33** |
| **Average** | **8.3** | **5.7** | **5.5** | **5.1** | **8.1** | **65%** |

¹ Isolation = higher means *less* connected (worse). Theme/Finance/Experience
score low isolation because they are fully wired.

## 4. Findings by area

### Area 1 — Onboarding (score 30/100)
- Participates: Experience stages (progress UI), Theme (provisioning), Finance
  (plan). Identity is computed then **dropped** by the UI.
- Missing: Knowledge Score, goal recommendation + seeding, adaptive questions,
  Recommendation output (computed and discarded in `importCreatorProfile`).
- New creators start with **no goals, no declared facts, no knowledge score**.

### Area 2 — Dashboard (70/100)
- Knowledge, Goals, Recommendations, Commerce, Health, Finance all present.
- Success Runtime absent; quick-start and a hardcoded "next steps" block are
  not runtime-driven.
- Performance: 3× snapshot build per render (see Area 13).

### Area 3 — Builder (75/100)
- Knowledge hints, goal suggestions, per-section recommendations, theme,
  experience preview all present.
- Goal-driven commerce ordering unused; global recommendations (SEO/domain/
  publish) never match a section; no SEO/brand panel.

### Area 4 — Website Generation (35/100)
- Consumes Experience, Theme, legacy Blueprint. Identity computed but dropped.
- **Does not consume** Goals or persisted Knowledge declared facts — prompts,
  blueprints and composition react only to source/niche/business-model/evidence.

### Area 5 — Storefront (80/100)
- Goals ordering, Theme, Experience, Commerce, Trust, SEO all wired.
- Knowledge declared facts not rendered; Recommendation not present (admin-only
  by design, but note the split). Legal is platform-level, not creator-level.

### Area 6 — Commerce (30/100)
- Finance (checkout/orders) wired. Knowledge, Goals (ordering is dead code),
  Recommendations, Success all absent. Commerce pages are plain CRUD.

### Area 7 — Success Runtime (25/100)
- Single consumer (Recommendation context). Not on dashboard/builder/
  knowledge/goals/super-admin. Three parallel "next step" systems coexist:
  `getQuickStartSteps`, `getCreatorSuccess`, `goalAwareNextTask`.

### Area 8 — Knowledge Runtime (60/100)
- Dashboard, knowledge page, builder hints, goal alignment, recommendations
  wired. Not on storefront, generation, commerce, or super-admin.

### Area 9 — Goals Runtime (60/100)
- Homepage, navigation, builder, dashboard, knowledge alignment,
  recommendations wired. Not in generation; commerce ordering is dead code.

### Area 10 — Recommendation Runtime (55/100)
- Dashboard, builder, knowledge, goals affinity, success context, super-admin
  analytics wired. Not on onboarding/storefront/commerce. `markShown` writes on
  every read.

### Area 11 — Super Admin (45/100)
- Finance, health, tenants, recommendations analytics wired. No per-tenant
  knowledge/goals/success. **`/super-admin/recommendations` missing from the
  actual sidebar registry** (`src/config/admin-registry.ts`).

### Area 12 — Events (20/100)
- Platform events, AuditLog, generation-session events, builder events all
  exist — but **no intelligence runtime emits anything**. `analyticsEngine`
  has zero call sites.

### Area 13 — Performance (35/100)
- `getDashboardData` builds the snapshot **3×** (~57 DB queries), computes
  knowledge/storefront scores **2×**, goal alignment **2×**, counts **2×**.
- No caching on the snapshot→score pipeline; `knowledge_score` Setting is
  persisted but never read back.
- Contrast: operations (30s TTL), billing, analytics, and builder-query caches
  exist for other subsystems.

### Area 14 — Mobile (75/100)
- Dashboard/knowledge/goals/recommendations/commerce are responsive.
- Builder is desktop-first (device preview toggle); storefront has mobile
  bottom nav (fixed 5 items).

## 5. Answers to the key audit questions

| Question | Answer |
| --- | --- |
| Does the Recommendation Runtime influence onboarding yet? | **No.** Not imported anywhere in `/onboarding`; onboarding computes its own evidence recommendations and discards them. |
| Does the Goals Runtime affect AI generation prompts or only homepage ordering? | **Only homepage/nav ordering (and builder/dashboard/alignment).** Generation never reads `creator_goals`. |
| Does the Knowledge Runtime improve commerce defaults? | **No.** Commerce pages are CRUD; no knowledge-driven defaults or hints. |
| Does the Success Runtime feed Super Admin insights? | **No.** Its only consumer is the Recommendation context. |
| Duplicated calculations between Dashboard, Knowledge, and Recommendation? | **Yes.** 3× `buildSnapshot`, 2× scores/alignment/counts per dashboard render (~57 snapshot queries + ~27 more metric queries ≈ 85 DB queries per render). |
| Caching / reuse opportunities? | **Yes, high.** Share one snapshot per request; persist + read back `knowledge_score`; memoize `buildSnapshot`; move `markShown` off the read path. |

## 6. Conclusion

The architecture is no longer the bottleneck — **integration is**. The three
EPIC-04/05/06 runtimes are individually strong (avg architecture 9.0) but
collectively reach only ~57% of their integration points. The highest-leverage
defects are the generation pipeline ignoring persisted intelligence, onboarding
being intelligence-blind, the Success Runtime being isolated, and duplicate
computation on the hot dashboard path — all of which are **cohesion issues,
not launch blockers**.

## 7. Next phase recommendation

A **focused integration sprint** is the right next step (not EPIC-07/08 yet):

1. Fix G-CRIT-3 (shared runtime context — build the snapshot once per request,
   compute all scores once) and G-CRIT-2 (onboarding goals + adaptive
   questions + knowledge score).
2. Fix G-CRIT-1 (generation consumes `creator_goals` + `knowledge_completion`).
3. Resolve G-HIGH-1/2/3/4 (surface Success, wire commerce ordering, super-admin
   intelligence console, sidebar nav).
4. Add the event layer (G-MED-4) as the foundation for the future **Insights
   Runtime (EPIC-07)** and **Business Health Runtime (EPIC-08)**.

Then EPIC-07/08 build on a fully integrated runtime stack.

## 8. Deliverables

- `docs/runtime-integration-matrix.md` — runtime × area matrix.
- `docs/runtime-dependency-map.md` — dependency graph.
- `docs/runtime-gap-analysis.md` — 22 gaps by severity.
- `docs/platform-readiness-report.md` — scores, top-20 lists, launch readiness.
- This report.
