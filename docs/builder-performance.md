# Builder Performance

RCCF-VALIDATION-03.5 · Builder Collaboration & Draft Integrity.

## Measured profile

| Path | Query count | Notes |
| --- | --- | --- |
| Builder load | ~3 (website + pages/sections/blocks nested) | Light ✅. Plus preview (~16 aggregate) + overview (~18 counts) on mount. |
| Autosave (`saveBuilderPages`) | ~1,026 for 25 pages / 500 sections / 2000 blocks | `deleteMany` + per-page `create` + per-section `create` (not batched) + per-section `block.createMany`. Sequential, in one transaction. |
| Publish | ~28–34 | tenant/workspace/website/policy + aggregate build (~16) + nav + 4-query snapshot transaction; serializes the full layout into the snapshot JSON. |
| Rollback | `load` + `save` (~1,026) + status flag | Same full-rewrite cost as save. |

## Latency estimates (save)

- 25 pages / 500 sections / 2000 blocks ≈ **1,026 sequential queries**.
  - ~2ms RTT → ~2s
  - ~10ms RTT → ~10s+
- The transaction holds locks on the website's rows for the whole duration.

## Findings

| # | Sev | Finding |
| --- | --- | --- |
| B-16 | Medium | `BuilderService.save` rewrites the entire document on every autosave (deleteMany + ~1,026 sequential creates). Sections aren't batched. |
| B-17 | Low | Publish rebuilds the content aggregate (~16 queries) even though the snapshot stores layout-only; snapshot JSON is large. |
| B-18 | Low | Storefront rebuilds the aggregate on every request (live content, by design). |

## Recommended fixes

1. **Batch section creates** with `createMany` (25 `createMany` calls, one per
   page) — drops ~475 queries.
2. **Diff-based or upsert-per-row saves** keyed on stable IDs instead of full
   delete+recreate — the real fix for large drafts (also removes the P2002 race).
3. **Skip the aggregate rebuild during publish** when the snapshot stores
   layout/theme/navigation only.
4. **Draft history**: persist per-save deltas or throttled autosave snapshots
   (bounds recovery cost).

## Verified wins

- Builder **load** is a single nested query (no N+1).
- Save is now **atomic** (V-03), so a large save either fully commits or fully
  rolls back.
- Autosave failure no longer dead-stops the draft (V-03.5 B-1).
