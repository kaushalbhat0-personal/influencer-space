# ADR-005: Domain Freeze

## Status

Accepted (v1.1 Roadmap)

## Context

As the codebase evolves, domain entities tend to accumulate new fields and relationships in every sprint. This makes the foundation unstable — middleware, services, and downstream consumers all need to adapt to schema changes.

After the Workspace foundation is shipped (Phase 2a), higher-level features (billing, agency, freelancer) must build on a stable domain.

## Decision

After Phase 2a, the Workspace domain layer enters a **frozen** state:

| Entity | Frozen | Notes |
|---|---|---|
| `Workspace` | ✅ | No new columns, no new relations |
| `WorkspaceMember` | ✅ | No new columns |
| `WorkspaceRole` | ✅ | Values can be added, not removed |
| `WorkspaceStatus` | ✅ | Values can be added, not removed |
| `WorkspaceService` public API | ✅ | Methods can be added, not removed or renamed |
| `WorkspaceCookie` format | ✅ | Version field allows evolution |

### What "Frozen" Means

- No new columns on `Workspace` or `WorkspaceMember` unless strictly necessary (append-only with Architecture Review)
- No new relations to `Workspace` from other aggregate roots
- No relationship changes (FK type changes, cascade changes)
- No new aggregate roots that overlap with Workspace
- No new workspace types (`TENANT` and `AGENCY` only until v2.0)

### What Builds on Top of Frozen Domain

Every new business capability introduced after Phase 2a must attach to an existing aggregate (Workspace, Website, BillingSubscription, WorkspaceMember, etc.). Creating a new aggregate root requires an Architecture Review.

| Feature | Attaches To |
|---|---|
| Subscription platform | `Workspace → BillingSubscription` |
| `/workspace` route | `WorkspaceService.getCurrent()` |
| Team management | `WorkspaceMember` |
| Client provisioning | `Workspace.type`, `Workspace.id` |
| Freelancer view | `Workspace.isFreelancer` |
| Analytics | `Workspace.id` (analytics service, not schema) |

### No Cross-Domain Queries

Domain boundaries are enforced by service layers, not schema:

```
Products
  ↓
EntitlementService  (not direct Billing query)
  ↓
Billing

Workspace
  ↓
AuthorizationService  (not direct role check)
  ↓
Permissions
```

Billing should never query Products. Products should never query Billing. Cross-domain concerns go through the appropriate service.

## Consequences

- **Positive**: Stable foundation. Middleware and services don't need schema-driven changes.
- **Positive**: Clear ownership of what can change.
- **Negative**: Occasional friction when a genuinely needed field requires exception process.
- **Enforcement**: `prisma/schema.prisma` comment on `Workspace` model flags freeze status. Architecture Review required for changes.
