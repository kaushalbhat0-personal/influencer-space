# REF-01C — Snapshot Format Consolidation

## Current State (Broken)

```
PublishSnapshot.snapshot JSON column stores EITHER:
  Format A (legacy): { pages: BuilderPage[], themePackageId, themeColors, themeFonts }
  Format B (artifact): ArtifactSnapshotRecord { website, theme, pages, navigation, sections, products, gallery, seo }

ArtifactSnapshotRecord LOSSES:
  products: []  ← ALWAYS EMPTY
  gallery: { enabled: false, albums: [] }  ← ALWAYS DEFAULT
  seo: { title: "", description: "" }  ← ALWAYS EMPTY
  website.title: ""  ← ALWAYS EMPTY
  website.tagline: ""  ← ALWAYS EMPTY
```

## Target State — One Immutable Document

```typescript
// PublishedSnapshot is top-level, created atomically by PublishingService
interface PublishedSnapshot {
  metadata: {
    version: number;
    publishedAt: string;          // ISO-8601
    previousVersion: number | null;
    correlationId: string;
    generatedBy: "dashboard" | "onboarding";
  };

  // Layout from Builder (semantic types, no registry IDs)
  layout: LayoutSnapshot;

  // Business content from WebsiteAggregateService (frozen at publish time)
  content: WebsiteAggregate;

  // Storefront rendering hints (visibility, responsive, animation, CSS)
  renderingHints: RenderingHints;
}

// Layout from Builder — layout ONLY, no business content
interface LayoutSnapshot {
  pages: Array<{
    id: string;
    name: string;           // "Home", "Products" — display name only
    slug: string;
    isHome: boolean;
    order: number;
    sections: Array<{
      id: string;
      type: string;          // SEMANTIC: "hero", "gallery", "products"
                             // NOT registry IDs ("hero.default", "gallery.grid")
                             // PublishingService resolves to registry IDs
      config: Record<string, unknown>;  // layout-only props (spacing, order)
      order: number;
      visible: boolean;
    }>;
  }>;
  theme: {
    packageId: string;
    colors: Record<string, string>;
    fonts: Record<string, string>;
  };
}

// Business content — frozen at publish time, immutable
interface WebsiteAggregate {
  identity: { ... };  // from BrandRepository
  hero: { ... };      // from SettingsService (SET hero_data)
  products: [...];    // from ProductRepository
  gallery: [...];     // from GalleryRepository
  links: [...];       // from LinkRepository
  seo: { ... };       // from SettingsService (SET seo)
  navigation: [...];  // from WebsiteRepository or computed
}

// Rendering hints — layout properties, NOT business data
interface RenderingHints {
  sectionVisibility?: Record<string, "visible" | "hidden" | "auto">;
  responsive?: Record<string, { mobile?: boolean; tablet?: boolean; desktop?: boolean }>;
  animations?: Record<string, { id: string; duration?: number }>;
  customCss?: string;
}
```

**Immutability invariant:** Once a `PublishedSnapshot` is stored, its `.metadata`, `.layout`, `.content`, and `.renderingHints` never change. Rollback = point `PublishStatus.liveVersion` to a previous snapshot. No data reconstruction needed.

## What Changes

| Current | After | Rationale |
|---------|-------|-----------|
| `ArtifactSnapshotRecord` | `Snapshot` | Single format, no ambiguity |
| `SnapshotData` union type | Remove | No dual format needed |
| `isLegacySnapshot()` discriminator | Remove | One format only |
| `builderPagesToArtifact()` | Replace with direct `Snapshot` construction | No intermediate conversion |
| `ArtifactSnapshotRecord.products` (empty) | `Snapshot.content.products` (real data) | Populated from database at publish |
| `ArtifactSnapshotRecord.gallery` (default) | `Snapshot.content.gallery` (real data) | Populated from database at publish |
| `ArtifactSnapshotRecord.seo` (empty) | `Snapshot.content.seo` (real data) | Populated from database at publish |
| `ArtifactSnapshotRecord.website` (empty) | `Snapshot.content.identity` | Populated from Brand table |
| `ArtifactSnapshotRecord.navigation` (auto-generated) | `Snapshot.content.navigation` | Populated from config |
| `Legacy format { pages, themePackageId, ... }` | Remove | No legacy format |

## Migration Strategy

1. New records are stored in the new `Snapshot` format
2. Old records remain readable via backward-compat adapter in `resolveModuleId()` + field defaults
3. After all tenants have been re-published, remove legacy read support
