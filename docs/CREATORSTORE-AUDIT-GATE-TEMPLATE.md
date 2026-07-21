# CreatorStore Audit Gate Template

> **Purpose:** Repeatable quality gate for every implementation phase.
> **When to run:** After every phase, before merging to main.
> **Three prompts.** Three separate audit passes. Each independently executable.

---

## Audit 1: Feature Completion Audit

```
Run a Feature Completion Audit for the [PHASE NAME] implementation.

Compare every deliverable from the Frontend Implementation Plan
(docs/CREATORSTORE-FRONTEND-IMPLEMENTATION-PLAN.md) against the
actual implementation.

For every planned deliverable, report:
- DELIVERED — matches specification
- PARTIAL — partially delivered, list gaps
- MISSING — not implemented
- EXCESS — implemented but not planned (scope creep)

Also verify against:
- docs/CREATORSTORE-UI-SPECIFICATION.md (screen layouts, widgets)
- docs/CREATORSTORE-DESIGN-SYSTEM.md (component spec matches implementation)

Return:
1. Delivery summary (X/Y deliverables complete)
2. Gap list with exact file paths
3. Scope creep items
4. PASS / PASS WITH GAPS / FAIL verdict
```

---

## Audit 2: Quality Hardening Audit

```
Run a Quality Hardening Audit for the current codebase.

Verify against the standards in docs/CREATORSTORE-DESIGN-SYSTEM.md.

Check:
1. Accessibility (WCAG AA):
   - prefers-reduced-motion respected
   - sr-only text on icon-only elements
   - All form inputs have associated labels (htmlFor)
   - All interactive elements have visible focus-visible
   - Keyboard navigation works (Tab, Enter, Escape, arrows)
   - ARIA: role, aria-label, aria-describedby on custom elements
   - Color contrast: 4.5:1 minimum on text

2. Design Tokens:
   - Zero hardcoded hex colors (#......) in new components
   - Zero hardcoded rgba() in Tailwind arbitrary values
   - All spacing uses Tailwind scale (no w-[300px] type values)
   - Shadow glow effects use glow-cyan/pink/gold utility classes

3. States:
   - Every async component has loading, error, empty, success states
   - Loading uses shared LoadingSpinner component
   - Empty uses shared EmptyState component
   - Errors show user-friendly message with retry option
   - No silently swallowed errors

4. Performance:
   - Images use next/image (not <img>)
   - Heavy components are dynamically imported
   - route-level loading.tsx files exist

5. Consistency:
   - No duplicate component implementations
   - All toast notifications use Sonner (not custom)
   - All icons from Lucide (no other icon library)
   - No inline spinners (use LoadingSpinner)

Return:
1. Issue list with exact file paths and line numbers
2. Severity per issue (CRITICAL / HIGH / MEDIUM / LOW)
3. PASS / PASS WITH WARNINGS / FAIL verdict
```

---

## Audit 3: Infrastructure Identity Audit

```
Run an Infrastructure Identity Audit.

Verify that NO external library leaks its visual identity into CreatorStore.

Check every third-party component:

1. Colors: All colors are CreatorStore tokens (s8ul-*, var(--*), Tailwind config colors)
   No library-default blues, grays, or accent colors visible.

2. Typography: All text uses Inter (sans) or Orbitron (display)
   No library-default system fonts or serif fonts visible.

3. Spacing: All spacing follows CreatorStore 4px scale
   No library-default padding/margin visible.

4. Radius: All border-radius matches CreatorStore token scale
   No library-default rounded corners visible.

5. Elevation: All shadows match CreatorStore shadow tokens
   No library-default drop shadows or material shadows visible.

6. Motion: All animations use CreatorStore duration/easing tokens
   No library-default spring, ease, or bounce curves visible.

7. Focus: All focus indicators use var(--focus-ring)
   No library-default blue outlines visible.

8. Dark theme: Every component renders correctly on dark background
   No library-default light backgrounds visible.

For every library in the dependency footprint:
- framer-motion / Motion: Verify useReducedMotion respected
- lucide-react: Verify no other icon library mixed in
- Sonner: Verify toast styling matches CreatorStore tokens
- cmdk (if used): Verify dark theme, glass surface, cyan highlights
- Recharts (if used): Verify chart colors are CreatorStore tokens

Return:
1. Leak list (any library identity visible)
2. Wrapper completeness score (0-100%)
3. PASS / LEAKS FOUND / FAIL verdict
```

---

## Usage

After completing Phase N, run all three audits:

```bash
# Prompt 1: Feature Completion
opencode "Run a Feature Completion Audit for Phase N..."

# Prompt 2: Quality Hardening
opencode "Run a Quality Hardening Audit..."

# Prompt 3: Infrastructure Identity
opencode "Run an Infrastructure Identity Audit..."
```

All three must PASS before the phase is considered complete.

---

*CreatorStore Audit Gate Template — July 2026*
