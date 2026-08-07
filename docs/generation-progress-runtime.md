# Generation Progress Runtime — RCCF-LAUNCH-TRACK-03

P0 launch-blocking UX fix: real, event-driven generation progress. The
onboarding UI reflects actual backend milestones — **no fake timers, no
simulated percentages**.

## Principle

> Progress is derived from the persisted GenerationSession (the backend's
> milestone source of truth) + canonical generation events. No timer determines
> progress. If generation finishes quickly, the UI finishes quickly. If it takes
> longer, the UI waits naturally.

## The runtime

`src/modules/generation-progress/`:
- `getGenerationProgress(sessionId)` — reads the session + its stage rows and
  derives current stage, completed stages, current message (friendly), started/
  completed times, elapsed, percentage, and failure state.
- `emitGenerationEvent(sessionId, type)` — publishes canonical `generation.*`
  events through the Event Runtime.
- `getGenerationMonitor()` — sessions + durations for the Super Admin monitor.
- `friendly.ts` — creator-first stage copy (no technical jargon).

## Real sub-phase progress

The profile import previously sat on stage 1 for the whole (slow) call.
`onboardingService.importProfile` now reports its **genuine** sub-phases through
a callback:
```
Fetching your profile → Learning about your brand → Understanding your voice
→ Planning your storefront → (AI enrichment) → Building your website → …
```
The pipeline updates the session in real time at each milestone. No invented
advancement.
