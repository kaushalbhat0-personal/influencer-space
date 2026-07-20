# CreatorOS — Business Domain Model

## Platform Hierarchy

```
CreatorOS Platform
    │
    ├── Super Admin        — Platform owner. Manages everything.
    │
    ├── Agency             — Business managing multiple Creators.
    │   ├── Creator
    │   ├── Creator
    │   └── Creator
    │
    └── Creator            — Direct-to-platform Creator (no agency).
```

## Roles & Responsibilities

| Persona | Creates | Owns | Access |
|---------|---------|------|--------|
| **Super Admin** | Agencies, Creators, Plans, Themes, Modules | Everything | `/super-admin/*` |
| **Agency** | Creator accounts, Websites | Their Creators | `/agency/*`, Builder |
| **Creator** | Content, Products, Media, Settings | Their own site | `/admin/*` |
| **Visitor** | Nothing | Nothing | Public pages only |

## Tenant Model (Database Alignment)

The current Prisma schema already supports this hierarchy:
- `User.role`: `SUPER_ADMIN` | `AGENCY_ADMIN` | `AGENCY_STAFF` | `ADMIN` (Creator)
- `WebsiteAgency`: Agency entity with subscription and settings
- `Tenant`: Creator entity with site data
- `AgencyTenant`: Junction (agency ↔ creator) with revenue share and permission flags

A Creator may belong directly to CreatorOS (`tenant.agencyTenant === null`) or to an Agency (`tenant.agencyTenant !== null`).

## Architectural Rules

1. Business logic stays in `src/lib/` (Builder Store, Commands, Queries, Events)
2. React components in `src/app/` are presentation only
3. No business logic inside components
4. Roles are enforced at the middleware layer (`RBAC` in `src/middleware.ts`)
5. Feature gating is plan-based (`src/lib/feature-gate.ts`)
