# ADR-002: AI Generation Flow Architecture

**Date:** 2026-07  
**Status:** Accepted

## Context

The AI Website Generation flow involves 8 sequential steps (Template → Strategy → URL → Analysis → Report → Preview → Provision → Invitation). Building this as individual routes would create 8 pages with shared state management complexity.

## Decision

The AI flow is built as a **single route** (`/super-admin/generate`) with **client-side step state**. Each step renders different Phase 2A reusable components based on the current step index.

**Key choices:**
- Single route avoids URL-based state management for wizard progression
- Step state is managed with `useState<FlowStep>` in the page component
- All 10 AI components from `src/components/ai/` are assembled per step
- Server action (`generateWebsite`) calls the backend `WebsiteGenerationPipeline`
- `Stepper` component provides visual progress across all steps
- `MotionPresence` handles animated step transitions

## Alternatives Considered

1. **Per-step routes** (`/generate/template`, `/generate/strategy`, etc.) — Better for deep-linking but requires complex state persistence across routes. Rejected for v1.
2. **URL query params for step tracking** — `?step=template` — Adds URL noise. User shouldn't bookmark mid-wizard. Rejected.
3. **React Router / Zustand for step state** — Overkill for an 8-step wizard. `useState` is sufficient and simpler.

## Consequences

- **Positive:** Smooth UX with animated transitions. Single codebase location for all AI flow logic. Easy to reorder or add steps.
- **Negative:** Cannot deep-link to a specific step. Users lose progress on page refresh. Mitigated by the fact that this is an admin tool (not consumer-facing) and the flow takes under 5 minutes.
- **Future:** When agency self-service is implemented, the same flow can be instantiated at `/agency/[id]/generate` using the same components.
