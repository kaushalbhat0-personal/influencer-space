# Changelog

## v2.0.0 (Feature Branch: feature/v1.1-workspace-foundation)

### EPIC-01: Release Maintenance
- Canonical seed service for deterministic E2E data
- Playwright globalSetup for automatic pre-run seeding
- 31/31 core E2E tests passing 3x consecutive
- Architecture Decision Records (ADR-001 through ADR-005)
- Git tag v1.0.0

### EPIC-02: Workspace Foundation
- Workspace model + WorkspaceMember model + enums (WorkspaceType, WorkspaceRole, WorkspaceStatus)
- WorkspaceRepository (CRUD + membership)
- WorkspaceService (getCurrent, switch, list, resolveTenantId)
- AuthorizationService (role→permission mapping, 22 permissions)
- WorkspaceCookie (AES-256-GCM encrypted, versioned)
- JWT carries workspaceId, workspaceType, workspaceRole
- Middleware sets x-workspace-id from JWT
- Provisioning creates Workspace + WorkspaceMember

### EPIC-03: Billing Platform
- Added workspaceId FK to BillingSubscription, BillingEvent, BillingInvoice
- BillingRepository (workspace-aware CRUD for v2 billing tables)
- BillingService (checkout, payment capture, cancel, status)
- Razorpay webhook v2 pipeline with idempotency
- Real checkout flow via billing.actions.ts
- Legacy feature gates replaced with EntitlementService

### EPIC-04: Workspace Experience
- WorkspaceProvider + useWorkspace hook
- WorkspaceSwitcher dropdown component (type-aware)
- workspace.actions.ts (encrypted cookie server action)
- Middleware 308 redirect from /agency/* to /workspace/*
- WorkspaceSwitcher integrated into admin layout topbar

### EPIC-05: Agency Workspace Platform
- Team management actions (invite, remove, change role)
- Real WorkspaceMember data on agency team page
- Freelancer support via isFreelancer field
- Seat quota guard integrated with workspace membership

### v2.0 Release
- globalTeardown for Playwright
- Full release certification
- Migration guide
- 0 TypeScript errors, 0 ESLint errors, 333/333 Vitest
- 94/94 static pages, production build passing
