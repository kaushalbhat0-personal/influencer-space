# Builder Conflict Audit

RCCF-VALIDATION-03.5 · Builder Collaboration & Draft Integrity.

## Concurrent editing (multi-tab / multi-browser / agency + client)

| Scenario | Behaviour |
| --- | --- |
| Two tabs, serial saves | Last-write-wins — the later `deleteMany`+recreate replaces the whole draft. No merge, no warning. |
| Two tabs, interleaved saves | Previously could corrupt the draft (P2002 on the unique page slug mid-rewrite). **Fixed in V-03** — save is now atomic (transactional). |
| Agency + client | Agency cannot currently open a client's builder (tenantId null) — no live collision until agency editing is enabled. |
| Autosave vs. manual save | Both replace all pages; the last commit wins. No version check. |

## What was fixed

- **Atomic save** (V-03): `BuilderService.save` is transactional — interleaved
  saves can no longer leave the draft partially deleted or corrupted.
- **Autosave re-arm** (V-03.5 B-1): a failed save no longer permanently kills
  autosave.
- **Undo/redo dirty** (V-03.5 B-5): a reverted state is persisted instead of
  silently diverging from the DB.
- **beforeunload** (V-03.5 B-2): users are warned before losing unsaved edits.

## Remaining risk (no collaboration features by design)

- **No optimistic concurrency / conflict detection.** Two users editing the same
  draft still overwrite each other (last-write-wins). This is acceptable for
  single-user/agency-impersonation today, but a draft **version / updatedAt
  compare** is the recommended follow-up so the "no silent data loss" success
  criterion holds when agency editing is enabled.
- **No draft history table.** Recovery is limited to publish snapshots; unsaved
  edits since the last successful autosave are unrecoverable after a crash.
- **Rollback structure flattening** (B-8): restoring a snapshot rebuilds
  single-block sections; storing the nested tree in snapshots fixes it.
- **ID regeneration on save** (B-7): pass stable IDs on create so external
  references survive.

## Conflict-detection recommendations (priority)

1. Add `Website.updatedAt` / a draft revision and compare-and-swap in
   `saveBuilderPages` — return a conflict error instead of overwriting.
2. Store nested `Page → Section → Block` in publish snapshots; rollback restores
   the exact tree and IDs.
3. Persist draft versions on every save for recovery beyond publish boundaries.
