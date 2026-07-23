# v1.0 to v2.0 Migration Guide

## Overview
v2.0 introduces Workspace as the single aggregate root. No data migration is required — Workspace coexists with existing Tenant and WebsiteAgency tables.

## What Changes

### Authentication
JWT tokens now carry additional fields:
- `workspaceId` — the user's primary workspace
- `workspaceType` — TENANT or AGENCY
- `workspaceRole` — OWNER, ADMIN, MEMBER, or VIEWER

These are additive. Existing `tenantId` and `agencyId` fields remain in the JWT for backward compatibility.

### Server Actions
If you have custom server actions that read `session.user.tenantId` directly, migrate to:
```typescript
const tenantId = await workspaceService.resolveTenantId();
```

### Authorization
Replace role checks with AuthorizationService:
```typescript
// Before
if (role === "OWNER") { /* manage billing */ }

// After
if (authorizationService.can("billing:manage")) { /* manage billing */ }
```

### Feature Gates
Replace plan string checks with EntitlementService:
```typescript
// Before
if (plan === "PRO") { /* enable custom domain */ }

// After
if (entitlement.has(planCode, "custom_domain")) { /* enable custom domain */ }
```

### API Routes
- `/agency/*` routes continue working (308 redirect to `/workspace/*` in Phase 1)
- `/admin/*` routes unchanged
- `/super-admin/*` routes unchanged

## No Changes Required
- Database schema (additive only)
- UI components
- Public storefront URLs
- Custom domain routing
- Razorpay integration

## Rollback
v2.0 is fully backward compatible. To roll back:
1. Remove workspace cookie (`__workspace`)
2. Revert to v1.0 deploy
3. All data is preserved
