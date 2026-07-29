# Architecture Decision Records

> **Part of:** [Creatos Platform Architecture v1](platform-architecture-v1.md)

---

## ADR Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-001 | Snapshot Rendering | Ratified | 2024-Q3 |
| ADR-002 | Registry Architecture | Ratified | 2024-Q3 |
| ADR-003 | Builder Philosophy | Ratified | 2024-Q3 |
| ADR-004 | Media Domain | Ratified | 2024-Q3 |
| ADR-005 | Theme Platform | Ratified | 2024-Q4 |
| ADR-006 | Website Template Platform | Ratified | 2024-Q4 |
| ADR-007 | Provisioning | Ratified | 2024-Q4 |
| ADR-008 | Marketplace | Ratified | 2024-Q4 |
| ADR-009 | Capability Platform | Ratified | 2024-Q4 |
| ADR-010 | Super Admin Direction | Draft | 2025-Q1 |

## ADR-001: Snapshot Rendering

**Context:** The storefront needs to render published websites. Two approaches were considered: live DB reads at render time vs immutable snapshots.

**Decision:** Immutable `PublishedSnapshot` is the single source of truth for storefront rendering. No business tables are read at render time (except tenant domain resolution).

**Consequences:**
- Storefront is fast and cacheable (ISR with 60s revalidation)
- Publishing is the only write path to the snapshot
- Snapshot format must be versioned (`_schema`, `_version`)
- Publishing must aggregate all business data into the snapshot

**Files:** `src/lib/publishing/service.ts`, `src/types/snapshot.ts`, `src/lib/storefront/layout-engine/LayoutEngine.ts`

---

## ADR-002: Registry Architecture

**Context:** Multiple domains need discoverable, extensible entity collections (themes, templates, components, capabilities).

**Decision:** All entities are registered in canonical in-memory registries. Registries follow a consistent pattern: singleton + provider registration + lookup by ID + filtering.

**Consequences:**
- Registries are populated at import time (no DB reads for entity definitions)
- New entities are added via new provider implementations
- Registries are the single source of truth for what exists

**Registries:** ThemeRegistry, BlueprintRegistry, MarketplaceRegistry, CapabilityRegistry, ComponentRegistry, IndustryRegistry

---

## ADR-003: Builder Philosophy

**Context:** The Builder was initially designed as a full website editor. This blurred ownership boundaries with admin content pages.

**Decision:** The Builder owns ONLY layout composition (section order, visibility, duplication, theme preview). It NEVER owns content editing. All content is managed in dedicated admin pages.

**Consequences:**
- Removed duplicate health scoring, quick actions, and Live Score from Builder
- Builder is optional — creators can publish without entering the Builder
- Builder deep-links to admin pages for content editing

**Files:** `src/features/builder/`

---

## ADR-004: Media Domain

**Context:** Media assets (images, videos) are referenced by multiple domains (hero, products, gallery, profile).

**Decision:** Media is managed by a dedicated `MediaService`. Assets are uploaded once and referenced by ID. URL resolution happens during `WebsiteAggregateService.build()` at publish time.

**Consequences:**
- Storefront receives resolved URLs, not asset IDs
- Media library is the single upload/management interface
- Asset URLs are frozen in the snapshot at publish time

---

## ADR-005: Theme Platform

**Context:** Themes define visual design (colors, typography, spacing). They could be stored in the database or defined in code.

**Decision:** Themes are code — defined in TypeScript at build time, stored in an in-memory registry. Custom color overrides are stored on the Website table and merged at publish time via `ThemeResolver.applyOverrides()`.

**Consequences:**
- 30 production themes defined across 8 categories
- ThemeRegistry is populated at import time (no DB reads for theme definitions)
- Website-specific overrides are separate from theme definitions
- Themes are immutable; changes require a new theme version

**Files:** `src/lib/theme/`

---

## ADR-006: Website Template Platform

**Context:** Templates define website structure (pages, navigation, sections). They could be rendered directly or used to generate websites.

**Decision:** Templates generate websites — they are not rendered directly. A `BlueprintDefinition` is converted to `BuilderPage[]` and saved via `BuilderService`, then published via `PublishingService`.

**Consequences:**
- 11 templates (6 active, 5 coming_soon)
- Template inheritance via `resolveInheritedBlueprint()`
- Templates are independent of themes — any theme works with any compatible template

**Files:** `src/lib/blueprint/`

---

## ADR-007: Provisioning

**Context:** Multiple creation paths existed for new websites (onboarding, import, demo, super admin).

**Decision:** All provisioning goes through ONE `ProvisioningService.provision()`. The legacy `CreatorProvisioningEngine` and `QualityGate` were deleted.

**Consequences:**
- `ProvisioningService` is the only service allowed to create tenants and websites
- All consumers (onboarding, import, demo, super admin) use the same pipeline
- Net reduction: -233 LOC

**Files:** `src/lib/provisioning/provisioning-service.ts`

---

## ADR-008: Marketplace

**Context:** The Marketplace could own generation, publishing, or provisioning operations.

**Decision:** The Marketplace owns discovery ONLY — search, filtering, recommendations, premium gating. It NEVER owns generation, publishing, building, or provisioning.

**Consequences:**
- Marketplace packages reference themes and templates (don't contain them)
- Install flows use existing provisioning/publishing pipelines
- External marketplace providers implement `MarketplaceProvider` interface

---

## ADR-009: Capability Platform

**Context:** Two capability systems coexisted — `src/lib/capabilities/` (feature-flag based) and `src/lib/platform/capabilities/` (entitlement based).

**Decision:** Consolidated into ONE canonical system at `src/lib/capabilities/`. The `EntitlementService` maps capability IDs to feature keys. Plans are never compared directly.

**Consequences:**
- 34 features across 6 plans
- 6 files deleted (506 LOC removed)
- All 8 consumers use the canonical service

**Files:** `src/lib/capabilities/`

---

## ADR-010: Super Admin Direction

**Context:** A dedicated Super Admin workspace is needed for platform operations.

**Decision:** Super Admin reuses all existing platform services. It adds new UI, not new architecture. No duplicate pipelines are created.

**Status:** Draft — will be finalized during SUPERADMIN-01

**See:** [superadmin-vision.md](superadmin-vision.md)

---

## Historical ADRs

Individual ADR documents exist at `docs/adr/`:
- `ADR-001-dashboard-shell.md` — Dashboard shell architecture
- `ADR-002-ai-generation-flow.md` — AI generation pipeline
- `ADR-003-navigation-system.md` — Navigation system design
- `ADR-004-design-tokens.md` — Design token system
- `ADR-005-motion-safe-policy.md` — Motion safety
- `ADR-006-component-wrappers.md` — Component wrapper pattern
- `ADR-007-authenticated-tenant-resolution.md` — Auth + Tenant resolution
- `ADR-008-billing-v2-architecture.md` — Billing v2 architecture

These records document specific implementation decisions. The platform ADRs above supersede them at the architectural level.
