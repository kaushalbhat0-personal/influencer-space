# ADR-003: Navigation System — Job-Based Grouping

**Date:** 2026-07  
**Status:** Accepted

## Context

The original admin sidebar was a flat list of 11 pages (Dashboard, Storefront, Links, Hall of Fame, Content Feed, Milestones, Games, Appearance, Domain, Billing, Settings). As the product grew to 20+ pages, this flat structure became overwhelming.

## Decision

Navigation is organized by **jobs** (what the creator wants to accomplish), not by pages. Five groups: Website, Content, Sell, Grow, Settings. Underlying routes remain unchanged.

**Key choices:**
- Configuration lives in `src/lib/navigation/config.ts` as typed `DashboardNav` objects
- Three separate nav configs: `CREATOR_NAV`, `SUPER_ADMIN_NAV`, `AGENCY_NAV`
- Each nav item declares `roles: string[]` — the sidebar filters items by the current user's role
- Groups can be collapsed/expanded with `defaultOpen` preference
- Items can show `badge` (new, beta) and `badgeVariant` (cyan, gold, success)

## Alternatives Considered

1. **Keep flat list, add sections visually** — Same data problem. Doesn't solve discoverability. Rejected.
2. **Dynamic navigation from database** — Useful if navigation changes per-tenant, but over-engineered for current needs. Can be added later by swapping the config source. Rejected.
3. **Nested routes with layout groups** — Next.js layout groups add folder complexity without solving the mental model problem. Rejected.

## Consequences

- **Positive:** Creators understand the groupings immediately (Website = build, Content = fill, Sell = monetize, Grow = expand). Agency and Super Admin have their own intuitive groupings.
- **Positive:** Adding a new page is a single-line change in `config.ts`. No component changes needed.
- **Positive:** Permission filtering is automatic — agency staff never see super-admin items.
- **Negative:** Routes must match the config. If a route is added without updating config, it becomes inaccessible. Mitigated by the DoD checklist requiring config updates.
