# Website Evolution Runtime

RCCF-EPIC-09 · Launch Readiness Initiative, Phase 11.

Generated websites should **continuously evolve** based on creator growth. The
runtime **never edits websites automatically** — it produces evolution
opportunities the creator previews and approves.

```
Runtime Context
      │
   Knowledge / Goals / Business Health / Experience Intelligence / Recommendations
      │
      ▼
Website Evolution Runtime
      │
   ┌───┼───────┐
   ▼   ▼       ▼
Builder Dashboard Super Admin
```

## The long-term feedback loop

```
Knowledge → Goals → Business Health → Experience Intelligence → Website
   ↑                                                            │
   └── Better Website ← Website Evolution ← Creator Growth ←────┘
```

The first generation gives the creator a solid starting point; everything after
that helps the website evolve as the business evolves.

## Module

`src/modules/website-evolution/` (DDD).

| Phase | Deliverable | Location |
| --- | --- | --- |
| 1 Evolution Registry | 10 growth-triggered improvements (reason, health/conversion lifts, effort, goals, required knowledge/commerce/trust, change manifest) | `domain/registry.ts` |
| 2 Opportunity detection | Detection from growth signals (products > 10 → collections, gallery > 30 → masonry, testimonials > 20 → featured reviews, …) | `application/detector.ts` |
| 3 Website versioning | Current / previous / generated / builder / blueprint / experience versions + evolution history | `application/versioning.ts` |
| 4 Evolution feed | Dashboard, Builder and Super Admin show improvements ordered by ROI | `presentation/*` |
| 5 Builder | One-click Apply / Reject / Later with before→after health preview | `presentation/builder-evolution-panel.tsx` |
| 6 Change preview | Before/After for Business Health, Conversion, Trust + section order/CTA/navigation manifest | `domain/types.ts` |
| 7 Health lift | Every evolution predicts Business Health, Conversion, Knowledge, Trust, Goal Alignment (registry-driven, no AI) | `domain/registry.ts` |
| 8 Storefront | No automatic changes — only creator-approved changes | — |
| 9 History | accepted / rejected / ignored / deferred / applied with outcomes | `infrastructure/history-store.ts` |
| 10 Super Admin | `/super-admin/evolution` — most/least adopted, avg lifts, industry + goal differences | `application/runtime.ts` |
| 11 Public API | `detect` / `preview` / `apply` / `history` / `versionInfo` / `platform` | `application/runtime.ts` |
| 12 Documentation | 4 docs | `docs/` |

## Public API

```
websiteEvolutionRuntime.detect(tenantId)          // growth-triggered opportunities
websiteEvolutionRuntime.preview(tenantId, id)     // before/after preview
websiteEvolutionRuntime.apply(tenantId, id)       // creator-approved — records + manifest
websiteEvolutionRuntime.setStatus(tenantId, id, status)
websiteEvolutionRuntime.history(tenantId)
websiteEvolutionRuntime.versionInfo(tenantId)
websiteEvolutionRuntime.platformEvolution()
```

## Key guarantees

- **Never edits automatically** — `apply()` validates the opportunity is still
  live, records the outcome with before/after health, and returns the change
  manifest for the creator to apply. The actual edit is always creator-driven.
- **Distinct from the Recommendation Runtime** — recommendations are single
  missing next-actions; evolutions trigger on **growth thresholds**.
- **Distinct from the Experience Runtime** — evolutions describe WHAT changed;
  the Experience Intelligence describes the resulting experience.
- **Consumes RuntimeContext only** — never rebuilds the WebsiteAggregate.

## See also

- `docs/evolution-registry.md` — the improvement registry.
- `docs/website-versioning.md` — version model.
- `docs/implementation-70-report.md` — verification report.
