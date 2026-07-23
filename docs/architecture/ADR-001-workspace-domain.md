# ADR-001: Workspace Domain

## Status

Accepted (v1.1 Roadmap)

## Context

The codebase had two separate concepts for the same thing: a `Tenant` (creator website owner) and a `WebsiteAgency` (multi-client organization). Billing was tracked via a polymorphic `BillingAccount(accountType, accountId)`. Authorization required checking `User.tenantId` or `User.agencyId` depending on context.

Adding a new workspace type (e.g., freelancer) required duplicated logic.

## Decision

Introduce a `Workspace` aggregate root as the unified domain entity for any billable, member-owned context.

```
Workspace
  ├── BillingSubscription
  ├── WorkspaceMember[]
  ├── Website[]         (v2.0 target)
  ├── Tenant (legacy FK, phased out in v2.0)
  └── Agency (legacy FK, phased out in v2.0)
```

Key properties:
- `Workspace.type` discriminates `TENANT` vs `AGENCY`
- `Workspace.slug` is the unique URL-friendly identifier
- `Workspace.isFreelancer` distinguishes solo operators from agencies
- Billing is owned directly by `Workspace` (no polymorphic `BillingAccount`)
- Membership is owned by `WorkspaceMember` (not loose FK on `User`)

## Consequences

- **Positive**: Single authorization boundary (`WorkspaceMember`). Single billing relationship. Easy to add new workspace types.
- **Negative**: Requires data migration to backfill `Workspace` rows for all existing `Tenant` and `WebsiteAgency` records.
- **Migration**: See `prisma/migrations/` for the backfill script.

## Long-Term Vision (v2.0)

`Tenant` and `WebsiteAgency` tables are removed entirely. `Workspace` directly owns `Website[]`. A creator is a workspace with one website. An agency is a workspace with many websites.
