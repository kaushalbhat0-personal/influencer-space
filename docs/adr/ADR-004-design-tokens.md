# ADR-004: Design Token Architecture

**Date:** 2026-07  
**Status:** Accepted

## Context

CreatorStore's visual identity is defined by a specific dark theme with neon accents. Early components used a mix of hardcoded hex colors, raw Tailwind utilities, and CSS variables. This led to inconsistency and made future white-labeling or light mode impossible without touching every component.

## Decision

All design tokens are declared as **CSS custom properties** in `:root` in `globals.css`. Components reference tokens via Tailwind config (`s8ul-*`, `neon-*`, `var(--*)`). A single source of truth.

**Key choices:**
- Surface tokens: `--surface-root` (#09090b) through `--surface-glass`
- Brand tokens: `--brand-primary` (indigo), `--brand-secondary` (violet), `--brand-accent` (cyan)
- Semantic tokens: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`
- Neon tokens: `--neon-cyan`, `--neon-pink`, `--neon-gold`
- Radius scale: `--radius-sm` through `--radius-2xl`
- Duration scale: `--duration-instant` through `--duration-slow`
- Focus ring: `--focus-ring`

**Compatibility constraint:** Tailwind v3 does not support `var()` with opacity modifiers (e.g., `bg-[var(--brand-primary)]/50`). Where opacity is needed, the Tailwind config token is used instead (e.g., `bg-s8ul-cyan/50`). This will be resolved when migrating to Tailwind v4.

## Alternatives Considered

1. **Design token NPM package (@creatorspace/tokens)** — Over-engineered for current team size. Good future option when multiple consuming apps exist. Deferred.
2. **All Tailwind config (no CSS variables)** — Works but doesn't support runtime theme switching (white-label). Rejected.
3. **CSS-in-JS (styled-components, emotion)** — Adds runtime overhead. Doesn't integrate with Tailwind's utility approach. Rejected.

## Consequences

- **Positive:** Theme changes affect all components. White-labeling requires only `:root` variable overrides. Light mode is a CSS class swap.
- **Positive:** Token auditability — run `grep` for `#` or `rgb(` to find violations.
- **Negative:** Tailwind v3 opacity limitation requires some tokens to appear in both CSS variables and Tailwind config. Mitigated by v4 migration.
- **Note:** All new components MUST use tokens. The DoD checklist enforces this.
