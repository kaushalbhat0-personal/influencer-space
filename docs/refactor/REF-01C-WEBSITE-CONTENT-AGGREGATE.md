# REF-01C — Website Aggregate Service

## Design Principle

ONE aggregate. Built by the canonical `WebsiteAggregateService` at publish time. Immutable after creation. Stored in the Snapshot. Rendered by the Storefront from the snapshot only.

**Architecture flow:**
```
Repositories
    ↓
WebsiteAggregateService   ← Application Service, not a mapper
    ↓
Snapshot
    ↓
Storefront
```

## Canonical Ownership Contract

This table is the architecture contract. Any feature that reads a domain from a non-canonical source is violating the contract.

| Domain | Canonical Owner | Reads From | Writes From | Builder Involvement | 
|--------|----------------|------------|-------------|-------------------|
| **Identity** | `BrandRepository` | Storefront, Dashboard | Profile | NONE |
| **Hero** | `SettingsService` (SET hero_data) | Storefront | Settings | Position only in Layout |
| **Products** | `ProductRepository` | Storefront, Dashboard | Products | NONE |
| **Gallery** | `GalleryRepository` | Storefront, Dashboard | Gallery | NONE |
| **Links** | `LinkRepository` | Storefront, Dashboard | Links | NONE |
| **SEO** | `SettingsService` (SET seo) | Storefront | SEO | NONE |
| **Theme** | `WebsiteRepository` | Builder, Storefront | Builder, Appearance | Writes theme |
| **Layout** | `BuilderService` | Storefront | Builder | SOLE OWNER |
| **Snapshot** | `PublishingService` | Storefront | Publishing | NONE |

## Aggregate Type

```typescript
interface WebsiteAggregate {
  identity: {
    name: string;           // Brand.name (with Tenant.name fallback)
    tagline: string;        // Brand.tagline
    bio: string;            // Brand.bio
    avatarUrl: string | null;  // Brand.avatarUrl
    bannerUrl: string | null;  // Brand.bannerUrl
    socialLinks: Array<{ platform: string; url: string }>;  // Brand.socialLinks
  };

  hero: {
    title: string;          // SET("hero_data").title
    subtitle: string;
    videoUrl: string | null;
    posterUrl: string | null;
    ctaText: string;
    ctaLink: string;
    liveBadgeText: string;
    showLiveBadge: boolean;
  };

  products: Array<{
    id: string; name: string; description: string | null;
    price: number; imageUrl: string | null; images: string[];
    slug: string; isFeatured: boolean;
  }>;

  gallery: Array<{
    id: string; title: string; description: string | null;
    imageUrl: string; mediaType: "image" | "video";
    videoUrl: string | null; altText: string | null;
    category: string; isFeatured: boolean;
  }>;

  links: Array<{
    id: string; title: string; url: string;
    imageUrl: string | null; platform: string;
  }>;

  seo: { title: string; description: string; };

  navigation: Array<{ label: string; href: string; order: number; }>;
}
```

## Aggregate Service

```typescript
class WebsiteAggregateService {
  constructor(
    private brandRepo: BrandRepository,
    private settingsService: typeof SettingsService,
    private productRepo: ProductRepository,
    private galleryRepo: GalleryRepository,
    private linkRepo: LinkRepository,
  ) {}

  async build(tenantId: string): Promise<WebsiteAggregate> {
    const [brand, heroData, products, gallery, links, seoData] = await Promise.all([
      this.brandRepo.findByTenantId(tenantId),
      this.settingsService.getHeroData(tenantId),
      this.productRepo.findActiveByTenantId(tenantId),
      this.galleryRepo.findPublishedByTenantId(tenantId),
      this.linkRepo.findActiveByTenantId(tenantId),
      this.settingsService.getSettingByKey(tenantId, "seo"),
    ]);

    return {
      identity: {
        name: brand?.name ?? "",
        tagline: brand?.tagline ?? "",
        bio: brand?.bio ?? "",
        avatarUrl: brand?.avatarUrl ?? null,
        bannerUrl: brand?.bannerUrl ?? null,
        socialLinks: (brand?.socialLinks as Array<{platform: string; url: string}>) ?? [],
      },
      hero: heroData,
      products: products.map(p => ({ id: p.id, name: p.name, ... })),
      gallery: gallery.map(g => ({ id: g.id, title: g.title, ... })),
      links: links.map(l => ({ id: l.id, title: l.title, ... })),
      seo: seoData as { title: string; description: string } ?? { title: "", description: "" },
    };
  }
}
```

## What Builder Owns (and NEVER Owns)

**Builder owns ONLY:**
- Layout (page/section order, section types)
- Section visibility
- Spacing and layout config
- Theme overrides (colors, fonts, package selection)
- Responsive settings
- Animation config
- Template selection

**Builder NEVER owns:**
- Hero content (title, subtitle, video, CTA, live badge)
- Creator identity (name, tagline, bio, avatar, banner)
- Products (data, pricing, images)
- Gallery (images, titles, categories)
- Links (platforms, URLs)
- SEO (title, description)
- Social links
- Any business content

**Hero position → Builder. Hero data → Settings/Dashboard.**

## Deprecated Sources (to be removed)

After this consolidation:
- `SET("influencer_data")` — replaced by `Brand` table
- `SET("brand_config")` — replaced by `Brand` table
- `Setting.getInfluencerData()` — replaced by `BrandRepository`
- `public.service.ts` `getPublicPageData()` — replaced by `WebsiteAggregateService`
- `PublicPageData` type — replaced by `WebsiteAggregate`
- `PublicProfile`, `PublicHeroData`, etc. — individual types replaced by `WebsiteAggregate.identity`, `.hero`, etc.
