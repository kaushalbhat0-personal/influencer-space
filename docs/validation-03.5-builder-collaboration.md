# VALIDATION-03.5 — Builder Collaboration & Draft Integrity

RCCF-VALIDATION-03.5 · Launch Readiness Initiative.

**Type:** Read-only audit + validated blocker fixes. No feature work, no
redesign, no new architecture. The objective: ensure creators never lose work.

## Journey map

```
Create → Edit → Save → Autosave → Undo/Redo → Publish → Rollback → Preview
→ Discard → Refresh → Logout/Login → Recover
```

Users: individual creator, agency client, SUPER_ADMIN (login-as), multiple
tabs/browsers/devices.

## Issue log

Every issue: ID · Severity · Step · Finding.

### Autosave / draft lifecycle

| ID | Sev | Finding |
| --- | --- | --- |
| B-1 | High | **Autosave permanently stops after one failed save.** The debounce is armed only on an `isDirty` transition; a failed save leaves `isDirty` true, so no new debounce is ever scheduled → the draft is silently never autosaved again. **FIXED** (save-attempt counter re-arms the debounce). |
| B-2 | High | **No `beforeunload` protection.** Closing the tab within the 2s debounce (or during a save) silently drops edits. **FIXED** (warn on navigation with unsaved changes). |
| B-3 | Medium | A clean draft whose save fails shows green "Draft saved" next to red "Save failed" (conflicting indicators). |
| B-4 | Medium | `markChangesPending` runs separately from the save — if it fails after a committed save, the action reports failure and autosave dies. **FIXED** (best-effort flag; committed save returns success). |

### Undo / redo

| ID | Sev | Finding |
| --- | --- | --- |
| B-5 | High | **Undo/redo don't mark the store dirty.** After an autosave, undoing changes the canvas while `isDirty` stays false — the DB keeps the pre-undo content, "Draft saved" shows green, and a reload discards the undo. **FIXED** (undo/redo set `isDirty: true`). |
| B-6 | Medium | First edit can never be undone (`canUndo = historyIndex > 0`; the pre-edit state is only reachable after a second edit). |

### Publish / rollback / recovery

| ID | Sev | Finding |
| --- | --- | --- |
| B-7 | High | **Every save regenerates all Page/Section/Block UUIDs** (no `id` passed to `create`). ID-based links/anchors break after the next save (default nav anchors are module-name based, so they survive). |
| B-8 | High | **Rollback flattens structure** — a published snapshot stores each block as a snapshot section (`sectionId__slotId`), so restoring turns a 1-section/5-block section into 5 single-block sections; section names/visibility are lost. |
| B-9 | High | **`rollbackToVersion` doesn't flag changes pending** — after restoring a draft the site can still read "Live" while the draft diverges. **FIXED**. |
| B-10 | Medium | Publish reads the draft before the snapshot transaction (TOCTOU) — a save landing mid-publish can be omitted from the published snapshot. |
| B-11 | Medium | Failed publish leaves the draft intact (transaction rolls back) — verified OK. |
| B-12 | High | No draft/autosave version history — crash recovery = last successful autosave only; unsaved edits since then are lost. |

### Security

| ID | Sev | Finding |
| --- | --- | --- |
| B-13 | OK | All builder actions are session/tenant-scoped (`getWebsiteId`); no API route accepts a websiteId; no replay vector. |
| B-14 | Low | The workspace-policy edit gate is skipped when no workspace cookie exists. |
| B-15 | Low | Expired session during a save returns "Unauthorized" without a redirect; combined with B-1 (now fixed) it no longer kills autosave. |

### Performance

| ID | Sev | Finding |
| --- | --- | --- |
| B-16 | Medium | `BuilderService.save` = deleteMany + recreate ≈ **1,026 sequential queries** for 25 pages / 500 sections / 2000 blocks (sections not batched). |
| B-17 | Low | Publish serializes the full layout into a large JSON snapshot per publish. |

### Runtime integration during editing

- Verified OK: Knowledge / Goals / Recommendations / Business Health /
  Experience Intelligence / Website Evolution read the shared Runtime Context
  and re-evaluate from the saved draft; no stale values or race conditions
  observed in the code path.

## Fix status

Fixed and committed (verified: `tsc --noEmit`, `next build`, full 101-file /
1983-test suite):

| ID | Fix |
| --- | --- |
| B-1 (High) | Autosave re-arms after a failed save (`saveAttempt` counter in the debounce deps). |
| B-2 (High) | `beforeunload` warns when the store is dirty. |
| B-4 (Medium) | Save treats a committed draft as success; `markChangesPending` is best-effort. |
| B-5 (High) | Undo/redo set `isDirty: true` so the reverted state is autosaved. |
| B-9 (High) | `rollbackToVersion` flags changes pending after restoring the draft. |

Remaining items are documented in `docs/builder-launch-readiness.md`.
