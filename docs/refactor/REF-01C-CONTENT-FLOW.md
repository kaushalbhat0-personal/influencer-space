# REF-01C — Current Content Flow Audit

## Executive Summary

The storefront currently reads content from 3+ independent pipelines:
1. **Snapshot pipeline**: `PublishedPageData` → `extractSlots()` → `ComponentRegistry` — for layout only
2. **Legacy pipeline**: `PublicPageData` → sections — for business content (products, gallery, etc.)
3. **Direct DB reads**: Products, Gallery, Links read LIVE from DB — not from snapshot

The snapshot pipeline LOSES data on every publish because `builderPagesToArtifact()` hardcodes:
- `website.title = ""` (creator name lost)
- `website.tagline = ""` (tagline lost)
- `products = []` (products lost)
- `gallery = { enabled: false }` (gallery lost)
- `seo = { title: "", description: "" }` (SEO lost)

This means the storefront bypasses the snapshot for business content, reading directly from the database at render time. This creates inconsistency (dashboard changes appear immediately on storefront without publishing) and prevents true version rollback.

## Field-by-Field Flow

### Hero

```
Settings page writes:
  SET("hero_data").title
  SET("hero_data").subtitle  
  SET("hero_data").videoUrl
  SET("hero_data").posterUrl
  SET("hero_data").ctaText
  SET("hero_data").ctaLink
  SET("hero_data").liveBadgeText
  SET("hero_data").showLiveBadge

Builder page stores:
  Page -> Section -> Block.config.title (for hero modules)
  Page -> Section -> Block.config.videoUrl

Storefront reads:
  getPublicPageData() -> hero (from SET hero_data)
    BUT HeroBanner only renders video/poster — NOT title/subtitle/cta/live badge

Snapshot stores:
  builderPagesToArtifact() -> section.props (first slot's config)
    BUT website.title = "" — hero title never reaches snapshot

ISSUE: Hero title, subtitle, CTA, live badge are stored but NEVER RENDERED
```

### Creator Identity

```
Profile page writes:
  Brand.name, Brand.tagline, Brand.bio, Brand.avatarUrl, Brand.socialLinks
  ALSO writes SET("influencer_data") with contactEmail, categories, etc.

Settings page writes:
  SET("influencer_data").name, .tagline, .bio, .profileImage, .social

Storefront reads:
  getPublicPageData() -> SET("influencer_data") — reads name/tagline/bio/social

Dashboard reads:
  profileService.getProfile() -> Brand table

STORE vs DASHBOARD DIVERGENCE:
  Profile page updates Brand — storefront never sees it
  Settings page updates SET("influencer_data") — storefront sees it
```

### Products/Gallery/Links

```
Dashboard adds -> Product table -> Storefront reads LIVE from Product table
Dashboard adds -> GalleryImage table -> Storefront reads LIVE from GalleryImage table
Dashboard adds -> AffiliateLink table -> Storefront reads LIVE from AffiliateLink table

Snapshot has products: [] / gallery: {enabled: false} — ALWAYS EMPTY
```

### Services/Courses/Testimonials/FAQ

```
Dashboard manages these but STOREFRONT NEVER LOADS THEM.
No getPublicPageData query includes Offering or SET("testimonials") or SET("faq").
They are dashboard-only features with no storefront rendering.
```

### SEO

```
Dashboard writes -> SET("seo").title, .description

Storefront reads:
  extractSeoFromPages() -> snapshot seo (always "" during onboarding)
    -> fallback: "{profile.name} — CreatorStore"
  OR
  buildStorefrontMetadata() -> profile.name

Snapshot stores: seo: { title: "", description: "" } — ALWAYS EMPTY on publish
```
