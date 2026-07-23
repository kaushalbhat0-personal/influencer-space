# ADR-004: Entitlements

## Status

Accepted (v1.1 Roadmap)

## Context

Feature availability was checked via scattered `if (plan === "PRO")` comparisons. When the plan catalog changed, every comparison was a latent bug. Two parallel feature gate systems (legacy `feature-gate.ts` and billing v2 `EntitlementService`) existed without clear ownership.

## Decision

All feature availability checks go through `EntitlementService` only.

```typescript
// ✅ Correct
entitlements.can("products.create")
entitlements.limit("products.max")

// ❌ Forbidden
if (plan === "creator_pro") { ... }
if (workspace.type === "AGENCY") { ... }
```

## Enforcement

- ESLint rule `no-plan-string-checks` catches `plan ===`, `plan !==`, `workspace.type ===`
- Code review rejects any feature check not using `EntitlementService`
- Legacy `src/lib/feature-gate.ts` is deleted when migration completes

## Plan Catalog

Plans are defined in `src/lib/billing/plan-catalog.ts`. Feature values are stored in `BillingPlanFeature` DB table (wired in Phase 2b, in-memory fallback until then).

| Feature Key | Type | Description |
|---|---|---|
| `products.max` | integer | Max products (-1 = unlimited) |
| `custom_domain` | boolean | Can use custom domain |
| `custom_branding` | boolean | Can remove CreatorStore branding |
| `clients.max` | integer | Max managed clients (agency plans) |
| `team.max` | integer | Max team members |
| `analytics.advanced` | boolean | Access to advanced analytics |
| `ai.generation` | boolean | AI content generation access |
| `storage.gb` | integer | Storage limit in GB |

## Consequences

- **Positive**: Plan renames require one catalog change, not 50 file changes.
- **Positive**: Feature limits are auditable via the DB table.
- **Negative**: Initial migration from in-memory to DB-backed reads requires caching strategy.
- **Rule**: No code path should check a plan code or workspace type to determine feature availability.
