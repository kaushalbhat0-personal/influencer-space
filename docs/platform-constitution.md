# Creatos Platform Constitution — Version 1.0

> **Status:** Ratified
> **Governance:** This is the highest-level engineering document in the repository. Every future feature, refactor, and architecture decision must comply with this constitution.
> **Supersedes:** All earlier architecture documents where conflicts exist.
> **Amends:** [Platform Architecture v1](platform-architecture-v1.md), [Workspace Constitution](workspace-platform-constitution.md)
> **Updates:** Any modification requires an Architecture Decision Record (ADR).

---

## 1. Purpose

This constitution defines the immutable architectural rules of the Creatos Platform. It exists to ensure that every engineer, contributor, and AI agent can understand what the platform is, how it is organized, what can be extended, and what must never be violated — without reading the entire codebase.

This document is NOT:

- A roadmap (see [Product Roadmap](product-roadmap.md))
- Implementation documentation
- API documentation
- A tutorial

This document IS:

- The single source of truth for architectural governance
- A contract between all platform contributors
- The arbiter of design disputes

---

## 2. Vision

Creatos is a **Website Operating System** — not a website builder. Creators never configure software; they create their online brand. The platform serves multiple personas through one architecture:

| Persona | Experience |
|---------|-----------|
| **Creator** | Signup, choose template, choose theme, generate, edit, publish |
| **Agency** | Manage clients, provision websites, white-label, collaborate |
| **Super Admin** | Platform operations, creator management, marketplace review |
| **Enterprise** | SSO, audit, compliance, custom branding (future) |

One platform. Many experiences.

---

## 3. Core Engineering Principles

1. **Single Ownership** — Every domain has exactly one owner. No code outside that owner may write to its data.
2. **One Canonical Pipeline** — Every operation has exactly one pipeline. No parallel implementations.
3. **Registry Driven** — Entity definitions live in registries, not in hardcoded switches or conditionals.
4. **Capability Driven** — Every feature gate, permission, and upgrade resolves through CapabilityService. Never compare plan codes directly.
5. **Snapshot Driven** — The PublishedSnapshot is the single source of truth for storefront rendering. No business table reads at render time.
6. **Workspace is the Aggregate Root** — Every billable, member-owned context resolves through Workspace. No parallel ownership models.
7. **Configuration over Duplication** — Registries replace duplicated logic.
8. **Composition over Inheritance** — Systems compose via registries and services, not class hierarchies.
9. **No Upward Dependencies** — Workspace → Website → Builder/Publishing/Storefront. Never Website → Workspace.
10. **SOLID, DRY, KISS, DDD** — Applied consistently across the codebase.

---

## 4. Architectural Invariants

These rules may NEVER be violated without an explicit ADR:

1. **One Workspace aggregate root** — No parallel ownership models.
2. **One Builder** — No parallel layout editor.
3. **One PublishingService** — `PublishingService` creates all snapshots.
4. **One ProvisioningService** — `ProvisioningService` creates all tenants and workspaces.
5. **One WebsiteHealthEngine** — All health scoring goes through this engine.
6. **One CapabilityService** — All feature gating resolves through this service.
7. **One ThemeRegistry** — All theme definitions live here.
8. **One BlueprintRegistry** — All website template definitions live here.
9. **One MarketplaceRegistry** — All marketplace items are listed here.
10. **One MediaService** — All media uploads and resolution go through this service.
11. **One BillingService** — All billing operations resolve through `src/modules/billing/`.
12. **One BillingRepository** — All billing persistence goes through this repository.
13. **Storefront reads ONLY from PublishedSnapshot** — No business tables at render time.
14. **Builder owns ONLY layout** — No content editing, no health scoring, no quick actions.
15. **Marketplace owns ONLY discovery** — No generation, publishing, building, or provisioning.
16. **Agency is a Workspace specialization** — No AgencyMember, AgencyBilling, AgencyPermission models.
17. **All runtime ownership resolution begins with Workspace** — Not Tenant, not WebsiteAgency, not Partner.

---

## 5. Platform Ownership

| Domain | Owner | Location | Consumers |
|--------|-------|----------|-----------|
| **Workspace** | Workspace Platform | `src/modules/workspace/`, `src/lib/workspace/` | All domains |
| **Capabilities** | Capability Platform | `src/lib/capabilities/` | All domains |
| **Publishing** | Publishing Platform | `src/lib/publishing/` | Dashboard, Builder, API |
| **Provisioning** | Provisioning Platform | `src/lib/provisioning/` | Onboarding, Super Admin |
| **Builder** | Builder Platform | `src/features/builder/` | Creator, Agency |
| **Media** | Media Platform | `src/lib/media/` | All content domains |
| **Marketplace** | Marketplace Platform | `src/lib/marketplace/` | Dashboard, Admin |
| **Theme** | Theme Platform | `src/lib/theme/` | Builder, Publishing, Storefront |
| **Blueprint** | Template Platform | `src/lib/blueprint/` | Creation wizard, Generator |
| **Agency** | Agency Platform | `src/app/agency/`, `src/lib/client/` | Agency workspace |
| **Creator** | Creator Platform | `src/app/admin/` | Creator workspace |
| **Health** | Health Platform | `src/lib/platform/health/` | Dashboard, Builder |
| **Billing** | Billing Platform | `src/modules/billing/` | All billing operations |

---

## 6. Aggregate Roots

The platform has exactly **one** aggregate root:

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

No other aggregate root may exist. No parallel ownership model may be created.

---

## 7. Canonical Runtime Flow

Every authenticated request executes within an **Active Workspace Context**:

```
Request
  ↓
User (authenticated via JWT)
  ↓
Workspace Context (resolved from cookie or session)
  ↓
Authorization (authorizationService.require())
  ↓
Capability (CapabilityService.can())
  ↓
Business Logic
  ↓
Publishing (PublishingService — if applicable)
  ↓
Event (platformEventBus — fire-and-forget)
```

Resolution order: Workspace cookie → Session → Super Admin fallback.

---

## 8. Canonical Service Layer

Every domain exposes its capabilities through a service layer. Services are consumed by:

- Server actions (`src/actions/`)
- API routes (`src/app/api/`)
- Page components (server components)
- Other services (composition)

The canonical services are:

| Service | File | Responsibility |
|---------|------|---------------|
| `BillingService` | `src/modules/billing/application/service.ts` | All billing operations |
| `CapabilityService` | `src/lib/capabilities/service.ts` | Feature gating |
| `PublishingService` | `src/lib/publishing/service.ts` | Snapshot creation |
| `ProvisioningService` | `src/lib/provisioning/provisioning-service.ts` | Tenant/workspace creation |
| `WebsiteHealthEngine` | `src/lib/platform/health/engine.ts` | Health scoring |
| `WorkspaceLifecycleService` | `src/lib/workspace/lifecycle.ts` | Workspace state machine |
| `WorkspaceContextService` | `src/lib/workspace/context.ts` | Runtime context resolution |
| `WorkspaceMemberService` | `src/lib/workspace/membership.ts` | Member management |
| `WorkspacePolicyService` | `src/lib/workspace/policy.ts` | Lifecycle enforcement |
| `ClientService` | `src/lib/client/service.ts` | Client management |
| `ClientHealthEngine` | `src/lib/client/health.ts` | Client health aggregation |
| `AssignmentService` | `src/lib/client/assignment.ts` | Team-to-client assignments |

---

## 9. Repository Rules

1. **One repository per domain** — No duplicate persistence logic.
2. **Repositories may only be called by their domain's service** — Not directly by pages or actions.
3. **All Prisma billing queries must go through BillingRepository** — No direct `prisma.billingSubscription.*` outside the module.
4. **Repositories may accept optional transaction clients** — For use within `$transaction`.
5. **Repositories return domain types, not raw Prisma types** — Map at the repository boundary.

---

## 10. Workspace Constitution

The [Workspace Platform Constitution](workspace-platform-constitution.md) defines the complete Workspace contract. Key rules:

1. Workspace is the single aggregate root.
2. Workspace type may be TENANT, AGENCY, or future types (FREELANCER, ENTERPRISE).
3. Workspace lifecycle: CREATING → ACTIVE → SUSPENDED → ARCHIVED → DELETED.
4. Only ACTIVE workspaces may publish or create websites.
5. Workspace owns identity, members, billing, branding, storage, marketplace.
6. Website owns content, publishing, storefront.
7. Website NEVER owns billing, permissions, or branding.

---

## 11. Billing Constitution

All billing resolves through `BillingService` → `BillingRepository`:

1. **BillingSubscription** is the only subscription model. `Subscription` (legacy) is deprecated. `AgencySubscription` is deleted.
2. **BillingService** handles checkout, payment capture, subscription lifecycle, cancellation.
3. **BillingRepository** handles all persistence. No direct Prisma billing queries outside this module.
4. **BillingInvoice** is the canonical invoice record.
5. **BillingEvent** is the append-only event log for payment operations.
6. **CapabilityService** determines plan entitlements — never duplicate in billing code.
7. **Workspace** owns billing — not Tenant, not Website, not WebsiteAgency.
8. Commission processing resolves through `CommissionService` → `BillingService.handlePaymentCaptured()`.

---

## 12. Marketplace Constitution

1. Marketplace owns discovery only — search, filtering, recommendations, premium gating.
2. Marketplace NEVER owns generation, publishing, building, or provisioning.
3. `MarketplaceRegistry` is the single registry for all marketplace items.
4. All items are read-only projections — never mutate ThemeRegistry or BlueprintRegistry.
5. Marketplace installations are workspace-scoped, not per-website.

---

## 13. Publishing Constitution

1. `PublishingService.publish()` is the only way to create PublishedSnapshots.
2. Publishing validates `WorkspacePolicy.assertCanPublish()` before creating snapshots.
3. The PublishedSnapshot is immutable once created — new publications create new versions.
4. Storefront reads ONLY from PublishedSnapshot — zero business table reads at render time.
5. Publishing fires `WebsitePublished` event and revalidates ISR cache.
6. Preview snapshots use a separate `state: "preview"` path.
7. Builder must use `PublishingService.markChangesPending()` instead of direct status writes.

---

## 14. Builder Constitution

1. Builder owns ONLY layout composition: section order, visibility, duplication, theme preview.
2. Builder NEVER owns content editing (products, hero, gallery, SEO, profile, links).
3. Builder is optional — creators can publish without opening Builder.
4. Builder resolves WorkspaceContext before loading and enforces workspace policy on save.
5. Builder provides deep links to admin content pages for all content editing.

---

## 15. Theme Constitution

1. Themes are code — defined in TypeScript at build time, stored in an in-memory registry.
2. `ThemeRegistry` is the single source of truth for all theme definitions.
3. `ThemeResolver` selects variants and applies custom overrides from `Website.themeColors`.
4. Themes are not database records. No theme data is stored in the database.
5. Custom color overrides are stored on the Website model and merged at publish time.

---

## 16. Blueprint (Website Template) Constitution

1. Blueprints define website structure: pages, navigation, sections, starter content, SEO defaults.
2. Blueprints generate websites — they are not rendered directly.
3. `BlueprintRegistry` is the single source of truth for all template definitions.
4. Template inheritance uses `resolveInheritedBlueprint()` for parent/child merging.
5. Templates are independent of themes — any compatible theme works with any template.

---

## 17. Agency Constitution

1. Agency is a Workspace specialization (`type: AGENCY`), not a separate ownership model.
2. No AgencyMember, AgencyBilling, AgencyPermission, or AgencyInvitation models exist — all reuse Workspace.
3. Client is the central business entity. Websites are assets of a client.
4. `ClientService` is the canonical client management service — no duplicate.
5. `ClientHealthEngine` wraps `WebsiteHealthEngine` — no duplicate health calculations.
6. `AssignmentService` is the canonical team-to-client assignment service.
7. Agency branding uses the canonical `AgencyBrandingService` — stored in Setting table.
8. White-label is a capability (`white_label`), not a separate infrastructure.

---

## 18. Creator Constitution

1. Creator is a Workspace specialization (`type: TENANT`), not a separate ownership model.
2. The Creator Journey is: Signup → Choose Template → Choose Theme → Generate → Website Ready → Dashboard → Admin → (Optional) Builder → Publish → Storefront.
3. Creator billing resolves through BillingService — no legacy billing imports.
4. Creator never sees Workspace terminology — they experience "My Website."

---

## 19. Capability Constitution

1. `CapabilityService` is the single feature gating service for the entire platform.
2. All plans are defined in `src/lib/capabilities/plans.ts`.
3. Plans are NEVER compared by code (`if (planCode === "creator_pro")`).
4. All gating uses `CapabilityService.can()`, `CapabilityService.limit()`, or `EntitlementService.has()`.
5. Feature IDs are defined in `FEATURE_IDS` constant — no hardcoded feature strings.
6. New capabilities require: feature ID in constants, feature info in catalog, plan values in plans.

---

## 20. Security Principles

1. **Three-layer defense**: Edge middleware (JWT), layout (server session), individual checks.
2. **All server actions verify roles** — every exported function checks session and role.
3. **Workspace isolation** — data queries must be scoped to the active workspace context.
4. **Development-only endpoints** must be production-guarded (`NODE_ENV === "production"` with role check).
5. **API routes** verify authentication and authorization before processing requests.
6. **Payment webhooks** validate provider signatures.
7. **Dangerous operations** (delete, suspend, publish for others) require SUPER_ADMIN role.

---

## 21. Performance Principles

1. **No N+1 queries** — Use `include` or batch queries.
2. **No repeated registry lookups** — In-memory registries are fast; avoid redundant calls in loops.
3. **No repeated health calculations** — `WebsiteHealthEngine.evaluate()` is expensive; cache per request.
4. **No repeated workspace resolution** — Resolve once per request, pass context through.
5. **Storefront ISR** — PublishedSnapshots are cached with 60s ISR revalidation.
6. **Index database columns** used in `WHERE`, `ORDER BY`, and `JOIN` clauses.

---

## 22. Extension Guidelines

A future product may extend the platform ONLY by adding:

| Extension Point | Example |
|----------------|---------|
| **WorkspaceType** | `ENTERPRISE`, `FREELANCER` |
| **Capabilities** | New feature IDs + plan definitions |
| **UI** | New pages under existing route patterns |
| **Services** | New domain services consuming canonical infrastructure |
| **Policies** | Business rules for the new workspace type |

A future product may NOT introduce:

| Prohibited | Reason |
|-----------|--------|
| A new aggregate root | Workspace is the only root |
| A new permission system | authorizationService is the only runtime check |
| A separate billing pipeline | BillingService owns all billing |
| A new marketplace ownership model | MarketplaceRegistry is the only registry |
| A new storage model | MediaService manages all assets |
| A new branding model | Workspace owns all brand identity |

---

## 23. Migration Policy

1. **Adapters first** — Legacy systems get compatibility adapters before migration.
2. **Dual writes during transition** — Write to both old and new systems, read from new.
3. **No breaking changes** — All migrations must be backward compatible.
4. **Data migration is idempotent** — Safe to run multiple times.
5. **Rollback strategy required** — Every migration must document how to revert.

---

## 24. Deprecation Policy

1. Deprecated features are marked with `@deprecated` JSDoc tag.
2. Deprecated features remain functional for one minor release.
3. After one minor release, deprecated features may be removed in a major release.
4. Removal requires: zero consumers confirmed, migration path documented, deprecation period elapsed.
5. Schema deprecation: annotate with `/// @deprecated` comment, keep model, remove in next major.

---

## 25. Documentation Policy

1. The [Platform Constitution](platform-constitution.md) is the top-level governance document.
2. The [Platform Architecture v1](platform-architecture-v1.md) defines architecture.
3. The [Product Roadmap](product-roadmap.md) defines product direction.
4. The [Workspace Constitution](workspace-platform-constitution.md) defines Workspace contract.
5. The [Coding Standards](coding-standards.md) define implementation rules.
6. Release notes live in `docs/releases/`.
7. ADRs live in `docs/adr/`.
8. All documents must use consistent terminology (see [Glossary](glossary.md)).

---

## 26. Release Governance

1. Releases follow SemVer: `MAJOR.MINOR.PATCH`.
2. **Major releases** may add new Workspace types or domains.
3. **Minor releases** may add features within existing domains.
4. **Patch releases** are for bug fixes and security only.
5. Every release requires a Release Candidate audit.
6. The audit must confirm zero release blockers before tagging.
7. After tagging, the release branch accepts only bug fixes.

---

## 27. Engineering Checklist

Before committing any code, verify:

- [ ] Does this change violate any architectural invariant? (Section 4)
- [ ] Does this change create a parallel ownership model? (Section 6)
- [ ] Does this change bypass a canonical service? (Section 8)
- [ ] Does this change introduce a direct Prisma billing query? (Section 11)
- [ ] Does this change add content editing to the Builder? (Section 14)
- [ ] Does this change add generation or publishing to Marketplace? (Section 12)
- [ ] Does this change compare plan codes directly? (Section 19)
- [ ] Does this change add a new aggregate root? (Section 6)
- [ ] Does this change read business tables in the storefront? (Section 13)
- [ ] Does this change introduce AgencyMember, AgencyBilling, or AgencyPermission? (Section 17)

If any answer is "yes," the change requires an ADR.

---

## 28. Forbidden Patterns

The following patterns are explicitly forbidden without an ADR:

- ❌ `prisma.billingSubscription.*` outside `src/modules/billing/`
- ❌ `prisma.publishStatus.update()` outside `PublishingService`
- ❌ Direct plan code comparisons (`if (planCode === "creator_pro")`)
- ❌ Content editing in the Builder
- ❌ Business table reads in storefront rendering
- ❌ New aggregate roots (parallel to Workspace)
- ❌ Direct `WebsiteAgency` reads without going through workspace adapters
- ❌ `AgencyMember`, `AgencyBilling`, `AgencyPermission` models
- ❌ Duplicate registries for themes, blueprints, capabilities, or marketplace items
- ❌ Hardcoded feature flags outside the capabilities system

---

## 29. Architecture Decision Process

1. Any change to an architectural invariant requires an ADR.
2. Any change to this constitution requires an ADR.
3. ADRs are stored in `docs/adr/`.
4. ADRs follow the format: `ADR-NNN-title.md`.
5. ADRs include: Context, Decision, Consequences.
6. ADRs are reviewed by the architecture team before acceptance.
7. Accepted ADRs become part of the permanent record.

---

## 30. Future Evolution Principles

1. The platform evolves by extending Workspace, not by creating new roots.
2. New business capabilities are added through new Workspace types.
3. New monetization is added through new capabilities and plan features.
4. The storefront remains snapshot-driven regardless of new features.
5. The Builder remains layout-only regardless of new content types.
6. Marketplace remains discovery-only regardless of new item types.
7. AI enhances existing pipelines without creating parallel ones.
8. Every new feature composes existing platform services.

---

## Validation

This constitution has been validated against:

- ✅ [Platform Architecture v1](platform-architecture-v1.md) — No conflicts. Constitution supersedes where it provides stricter governance.
- ✅ [Product Roadmap](product-roadmap.md) — No conflicts. Constitution does not contain roadmap items.
- ✅ [Workspace Constitution](workspace-platform-constitution.md) — Aligned. Constitution references Workspace Constitution for detailed Workspace rules.
- ✅ [Coding Standards](coding-standards.md) — Aligned. Constitution provides governance; Coding Standards provide implementation rules.
- ✅ [Glossary](glossary.md) — Terminology is consistent across all documents.
- ✅ All 30 sections are internally consistent.
- ✅ All forbidden patterns are motivated by real past violations discovered during platform development.

---

## References

- [Platform Architecture v1](platform-architecture-v1.md) — Detailed architecture
- [Product Roadmap](product-roadmap.md) — Product direction
- [Workspace Constitution](workspace-platform-constitution.md) — Workspace contract
- [Coding Standards](coding-standards.md) — Implementation rules
- [Glossary](glossary.md) — Canonical terminology
- [Architecture Decisions](architecture-decisions.md) — ADR index
