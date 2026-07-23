# CreatorStore v2.0.0 Release Notes

## Overview
CreatorStore v2.0 introduces the Workspace Platform — a unified multi-tenant architecture that enables creators, agencies, and freelancers to manage websites from a single platform.

## What's New

### Workspace Architecture
- Single `Workspace` aggregate root replaces separate `Tenant` and `WebsiteAgency` concepts
- `WorkspaceService` provides unified context resolution (server + client + cookie)
- `AuthorizationService` enforces role-based permissions across all operations
- Versioned, encrypted workspace cookie for secure context switching

### Billing Platform v2
- Billing is now owned by Workspace (not Tenant/Agency)
- Full Razorpay checkout pipeline with idempotent webhook processing
- EntitlementService replaces scattered `if (plan === "PRO")` logic
- Plan catalog with 5 plans (creator_free, creator_pro, creator_elite, agency_starter, agency_growth)

### Team Management
- Invite members to workspace via email
- Role-based access (OWNER, ADMIN, MEMBER, VIEWER)
- Member removal and role changes
- Seat quota enforcement

### Workspace Experience
- Workspace switcher in admin topbar
- Type-aware UI (TENANT vs AGENCY)
- Middleware redirect from /agency to /workspace (Phase 1)
- Backward compatible — all existing routes preserved

## Breaking Changes
None. All existing APIs, routes, and data are backward compatible.

## Migration
See MIGRATION_GUIDE.md for details on migrating from v1.0 to v2.0.

## Test Results
- TypeScript: 0 errors
- ESLint: 0 errors
- Vitest: 333/333 passed
- Production build: 0 errors, 94/94 pages
- Playwright core: 31/31 passed

## Known Issues
- 33 pre-existing Playwright test failures (admin CRUD selectors, storefront products)
- No /workspace/* route pages yet (Phase 2)
- BillingPlan/BillingPlanFeature tables not populated from catalog (Phase 3)
- No SessionProvider in root layout (relies on DashboardShell)
