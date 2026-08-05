# Technical Debt Register — RCCF-LC-01

**Date:** 2026-08-05

---

## Debt Inventory

### 1. Dual Partner Services (Modules vs Libraries)

| File | Purpose | Consumers | Issue |
|------|---------|-----------|-------|
| `lib/partners/service.ts` | Full CRUD partner management | Billing commission trigger, agency actions | Exports `partnerService` |
| `modules/partner/application/partner.ts` | Read-only WebsiteAgency adapter | Agency billing page | Also exports `partnerService` |

**Risk:** Name collision. Both export the same symbol name with different implementations.
**Resolution:** Consolidate into single `modules/partner/application/partner.ts` that wraps both the WebsiteAgency model AND financial partner operations. Move billing's `partnerService.get()` call to use the module version.

### 2. Dual Navigation Configurations

| File | Purpose | Consumers |
|------|---------|-----------|
| `config/admin-nav.ts` | Flat creator dashboard nav groups | `admin-sidebar.tsx` |
| `lib/navigation/config.ts` | Role-aware CREATOR/SUPER_ADMIN/AGENCY nav | New layout system, agency sidebar |

**Risk:** Adding a nav item requires updating both configs. They drift over time.
**Resolution:** Migrate `admin-sidebar.tsx` to use `CREATOR_NAV` from `lib/navigation/config.ts`. Delete `config/admin-nav.ts`.

### 3. Placeholder Routes (Non-Functional)

| Route | Content | Status |
|-------|---------|--------|
| `/admin/email` | "Coming Soon" EmptyState | Not linked from nav sidebar |
| `/admin/ai-assistant` | "Beta" static mock UI | Not linked from nav sidebar |

**Risk:** Users discovering these routes via URL will find dead functionality.
**Resolution:** Either implement the features or delete the routes. If deleting, also remove from any sitemap/reference.

### 4. Legacy Subscription Table Migration

| Remaining Consumer | Location | Action |
|--------------------|----------|--------|
| `tenants-list` reader | `services/super-admin.service.ts` | Replace with Billing v2 plan-source resolver |
| `update-subscription-plan` writer | `actions/super-admin.actions.ts` | Replace with `billingService.adminSetPlan()` |

**Risk:** Stale data for unmigrated tenants. 10/12 consumers already migrated.
**Resolution:** Complete the migration, then drop the legacy `Subscription` table.

### 5. Remaining `agency_*` Legacy Code in Adapters

| Code | Location | Reason |
|------|----------|--------|
| `agency_free`, `agency_studio`, `agency_agency` | `LEGACY_TO_CANONICAL` map, `PLAN_CODES`, `UPGRADE_PATHS` | DB stores legacy codes |
| `agency_starter`, `agency_growth` | Same as above | DB backward compat |

**Risk:** None — these are intentional compatibility adapters for DB-stored values.
**Resolution:** Keep indefinitely. Remove only after DB migration to canonical codes.

---

## Cleanup Completed (This Milestone)

| Files Removed | Count | Reason |
|---------------|-------|--------|
| Dead marketing components (`Comparison.tsx`, `TrustedBy.tsx`, `Grow.tsx`) | 3 | Zero imports anywhere |
| Super-admin orphaned table components | 2 | Pages render inline tables instead |
| `features/domains/service.ts` + `actions.ts` + test | 3 | Replaced by `actions/domain.actions.ts` (Vercel-integrated) |
| `features/billing/service.ts` + `actions.ts` + test | 3 | Replaced by `modules/billing/application/service.ts` |
| `lib/billing/service.ts` + `events.ts` + `event-registry.ts` + `provider-registry.ts` + `providers.ts` | 5 | Old billing layer superseded by module architecture |
| `lib/billing/index.ts` barrel | 1 | Cleaned up 5 re-export lines for deleted files |
| **Total** | **18 files** | — |

---

## Architecture Decisions

### What stays
- `LEGACY_TO_CANONICAL` mapping — required for DB backward compatibility
- `modules/billing/application/service.ts` — authoritative billing service
- `modules/billing/domain/events.ts` — authoritative event system
- `config/commerce/plans.ts` — canonical commerce registry
- `src/actions/domain.actions.ts` — authoritative domain actions (Vercel)

### What was removed
- Old lib/billing layer — replaced by modules/billing
- Old features/billing — replaced by modules/billing
- Old features/domains — replaced by actions/domain.actions
- In-memory event bus — replaced by DB-persisted BillingEvent
- Old marketing components — dead code

---

## Quality Gates for Future Work

1. All new services must go in `modules/` or `lib/`, not `features/` (unless they're UI components)
2. No duplicate service registrations — check before creating a new service class
3. Barrel exports must be maintained — update `index.ts` when adding/removing files
4. Tests must be co-located with source — `__tests__/` alongside the module
5. Dead code must be identified and removed in the same PR that makes it dead
