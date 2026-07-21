# ADR-001: Dashboard Shell Architecture

**Date:** 2026-07  
**Status:** Accepted

## Context

CreatorStore has three user-facing portals (Creator, Agency, Super Admin) that share identical layout structure: sidebar, topbar, content area, and global overlays (command palette, notification center). Each portal was implemented independently, leading to duplicated layout logic.

## Decision

A single `DashboardShell` component in `src/components/layout/` provides the shared layout infrastructure. The sidebar navigation is configured through `src/lib/navigation/config.ts` with role-based filtering (`getNavForRole()`).

**Key choices:**
- `DashboardShell` is a client component (uses `useSession` for role detection)
- Sidebar is permission-aware — each role sees only its relevant navigation groups
- Job-based grouping (Website, Content, Sell, Grow, Settings for Creator)
- Global overlays (`CommandPalette`, `NotificationCenter`) are rendered once in the shell
- `ErrorBoundary` + `Suspense` boundaries protect all content areas

## Alternatives Considered

1. **Per-route layout duplication** — Simpler initially but leads to inconsistent UX and higher maintenance. Rejected.
2. **CSS Grid template areas** — Too rigid; doesn't support the sidebar collapse/mobile overlay behavior well. Rejected.
3. **Server Component layout with cookie-based role detection** — Would require re-reading session on every navigation. Added complexity without benefit. Rejected.

## Consequences

- **Positive:** All three portals share one layout. Navigation changes are centralized in `config.ts`. New portals are trivial to add.
- **Positive:** Migration path exists — existing `AdminLayoutClient` is preserved, with incremental adoption of `DashboardShell`.
- **Negative:** `DashboardShell` is a client component, preventing some server-side optimizations. Mitigated by keeping child routes as Server Components with `Suspense`.
- **Note:** The existing `AdminLayoutClient` compatibility wrapper remains until Phase 3C (incremental swap).
