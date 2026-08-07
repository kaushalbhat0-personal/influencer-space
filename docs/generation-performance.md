# Generation Performance — RCCF-LAUNCH-TRACK-03

## Phase 10 audit

| Metric | Status |
| --- | --- |
| Time to first progress | The first stage ("Fetching your profile") is marked running as soon as the session starts — the UI shows activity immediately (no blank wait). |
| Time between stages | Real milestone boundaries. The import now reports sub-phases (fetch → knowledge → persona → planning), so the UI advances during the long network/AI step instead of freezing on stage 1. |
| Longest stage | Profile import (network + AI enrichment) — now visibly progressing through sub-phases. |
| Publish duration | ~seconds; `generation.publish.started/completed` bound it. |
| Dashboard load | The artificial 2s wait before the redirect was **removed** — the dashboard opens the moment `generation.completed` fires. |

## Monitored by Super Admin

`/super-admin/generation-monitor` surfaces:
- Current stage per active session
- Generation duration (completed) + average duration
- Failed stage + error (retry count is available from the session row)

## Honesty guarantee

No simulated progress anywhere: the UI advances only on backend-confirmed
milestones. If a stage is genuinely slow, the user sees the real stage running
with its friendly message — not a fake 30→50→70% crawl.
