# CreatorStore — Definition of Done

> **Purpose:** Release gate for every implementation phase. A phase is NOT complete until every checkbox is verified.
> **Applies to:** All future phases (Phase 3B, 4, 5, 6, 7, and beyond).

---

## Mandatory Gates (ALL must pass)

### 1. Feature Completeness

- [ ] Every deliverable from the Frontend Implementation Plan is implemented
- [ ] Every screen matches the UI Specification layout
- [ ] Every screen is mapped to the Design System components
- [ ] No scope creep (features not in the spec are absent)
- [ ] No missing features (features in the spec are present)

### 2. No Duplication

- [ ] Zero duplicated components (search for `function.*Empty`, `function.*Loading`, `function.*Upload`)
- [ ] Zero duplicated business logic (no Prisma calls in hooks that bypass app services)
- [ ] Zero duplicated layout (use `ContentContainer`, `PageHeader`, `MetricGrid`, `DashboardGrid`)
- [ ] Zero duplicated state management (use `useAsyncState` or `useMutation`)

### 3. Shared Components

- [ ] All reusable UI lives in `src/components/ui/`, `src/components/layout/`, `src/components/ai/`, or `src/components/data/`
- [ ] Feature-specific components live in `src/app/*/<feature>/_components/`
- [ ] No component in `src/app/` is imported by a sibling or parent route
- [ ] All new shared components exported from their barrel `index.ts`

### 4. Build & Type Safety

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx next build` passes with zero errors
- [ ] `npx next lint` produces zero errors (warnings acceptable, pre-existing only)
- [ ] `npx vitest run` — all tests pass, zero regressions in existing suites

### 5. Audit Gates

- [ ] **Feature Completion Audit** passes — verifies phase matches Product Blueprint + UI Spec
- [ ] **Quality Hardening Audit** passes — accessibility, design tokens, states, performance
- [ ] **Infrastructure Identity Audit** passes — no external library visual leaks

### 6. Accessibility (WCAG AA — implemented scope)

- [ ] `prefers-reduced-motion` respected (use `MotionDiv`/`MotionPresence`)
- [ ] All icon-only buttons have `aria-label`
- [ ] All form inputs have associated `<label>` with `htmlFor`/`id`
- [ ] All interactive elements have visible `focus-visible` indicator
- [ ] Modals/drawers trap focus and close on Escape
- [ ] Keyboard navigation works (Tab, Enter, Space, Escape, arrows where applicable)
- [ ] `sr-only` text on status announcements (stepper, loading, progress)

### 7. Design Tokens

- [ ] Zero hardcoded hex colors (`#......`) introduced
- [ ] Zero hardcoded `rgba()` in Tailwind arbitrary values (use `glow-*` or `shadow-*` utilities)
- [ ] All spacing via Tailwind scale (no `w-[300px]`, `min-h-[160px]`, etc.)
- [ ] All colors via `s8ul-*`, `brand-*`, `var(--*)`, or Tailwind config colors with opacity modifiers
- [ ] All interactive elements have hover + focus + disabled states

### 8. Documentation

- [ ] If new routes added, navigation config (`src/lib/navigation/config.ts`) is updated
- [ ] If new shared components added, `index.ts` barrel exports are updated
- [ ] If design tokens changed, `globals.css` `:root` block is updated
- [ ] If new dependencies added, `CREATORSTORE-DEPENDENCY-AUDIT.md` is updated

---

## How to Use

At the end of every phase:

1. **Self-audit** using this checklist. Mark each item pass/fail with notes.
2. **Run the three OpenCode audit prompts** (from `CREATORSTORE-AUDIT-GATE-TEMPLATE.md`).
3. **Fix all failures** before the phase is considered complete.
4. **Merge only when all 8 gates pass.**

---

*CreatorStore Definition of Done — July 2026*
