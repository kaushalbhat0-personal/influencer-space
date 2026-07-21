# ADR-006: Third-Party Component Wrapper Policy

**Date:** 2026-07  
**Status:** Accepted

## Context

CreatorStore's Dependency Audit identified that third-party UI libraries (framer-motion, lucide-react, future: Recharts, cmdk, Sonner) can leak their visual identity into the product. Components must feel like CreatorStore, not like a collection of library defaults.

## Decision

Every third-party UI library is consumed through a CreatorStore wrapper. Application code never imports third-party components directly. The wrapper enforces CreatorStore design tokens and hides implementation details.

**Key choices:**
- `MotionDiv` / `MotionPresence` wrap framer-motion (see ADR-005)
- Lucide icons are the single icon library (enforced by convention, not wrapper)
- `CommandPalette` wraps cmdk patterns with CreatorStore tokens (glass surface, cyan highlights, dark theme)
- `DataTable` wraps TanStack Table patterns (though current implementation is vanilla for simplicity)
- Future: `Chart` wraps Recharts, `Toast` wraps Sonner
- Every wrapper accepts `className` for per-instance customization
- Every wrapper uses CreatorStore tokens for colors, spacing, typography

## Alternatives Considered

1. **No wrappers — use libraries directly** — Acceptable for infrastructure libraries (Prisma, Zod) but unacceptable for UI libraries. Would lead to visual inconsistency and lock-in. Rejected for UI.
2. **Fork libraries and customize** — Massive maintenance burden. Wrappers are lighter and replaceable. Rejected.
3. **Custom build everything** — Rejecting mature, accessible, tested libraries is hubris. Wrappers give us the best of both: mature infrastructure with CreatorStore identity. Implemented.

## Consequences

- **Positive:** Library changes are transparent to consumers. Swap `cmdk` for a different command palette library without touching 30+ page files.
- **Positive:** Infrastructure Identity Audit is straightforward — check wrapper files for CreatorStore tokens, not 200+ component files.
- **Positive:** Prevents the "N different button styles" problem common in large codebases.
- **Negative:** Every new UI library requires an initial wrapper investment. Payoff comes on first library swap or upgrade.
- **Rule of thumb:** If a library is used in 3+ places, it deserves a wrapper. If used in 1-2, a wrapper may be premature.
