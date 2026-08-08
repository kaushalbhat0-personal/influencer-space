# Onboarding Progress — RCCF-LAUNCH-TRACK-03

## The fix

Before: "Click Build → Stage 1 highlighted → timer runs → nothing changes →
all remaining stages become green together." The UI felt frozen.

After: stages complete one by one as the backend reports each real milestone:

```
✓ Learning about your brand
✓ Creating your workspace
✓ Building your website
✓ Creating your storefront
✓ Checking everything
✓ Publishing your website
✓ Preparing your dashboard
→ Dashboard (immediately)
```

## What drives the UI

- The page **polls the real session** (`getGenerationSessionProgress`) every
  1.5s — the session advances as the pipeline calls `updateStage`.
- The elapsed-time counter is real elapsed time, **not** progress.
- `useGenerationExperience` derives stage states from the events; each stage is
  `pending → running → completed → failed` (only one running at a time).
- The "2-second wait" before the dashboard redirect was **removed** — the
  redirect fires the moment the backend reports completion.

## Refresh recovery

On mount, `getActiveGenerationSession()` finds the latest in-flight session and
restores the generating step + current stage — **progress never restarts, never
returns to stage 1**.

## Live activity feed (premium polish)

Beneath the stage list, a **live activity feed** ("What's happening") streams
real pipeline milestones — no invented items:

```
✓ Extracted your profile (24 fields)
✓ Detected "Fitness Creator" persona
✓ Analyzed your content and audience
✓ Created your workspace
✓ Published your website
```

The messages are recorded by `sessionService.recordActivity` at the actual
pipeline steps (from acquisition diagnostics, persona detection, provisioning,
publishing) and surfaced through `getGenerationSessionProgress().activity` —
they make the system feel like it's actively working rather than waiting for the
next stage.

## Completion

When the backend reports completion, the view shows **"Your website is ready! —
Opening your dashboard…"** for ~400ms before navigating — just enough for the
user to register the success (not an artificial delay). The dashboard opens
immediately after.

## Failure experience

Only the failed stage is highlighted. Copy is creator-friendly ("We couldn't
publish your website"), with **Retry / Change Settings / Go to Dashboard /
Contact Support**. Remaining stages are never marked complete.
