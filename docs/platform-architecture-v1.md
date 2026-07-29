# Creatos Platform Architecture Constitution — Version 1.0

> **Status:** Ratified
> **Applies to:** All platform development from SUPERADMIN-01 onward
> **Updates:** Requires ADR

---

## 1. Product Vision

Creatos is a **Website Operating System**.

It is NOT a website builder. Creators never configure software — they create their online brand. The experience resembles Shopify, Canva, Framer, or Squarespace: a working website within minutes, with optional customization.

The platform serves multiple personas through one architecture:

| Persona | Experience |
|---------|-----------|
| **Creator** | Signup → Choose Template → Choose Theme → Generate Website → Edit → Publish |
| **Agency** | Manage clients → Provision websites → White-label → Bill |
| **Enterprise** | Custom branding → Team management → SSO → Audit logs |
| **Super Admin** | Platform operations → Creator management → Marketplace review |
| **Marketplace** | Theme/template distribution → Discovery → Premium gating |

One platform. Many experiences.

---

## 2. Core Principles

### Architectural
- **Registry Driven** — All entities are registered in canonical registries, never hardcoded
- **Capability Driven** — Every feature gate, permission, and upgrade resolves through the Capability Service
- **Snapshot Driven** — The PublishedSnapshot is the single source of truth for storefront rendering
- **Single Ownership** — Every domain has exactly one owner. No code outside that owner may write to its data.
- **Composition over Inheritance** — Systems compose via registries and services, not class hierarchies
- **Configuration over Duplication** — Registry-driven configuration replaces duplicated logic
- **SOLID, DRY, KISS, DDD**

### Domain Boundaries (Frozen)

| Domain | Owns | Does NOT Own |
|--------|------|-------------|
| Website Template | Pages, Navigation, Sections, Starter Content, SEO Defaults | Colors, Typography |
| Theme | Colors, Typography, Spacing, Motion, Radius | Pages, Content |
| Admin Pages | Hero, Products, Gallery, Timeline, FAQ, Testimonials, Links, SEO, Profile | Layout, Discovery |
| Builder | Section order, hide/show, duplicate, theme preview | Content, Health, Quick Actions |
| Marketplace | Discovery, Search, Categories, Recommendations | Generation, Publishing |
| Publishing | PublishedSnapshot | Rendering, Content Editing |
| Storefront | Rendering only | All business logic |
| Capabilities | Feature gating, Limits, Entitlements | Plan storage, billing |
| Provisioning | Tenant, Website, Workspace creation | Content generation |
| Health | Website scoring, Recommendations | Content editing |

**Never violate these boundaries.**

---

## 3. Architectural Invariants

These rules may NEVER be violated without an explicit ADR:

1. **One Theme Registry** — `ThemeRegistry` in `src/lib/theme/registry-new.ts`
2. **One Theme Resolver** — `ThemeResolver` in `src/lib/theme/resolver-new.ts`
3. **One Builder** — No parallel layout editor
4. **One Publish Service** — `PublishingService` in `src/lib/publishing/service.ts`
5. **One Provisioning Service** — `ProvisioningService` in `src/lib/provisioning/provisioning-service.ts`
6. **One Marketplace** — `MarketplaceRegistry` in `src/lib/marketplace/registry.ts`
7. **One MediaService** — No duplicate media upload/resolution paths
8. **One WebsiteHealthEngine** — `WebsiteHealthEngine` in `src/lib/platform/health/engine.ts`
9. **One CapabilityService** — `capabilityService` in `src/lib/capabilities/`
10. **One Snapshot pipeline** — Storefront reads ONLY from `PublishedSnapshot`
11. **One Storefront** — No alternative rendering paths
12. **Builder NEVER owns content** — No product/hero/gallery/SEO editing in Builder
13. **Marketplace NEVER owns generation** — No publishing, building, or provisioning
14. **Storefront NEVER reads business tables** — Only snapshots at render time

---

## 4. Domain Map

See [domain-map.md](domain-map.md) for complete bounded context definitions.

---

## 5. Dependency Graph

See [dependency-graph.md](dependency-graph.md) for Mermaid diagrams.

---

## 6. Creator Journey

See [creator-journey.md](creator-journey.md) for the complete lifecycle.

---

## 7. Data Flow Architecture

### Publishing Pipeline (Write Path)

```
Admin UI → Business DB (Products, Gallery, Settings, etc.)
     ↓
PublishingService.publish(tenantId)
     ├── BuilderService.load()          → Page/Section/Block tables
     ├── WebsiteAggregateService.build() → All business tables (12 queries)
     ├── NavigationService.getOrGenerate() → Setting table
     └── ThemeResolver.resolveForSnapshot() → ThemeRegistry (in-memory)
     ↓
PublishedSnapshot (immutable JSON)
     ↓
PublishSnapshot table + PublishStatus update
     ↓
WebsitePublished event → ISR cache invalidation
```

### Storefront Pipeline (Read Path)

```
Browser Request
     ↓
Middleware (domain resolution)
     ↓
prisma.tenant (only DB read at render time)
     ↓
PublishSnapshotService.getLive() / getPreview()
     ↓
LayoutEngine.resolve() → StorefrontDocument (pure transformation, no DB)
     ↓
DataBoundRenderer → ComponentRenderer → Section renderers
     ↓
HTML
```

### Theme Pipeline

```
ThemeDefinition (in-memory registry, 30 themes across 8 categories)
     ↓
ThemeResolver.resolveForSnapshot(themeId, mode, overrides?)
     │  overrides from Website.themeColors / themeFonts
     ↓
PublishedSnapshot.theme (colors, typography)
     ↓
LayoutEngine.buildTheme() → CSS custom properties
     ↓
Storefront rendering
```

### Media Pipeline

```
Upload → MediaService → Asset/AssetReference
     ↓
WebsiteAggregateService.build() resolves asset IDs to URLs
     ↓
PublishedSnapshot.content (URLs embedded)
     ↓
Storefront renders via CreatorImage / CreatorVideo
```

---

## 8. Registry Architecture

All registries follow a consistent pattern:
- Singleton in-memory store
- Provider/plugin registration
- Lookup by ID
- Filtering/sorting options

| Registry | Location | Owner | Contents |
|----------|----------|-------|----------|
| ThemeRegistry | `src/lib/theme/registry-new.ts` | Theme Platform | 30 ThemeDefinitions |
| BlueprintRegistry | `src/lib/blueprint/registry.ts` | Template Platform | 11 BlueprintDefinitions |
| MarketplaceRegistry | `src/lib/marketplace/registry.ts` | Marketplace | MarketplacePackages |
| CapabilityRegistry | `src/lib/capabilities/registry.ts` | Capability Platform | 20 CapabilityDefinitions |
| FeatureRegistry | `src/lib/capabilities/registry.ts` | Capability Platform | 24 FeatureDefinitions |
| IndustryRegistry | `src/lib/creation/industry/registry.ts` | Creation Engine | 8 IndustryDefinitions |
| ComponentRegistry | `src/lib/registry/components/registry.ts` | Storefront | 20 ComponentDefinitions |

---

## 9. Capability Platform

**Location:** `src/lib/capabilities/`

Every feature gate, subscription limit, upgrade prompt, and permission resolves through ONE capability service. Plans are never compared directly.

### Components

| Component | Responsibility |
|-----------|---------------|
| `CapabilityRegistry` | Lists all capabilities and features with metadata |
| `SubscriptionRegistry` (plans.ts) | Defines 6 plans with feature maps (boolean + numeric) |
| `CapabilityEngine` | Evaluates `can()`, `cannot()`, `limit()`, `remaining()`, `requiresUpgrade()` |
| `CapabilityService` | Public facade over engine |
| `EntitlementService` | Maps capability IDs → feature keys for nav/UI gating |
| Limits module | `getEffectiveLimit()`, `checkLimit()`, `getOverLimitFeatures()` |

### Plan Tiers

| Plan | Code | Price | Family |
|------|------|-------|--------|
| Starter | `creator_free` | Free | Creator |
| Pro | `creator_pro` | ₹999/mo | Creator |
| Elite | `creator_elite` | ₹2,999/mo | Creator |
| Free | `agency_free` | Free | Agency |
| Studio | `agency_studio` | ₹1,999/mo | Agency |
| Agency | `agency_agency` | ₹4,999/mo | Agency |

### Extension Points
- New plan tiers: Add to `plans.ts` with feature map
- New capabilities: Add to `constants.ts` FEATURE_IDS + `features.ts` catalog
- New limit types: Add to LIMIT_FEATURES set

---

## 10. Theme Platform

**Location:** `src/lib/theme/`

Themes are **code** — defined at build time in TypeScript, stored in an in-memory registry. Not database records.

### Components

| Component | Location | Responsibility |
|-----------|----------|---------------|
| ThemeRegistry | `registry-new.ts` | In-memory registry of 30 themes |
| BuiltInThemeProvider | `providers/built-in.ts` | Supplies static theme array |
| ThemeResolver | `resolver-new.ts` | Selects variant, extracts tokens, applies overrides |
| ThemeDefinition | `types-new.ts` | Contract: colors, typography, spacing, motion, radius |

### Pipeline
```
ThemeDefinition → ThemeRegistry → ThemeResolver → PublishedSnapshot → Storefront CSS vars
```

### Categories (14)
Minimal, Creator, Business & Agency, Portfolio & Creative, Photography, Coach & Education, Gaming, Podcast, Luxury & Lifestyle, E-Commerce, Agency, Food & Restaurant, Music, Health

### Extension Points
- New theme: Add definition file to `src/lib/theme/themes/` and add to barrel export
- New category: Add to `ThemeCategory` type and `CATEGORY_LABELS` map
- Marketplace themes: Implement new `ThemeProvider` and register with `ThemeRegistry`

---

## 11. Website Template Platform

**Location:** `src/lib/blueprint/`

Templates define website structure (pages, navigation, sections, SEO defaults). They generate websites — they are not rendered directly.

### Components

| Component | Location | Responsibility |
|-----------|----------|---------------|
| BlueprintRegistry | `src/lib/blueprint/registry.ts` | 11 template definitions |
| BuiltInBlueprintProvider | `src/lib/blueprint/providers/built-in.ts` | Static template data |
| BlueprintDefinition | `src/lib/blueprint/types.ts` | Contract: pages, navigation, starter content, SEO |

### Pipeline
```
BlueprintRegistry → createWebsite() → BuilderService.save() → PublishingService.publish()
```

### Extension Points
- New template: Add to `built-in.ts` provider with pages, navigation, starter content
- Template inheritance: Use `BlueprintInheritance` for parent/child merging
- Marketplace templates: Register new `BlueprintProvider`

---

## 12. Builder

**Location:** `src/features/builder/`

The Builder is a **layout composition tool**. It is NOT a content editor. It is optional — creators can publish without ever opening the Builder.

### Builder Owns
- Section ordering
- Section visibility (hide/show)
- Section duplication
- Theme preview and apply
- Deep links to admin content pages

### Builder NEVER Owns
- Product creation/editing
- Gallery management
- Hero section content
- SEO settings
- Profile information
- Link management
- FAQ content
- Timeline events
- Game listings
- Health scoring (removed in PLATFORM-04)
- Quick actions (removed in PLATFORM-04)

### Why
Content editing belongs in dedicated admin pages with proper validation, preview, and specialized UX. The Builder's role is visual composition — reordering what exists, not creating new content.

---

## 13. Marketplace

**Location:** `src/lib/marketplace/`

The Marketplace is a **discovery layer** only.

### Marketplace Owns
- Discovery and search
- Category browsing
- Recommendations (via RecommendationEngine)
- Premium gating (via CapabilityService)
- Package metadata (author, version, pricing, previews)

### Marketplace NEVER Owns
- Website generation
- Publishing
- Builder operations
- Provisioning
- Content editing

### Extension Points
- New package types: Add to `PackageType` union
- New providers: Implement `MarketplaceProvider` interface
- External marketplace websites: Register as additional providers

---

## 14. Publishing Platform

**Location:** `src/lib/publishing/`

The Publishing Platform owns the **PublishedSnapshot** — the immutable contract between content creation and storefront rendering.

### Pipeline

```
PublishingService.publish(tenantId)
  ├── Load Builder pages (layout)
  ├── Build WebsiteAggregate (content from all business tables)
  ├── Resolve theme (ThemeResolver)
  ├── Load navigation (NavigationService)
  ├── Assemble PublishedSnapshot
  ├── Persist via PublishRepository (transactional)
  ├── Emit WebsitePublished event
  └── Revalidate ISR cache
```

### Snapshot Structure

```
PublishedSnapshot
  ├── _schema: "creatorstore.snapshot"
  ├── metadata (version, publishedAt, previousVersion)
  ├── content (WebsiteAggregate — identity, hero, products, gallery, links, etc.)
  ├── layout (pages with sections and module IDs)
  ├── theme (colors, typography)
  ├── navigation (nav items with visibility)
  └── renderingHints (visibility, responsive, animations)
```

### States
- `draft` — Editing in progress
- `preview` — Preview snapshot available via `?preview=true`
- `live` — Current published version

---

## 15. Storefront

**Location:** `src/app/[domain]/` + `src/lib/storefront/`

The Storefront is a **pure renderer**. It contains zero business logic and makes zero database reads at render time (except tenant resolution).

### Principles
- Reads ONLY from `PublishedSnapshot`
- Uses `LayoutEngine` for snapshot → document transformation (pure function)
- All content is embedded in the snapshot — no DB queries
- Each section has a `moduleId` that maps to a registered renderer
- ISR cache with 60s revalidation

### Section Renderers
20 built-in renderers: Hero, About, Gallery, Products, Timeline, Links, Footer, Testimonials, FAQ, Contact, Newsletter, Pricing, Courses, Spotify, YouTube, Discord, Instagram, Games, ContentFeed

### Extension Points
- New section type: Register in `ComponentRegistry` with renderer reference
- New renderer: Add to `renderers.tsx` following existing pattern

---

## 16. Naming Standards

### Canonical Terms

| Term | Meaning | Never Use |
|------|---------|-----------|
| Website Template | A blueprint defining website structure | Blueprint (user-facing) |
| Theme | Visual design (colors, fonts, spacing) | Skin, Template |
| Marketplace Package | A discoverable item | N/A |
| Capability | A feature entitlement | Plan check |
| Builder | Layout composition tool | Editor |
| Creator | Primary platform user | User, Customer |
| Website | A single creator's site | Storefront (confusing) |
| Section | A reusable page component | Widget, Block |
| Module | A section type identifier | Component ID |
| Asset | A media file | Image, File |
| PublishedSnapshot | Immutable publishing output | Cache, Export |
| Generation | AI-powered website creation | Autobuild |
| Provisioning | New tenant/website creation | Onboarding (part of it) |

---

## 17. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js (Credentials provider) |
| Payments | Razorpay |
| Storage | Supabase (media assets) |
| Deployment | Vercel (ISR + Serverless) |
| Testing | Vitest |

---

## 18. Technical Debt (Intentional)

| Item | Reason | Status |
|------|--------|--------|
| `SettingsService.patchThemeConfig()` deprecated | Legacy theme write path, unused by snapshot | Needs removal |
| Snapshot union type casts (`as unknown as`) | Legacy format during transition | Needs cleanup |
| Two capability systems merged | Consolidated in PLATFORM-05 | Resolved |
| Two provisioning paths merged | Consolidated in PLATFORM-06 | Resolved |
| CreatorProvisioningEngine deleted | Superseded | Resolved |
| QualityGate deleted | Superseded | Resolved |
| NavigationRegistry deleted | Dead code | Resolved |

---

## 19. References

- [Product Roadmap](product-roadmap.md) — Future product direction, release planning, and milestones
- [Domain Map](domain-map.md) — Bounded contexts with ownership
- [Dependency Graph](dependency-graph.md) — Mermaid dependency diagrams
- [Creator Journey](creator-journey.md) — Full creator lifecycle
- [Architecture Decisions](architecture-decisions.md) — ADR index
- [Glossary](glossary.md) — Canonical terminology
- [Coding Standards](coding-standards.md) — Contributor rules
- [ADRs](adr/) — Individual Architecture Decision Records
- [Runbooks](runbooks/) — Deployment, monitoring, operations
