# ADR-005: Motion-Safe Animation Policy

**Date:** 2026-07  
**Status:** Accepted

## Context

CreatorStore uses Framer Motion extensively (28+ components). Users with vestibular disorders can experience motion sickness from animations. WCAG 2.2 requires respecting `prefers-reduced-motion`.

## Decision

All animations go through `MotionDiv` and `MotionPresence` wrappers that check `prefers-reduced-motion` and render static elements when reduced motion is preferred. Direct `motion.div` / `AnimatePresence` usage is prohibited.

**Key choices:**
- `MotionDiv` wraps `motion.div` with `useReducedMotion()` check
- `MotionPresence` wraps `AnimatePresence` with the same check
- `useReducedMotion()` re-exports framer-motion's built-in hook from `src/hooks/use-reduced-motion.ts`
- Global CSS also applies `prefers-reduced-motion: reduce` to set all animation/transition durations to 0.01ms
- Components that need motion use `MotionDiv` with `initial`/`animate`/`exit`/`transition` props — identical API to raw framer-motion

## Alternatives Considered

1. **No motion at all for accessibility** — Degrades experience for the 95%+ of users without motion sensitivity. Rejected.
2. **`useReducedMotion` check per component** — Same outcome but duplicated across every animated component. Wrapper is DRYer. Implemented.
3. **CSS-only `prefers-reduced-motion` media query** — Handles CSS transitions but not JS-driven Framer Motion animations. Insufficient alone. Combined with MotionDiv.

## Consequences

- **Positive:** Zero-component migration cost — replace `motion.div` with `MotionDiv`, identical props.
- **Positive:** `prefers-reduced-motion` users get a static but fully functional experience.
- **Positive:** Future auditability — grep for `from "framer-motion"` and flag any direct `motion.` usage.
- **Negative:** `MotionDiv` strips non-standard HTML props (like `initial`/`animate`) when rendering static div. `className` and `children` are preserved.
