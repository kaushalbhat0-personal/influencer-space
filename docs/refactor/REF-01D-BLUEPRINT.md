# REF-01D — Storefront Rendering Consolidation Blueprint

---

## 1. Executive Summary

The storefront rendering pipeline has **14 illegal live-database reads**, **2 complete rendering engines** running in parallel, and **8 legacy code paths** that bypass the PublishedSnapshot entirely. Every storefront page load reads from **9 different database tables**, of which only 1 (PublishSnapshot) is canonical. This blueprint eliminates all illegal reads, removes the legacy rendering path, and establishes a single rendering pipeline: `PublishedSnapshot → LayoutEngine → ComponentRegistry → Storefront`.

**Key metrics:**
- 14 illegal DB reads eliminated
- 2 rendering engines consolidated to 1
- 8 legacy files deleted
- ~500 lines of dead code removed
- 0 fallback paths remaining

---

## 2. Architecture Gate

### Q0 — Canonical PublishedSnapshot Contract (Frozen Before LayoutEngine)

Before LayoutEngine is designed, the snapshot schema is frozen. Nothing else may be added. No legacy fields. No runtime detection.

```typescript
interface PublishedSnapshot {
  metadata: {
    version: number;
    publishedAt: string;
    previousVersion: number | null;
    correlationId: string;
    generatedBy: "dashboard" | "onboarding";
  };

  layout: {
    pages: Array<{
      id: string;
      name: string;
      slug: string;
      isHome: boolean;
      order: number;
      sections: Array<{
        id: string;
        type: string;         // semantic: "hero", "products", "gallery"
        config: Record<string, unknown>;  // layout-only props (spacing, order)
        order: number;
        visible: boolean;
      }>;
    }>;
  };

  theme: {
    packageId: string;
    colors: Record<string, string>;
    fonts: Record<string, string>;
  };

  content: {
    identity: {
      name: string;
      tagline: string;
      bio: string;
      avatarUrl: string | null;
      bannerUrl: string | null;
      socialLinks: Array<{ platform: string; url: string }>;
    };
    hero: Record<string, unknown>;
    products: Array<Record<string, unknown>>;
    gallery: Array<Record<string, unknown>>;
    links: Array<Record<string, unknown>>;
    seo: { title: string; description: string };
  };

  navigation: Array<{
    label: string;
    href: string;
    order: number;
  }>;

  renderingHints: {
    sectionVisibility?: Record<string, "visible" | "hidden" | "auto">;
    responsive?: Record<string, { mobile?: boolean; tablet?: boolean; desktop?: boolean }>;
    animations?: Record<string, { id: string; duration?: number }>;
    customCss?: string;
  };
}
```

**INVARIANT — PublishedSnapshot is IMMUTABLE:**
- A snapshot is NEVER updated after creation.
- Every publish creates a completely new row in the PublishSnapshot table.
- Rendering is read-only — the storefront never writes to any table.
- Dashboard edits database tables (products, settings, etc.).
- Builder edits layout (Page/Section/Block tables).
- Publishing freezes aggregate into snapshot.
- Storefront reads snapshot only.
- This invariant prevents "quick fixes" that mutate snapshots after publishing, which would break version rollback.

**Contract rules:**
1. `layout` comes from Builder (after REF-01C.5 refactor) — semantic types only, no registry IDs
2. `content` comes from WebsiteAggregateService — frozen at publish time, no live reads
3. `theme` comes from WebsiteRepository — frozen at publish time
4. `navigation` computed at publish time from layout pages + content presence
5. `renderingHints` comes from Builder (visibility, responsive, animation) — layout-only, no business data
6. No `legacy` field
7. No `pages` field outside of `layout.pages`
8. No `sections` field outside of `layout.pages[].sections`
9. No `builderPages`, no `builderArtifact`
10. No runtime format detection (`isLegacySnapshot`, `"sections" in snapshot`, `themePackageId`)
11. Every storefront render reads from this object only
12. Snapshot is never mutated after creation — each publish creates a new version

**Enforcement:** LayoutEngine receives `PublishedSnapshot` as typed input. Any access to `snapshot` fields outside `layout`, `content`, `theme`, `navigation`, `renderingHints` is a type error.

### Q1: Describe the COMPLETE storefront rendering pipeline TODAY.

```
HTTP Request to [domain]
  │
  ├─ 1. middleeware.ts
  │     └─ LifecycleService (token resolution, edge)
  │
  ├─ 2. [domain]/page.tsx :: getPageData(slug)
  │     ├─ INFRASTRUCTURE: prisma.tenant.findFirst()         ── Tenant table
  │     └─ published.service.ts :: getPublishedPageData()
  │           ├─ INFRASTRUCTURE: prisma.website.findUnique()  ── Website table
  │           ├─ INFRASTRUCTURE: publishSnapshotService.getLive()
  │           │     ├─ prisma.publishStatus.findUnique()       ── PublishStatus table
  │           │     └─ prisma.publishSnapshot.findUnique()     ── PublishSnapshot table
  │           ├─ ILLEGAL: getPublicPageData()                  ── ALWAYS called
  │           │     ├─ prisma.setting (influencer_data)
  │           │     ├─ SettingsService.getHeroData (hero_data)
  │           │     ├─ loadProductsForStorefront() → Product
  │           │     ├─ loadAffiliatesForStorefront() → AffiliateLink
  │           │     ├─ loadGalleryForStorefront() → GalleryImage
  │           │     ├─ loadTimelineForStorefront() → TimelineEvent
  │           │     ├─ loadGamesForStorefront() → Game
  │           │     └─ getContentFeed() → ContentFeedItem
  │           └─ Returns { snapshot (from publishSnapshot), legacy (from public), fromSnapshot }
  │
  ├─ 3. extractTheme(snapshot, legacy, niche)
  │     ├─ CANONICAL: snapshot.theme.primary (if artifact format)
  │     └─ FALLBACK: niche map via legacy.profile.niche
  │
  ├─ 4. extractSlots(snapshot)
  │     ├─ PATH A (artifact): snapshot.sections → resolveModuleId(s.type)
  │     └─ PATH B (legacy): snapshot.pages → slots[].moduleId
  │
  ├─ 5. IF slots.length > 0:
  │     ├─ DataBoundRenderer (server)
  │     │     ├─ ILLEGAL: dataResolver.resolve(config, tenantId)
  │     │     │     ├─ loadProducts() → Product table
  │     │     │     ├─ loadGallery() → GalleryImage table
  │     │     │     ├─ loadTimeline() → TimelineEvent table
  │     │     │     ├─ loadAffiliates() → AffiliateLink table
  │     │     │     └─ prisma.website → Brand.socialLinks
  │     │     └─ ComponentRenderer (client)
  │     │           └─ componentRegistry.get(moduleId) → <Renderer />
  │     └─ ILLEGAL: legacy.products/gallery/feed/milestones/games.length for nav
  │
  └─ 6. IF slots.length == 0:
        └─ FallbackStorefront (legacy)
              ├─ Dynamic import: @/lib/storefront/sections → registerDefaultSections()
              ├─ Dynamic import: @/lib/storefront → sectionRegistry
              └─ sectionRegistry.getAll().filter(isVisible).map(render)
```

### Q2: EVERY read path — classified.

**Infrastructure Reads (allowed, necessary):**
| Table | File | Line | Purpose |
|-------|------|------|---------|
| Tenant | `page.tsx` | 18 | Domain resolution (subdomain/customDomain) |
| Website | `published.service.ts` | 17 | Find website by tenantId (needed for snapshot lookup) |
| PublishStatus | `snapshot.ts` | 208 | Find live version |
| PublishSnapshot | `snapshot.ts` | 199 | Read stored snapshot data |

**Business Reads (canonical — should come from snapshot, currently live):**
| Table | File | Line | Currently Reads |
|-------|------|------|----------------|
| Setting (influencer_data) | `public.service.ts` | 113-114 | Identity data |
| Setting (hero_data) | `public.service.ts` | 116 | Hero data |
| Product | `public.service.ts` | 117 | Products |
| AffiliateLink | `public.service.ts` | 118 | Links |
| GalleryImage | `public.service.ts` | 119 | Gallery |
| TimelineEvent | `public.service.ts` | 120 | Milestones |
| Game | `public.service.ts` | 121 | Games |
| ContentFeedItem | `public.service.ts` | 122 | Content feed |
| Product | `data/resolver.ts` | 17 | Products (DataBoundRenderer) |
| GalleryImage | `data/resolver.ts` | 20 | Gallery (DataBoundRenderer) |
| TimelineEvent | `data/resolver.ts` | 23 | Timeline (DataBoundRenderer) |
| AffiliateLink | `data/resolver.ts` | 26 | Links (DataBoundRenderer) |
| Website + Brand | `data/resolver.ts` | 36-38 | Social links (DataBoundRenderer) |
| ALL 8 tables | `published.service.ts` | 29 | **DUAL-READ**: always calls getPublicPageData() |

### Q3: For EVERY illegal read.

| # | File | Line | Reads | Owner | Should Own | Why Exists | Caller | Can Delete? |
|---|------|------|-------|-------|-----------|------------|--------|-------------|
| V1 | public.service.ts | 113 | Setting(influencer_data) | public.service | WebsiteAggregateService | Historical — built before aggregate existed | published.service.ts (unconditional) | ✅ Yes — data in snapshot |
| V2 | public.service.ts | 116 | Setting(hero_data) | public.service | WebsiteAggregateService | Ibid | published.service.ts | ✅ Yes |
| V3 | public.service.ts | 117 | Product | public.service | WebsiteAggregateService | Ibid | published.service.ts | ✅ Yes |
| V4 | public.service.ts | 118 | AffiliateLink | public.service | WebsiteAggregateService | Ibid | published.service.ts | ✅ Yes |
| V5 | public.service.ts | 119 | GalleryImage | public.service | WebsiteAggregateService | Ibid | published.service.ts | ✅ Yes |
| V6 | public.service.ts | 120 | TimelineEvent | public.service | WebsiteAggregateService | Ibid | published.service.ts | ✅ Yes |
| V7 | public.service.ts | 121 | Game | public.service | WebsiteAggregateService | Ibid | published.service.ts | ✅ Yes |
| V8 | public.service.ts | 122 | ContentFeedItem | public.service | WebsiteAggregateService | Ibid | published.service.ts | ✅ Yes |
| V9 | data/resolver.ts | 17 | Product | DataResolver | LayoutEngine (injects from snapshot) | DataBoundRenderer resolves entityType at render time | DataBoundRenderer | ✅ Yes — content in snapshot |
| V10 | data/resolver.ts | 20 | GalleryImage | DataResolver | LayoutEngine | Ibid | DataBoundRenderer | ✅ Yes |
| V11 | data/resolver.ts | 23 | TimelineEvent | DataResolver | LayoutEngine | Ibid | DataBoundRenderer | ✅ Yes |
| V12 | data/resolver.ts | 26 | AffiliateLink | DataResolver | LayoutEngine | Ibid | DataBoundRenderer | ✅ Yes |
| V13 | data/resolver.ts | 36 | Website+Brand | DataResolver | LayoutEngine | Ibid | DataBoundRenderer | ✅ Yes |
| V14 | published.service.ts | 29 | ALL | published.service | N/A | Historical — always fetched legacy alongside snapshot | getPageData() | ✅ Yes — remove call |

### Q4: EVERY rendering engine.

| Engine | File | Type | Status | Action |
|--------|------|------|--------|--------|
| `extractSlots()` | `[domain]/page.tsx:70` | Canonical (two-format) | ⚠ Dual format | Replace with LayoutEngine |
| ComponentRenderer | `lib/renderer/index.tsx` | Canonical | ✅ Keep | No change |
| DataBoundRenderer | `lib/renderer/data-bound.tsx` | Canonical (with illegal resolver) | ⚠ Has illegal dep | Remove dataResolver call |
| DataResolver | `lib/data/resolver.ts` | Legacy runtime query | ❌ Illegal | Delete entire file |
| ComponentRegistry | `lib/registry/components/` | Canonical | ✅ Keep | No change |
| FallbackStorefront | `[domain]/page.tsx:163` | Legacy fallback | ❌ Dead path | Delete |
| SectionRegistry | `lib/storefront/registry.ts` | Legacy | ❌ Dead path | Delete |
| registerDefaultSections | `lib/storefront/sections.tsx` | Legacy | ❌ Dead path | Delete |
| extractTheme() | `[domain]/page.tsx:31` | Canonical (with fallback) | ⚠ Has legacy fallback | Simplify to snapshot-only |
| storefront.service | `features/storefront/service.ts` | Legacy conversion | ❌ Dead path | Delete |
| published.service | `services/published.service.ts` | Infrastructure | ⚠ Has illegal dual-read | Clean up |

### Q5: Trace ONE product.

**Current (broken — 3 paths):**
```
Path 1: Dashboard → features/products/service.ts → Product table
         ↓
         public.service.ts → loadProductsForStorefront() → Product table (LIVE READ)
         ↓
         Storefront fallback (legacy object)

Path 2: Dashboard → features/products/service.ts → Product table
         ↓
         DataBoundRenderer → DataResolver → prisma.product (LIVE READ)
         ↓
         Storefront primary (registry components)

Path 3: Dashboard → features/products/service.ts → Product table
         ↓
         PublishingService → builderPagesToArtifact() → products: [] (LOST!)
         ↓
         PublishedSnapshot → (empty, not read for products)
```

**Target (single path):**
```
Dashboard → ProductRepository → Product table
         ↓
         (at publish time) WebsiteAggregateService → WebsiteAggregate.products
         ↓
         PublishingService → PublishedSnapshot.content.products
         ↓
         LayoutEngine → injects into "products" section config
         ↓
         ComponentRenderer → ProductsRenderer with data from snapshot
```

### Q6: Trace ONE hero title.

**Current (broken — title written but never rendered):**
```
Settings page → SettingsService → SET(hero_data).title
         ↓
         public.service.ts → getHeroData() → hero.title (LIVE READ)
         ↓
         Storefront → HeroBanner (DOES NOT RENDER title — only video/poster)
```

**Target:**
```
Settings page → SettingsService → SET(hero_data).title
         ↓
         (at publish time) WebsiteAggregateService → WebsiteAggregate.hero
         ↓
         PublishingService → PublishedSnapshot.content.hero
         ↓
         LayoutEngine → injects hero content into "hero" section
         ↓
         ComponentRenderer → HeroRenderer with title from snapshot
         (HeroRenderer needs to be updated to render title — REF-01D fixing HeroBanner)
```

### Q7: Trace ONE gallery image.

**Current (2 paths):**
```
Path 1: Gallery page → GalleryService → GalleryImage table
         ↓
         public.service.ts → loadGalleryForStorefront() → LIVER EAD
         ↓
         Storefront fallback

Path 2: Gallery page → GalleryService → GalleryImage table
         ↓
         DataBoundRenderer → DataResolver → prisma.galleryImage (LIVE READ)
         ↓
         Storefront primary
```

**Target (single path):**
```
Gallery page → GalleryRepository → GalleryImage table
         ↓
         (at publish time) WebsiteAggregateService → WebsiteAggregate.gallery
         ↓
         PublishingService → PublishedSnapshot.content.gallery
         ↓
         LayoutEngine → injects gallery data into "gallery" section
         ↓
         ComponentRenderer → GalleryRenderer
```

### Q8: Trace ONE SEO title.

**Current (2 paths):**
```
Path 1: SEO page → seoService → SET(seo).title
         ↓
         published.service.ts → extractSeoFromPages()
         ↓
         Reads snapshot.seo (always "" during onboarding) OR extractProfileFromPages()
         ↓
         generateMetadata → metadata

Path 2: SEO page → seoService → SET(seo).title
         ↓
         public.service.ts → getPublicPageData() → profile.name
         ↓
         buildStorefrontMetadata() → "profile.name — CreatorStore"
         ↓
         generateMetadata → metadata (fallback)
```

**Target (single path):**
```
SEO page → SettingsService → SET(seo).title
         ↓
         (at publish time) WebsiteAggregateService → WebsiteAggregate.seo
         ↓
         PublishingService → PublishedSnapshot.content.seo
         ↓
         generateMetadata → reads snapshot.content.seo
```

### Q9: Trace ONE navigation item.

**Current (broken):**
```
convertSnapshotToData() → ALWAYS returns navigation: []
         ↓
         storefront.service → StorefrontData.navigation = [] (ALWAYS EMPTY)
         ↓
         page.tsx → rebuilds nav from legacy.*.length
         ↓
         StorefrontNav gets sectionDefs from legacy data
```

**Target (computed from layout + content):**
```
LayoutEngine → computes navigation from PublishedSnapshot.layout.pages
         AND content.products.length, content.gallery.length, etc.
         ↓
         Returns ResolvedSection[] with nav metadata
         ↓
         StorefrontNav renders from ResolvedSection metadata
```

### Q10: Dependency graph.

**Current:**
```
prisma.tenant ──────────┐
                        ├──→ page.tsx
prisma.website ─────────┤     │
                        │     ├─→ extractSlots() ──→ ComponentRegistry
publishSnapshot ────────┤     ├─→ extractTheme() ──→ (snapshot || niche fallback)
                        │     ├─→ DataBoundRenderer
public.service.ts ──────┤     │     └─→ DataResolver ──→ prisma.product/.gallery/...
  ├─ Setting x2         │     │                       └─→ prisma.website/.brand
  ├─ Product            │     └─→ FallbackStorefront
  ├─ AffiliateLink      │           ├─→ sectionRegistry
  ├─ GalleryImage       │           └─→ sections.tsx → render(legacy)
  ├─ TimelineEvent      │
  ├─ Game               └─→ SEO metadata (dual path)
  └─ ContentFeedItem         └─→ JSON-LD (from legacy)
```

**Target:**
```
prisma.tenant ──────────┐
                        ├──→ page.tsx
publishSnapshot ────────┤     │
                        │     ├─→ LayoutEngine ──→ ComponentRegistry
                        │     ├─→ extractTheme() ──→ snapshot only
                        │     └─→ SEO + JSON-LD ──→ snapshot.content
                        │
(no other DB reads)
```

---

## 3. Current Dependency Graph

```
src/app/[domain]/page.tsx
  ├─ prisma (Tenant)
  ├─ published.service.ts
  │     ├─ prisma (Website)
  │     ├─ publishSnapshotService (PublishSnapshot + PublishStatus)
  │     └─ public.service.ts [ILLEGAL — DELETE]
  │           ├─ prisma (Setting x2)
  │           ├─ loaders.ts [ILLEGAL — DELETE]
  │           │     ├─ prisma (Product)
  │           │     ├─ prisma (GalleryImage)
  │           │     ├─ prisma (AffiliateLink)
  │           │     ├─ prisma (TimelineEvent)
  │           │     └─ prisma (Game)
  │           └─ content-feed.service.ts
  │                 └─ prisma (ContentFeedItem)
  ├─ extractSlots() [REPLACE with LayoutEngine]
  ├─ extractTheme() [SIMPLIFT — snapshot only]
  ├─ DataBoundRenderer
  │     └─ dataResolver.ts [ILLEGAL — DELETE]
  │           ├─ prisma (Product, GalleryImage, TimelineEvent, AffiliateLink)
  │           └─ prisma (Website + Brand)
  ├─ ComponentRenderer [KEEP]
  │     └─ componentRegistry [KEEP]
  ├─ FallbackStorefront [DELETE]
  │     ├─ sections.tsx [DELETE]
  │     └─ storefront/registry.ts [DELETE]
  ├─ metadata.ts [SIMPLIFY — snapshot only]
  └─ storefront/service.ts [DELETE]
```

---

## 4. Target Dependency Graph

```
src/app/[domain]/page.tsx
  ├─ prisma (Tenant) [KEEP — infrastructure]
  ├─ published.service.ts [CLEAN]
  │     └─ publishSnapshotService (PublishSnapshot + PublishStatus) [KEEP]
  ├─ LayoutEngine [NEW]
  │     └─ resolveModuleId [KEEP]
  ├─ extractTheme() [SIMPLIFT — snapshot.theme only, no niche fallback]
  ├─ DataBoundRenderer [SIMPLIFY — no DataResolver]
  ├─ ComponentRenderer [KEEP]
  │     └─ componentRegistry [KEEP]
  └─ buildMetadata() [NEW — reads snapshot.content for SEO + JSON-LD]
```

---

## 5. Illegal Read Matrix

| # | File | Table | Path | Replacement | Delete File? |
|---|------|-------|------|------------|-------------|
| V1 | public.service.ts:113 | Setting(influencer_data) | getPublicPageData() → profile | WebsiteAggregate.identity | ✅ public.service.ts |
| V2 | public.service.ts:116 | Setting(hero_data) | getPublicPageData() → hero | WebsiteAggregate.hero | ✅ |
| V3 | public.service.ts:117 | Product | getPublicPageData() → products | WebsiteAggregate.products | ✅ |
| V4 | public.service.ts:118 | AffiliateLink | getPublicPageData() → links | WebsiteAggregate.links | ✅ |
| V5 | public.service.ts:119 | GalleryImage | getPublicPageData() → gallery | WebsiteAggregate.gallery | ✅ |
| V6 | public.service.ts:120 | TimelineEvent | getPublicPageData() → milestones | (storefront doesn't render these yet) | ✅ |
| V7 | public.service.ts:121 | Game | getPublicPageData() → games | (storefront doesn't render these yet) | ✅ |
| V8 | public.service.ts:122 | ContentFeedItem | getPublicPageData() → feed | (storefront doesn't render these yet) | ✅ |
| V9 | data/resolver.ts:17 | Product | DataBoundRenderer → entityType | LayoutEngine inject from snapshot | ✅ data/resolver.ts |
| V10 | data/resolver.ts:20 | GalleryImage | DataBoundRenderer → entityType | LayoutEngine inject | ✅ |
| V11 | data/resolver.ts:23 | TimelineEvent | DataBoundRenderer → entityType | LayoutEngine inject | ✅ |
| V12 | data/resolver.ts:26 | AffiliateLink | DataBoundRenderer → entityType | LayoutEngine inject | ✅ |
| V13 | data/resolver.ts:36 | Website+Brand | DataBoundRenderer → social | LayoutEngine inject from snapshot | ✅ |
| V14 | published.service.ts:29 | ALL | Unconditional dual-read | Remove call entirely | Clean file |

---

## 6. Rendering Ownership Matrix

| Component | Current Status | Target Status | Action |
|-----------|---------------|---------------|--------|
| `extractSlots()` | Dual format parser | Deleted | Replace with LayoutEngine |
| `LayoutEngine` | Does not exist | Sole entry point | Create |
| `DataBoundRenderer` | Has illegal dataResolver call | Keep — remove resolver | Modify |
| `ComponentRenderer` | Canonical | Canonical | Keep |
| `DataResolver` | Reads 5 tables live | Deleted | Delete file |
| `FallbackStorefront` | Legacy fallback | Deleted | Delete |
| `SectionRegistry` | Legacy registry | Deleted | Delete file |
| `registerDefaultSections` | Legacy sections | Deleted | Delete file |
| `sectionRegistry` | Legacy | Deleted | Delete file |
| `public.service.ts` | 8-table live reader | Deleted | Delete file |
| `published.service.ts` | Dual-read (snapshot + legacy) | Snapshot-only | Clean |
| `extractTheme()` | Snapshot + niche fallback | Snapshot only | Simplify |
| `metadata.ts` | Uses legacy profile | Snapshot content only | Rewrite |
| `storefront/service.ts` | Legacy conversion | Deleted | Delete file |
| `loaders.ts` | Storefront-specific loaders | Deleted (or keep non-storefront) | Clean |

---

## 7. Canonical Design

### LayoutEngine — Pure Transformation (`src/lib/renderer/layout-engine.ts`)

```
LayoutEngine.resolve(snapshot: PublishedSnapshot) → StorefrontDocument
```

**PURITY CONTRACT:** LayoutEngine is a pure function. It has NO access to:
- Prisma or any database
- Repositories
- Services
- fetch() or HTTP calls
- Cache
- Environment variables
- Tenant lookups
- Feature flags

Input: `PublishedSnapshot` only. Output: `StorefrontDocument` only. Deterministic. Trivially testable.

The LayoutEngine produces ONE document that the storefront page renders directly. No helper functions, no extractors, no builders — just render.

```typescript
interface StorefrontDocument {
  version: number;

  theme: Record<string, string>;         // CSS custom properties (was extractTheme())

  metadata: {
    title: string;                       // from snapshot.content.seo.title
    description: string;
    canonicalUrl: string;
    openGraph: Record<string, string>;
    twitter: Record<string, string>;
  };

  jsonLd: Array<Record<string, unknown>>;  // Person schema + ProductList schema

  navigation: Array<{                    // was sectionDefs
    id: string;
    label: string;
    exists: boolean;
  }>;

  pages: Array<{                         // mirrors Builder's page hierarchy
    id: string;
    name: string;
    slug: string;
    isHome: boolean;
    sections: Array<{                    // ready for ComponentRenderer
      id: string;
      moduleId: string;                  // semantic → registry: "hero" → "hero.default"
      config: Record<string, unknown>;   // layout config merged with snapshot content
      order: number;
    }>;
  }>;

  renderingHints: {
    sectionVisibility?: Record<string, "visible" | "hidden" | "auto">;
    responsive?: Record<string, { mobile?: boolean; tablet?: boolean; desktop?: boolean }>;
    animations?: Record<string, { id: string; duration?: number }>;
    customCss?: string;
  };
}
```

**LayoutEngine responsibilities (pure transformation):**
1. Read `snapshot.layout.pages` — preserve page hierarchy, do NOT flatten
2. For each section, resolve semantic type to registry ID via `resolveModuleId()`: `"hero"` → `"hero.default"`
3. Match section type to content in `snapshot.content`: `"hero"` → `snapshot.content.hero`
4. Merge layout config with content data: `config = { ...section.config, ...contentForType }`
5. Compute navigation from `snapshot.layout.pages[].name` + content presence (products.length > 0, gallery.length > 0, etc.)
6. Build metadata + JSON-LD from `snapshot.content.seo` and `snapshot.content.identity`
7. Extract theme CSS custom properties from `snapshot.theme`
8. Return ONE `StorefrontDocument` — no DB access, no services, no side effects

**What the storefront page becomes:**

```tsx
export default async function PublicPage({ params }: { params: { domain: string } }) {
  const snapshot = await getSnapshot(params.domain);  // published.service.ts
  if (!snapshot) notFound();

  const doc = LayoutEngine.resolve(snapshot);          // pure transformation

  return (
    <main style={doc.theme}>
      <StorefrontNav sections={doc.navigation} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(doc.jsonLd) }} />
      {doc.pages.flatMap(page => page.sections).map(slot => (
        <ComponentErrorBoundary key={slot.id} componentId={slot.moduleId}>
          <DataBoundRenderer slot={{ moduleId: slot.moduleId, config: slot.config }} />
        </ComponentErrorBoundary>
      ))}
    </main>
  );
}
```

**What the page NO LONGER has:**
- `extractSlots()` — replaced by LayoutEngine
- `extractTheme()` — replaced by LayoutEngine
- `buildStorefrontMetadata()` — replaced by LayoutEngine.doc.metadata
- `buildStorefrontJsonLd()` — replaced by LayoutEngine.doc.jsonLd
- `FallbackStorefront` — deleted
- `legacy` object — deleted
- `hasProducts`/`hasGallery` booleans — computed by LayoutEngine into navigation
- Dynamic imports of storefront modules — deleted
- Any Prisma/service/fetch call in the page beyond snapshot loading

### DataBoundRenderer (modified)

Remove:
- `dataResolver.resolve()` call entirely
- `entityType` handling
- `tenantId` forwarding to resolver

Keep:
- Server/client boundary
- Error boundary wrapping
- Delegation to `ComponentRenderer`

### published.service.ts (modified)

Remove:
- `import { getPublicPageData }`
- `const legacy = await getPublicPageData(tenantId)` (both calls)
- `legacy` from return type
- `PublicPageData` type

Keep:
- `publishSnapshotService.getLive()` — primary snapshot read
- `prisma.website.findUnique()` — website lookup for snapshot query
- Return type simplified to `{ snapshot, fromSnapshot }`

### extractTheme() (simplified)

Remove:
- `legacy` parameter
- Niche fallback map
- Hardcoded color fallbacks

Keep:
- Read from `snapshot.theme` only
- Return CSS custom properties from snapshot theme data
- If no snapshot theme, return sensible defaults

### Metadata (rewritten)

New function `buildMetadata(snapshot: PublishedSnapshot, canonicalUrl: string)`:
- SEO title: `snapshot.content.seo.title`
- SEO description: `snapshot.content.seo.description`
- OG/twitter: `snapshot.content.identity`
- JSON-LD: `snapshot.content.identity` + `snapshot.content.products`

No legacy fallback. No profile name interpolation. All data from snapshot.

---

## 8. Deletion Plan

| # | File | Delete | Replace With | Reason | Safe? |
|---|------|--------|-------------|--------|-------|
| 1 | `src/services/public.service.ts` | ✅ Delete entire file | WebsiteAggregateService | 8 illegal live DB reads | ✅ All consumers replaced |
| 2 | `src/lib/data/resolver.ts` | ✅ Delete entire file | LayoutEngine content injection | 5 illegal live DB reads | ✅ DataBoundRenderer simplified |
| 3 | `src/lib/data/loaders.ts` | ✅ Delete storefront loaders | (keep if used by dashboard) | Storefront-specific DB reads | ⚠ Verify dashboard usage first |
| 4 | `src/lib/storefront/registry.ts` | ✅ Delete entire file | ComponentRegistry | Legacy SectionRegistry | ✅ FallbackStorefront deleted |
| 5 | `src/lib/storefront/sections.tsx` | ✅ Delete entire file | ComponentRegistry renderers | Legacy section definitions | ✅ FallbackStorefront deleted |
| 6 | `src/lib/storefront/index.ts` | ✅ Delete or clean | (already re-exports sectionRegistry) | Barrel for deleted module | ✅ |
| 7 | `src/features/storefront/service.ts` | ✅ Delete entire file | LayoutEngine | Legacy snapshot-to-data conversion | ✅ storefront uses snapshot directly |
| 8 | `src/features/storefront/service-legacy.ts` | ✅ Delete entire file | N/A | Already dead (0 importers) | ✅ |
| 9 | `src/app/[domain]/page.tsx` sections | ✅ Delete: FallbackStorefront, dynamic imports, legacy nav, legacy SEO fallback, extractSlots() | LayoutEngine + snapshot content | Legacy rendering path | ✅ |
| 10 | `src/lib/storefront/metadata.ts` | ✅ Replace with snapshot-based builder | Single buildMetadata() | Dual-path SEO + JSON-LD | ✅ |

### Callers to update:

| Delete | Affects | Update Action |
|--------|---------|---------------|
| public.service.ts | published.service.ts:5 (import), :24,:29 (calls) | Remove imports and calls |
| data/resolver.ts | data-bound.tsx:6 (import), :33 (call) | Remove imports and call |
| storefront/registry.ts + sections.tsx | page.tsx:166-170 (dynamic imports) | Remove imports and FallbackStorefront |
| storefront/service.ts | (only page.tsx via published.service — indirect) | Remove all references |
| storefront/metadata.ts | page.tsx:8 (import), :97-106 (calls) | Replace with new buildMetadata() |

---

## 9. Atomic Commit Plan

### Commit D0 — Snapshot Contract Freeze

**Deletion-first:**
- Nothing deleted — contract definitions only.

**Files created:**
- `src/types/snapshot.ts` — add `PublishedSnapshot` interface (freeze contract)
- `src/types/storefront.ts` — add `StorefrontDocument` interface (engine output)

**Files modified:**
- `src/lib/content/website-aggregate.types.ts` — update `WebsiteAggregate` to match contract

**Verification:**
- `npx next build`
- All types compile
- No runtime changes

### Commit D1 — LayoutEngine + StorefrontDocument

**Deletion-first:**
- Nothing deleted — additive commit.

**Files created:**
- `src/lib/renderer/layout-engine.ts` — pure LayoutEngine class

**Files modified:**
- `src/lib/renderer/index.ts` — add LayoutEngine export

**Verification:**
- `npx next build`
- LayoutEngine is pure — zero Prisma/service/repository imports
- No behavior changes — not consumed yet

### Commit D2 — PublishedService Cleanup

**Deletion-first:**
- Remove: `import { getPublicPageData }` from `published.service.ts`
- Remove: line 24 `const legacy = await getPublicPageData(tenantId)` (no-website fallback)
- Remove: line 29 `const legacy = await getPublicPageData(tenantId)` (unconditional dual-read)
- Remove: `legacy` from return type
- Remove: `PublicPageData` import

**Files modified:**
- `src/services/published.service.ts`
- `src/app/[domain]/page.tsx` — update destructuring to remove `legacy`

**Runtime paths eliminated:**
- Unconditional legacy DB read (8 tables) on every storefront request
- PublicPageData dual-read bug

**Verification:**
- `npx next build`
- Storefront still renders (snapshot path unchanged)
- Tenants without snapshot get `null` → page shows empty/404

### Commit D3 — Storefront Page Migration

**Deletion-first:**
- Remove: `extractSlots()` function
- Remove: `FallbackStorefront` component and its dynamic imports
- Remove: `legacy` variable and all 10+ legacy references
- Remove: `buildStorefrontMetadata()` import and call
- Remove: `buildStorefrontJsonLd()` import and call
- Remove: `extractSeoFromPages()` import
- Remove: `extractTheme()` function
- Remove: `hasProducts/hasGallery/hasFeed/hasMilestones/hasGames` booleans
- Remove: `sectionDefs` nav computation

**Files modified:**
- `src/app/[domain]/page.tsx` — rewrite to use LayoutEngine

**Runtime paths eliminated:**
- FallbackStorefront rendering path
- legacy data dependency
- extractTheme niche fallback
- SEO/JSON-LD dual-path generation
- extractSlots dual-format parsing

**Verification:**
- `npx next build`
- Storefront renders from snapshot only via `LayoutEngine → doc.pages`
- Theme from LayoutEngine.doc.theme
- Nav from LayoutEngine.doc.navigation
- SEO from LayoutEngine.doc.metadata
- JSON-LD from LayoutEngine.doc.jsonLd
- `grep -r "extractSlots\|FallbackStorefront\|legacy\." page.tsx` returns 0

### Commit D4 — Remove DataResolver

**Deletion-first:**
- Remove: `import { dataResolver }` from `data-bound.tsx`
- Remove: `dataResolver.resolve()` call and error handling
- Remove: `entityType` / `resolvedData` code

**Files modified:**
- `src/lib/renderer/data-bound.tsx`

**Files deleted:**
- `src/lib/data/resolver.ts` (entire file — 0 remaining callers)

**Runtime paths eliminated:**
- 5 illegal live DB reads (Product, GalleryImage, TimelineEvent, AffiliateLink, Website+Brand)

**Verification:**
- `npx next build`
- `grep -r "dataResolver" src/` returns 0

### Commit D5 — Delete Legacy Rendering

**Deletion-first:**
- `src/services/public.service.ts` — entire file (8 illegal reads removed)
- `src/lib/storefront/registry.ts` — entire file (SectionRegistry)
- `src/lib/storefront/sections.tsx` — entire file (legacy section definitions)
- `src/lib/storefront/index.ts` — clean or delete (was re-exporting sectionRegistry)
- `src/features/storefront/service.ts` — entire file (convertSnapshotToData)
- `src/features/storefront/service-legacy.ts` — entire file (already dead)
- `src/lib/data/loaders.ts` — remove storefront-specific functions (findStorefrontProducts, loadProductsForStorefront, loadGalleryForStorefront, loadAffiliatesForStorefront, loadTimelineForStorefront, loadGamesForStorefront)

**Duplicate ownership removed:**
- PublicPageData type (identity/hero dual source)
- SectionRegistry (legacy renderer)
- section rendering code (legacy sections)
- convertSnapshotToData (legacy format conversion)
- Storefront product/gallery/timeline/affiliate loaders (replaced by LayoutEngine)

**Verification:**
- `npx next build`
- `grep -r "public.service" src/` returns 0
- `grep -r "FallbackStorefront" src/` returns 0
- `grep -r "sectionRegistry" src/` returns 0
- `grep -r "PublicPageData" src/` returns 0
- `grep -r "convertSnapshotToData" src/` returns 0

---

## 10. Risk Analysis

| Commit | What Can Break | Rollback | Verification | Database Impact | User Impact |
|--------|---------------|----------|-------------|----------------|-------------|
| D1 (LayoutEngine) | Nothing — no consumers | `git revert` | Build | None | None |
| D2 (PublishedService) | Tenants without snapshot (no website) lose legacy fallback — will get 404 | `git revert` | Build + storefront test | None | No-snapshot tenants see 404 instead of legacy page |
| D3 (Storefront) | Theme colors without snapshot theme data, nav broken if snapshot has no content | `git revert` | Build + E2E storefront | None | Theme falls to defaults; nav shows nothing if snapshot empty |
| D4 (DataResolver) | Components using entityType lose dynamic data (products, gallery, links in snapshot-based sections) | `git revert` | Build + storefront test | None | Snapshot content must be populated (REF-01C ensures this) |
| D5 (Delete legacy) | If any caller still references deleted files, build breaks | `git revert` | Build + grep verification | None | None (all references removed in D2-D4) |

**Overall risk: MEDIUM.** The critical risk is D2 — tenants without a snapshot will lose their legacy fallback. Mitigation: ensure all active tenants have been published at least once before deploying D2. In practice, every tenant that completed onboarding has a snapshot (REF-01A-FIX-03 ensures provisioning creates a website).

---

## 11. Verification Strategy

### Per-Commit:
```
1. npx next build                      # Must pass
2. npx tsc --noEmit                     # Must pass (type checking)
3. grep -r "DELETED_SYMBOL" src/       # Must return 0
4. Visit /[domain] for test tenant      # Must render correctly
5. Visit /admin/dashboard               # Must render correctly
```

### Post-REF-01D Full Verification:
```
1. Build                                       → Must pass
2. TypeScript                                  → Must pass  
3. ESLint                                      → Must pass (pre-existing warnings only)
4. Visit storefront for test tenant            → Hero, Products, Gallery, Nav render
5. Visit storefront for no-snapshot tenant     → 404 (expected) or empty state
6. Visit dashboard                             → Metrics, products, gallery work
7. Visit admin/products                        → CRUD works
8. Visit admin/gallery                         → CRUD works
9. Visit admin/settings                        → Save + display works
10. grep -r "public.service" src/              → 0
11. grep -r "FallbackStorefront" src/          → 0
12. grep -r "sectionRegistry" src/             → 0
13. grep -r "PublicPageData" src/              → 0
14. grep -r "dataResolver" src/                → 0
```

---

## 12. Final Architecture Score

| Metric | Current | After REF-01D | Delta |
|--------|---------|---------------|-------|
| Rendering engines | 3 (extractSlots, FallbackStorefront, SectionRegistry) | 1 (LayoutEngine) | **-2** |
| Rendering pipelines | 2 (snapshot + legacy fallback) | 1 (snapshot only) | **-1** |
| Snapshot formats | 2 (legacy + artifact) | 1 (artifact + canonical) | **-1** (artifact remains, canonical stored alongside) |
| Publish pipelines | 2 (dashboard + builder disabled) | 1 (dashboard only) | Already fixed in FIX-04 |
| Illegal DB reads at render time | 14 | 0 | **-14** |
| Legacy rendering files | 8 | 0 | **-8** |
| Duplicate SEO builders | 2 (extractSeoFromPages + buildStorefrontMetadata) | 1 (snapshot.content.seo) | **-1** |
| Duplicate JSON-LD builders | 1 (from legacy) | 1 (from snapshot) | 0 (simplified source) |
| Files deleted | — | ~8 files | **-8** |
| Lines removed (est.) | — | ~600 | **-600** |

---

## 13. GO/NO-GO Decision

### ✅ GO for REF-01D Implementation

**Rationale:**
1. All 14 illegal reads have identified replacements in the canonical PublishedSnapshot
2. The LayoutEngine is a small, well-scoped new file (~80 lines)
3. No database schema changes required
4. No API contract changes required
5. No builder changes required
6. No dashboard changes required
7. Each commit is atomic and revertible
8. Deletion-first approach ensures no dead code remains

**Blocking prerequisite:** All active tenants must have at least one PublishedSnapshot before removing the legacy fallback (Commit D2). This is already true — every tenant that completed onboarding or dashboard publishing after REF-01A-FIX-03 has a snapshot.

**Order of implementation:** D1 → D2 → D3 → D4 → D5 (each depends on previous)

---

## 14. Next RCCF Phase Recommendation

### After REF-01D: RCCF-01E — Dead Code Removal

REF-01D eliminates the rendering duplication. The next phase should delete the remaining architectural dead code identified in BETA-05A-FINAL audit:

- 24 dead action/service/component files
- 7 orphan UI components
- Dead nav routes from `lib/navigation/config.ts`
- Dead barrel exports

**Estimated effort:** 1 day
**Risk:** LOW — all files confirmed dead via runtime usage audit in REF-01A
