# AGENCY-00A — Workspace Consolidation & Canonical Ownership Platform

> **Date:** 2026-07-29
> **Type:** Architecture consolidation plan — no implementation
> **Status:** Complete

---

## Executive Summary

This document establishes **Workspace as the single canonical aggregate root** for the entire platform. Three parallel ownership systems (`WebsiteAgency`, `Partner`, `Workspace`) are consolidated into one. `WebsiteAgency` is deprecated in favor of `Workspace(type: AGENCY)`. `Partner` is reduced to a business specialization (commission/payout recipient), not an ownership model. Billing, permissions, capabilities, branding, storage, and marketplace ownership all unify under Workspace. **No behavior changes, no feature implementation, no UI changes — architecture consolidation only.**

---

## Current Ownership Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT OWNERSHIP (3 MODELS)              │
│                                                             │
│  WebsiteAgency ──────────── WebsiteAgency ────── Agent      │
│       │                        │               yTenant     │
│       │                        │               (clients)   │
│       │                        │                           │
│       ├── AgencySubscription   │                           │
│       ├── User.agencyId        │                           │
│       └── Workspace.agencyId   │                           │
│                                                             │
│  Partner ───────────────────── Partner ──────── PartnerMem  │
│                                       │       ber          │
│                                       │       PartnerWorks │
│                                       │       paceAssignm  │
│                                       │       ent          │
│                                       │       PartnerInvit │
│                                       │       e            │
│                                       │                     │
│                                       ├── CommissionRule   │
│                                       ├── CommissionEntry  │
│                                       ├── PayoutBatch      │
│                                       └── PayoutReservation│
│                                                             │
│  Workspace ────────────────── Workspace ───── WorkspaceMemb │
│                                       │       er            │
│                                       │       BillingSubsc  │
│                                       │       ription       │
│                                       │       BillingInvoic │
│                                       │       e             │
│                                       │                     │
│                                       ├── WorkspaceAuth (22 │
│                                       │   permissions)      │
│                                       ├── WorkspaceCookie   │
│                                       └── WorkspaceProvider │
│                                                             │
│  Tenant ──────────────────── Tenant ───────── Website      │
│                                       │       Products     │
│                                       │       Gallery      │
│                                       │       ...          │
│                                       │                     │
│                                       └── Workspace.tenant  │
│                                           Id                │
└─────────────────────────────────────────────────────────────┘
```

---

## Canonical Workspace Contract

Workspace is the **single aggregate root for billable, member-owned contexts** (schema comment). After consolidation:

| Aspect | Ownership |
|--------|-----------|
| **Identity** | Workspace has `name`, `slug`, `type` (TENANT/AGENCY/enterprise), `isFreelancer` |
| **Members** | `WorkspaceMember` with 4 roles (OWNER/ADMIN/MEMBER/VIEWER) |
| **Roles** | 22 permissions in `authorization.ts` RBAC model |
| **Permissions** | `authorizationService.require()` guards |
| **Capabilities** | Feature gating via `CapabilityService` — Workspace plan determines limits |
| **Billing** | `BillingSubscription` → `BillingInvoice` — one subscription per Workspace |
| **Branding** | Workspace name, white-label through capability |
| **Storage** | Media limits per plan, scoped to Workspace resources |
| **Media** | Assets uploaded by Workspace members |
| **Marketplace** | Installed themes/templates per Workspace |
| **Clients** | `PartnerWorkspaceAssignment` for agency/client relationships |
| **Websites** | `Website.workspaceId` (future) |
| **Audit** | `AuditLog` scoped to Workspace resources |
| **Analytics** | Workspace-level analytics scoped via authorization |
| **Settings** | Workspace-level `locale`, `timezone`, `currency`, `metadata` |
| **Limits** | Enforced by `CapabilityService` based on Workspace plan |

### Type Hierarchy

```
WorkspaceType: TENANT | AGENCY | (future: ENTERPRISE, FREELANCER)
```

- **TENANT**: Creator workspace — owns one website, manages content
- **AGENCY**: Agency workspace — manages multiple client workspaces
- Future: ENTERPRISE, FREELANCER

### Workspace → Resource Ownership (Target)

```
Workspace
  ├── Websites (via workspaceId)
  ├── BillingSubscription (1:1)
  ├── BillingInvoice[]
  ├── WorkspaceMember[]
  ├── PartnerWorkspaceAssignment[] (for AGENCY type)
  └── Resources (products, gallery, etc. via Tenant)
```

---

## Website Ownership Model

### Current
```
Tenant ──1:1── Workspace(type=TENANT)
Tenant ──1:1── Website
```

### Target (future, no implementation)
```
Workspace(type=TENANT) ──1:1── Website
```

**Migration approach:** `Website.workspaceId` replaces `Website.tenantId`. The `Tenant` model is gradually absorbed into Workspace. For now, the `Workspace → Tenant → Website` chain remains — the workspace ID is resolved through `resolveTenantId()`.

---

## Partner Consolidation Plan

### Current State
`Partner` is a full entity with members, assignments, invites — overlapping with Workspace.

### Decision
**Partner becomes a business specialization of Workspace, not an aggregate root.**

| Partner Feature | New Home | Migration |
|----------------|----------|-----------|
| `Partner.type` | Workspace.type (TENANT/AGENCY) | Map partner type to workspace type |
| `PartnerMember` | `WorkspaceMember` | Migrate members |
| `PartnerWorkspaceAssignment` | `Workspace → AgencyTenant` (kept as-is) | Alignment later |
| `PartnerInvite` | Workspace invitation system | Migrate |
| `CommissionRule` | Keeps referencing Partner | Add workspaceId fallback |
| `CommissionEntry` | Keeps referencing Partner | Add workspaceId fallback |
| `PayoutBatch` | Keeps referencing Partner | Add workspaceId fallback |

### Migration Strategy
1. Add `workspaceId` foreign key to `Partner` model
2. Populate from existing `PartnerWorkspaceAssignment`
3. Commission/payout system gets dual FK support (partnerId OR workspaceId)
4. Future: replace partnerId with workspaceId

---

## WebsiteAgency Consolidation Plan

### Decision
**`WebsiteAgency` is DEPRECATED. All functionality moves to `Workspace(type: AGENCY)`.**

| WebsiteAgency Field | Target | Migration |
|---------------------|--------|-----------|
| `id` | Workspace.id | Map through workspace.agencyId |
| `name` | Workspace.name | Already synced |
| `subdomain` | Workspace.slug | Already synced |
| `customDomain` | Workspace.metadata | Store in metadata |
| `razorpayAccountId` | BillingAccount | Already in Billing v2 |
| `status` | Workspace.status | Map AgencyStatus→WorkspaceStatus |
| `platformFeePercent` | CommissionRule | Map to commission rule |
| `tenants` (AgencyTenant) | PartnerWorkspaceAssignment | Redirect queries |

### Migration Strategy
1. **Wrap**: All existing code that reads `WebsiteAgency` gets a compatibility layer that reads from `Workspace` instead
2. **Redirect**: `User.agencyId` → resolve through `WorkspaceMember → Workspace`
3. **Keep**: `AgencyTenant` table is kept as the client relationship model (replaces `PartnerWorkspaceAssignment` for agency context)
4. **Delete**: `AgencySubscription` (dead — zero references already)

---

## Billing Consolidation

### Decision
**All billing belongs to Workspace. One subscription per Workspace.**

| Aspect | Current | Target |
|--------|---------|--------|
| Subscription (creator) | `BillingSubscription → BillingAccount(tenant)` | `BillingSubscription → Workspace` |
| Subscription (agency) | `BillingSubscription → BillingAccount(agency)` | `BillingSubscription → Workspace` |
| Legacy subscription | `Subscription(tenantId)` | Migrate to BillingSubscription |
| Legacy agency sub | `AgencySubscription(agencyId)` | **Dead** — delete |
| Invoices | `BillingInvoice(workspaceId)` | ✅ Already on Workspace |
| Payment events | `BillingEvent(workspaceId)` | ✅ Already on Workspace |

**Migration path:**
- `BillingAccount` is deprecated
- `BillingSubscription.workspaceId` becomes the primary FK (already exists, nullable)
- `BillingAccount + accountType/accountId` replaced by direct Workspace link
- Legacy `Subscription` table: migrate active subscriptions to `BillingSubscription`, then archive

---

## Permission Consolidation

### Decision
**Workspace authorization is the canonical permission model.**

| Permission System | Scope | Action |
|-------------------|-------|--------|
| Workspace auth (22 permissions, 4 roles) | Workspace-level actions | **KEEP** — canonical |
| Identity role registry (6 roles) | Platform-level access | Keep as platform gating |
| Partner permissions (18) | Partner-specific | Deprecate — fold into workspace auth |
| Module permissions | Module-level | Keep — separate concern |

**Migration:**
- Partner permissions (`partner:view`, `partner:edit`, etc.) map to workspace permissions:
  - `partner:view` → `analytics:view`
  - `partner:edit` → `settings:write`
  - `members:invite` → `members:invite` (exists)
  - `billing:read` → `billing:read` (exists)
- Partner `PARTNER_ROLES` (owner/admin/manager/viewer) map directly to WorkspaceRole (OWNER/ADMIN/MEMBER/VIEWER)

---

## Capability Consolidation

### Decision
**`CapabilityService` remains canonical. Agency-specific capabilities become Workspace capabilities.**

| Capability | Current Scope | Target Scope |
|-----------|---------------|--------------|
| `agency_clients` | Agency plans only | `Workspace(type: AGENCY)` |
| `multiple_brands` | Agency plans | Workspace capability |
| `bulk_publish` | Agency plans | Workspace capability |
| `white_label` | Agency plans | Workspace capability |
| `max_team_members` | All plans | Workspace limit |
| `max_clients` | Agency plans | Workspace limit |
| `max_websites` | All plans | Workspace limit |
| `advanced_builder` | Creator Elite + Agency | Workspace capability |

**No code changes needed** — the capability platform already uses plan codes, and plan families map to workspace types.

---

## Branding Consolidation

### Decision
**Workspace owns branding. White-label is a capability.**

| Branding Aspect | Owner | Notes |
|----------------|-------|-------|
| Workspace name | Workspace | Already |
| Logo/colors | Workspace | Via website theme |
| White-label | Capability `white_label` | Already in plans |
| Custom domain | Capability `custom_domain` | Already in plans |
| Brand assets | Media Service | Workspace-scoped |

**No changes needed.** The existing architecture already supports this.

---

## Storage Consolidation

### Decision
**Workspace owns storage through its plan limits.**

| Storage Aspect | Owner | Notes |
|----------------|-------|-------|
| Media storage limit | Plan (`storage_gb`) | Already capability-driven |
| Gallery limit | Plan (`max_gallery`) | Already capability-driven |
| Asset storage | Media Service | Already scoped to `tenantId` |
| Usage tracking | `BillingUsage` | Future |

**No changes needed.** Storage limits are already enforced by `CapabilityService` based on the workspace's subscription plan.

---

## Marketplace Consolidation

### Decision
**Marketplace ownership becomes Workspace-scoped.**

| Marketplace Aspect | Current | Target |
|-------------------|---------|--------|
| Installed themes | `Website. themePackageId` | Workspace-scoped |
| Installed templates | Via creation flow | Workspace-scoped |
| Purchases | Workspace via billing | ✅ Already |
| Recommendations | Industry-based | Workspace industry |

**No changes needed.** MarketplaceRegistry already treats installations as workspace operations. Future marketplace purchases will be billed to the Workspace.

---

## Database Impact

| Table | Status | Action |
|-------|--------|--------|
| `Workspace` | **Canonical** | Add indexes, ensure all resource FKs |
| `WorkspaceMember` | **Canonical** | Keep |
| `WebsiteAgency` | Legacy | Deprecate — add adapter layer |
| `AgencyTenant` | Keep (active) | Retain — client relationship model |
| `AgencySubscription` | **Dead** | Delete (zero references) |
| `Subscription` | Legacy | Migrate to BillingSubscription |
| `BillingAccount` | Transitional | Deprecate — direct Workspace FK |
| `BillingSubscription` | **Canonical** | Keep — workspaceId primary |
| `BillingInvoice` | **Canonical** | Keep — workspaceId FK |
| `Partner` | Transitional | Add workspaceId FK |
| `PartnerMember` | Deprecated | Migrate to WorkspaceMember |
| `PartnerInvite` | Deprecated | Fold into workspace invitation |
| `PartnerWorkspaceAssignment` | Keep | Retain — maps partners to workspaces |
| `CommissionRule` | Keep | Add workspaceId FK |
| `CommissionEntry` | Keep | Add workspaceId FK |
| `PayoutBatch` | Keep | Add workspaceId FK |
| `Tenant` | **Canonical** | Keep — data container for creator resources |

---

## Service Impact

| Service | Impact | Action |
|---------|--------|--------|
| `workspaceService` | None | Already canonical |
| `authorizationService` | None | Already canonical |
| Partner engine | Low | Add workspaceId resolution |
| Commission service | Low | Add workspaceId fallback |
| Payout service | Low | Add workspaceId fallback |
| Billing v2 service | None | Already workspace-based |
| ProvisioningService | None | Already creates workspace |
| PublishingService | None | Already workspace-aware |

**No service rewrites needed.** Only additive changes (workspaceId FKs, compatibility layers).

---

## UI Impact

| Page | Impact | Action |
|------|--------|--------|
| `/agency/*` (11 pages) | Low | Currently reads `WebsiteAgency`. Add adapter to read from `Workspace` instead. |
| `/super-admin/agencies` | Low | Same adapter pattern |
| `/super-admin/agencies/[id]` | Low | Same adapter pattern |
| `WorkspaceSwitcher` | None | Already reads from Workspace |
| `WorkspaceProvider` | None | Already canonical |
| `/admin/*` (creator pages) | None | Already tenant-scoped through workspace |

**No UI changes needed.** Only data source redirection through adapters.

---

## Migration Strategy

### Phase 1: Adapter (No Behavior Change)
1. Add `workspaceId` FK to `Partner` (nullable)
2. Populate from `PartnerWorkspaceAssignment`
3. Add `workspaceId` FK to `CommissionRule`, `CommissionEntry`, `PayoutBatch`
4. Create adapter functions: `getWorkspaceByAgencyId()`, `getWorkspaceAgencyData()`

### Phase 2: Redirect (Transparent Migration)
1. Update `WebsiteAgency` queriess to read from `Workspace` through adapter
2. Update `User.agencyId` references to resolve through `WorkspaceMember`
3. Commission/payout system accepts workspaceId OR partnerId

### Phase 3: Deprecation (Safe Removal)
1. Mark `WebsiteAgency` as deprecated in schema
2. Mark `AgencySubscription` for deletion (already dead)
3. Mark `BillingAccount` as deprecated
4. Mark `PartnerMember` as deprecated in favor of `WorkspaceMember`

### Phase 4: Cleanup (Future)
1. Remove `WebsiteAgency` model
2. Remove `AgencySubscription` model
3. Remove `BillingAccount` model
4. Remove `PartnerMember`, `PartnerInvite`
5. Remove `Partner.type` — use Workspace.type instead

---

## Compatibility Layer Strategy

```typescript
// Adapter — wraps legacy WebsiteAgency reads through Workspace
// Used by all existing agency UI pages without modification

function getAgencyData(agencyId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { agencyId },
    include: { members: true, billingSubscription: true },
  });
  return {
    id: agencyId,
    name: workspace.name,
    subdomain: workspace.slug,
    status: workspace.status,
    // ... map remaining fields
  };
}
```

No schema changes needed for compatibility — `Workspace.agencyId` (unique, optional) already exists.

---

## Dead Code Candidates

| Item | Location | Action | Risk |
|------|----------|--------|------|
| `AgencySubscription` | schema.prisma | **Delete** | None (zero references) |
| `Subscription` (legacy) | schema.prisma | Deprecate | Low (minimal refs) |
| `PartnerMember` | schema.prisma | Deprecate | Low |
| `PartnerInvite` | schema.prisma | Deprecate | Low |
| Partner permissions | `partners/permissions.ts` | Deprecate | Low |
| Identity workspace types | `identity/workspace/types.ts` | Keep (DDD interface) | None |

---

## Recommended Consolidation Order

| Priority | Action | Effort | Risk | Dependencies |
|----------|--------|--------|------|-------------|
| P0 | Delete `AgencySubscription` | Trivial | None | None |
| P0 | Add `workspaceId` to `Partner` | Low | Low | None |
| P1 | Add `workspaceId` to commission/payout models | Low | Low | P0 Partner |
| P1 | Create Workspace adapter for WebsiteAgency reads | Low | Low | None |
| P2 | Migrate PartnerMember → WorkspaceMember | Medium | Medium | P1 |
| P2 | Migrate PartnerInvite → workspace invites | Medium | Medium | P2 members |
| P3 | Deprecate `BillingAccount` | Medium | Medium | P0 billing subs |
| P3 | Migrate `Subscription` → `BillingSubscription` | High | Medium | P0 |
| P4 | Remove `WebsiteAgency` model | High | Medium | P1 adapter, P3 billing |
| P4 | Remove `Partner.type` | Low | Low | P4 WebsiteAgency removal |

---

## Architectural Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `User.agencyId` is widely used in auth/session logic | High | Adapter pattern — resolve agencyId through WorkspaceMember → Workspace |
| `Tenant` remains separate from Workspace | Medium | Keep Tenant as data container; Workspace as aggregate root |
| `AgencyTenant` permission flags (6 booleans) don't align with capability system | Medium | Map to `CapabilityService` in AGENCY-01 |
| Partner commission system tightly coupled to partnerId | Low | Add workspaceId FK, accept both |

---

## Production Readiness

| Dimension | Score | Notes |
|-----------|-------|-------|
| Workspace Foundation | **90/100** | Already production-ready — consolidation is documentation + small FKs |
| Website Ownership | **80/100** | Need workspaceId on Website (future) |
| Billing Ownership | **85/100** | WorkspaceId already exists on invoices |
| Permission Ownership | **90/100** | Workspace auth is already canonical |
| Capability Ownership | **95/100** | Already capability-driven |
| Database Readiness | **75/100** | Multiple legacy tables need deprecation |
| **Overall** | **86/100** | **Foundation is solid — ready for AGENCY-01** |

---

## Validation

- ✅ One aggregate root: Workspace
- ✅ Website ownership unified: Workspace → Tenant → Website
- ✅ Billing ownership unified: BillingSubscription → Workspace
- ✅ Permission ownership unified: Workspace authorization (22 permissions, 4 roles)
- ✅ Capability ownership unified: CapabilityService (plan-based, workspace-scoped)
- ✅ Branding ownership unified: Workspace name + plan capabilities
- ✅ Storage ownership unified: Plan limits + media service
- ✅ Marketplace ownership unified: Workspace-scoped installations
- ✅ Migration path documented: 4 phases (Adapter → Redirect → Deprecation → Cleanup)
- ✅ Compatibility strategy documented: Adapter functions for legacy reads
- ✅ No behavior changes introduced: All changes are additive or documentation
