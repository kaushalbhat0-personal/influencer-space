# Glossary

> **Part of:** [Creatos Platform Architecture v1](platform-architecture-v1.md)

---

## A

**Admin Page** — A dedicated content management page for a specific domain (Products, Gallery, Hero, SEO, etc.). Each admin page owns its content type.

**Asset** — A media file (image, video) stored via the `MediaService`. Assets are referenced by ID and resolved to URLs at publish time.

**Aggregate (WebsiteAggregate)** — The complete set of business content assembled during publishing. Includes identity, hero, products, gallery, links, SEO, testimonials, FAQ, timeline, games, and content feed data.

## B

**Blueprint** — Internal name for a Website Template. See Website Template.

**Builder** — The layout composition tool. Owns section ordering, visibility, duplication, and theme preview. NEVER owns content editing.

## C

**Capability** — A feature entitlement (e.g., `premium_themes`, `custom_domain`). Capabilities are checked via `CapabilityService` or `EntitlementService`. Plans are never compared directly.

**CapabilityService** — The canonical feature gating service. Located at `src/lib/capabilities/service.ts`. All feature checks use this.

**Creator** — The primary platform user. Creates and manages a website.

**Creatos** — The platform name (formerly "CreatorStore").

## D

**Dashboard** — The Creator Control Center. Shows metrics, health, quick actions, and storefront status.

**Domain** — A bounded context with single ownership. Each domain has one owner and may not be written to by other domains.

## E

**EntitlementService** — Maps capability IDs to feature keys for nav/UI gating. Located at `src/lib/capabilities/entitlements.ts`.

## G

**Generation** — The process of creating a website from a template or AI source. Generates pages, navigation, sections, and starter content.

## H

**Health (WebsiteHealthEngine)** — The canonical website scoring engine. 15 checks across 6 categories with weighted scoring.

## I

**Industry** — A creator's professional category (Creator, Photographer, Business, Gamer, Agency, Podcaster, Portfolio, Coach). Used for template and theme recommendations.

**ISR (Incremental Static Regeneration)** — Next.js caching strategy used by the storefront. Pages are regenerated every 60 seconds or on-demand after publishing.

## L

**LayoutEngine** — Pure function that transforms a `PublishedSnapshot` into a `StorefrontDocument`. No DB access, no side effects.

## M

**Marketplace** — The discovery layer for themes, templates, and future components. Owns search, filtering, recommendations, and premium gating. Does NOT own generation, publishing, building, or provisioning.

**MediaService** — The canonical media upload and resolution service. Manages assets and resolves asset IDs to URLs.

**Module** — A section type identifier (e.g., `hero.default`, `products.grid`). Maps to a registered component renderer.

## N

**Navigation** — Website navigation items (links, anchor scroll, external URLs). Stored in the Setting table and included in the PublishedSnapshot.

## P

**Plan** — A subscription tier (creator_free, creator_pro, creator_elite, agency_free, agency_studio, agency_agency). Defines feature values (boolean flags and numeric limits).

**Provisioning** — The process of creating a new tenant, website, workspace, and user. Only `ProvisioningService.provision()` may create tenants.

**PublishedSnapshot** — The immutable output of the publishing pipeline. Contains all content, layout, theme, and navigation data. The storefront reads only from snapshots.

**PublishingService** — The canonical publishing service. Creates, previews, and manages PublishedSnapshots.

## R

**Registry** — An in-memory collection of entities following a consistent pattern: singleton + provider registration + lookup by ID + filtering. Examples: ThemeRegistry, BlueprintRegistry, MarketplaceRegistry, CapabilityRegistry, ComponentRegistry.

**Renderer** — A React component that renders a specific section type. Receives data from the snapshot via the LayoutEngine's `composeSectionConfig()`.

## S

**Section** — A reusable page component (Hero, Products, Gallery, etc.). Sections have a `moduleId`, `config`, `order`, and `visible` flag.

**Snapshot** — See PublishedSnapshot.

**Storefront** — The public-facing website renderer. Reads only from PublishedSnapshot. Contains zero business logic.

## T

**Template** — See Website Template.

**Tenant** — A creator's organization. Created during provisioning. Has one website, one workspace, and one admin user.

**Theme** — Visual design definition (colors, typography, spacing, motion, radius). Defined in TypeScript code, stored in an in-memory registry. 30 themes across 8 categories.

**ThemeResolver** — Resolves a theme ID + mode + optional overrides into a `ResolvedSnapshotTheme`. Used by the publishing pipeline.

## W

**Website** — A single creator's site. One per tenant (extendable with higher plans). Has a layout, theme, and content.

**Website Template** — A predefined website structure (pages, navigation, sections, starter content, SEO defaults). Defined as a `BlueprintDefinition`. Used to generate new websites.

**WebsiteAggregateService** — Aggregates all business data during publishing. Reads from 12+ business tables and resolves media URLs.

**WebsiteHealthEngine** — The canonical website health scoring engine. 15 checks, weighted scoring, top recommendations.

**Workspace** — A collaboration context for team members. Created during provisioning alongside the tenant.
