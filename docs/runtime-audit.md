# Runtime Audit — RCCF-VALIDATION-05 (Phases 3 + 5)

## Runtime Context

**Verdict: the Runtime Context is the single canonical aggregate build.**
`runtimeContextBuilder.build()` (`src/modules/runtime-context/application/builder.ts:34`)
builds the WebsiteAggregate once via `React.cache` and every runtime evaluates
from that snapshot (Knowledge, Goals, Success, Recommendations, Storefront
Score, Health, dashboard metrics). The storefront and builder canvas are the two
intentional exceptions (live/preview content, per IMPLEMENTATION-16/19).

### Duplicate computation found

| ID | Sev | Location | Finding | Fix |
| --- | --- | --- | --- | --- |
| RT-01 | HIGH | `recommendation-runtime/application/runtime.ts:68-79` | `scoresSnapshot` built the aggregate TWICE (`buildSnapshot` then `recommendationContextSource.build` re-builds it) per `complete()` | **FIXED** — build the context once, reuse `ctx.snapshot` |
| RT-02 | HIGH | `src/app/super-admin/tenants/[id]/page.tsx:33,71` | `websiteHealthEngine.evaluate` run directly (13 queries) then AGAIN inside the context build (result unused by the page) | **FIXED** — `evaluate` request-scoped memoized |
| RT-03 | MEDIUM | `builder.ts:40-46` + `dashboard/service.ts` + `health/engine.ts` + `creator-success/runtime.ts` | health/metrics/success re-query the same tables the snapshot already flattened (~30 redundant queries per context build) | derive counts from the snapshot |
| RT-04 | MEDIUM | `builder.ts:54`, `context-source.ts:64-69`, `score-service.ts:62-63` | storefront/knowledge/goal scores computed 2–3× per context build (CPU-only, deterministic) | pass `preRead` scores into `buildFromSnapshot` |
| RT-05 | LOW | `builder.ts:34` | `React.cache` key includes `markShown` — both modes in one request = two builds | key on `tenantId` only |
| RT-06 | MEDIUM | `features/builder/components/workspace.tsx:53-90` | builder page load fires ~5 overlapping server actions (~60 queries) | consolidate on the shared context |

## Storefront render path

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| SF-01 | **CRITICAL** | `[domain]/page.tsx` data pipeline ran twice per request (~38 queries) — `getSnapshotData` was not memoized | **FIXED** — `React.cache` |
| SF-02 | HIGH | `traceRuntime` canonical-stringified + SHA-256'd the whole aggregate per request; `LayoutEngine` ran 11 `console.log` per section in production | **FIXED** — logs gated to non-production (E2E signature kept) |
| SF-03 | MEDIUM | Hero LCP media is a raw `<img>` (`HeroMedia.tsx:88`), lazily loaded (`renderers.tsx:131`) | `CreatorImage` + `priority` for hero/profile images |
| SF-04 | MEDIUM | Root `template.tsx` wraps the public storefront in a framer-motion client wrapper | scope template to marketing or remove |
| SF-05 | LOW | `goalProfileService.getProfile` not `React.cache`d (1 query today) | wrap it |
| SF-06 | LOW | Goal nav/section sorts re-invoke `getGoal` per comparison — negligible at ~15 sections | memoize comparators if sections grow |
| SF-07 | LOW | Dead legacy storefront components use raw `<img>` (ProductGrid, public/*) | delete dead code |

### Storefront query budget (post-fix, per request)

~19 DB queries: tenant OR lookup (1) + published snapshot (3) + aggregate build
(~14) + goal profile (1) + platform-config (1). `layoutEngine.resolve` runs once
per request (was twice). Navigation/legal are baked at publish — no per-page
generation.

### Confirmed non-issues

- Navigation/legal generation is publish-time, not per request.
- Adaptive visibility / experience resolution is once per request, O(registry).
- YouTube embeds use `aspect-video` (no CLS); CreatorImage uses fill +
  aspect-ratio + blur placeholder; fonts are self-hosted via `next/font/local`.
