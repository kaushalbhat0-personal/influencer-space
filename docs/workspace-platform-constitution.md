# Workspace Platform Constitution — Version 1.0

> **Status:** Ratified
> **Applies to:** All platform development from AGENCY-01 onward
> **Amends:** [Platform Architecture v1](platform-architecture-v1.md)
> **Updates:** Any modification to this constitution requires a new Architecture Decision Record (ADR)

---

## 1. Purpose

Workspace is the **single canonical aggregate root** for the Creatos Platform. Every billable, member-owned context resolves through Workspace — whether Creator, Agency, Enterprise, Freelancer, or future product types.

This constitution defines the permanent contract for Workspace. No future product may create a parallel ownership system. All products extend Workspace.

---

## 2. Platform vs Business Separation

The Workspace model has **two distinct layers** that must never be mixed.

### Workspace Platform (infrastructure)

```
Workspace Platform
  ├── Identity         — name, slug, type, status, lifecycle
  ├── Membership       — WorkspaceMember, roles, authorization
  ├── Billing          — BillingSubscription, BillingInvoice, plans
  ├── Capabilities     — Feature gating via CapabilityService
  ├── Marketplace      — Installed themes, templates, packs
  ├── Storage          — Media limits, asset management
  ├── Branding         — White-label, custom domain
  ├── Audit            — AuditLog scoped to workspace resources
  └── Analytics        — Workspace-level metrics
```

### Workspace Business (specializations)

```
Workspace Business
  ├── Creator Workspace   — type: TENANT,    1 website, creator plans
  ├── Agency Workspace    — type: AGENCY,    N client websites, agency plans
  ├── Freelancer Workspace — type: FREELANCER (future)
  ├── Enterprise Workspace — type: ENTERPRISE (future)
  └── Internal Workspace  — type: INTERNAL   (future)
```

**Rule:** Business logic must never be baked into platform infrastructure. Platform services (billing, authorization, marketplace) must remain business-agnostic.

---

## 3. Aggregate Definition

```
Workspace
  ├── Identity (name, slug, type, status)
  ├── Members (WorkspaceMember with roles)
  ├── Billing (BillingSubscription, BillingInvoice)
  ├── Branding (name, white-label capability)
  ├── Storage (media limits, asset references)
  ├── Marketplace (installed themes, templates, packs)
  ├── Websites (1:1 for TENANT type, N:N for AGENCY type)
  ├── Audit (AuditLog scoped to workspace resources)
  └── Analytics (workspace-level metrics)
```

### Workspace Type Hierarchy

| Type | Purpose | Website Relationship | Billing |
|------|---------|---------------------|---------|
| `TENANT` | Individual creator | 1 workspace : 1 website | Creator plans |
| `AGENCY` | Agency managing clients | 1 workspace : N client websites | Agency plans |
| `FREELANCER` | Solo professional (future) | 1 workspace : N websites | Creator+ plans |
| `ENTERPRISE` | Organization (future) | 1 workspace : N websites | Enterprise plans |
| `INTERNAL` | Platform operations (future) | None | Internal |

---

## 4. Workspace Identity (Frozen)

| Field | Constraint |
|-------|-----------|
| `workspaceId` | **Immutable.** Globally unique. Never reused after deletion. |
| `slug` | **Immutable after creation.** Unique. Human-readable. URL-safe. |
| `name` | Mutable. Display name for the workspace. |
| `type` | **Immutable after creation.** One of: TENANT, AGENCY, FREELANCER (future), ENTERPRISE (future), INTERNAL (future). |
| `status` | Managed by lifecycle. See section 5. |

---

## 5. Workspace Lifecycle

```
CREATING ──→ ACTIVE ──→ SUSPENDED ──→ ARCHIVED ──→ DELETED
                │            │             │
                └────────────┴─────────────┘
                         (restore)
```

### State Rules

| State | Description | Can Publish | Can Create Websites | Can Edit | Can Bill |
|-------|-------------|-------------|-------------------|----------|----------|
| `CREATING` | Being provisioned | ❌ | ❌ | ❌ | ❌ |
| `ACTIVE` | Fully operational | ✅ | ✅ | ✅ | ✅ |
| `SUSPENDED` | Temporarily disabled | ❌ | ❌ | ❌ | ❌ |
| `ARCHIVED` | Read-only historical | ❌ | ❌ | Read-only | ❌ |
| `DELETED` | Soft delete (retained for compliance) | ❌ | ❌ | ❌ | ❌ |

### Transition Rules

- `CREATING → ACTIVE` — Automatic after successful provisioning
- `ACTIVE → SUSPENDED` — Manual (super admin or payment failure)
- `SUSPENDED → ACTIVE` — Restore (payment resolved or admin action)
- `ACTIVE → ARCHIVED` — Manual (creator closes workspace)
- `ARCHIVED → ACTIVE` — Restore (within retention period)
- `ARCHIVED → DELETED` — Automatic after retention period expires

---

## 6. Workspace Context

Every authenticated request executes within an **Active Workspace Context**.

```
Request
  ↓
User (authenticated via JWT)
  ↓
Workspace Context (resolved from cookie or session)
  │  └── workspaceId, type, role
  ↓
Authorization (authorizationService.require())
  ↓
Capability (CapabilityService.can())
  ↓
Business Logic
```

### Resolution Order

1. Check `__workspace` cookie (set by workspace switcher)
2. Fall back to `session.user.workspaceId` (set during login)
3. If neither exists, the request operates without workspace context (super admin only)

### Rules

- All data queries MUST be scoped to the active workspace context
- `workspaceService.resolveTenantId()` provides tenant isolation
- Workspace context is immutable for the duration of a single request

---

## 7. Ownership Graph

```
                    ┌─────────────────────────────┐
                    │         WORKSPACE            │
                    │  (single aggregate root)     │
                    └───────────┬─────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
     ┌────────▼────────┐ ┌─────▼──────┐  ┌────────▼────────┐
     │    MEMBERS      │ │  BILLING   │  │   MARKETPLACE   │
     │  WorkspaceMember│ │  BillingSub│  │  Installed Items│
     │  (OWNER/ADMIN/  │ │  BillingInv│  └─────────────────┘
     │   MEMBER/VIEWER)│ └────────────┘
     └─────────────────┘
              │
     ┌────────▼────────┐
     │    WEBSITES     │
     │                 │
     │  Content        │
     │  Products       │
     │  Gallery        │
     │  Pages          │
     │  SEO            │
     │  Navigation     │
     │                 │
     │  Publishing     │
     │  Snapshot       │
     │  Storefront     │
     └─────────────────┘
```

### Dependency Direction

```
Workspace
  ↓
Website
  ↓
Builder / Publishing / Storefront
```

**NEVER:**

```
Website → Workspace  (FORBIDDEN)
```

No upward dependencies. Workspace never depends on Website. Website depends on Workspace for ownership context only.

### Ownership Rules (Non-negotiable)

1. **Workspace owns identity** — name, slug, type, membership
2. **Workspace owns billing** — subscription, invoices, plan, limits
3. **Workspace owns branding** — logo, colors, white-label, domains
4. **Workspace owns storage** — media limits, total usage
5. **Workspace owns marketplace** — installed themes, templates, packs
6. **Workspace owns permissions** — member roles, authorization
7. **Website owns content** — products, gallery, pages, SEO, navigation
8. **Website owns publishing** — snapshots, storefront rendering
9. **Website NEVER owns billing** — no subscription, no plan
10. **Website NEVER owns permissions** — no membership, no roles
11. **Website NEVER owns branding** — theme is a preference, not ownership
12. **Website NEVER owns marketplace** — consumes workspace's installed items

### What Workspace Never Owns

| Workspace Owns | Workspace Does NOT Own |
|---------------|------------------------|
| Identity (name, slug, type) | Products |
| Membership (users, roles) | Orders |
| Billing (subscription, plan) | Builder state |
| Storage limits | PublishedSnapshots |
| Marketplace installs | Theme configuration |
| Audit log | Navigation items |
| Analytics aggregation | SEO metadata |
| Branding (white-label) | Website content |

---

## 8. Membership Model

### Roles

| Role | Level | Permissions | Scope |
|------|-------|-------------|-------|
| `OWNER` | Workspace | All 22 permissions | Full control |
| `ADMIN` | Workspace | 12 permissions (clients, content, analytics, settings, assets) | Day-to-day operations |
| `MEMBER` | Workspace | 3 permissions (content:edit, analytics:view, assets:upload) | Content editing |
| `VIEWER` | Workspace | 1 permission (analytics:view) | Read-only access |

### All Permissions (22)

```
workspace:manage       workspace:delete
billing:read           billing:manage
members:invite         members:remove        members:change-role
clients:create         clients:manage        clients:delete
websites:create        websites:manage
content:edit           content:publish
analytics:view
settings:read          settings:write
ai:generate            ai:manage
domains:manage
assets:upload
```

### Invitation Model

```
Workspace Owner/Admin
  ↓
Invite (email, role, expiresAt)
  ↓
User accepts
  ↓
WorkspaceMember created (status: ACTIVE)
  ↓
Authorization enforced via authorizationService.require()
```

### Ownership Transfer

- Ownership transfer requires existing OWNER approval
- Minimum one OWNER per workspace
- Transfer logs to audit

---

## 9. Billing Model

### Ownership

```
Workspace ──1:1── BillingSubscription
  ├── BillingPlan (code, price, features)
  ├── BillingInvoice[]
  ├── BillingEvent[]
  └── Limits enforced by CapabilityService
```

### Rules

1. **One subscription per workspace** — `BillingSubscription.workspaceId` (unique)
2. **Plan determines capabilities** — CapabilityService reads plan features
3. **Invoices belong to workspace** — `BillingInvoice.workspaceId`
4. **Events belong to workspace** — `BillingEvent.workspaceId`
5. **Usage is workspace-scoped** — usage tracking per workspace
6. **Website never has its own billing** — no subscription on website

### Plan Family to Workspace Type Mapping

| Workspace Type | Plan Family | Plan Examples |
|---------------|-------------|--------------|
| `TENANT` | `creator` | creator_free, creator_pro, creator_elite |
| `AGENCY` | `agency` | agency_free, agency_studio, agency_agency |
| `FREELANCER` | `creator` | (future) |
| `ENTERPRISE` | `enterprise` | (future) |

---

## 10. Branding Model

### Ownership

```
Workspace
  ├── name (workspace.name)
  ├── slug (workspace.slug)
  ├── white_label (capability: white_label)
  ├── custom_domain (capability: custom_domain)
  └── Website.theme (consumes workspace theme preference)
```

### Rules

1. **Workspace name is the business identity** — used in billing, communication
2. **White-label is a capability** — `CapabilityService.can(planCode, "white_label")`
3. **Custom domain is a capability** — `CapabilityService.can(planCode, "custom_domain")`
4. **Website theme is a content preference** — not branding ownership
5. **Agency branding** — Workspace type AGENCY can white-label client storefronts

---

## 11. Storage Model

### Ownership

```
Workspace
  └── Storage limit (from plan)
       └── Media assets (scoped to workspace via tenant)
            └── Asset references (used by website content)
```

### Rules

1. **Storage limit is a plan feature** — `CapabilityService.limit(planCode, "storage_gb")`
2. **Media assets belong to workspace** — uploaded by workspace members
3. **Website references media** — stores resolved URLs in snapshot
4. **Usage tracking** — future: `BillingUsage` per workspace

---

## 12. Marketplace Model

### Ownership

```
Workspace
  ├── Installed themes (ThemePackage records)
  ├── Installed templates (BlueprintPackage records)
  ├── Installed components (future)
  ├── Purchased packs (future)
  └── Licenses (future)
```

### Rules

1. **Marketplace installations are workspace-scoped** — not per-website
2. **Websites consume workspace's installed items** — theme, template
3. **Purchases bill to workspace** — via BillingSubscription
4. **MarketplaceRegistry remains read-only** — never mutated by installations

---

## 13. Website Model

### Ownership

```
Website (belongs to workspace via tenant)
  ├── Content (products, gallery, timeline, games, etc.)
  ├── Pages (layout, sections, blocks)
  ├── Navigation (menu structure)
  ├── SEO (metadata, structured data)
  ├── Publishing (PublishedSnapshot)
  └── Storefront (rendering)
```

### Boundaries

| Website Owns | Website Does NOT Own |
|-------------|---------------------|
| Product catalog | Subscription/plan |
| Gallery images | Storage limits |
| Page layout | Team membership |
| Navigation | Billing |
| SEO metadata | White-label |
| PublishedSnapshot | Custom domain |
| Storefront rendering | Marketplace purchases |
| Hero content | Permissions |
| FAQ | Brand identity |
| Testimonials | — |
| Timeline events | — |
| Links | — |
| Theme preference (not ownership) | — |

---

## 14. Workspace Events (Reserved)

These events are reserved for future AI, automation, and audit integration. No implementation required — architecture contract only.

### Workspace Lifecycle

| Event | Trigger |
|-------|---------|
| `WorkspaceCreated` | Provisioning completes |
| `WorkspaceActivated` | Status changes to ACTIVE |
| `WorkspaceSuspended` | Status changes to SUSPENDED |
| `WorkspaceArchived` | Status changes to ARCHIVED |
| `WorkspaceRestored` | Status changes from ARCHIVED back to ACTIVE |
| `WorkspaceDeleted` | Status changes to DELETED |

### Membership

| Event | Trigger |
|-------|---------|
| `MemberInvited` | Invitation sent |
| `MemberJoined` | User accepts invitation |
| `MemberRoleChanged` | Workspace role updated |
| `MemberRemoved` | Member removed from workspace |

### Billing

| Event | Trigger |
|-------|---------|
| `SubscriptionChanged` | Plan upgraded or downgraded |
| `CapabilityGranted` | New capability added to workspace |
| `PaymentSucceeded` | Invoice paid |

### Website (Workspace-scoped)

| Event | Trigger |
|-------|---------|
| `WebsiteCreated` | Website provisioned |
| `WebsitePublished` | New snapshot published |
| `WebsiteArchived` | Website archived |

---

## 15. Extension Model

### How Future Products Extend Workspace

A future product may extend Workspace **only** by adding:

| Extension Point | Example |
|----------------|---------|
| **WorkspaceType** | `ENTERPRISE`, `FREELANCER` |
| **Capabilities** | New feature IDs + plan definitions in CapabilityService |
| **UI** | New pages under workspace route patterns |
| **Services** | New domain services consuming workspace platform |
| **Policies** | Business rules for the specific workspace type |

### A future product may NOT introduce:

| Prohibited | Reason |
|-----------|--------|
| A new aggregate root | Workspace is the only root |
| A new ownership hierarchy | All ownership descends from Workspace |
| A parallel permission system | authorizationService is the only runtime check |
| A separate billing pipeline | BillingSubscription owns all billing |
| A new marketplace ownership model | MarketplaceRegistry is the only registry |
| A new storage model | MediaService manages all assets |
| A new branding model | Workspace owns all brand identity |

### Examples

```
AGENCY:
  Workspace(type: AGENCY)
  ├── Clients managed via workspace relationships
  ├── White-label via capability
  ├── Team via workspace members
  └── Billing via workspace subscription

ENTERPRISE:
  Workspace(type: ENTERPRISE)
  ├── Departments via workspace hierarchy (future)
  ├── SSO via capability
  ├── Audit via workspace audit
  └── Custom branding via capability
```

---

## 16. Architecture Guardrails

### Constitutional Runtime Rule

> **All runtime ownership resolution MUST begin with Workspace.**

Not Tenant. Not WebsiteAgency. Not Partner. Not BillingAccount. Exactly one entry point for ownership: **Workspace**.

### Non-Negotiable Rules

1. **One Workspace aggregate root** — no parallel ownership models
2. **One authorization service** — `authorizationService.require()` is the only runtime check
3. **One billing pipeline** — `PublishingService` creates all snapshots
4. **One provisioning pipeline** — `ProvisioningService` creates all tenants/workspaces
5. **One capability service** — `CapabilityService` gates all features
6. **One health engine** — `WebsiteHealthEngine` scores all websites
7. **One theme registry** — `ThemeRegistry` defines all themes
8. **One blueprint registry** — `BlueprintRegistry` defines all templates
9. **One marketplace registry** — `MarketplaceRegistry` lists all items
10. **One media service** — `MediaService` manages all assets

### Migration Rules

- Legacy tables may exist but must not own business logic
- All legacy reads must go through adapters
- New features must never read legacy tables directly

---

## 17. Migration Notes (Current State)

| Legacy System | Status | Adapter | Migration Target |
|--------------|--------|---------|-----------------|
| `WebsiteAgency` | **Deprecated** | `getWorkspaceByAgencyId()` | Workspace(type: AGENCY) |
| `AgencySubscription` | **Dead** | None — zero references | Delete |
| `Subscription` (legacy) | **Deprecated** | BillingSubscription | BillingSubscription |
| `BillingAccount` | **Deprecated** | resolveWorkspaceBilling() | Direct Workspace FK |
| `Partner` (ownership) | **Deprecated** | Partner membership → WorkspaceMember | Workspace |
| `PartnerMember` | **Deprecated** | → WorkspaceMember | Workspace |
| `PartnerInvite` | **Deprecated** | → Workspace invitation | Workspace |

---

## 18. ADR Requirement

**Any modification to this constitution requires a new Architecture Decision Record (ADR).**

This includes:
- Adding a new WorkspaceType
- Changing the lifecycle model
- Adding new permissions
- Changing ownership boundaries
- Adding new platform services
- Modifying the runtime resolution rule

This prevents accidental architectural drift.

---

## 19. References

- [Platform Architecture v1](platform-architecture-v1.md) — Core architecture constitution
- [Domain Map](domain-map.md) — Bounded contexts
- [Workspace Consolidation](agency-00a-workspace-consolidation.md) — Consolidation decisions
- [Runtime Consolidation](agency-00b-runtime-consolidation-report.md) — Adapter implementation
- [Coding Standards](coding-standards.md) — Implementation rules
- [Architecture Decisions](architecture-decisions.md) — ADR index
