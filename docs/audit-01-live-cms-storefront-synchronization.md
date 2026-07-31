# AUDIT-01 — Live CMS Integration & Storefront Synchronization

**Type:** Audit only. No code modified during this audit.
**Date:** 2026-07-31
**Status:** Complete. Verified against source. Ready for the implementation phase with zero remaining architectural decisions.
**Method:** Six parallel end-to-end pipeline traces + targeted source verification. All file:line references verified.
**Scope:** Creator CMS → Storefront (Hero, Profile, Products, Gallery, Testimonials, Timeline, Games, Services, Courses, Links, Content Feed, Media, Builder, Theme, Layout, Storefront Runtime, Website Health, Acquisition).

---

## Executive Summary

The platform is **architecturally complete**. Content writes already reach live DB tables, and the storefront already composes live content every request (`mergeLiveContent` at `src/app/[domain]/page.tsx:20`). The remaining problems are **broken mappings, dead code, and lifecycle bugs** — not missing architecture.

The five most severe defects, in order:

1. **Builder rollback wipes all builder pages.** `publishSnapshotService.rollback` reads a `data.canonical` field that the serializer never writes (`src/lib/publishing/snapshot.ts:49-70` vs `snapshot-serializer.ts:14-23`), always returns `{ pages: [] }`, and `builderService.save(websiteId, [])` then `deleteMany`s every Page row (`builder-service.ts:53`). UI has no restore button, so this is latent — but any future wiring will wipe the builder.
2. **Preview and live publish share one version sequence.** `createPublish` uses `(liveVersion ?? 0) + 1` (`publishing-repository.ts:18`) while `createPreview` uses `(previewVersion ?? 0) + 1` (`:50`), both constrained by `@@unique([websiteId, version])` (`schema.prisma:158`). Publish-after-preview and preview-after-publish **hard-fail with a unique constraint violation**.
3. **`markChangesPending` is wired to builder saves only.** Content and theme changes never flag the snapshot as stale (`builder.actions.ts:83` vs `content-change.ts:9-12` and `theme.actions.ts`), so the dashboard can say "Live" while the published snapshot is stale — and conversely every builder save flips the card to "Changes pending"/"Draft" while the storefront keeps serving the old live snapshot.
4. **Profile brand colors are silently dropped.** The profile form collects `brandColors` (`profile-page.tsx:98-112`), the validator accepts them, but `profileService.updateProfile` never writes them (`profile/service.ts:59-94`) — colors set in the form vanish on refresh, and the storefront theme actually comes from `Website.themeColors`, a third unrelated source.
5. **The active Links Manager never invalidates the storefront.** The UI calls `src/actions/link.actions.ts` (revalidates only `/admin/links`, `:78,111,138,187,216`); the `afterContentChange`-wired copies live in `src/features/links/actions.ts` which has **zero callers**.

Underlying systemic facts that drive most findings:

- **Content is LIVE by default.** The storefront builds the aggregate on every request (`live-content.ts:17-31`) and ISR `revalidate = 60` is inert (`searchParams.preview` at `page.tsx:58`). So missing revalidation mostly hides latent bugs, not current user-visible ones.
- **Builder presentation is snapshot-only.** Theme/layout/nav render from the snapshot; only content is merged live.
- **Multiple entity areas are "write-only dead code"**: Services, Courses, FAQ, Gallery create — actions exist but have no UI callers; data can never be created from the admin.
- **Six orphaned sub-pipelines** (dashboard health, dashboard hooks, commerce registry/purchases, content-entity products, media registry/resolver, public template components) are dead code that duplicates live logic.

---

## 1. System Architecture (Current)

```
                          ┌──────────────────────────────────────────────────────────────┐
                          │                        CREATOR                                │
                          └──────────────┬───────────────────────────────┬────────────────┘
                                         │                               │
                    ┌────────────────────▼─────────────┐   ┌─────────────▼──────────────────┐
                    │  CMS CONTENT (LIVE, Rule 1)       │   │  BUILDER (PRESENTATION, Rule 2) │
                    │  settings-form / profile-page /   │   │  workspace.tsx (autosave)       │
                    │  products / gallery / testimonials│   └──────────────┬──────────────────┘
                    │  milestones / games / links / seo │                  │ saveBuilderPages
                    │  faq / content-feed / media       │                  ▼
                    └──────────────┬────────────────────┘   ┌───────────────────────────────┐
                                   │ server actions         │ builder.actions.ts             │
                                   ▼                        │  tryLoadFromArtifact (FIRST)   │
                    ┌───────────────────────────────┐       │  builderService.save (DB rows) │
                    │ live tables (Prisma)          │       │  markChangesPending            │
                    │ Brand, Setting(hero_data,      │       └──────────────┬────────────────┘
                    │   influencer_data, seo, faq,  │                      │ Page/Section/Block
                    │   testimonials), Product,     │                      ▼
                    │ GalleryImage, TimelineEvent,  │       ┌───────────────────────────────┐
                    │ Game, AffiliateLink,          │       │ Website.themeColors/Fonts      │
                    │ ContentFeedItem, Offering,    │       │ Website.themePackageId         │
                    │ Asset, AssetReference         │       └──────────────┬────────────────┘
                    └──────────────┬────────────────┘                      │
                                   │ afterContentChange()                  │ publishingService.publish()
                                   │ revalidate /<storeRoot>               │ createPublish vN (state:"live")
                                   ▼                                      ▼
                    ┌──────────────────────────────────────────────────────────────────────┐
                    │  PUBLISH SNAPSHOT  (PublishSnapshot row, state:"live", version N)     │
                    │  PublishStatus: state, liveVersion  ←── served content source         │
                    └───────────────────────────────────────┬──────────────────────────────┘
                                                            │
                                    ┌───────────────────────▼────────────────────────────┐
                                    │  STOREFRONT  src/app/[domain]/page.tsx             │
                                    │  snapshot = getLive(websiteId)  [snapshot.ts:84-94] │
                                    │  snapshot = mergeLiveContent(snapshot, tenantId)    │
                                    │        └─ websiteAggregateService.build(tenantId)   │
                                    │           (reads live tables EVERY REQUEST)         │
                                    │  doc = layoutEngine.resolve(snapshot)               │
                                    │  render sections (visible !== false) via renderers  │
                                    └────────────────────────────────────────────────────┘
```

Canonical read chain (verified):
`middleware` (tenant-host rewrite) → `[domain]/page.tsx:14-25` → `getPublishedPageData` → `publishSnapshotService.getLive` (`snapshot.ts:84-94`) → `mergeLiveContent` → `websiteAggregateService.build` (live tables) → `layoutEngine.resolve` → `DataBoundRenderer` → registry renderers.

Canonical write chain (verified):
Editor → server action → repository/service → live table → `afterContentChange()` → `revalidatePath("/<customDomain ?? subdomain>")` → next request rebuilds aggregate.

Publish chain (presentation only):
Builder pages → `builderService.save` → `publishingService.publish` → `websiteAggregateService.build` (content snapshot) + theme + nav → `createPublish` vN → `revalidatePath("/<subdomain>")` only (custom domain not revalidated).

---

## 2. Complete Integration Matrix

Legend: ✅ live end-to-end · ⚠️ partially wired · ❌ broken · 💀 dead code · — not applicable

### A. HERO (`hero_data` Setting → aggregate.hero → LayoutEngine `hero.` → HeroRenderer)

| Form field (settings-form.tsx) | DB write (settings.service.ts) | Aggregate (website-aggregate.ts) | LayoutEngine | HeroRenderer reads? | Verdict |
|---|---|---|---|---|---|
| Title (:167,272) | `patchHeroData` hero_data.title (:91) | ✅ :60 | ✅ :158 | ✅ :79 | ✅ |
| Subtitle (:168,281) | hero_data.subtitle | ✅ :61 | ✅ :158 | ✅ :83 | ✅ |
| Tagline (:169,289) | hero_data.tagline | ❌ **not read** | ❌ | ❌ | ❌ dropped |
| CTA text (:170,296) | hero_data.ctaText | ✅ :65 | ✅ → `config.cta` :159 | ✅ :87,90,94 | ✅ |
| CTA link (:171,297) | hero_data.ctaLink | ✅ :66 | ✅ :158 | ✅ :88-89 | ✅ |
| Secondary CTA text (:172,298) | hero_data.ctaSecondaryText | ✅ :67 | ✅ :158 | ✅ :101,105 | ✅ |
| Secondary CTA link (:173,299) | hero_data.ctaSecondaryLink | ✅ :68 | ✅ :158 | ✅ :100 | ✅ |
| Live badge text (:174,307) | hero_data.liveBadgeText | ✅ :69 | ✅ :158 | ✅ :75 | ✅ |
| Show live badge (:175,311) | hero_data.showLiveBadge | ✅ :70 | ✅ :158 | ✅ :69 | ✅ |
| Video URL (:135) | hero_data.videoUrl | ✅ :63 | ✅ :158 | ✅ :46-56 | ✅ |
| Poster URL (:151) | hero_data.posterUrl | ✅ :64 | ✅ :158 | ✅ :49,59-64 | ✅ |
| Video desktop align (:136) | hero_data.videoDesktopAlignment | ❌ **not read** | ❌ | ❌ | ❌ dropped |
| Video mobile align (:137) | hero_data.videoMobileAlignment | ❌ **not read** | ❌ | ❌ | ❌ dropped |
| Image desktop align (:152) | hero_data.imageDesktopAlignment | ❌ **not read** | ❌ | ❌ | ❌ dropped |
| Image mobile align (:153) | hero_data.imageMobileAlignment | ❌ **not read** | ❌ | ❌ | ❌ dropped |

Read-but-never-written (dead reads): `hero_data.description` (aggregate :62, no form writes it), `hero_data.imageUrl` (:71, only OG fallback `LayoutEngine.ts:72`).

### B. PROFILE (`Brand` + `influencer_data` → aggregate.identity → about./links. branches)

| Form field (profile-page.tsx) | Validator | DB write (profile/service.ts) | Rendered? | Verdict |
|---|---|---|---|---|
| Avatar (:57-68) + avatarAssetId | ✅ avatarUrl; ❌ **avatarAssetId stripped** | Brand.avatarUrl ✅ :64; avatarAssetId never from UI | ✅ identity.avatarUrl (About :165, OG :72) | ⚠️ asset id stripped |
| Name (:73-77) | ✅ :11 | Brand.name :61 | ✅ title/jsonld/About | ✅ |
| Tagline (:79-82) | ✅ :12 | Brand.tagline :62 | ✅ :166 | ✅ |
| Bio (:83-88) | ✅ :13 | Brand.bio :63 | ✅ :164 | ✅ |
| Location (:90-93) | ✅ :21 | influencer_data.location :83,91 | ❌ never rendered | ❌ stored-only |
| Brand colors (:98-112) | ✅ :19 | ❌ **never written** | ❌ | ❌ **data loss** |
| Contact email (:113-118) | ✅ :17 | influencer_data.contactEmail :80,88 | ❌ never rendered | ❌ stored-only |
| Social links (:121-154) | ✅ :16 | Brand.socialLinks :68 | ✅ links renderer :198-200, jsonld :107-109 | ✅ |
| Banner / bannerAssetId | — | Brand.bannerUrl/bannerAssetId :66-67 | ❌ no UI, no renderer | 💀 |
| Username / handle | ❌ does not exist | — | — | ❌ absent |

### C. PRODUCTS (Product → aggregate.products → products. → ProductsRenderer + BuyNowButton)

| Step | Status | Evidence |
|---|---|---|
| Create / Update / Delete | ✅ | actions.ts:24,36,46 → service.ts:39-81 → afterContentChange :32,42,52 |
| Default status | ✅ PUBLISHED | service.ts:49; schema.prisma:340; form :30,35 |
| Status + type selectors | ✅ | products-page.tsx:154-180 |
| Image upload | ✅ canonical | ImageManager.tsx:56 uploadAsset (folder `products`) |
| Aggregate | ✅ | website-aggregate.ts:73-83 (imageUrl :78, images :79) |
| Renderer (price/image/buy) | ✅ | renderers.tsx:177-222; BuyNowButton :204; import :11 |
| Checkout | ✅ guest | checkout.actions.ts:27-33 tenantId=product.tenantId; filter PUBLISHED+isActive+!archivedAt |
| Webhook completes order | ✅ | route.ts:63-80 |
| Edit-drawer images reload | ❌ | openEdit never sets form.images (products-page.tsx:39-55) — existing images not shown while editing |

### D. GALLERY (GalleryImage → aggregate.gallery → gallery. → GalleryRenderer)

| Step | Status | Evidence |
|---|---|---|
| Upload/create | ❌ **no UI** | createGalleryItem (gallery.actions.ts:13) zero callers; GalleryEditor has no upload/URL field; empty-state button unwired |
| Reorder | ❌ **no UI** | updateGalleryOrder (gallery.actions.ts:28) zero callers |
| Delete | ✅ | gallery.actions.ts:23 → service.ts:80-92; wired gallery-page.tsx:162 |
| Aggregate | ✅ | website-aggregate.ts:84-93 (incl. videoUrl/altText/mediaType) |
| Renderer videos | ❌ | GalleryRenderer ignores videoUrl/isVideo; video rows have imageUrl `""` (service.ts:31) → `url=""` |
| Lazy loading / optimization | ✅ | CreatorImage next/image lazy :59; admin card `<img loading="lazy">` |
| Live | ✅ | all actions afterContentChange |

### E. TESTIMONIALS (Setting `testimonials` → aggregate.testimonials → testimonials. → TestimonialsRenderer)

| Step | Status | Evidence |
|---|---|---|
| Create | ✅ | actions.ts:18 → service.ts:25-53 (upsert key `testimonials`) → afterContentChange :26 |
| Edit | ❌ **no update action** | only create+delete |
| Delete | ✅ | actions.ts:30 → :55-67 |
| Avatar input | ❌ | not in form (testimonials-page.tsx:96-103) though types/validator/service/aggregate have it |
| Aggregate | ✅ | website-aggregate.ts:104-113 |
| Renderer avatar/rating | ❌ | renderers.tsx:292-324 reads name/handle/content only; avatar+rating ignored |

### F. TIMELINE / MILESTONES (TimelineEvent → aggregate.timeline → timeline. → TimelineRenderer)

| Step | Status | Evidence |
|---|---|---|
| Create/Update/Delete | ✅ | milestone.actions.ts:48,99,156 → afterContentChange :89,146,174 |
| Image upload (create) | ✅ canonical | milestones-manager.tsx:195-201 MediaUploadField folder `milestones` (in ALLOWED_FOLDERS) |
| Image edit | ⚠️ | edit drawer = plain text URL input (:319-322); blank input converts image to null (:139) |
| Aggregate | ✅ | website-aggregate.ts:120-127 |
| Renderer image | ❌ **never renders image** | TimelineRenderer (renderers.tsx:226-251) drops imageUrl |
| AssetReference | ❌ | imageAssetId column (schema.prisma:477) never written; dangling URLs on library delete |

### G. GAMES (Game → aggregate.games → games. → GamesRenderer)

| Step | Status | Evidence |
|---|---|---|
| CRUD | ✅ | games.actions.ts:27,72,117 → pages exist (new/[id]/edit) → afterContentChange |
| Image upload | ❌ | games-form.tsx:68-74 plain text `logoUrl`; no MediaUploadField; emoji → next/image onError hides |
| Aggregate | ✅ | website-aggregate.ts:128-134 |
| Renderer | ✅ | renderers.tsx:687-720 (logo/name/genre/description) |

### H. SERVICES (Offering type `coaching` → aggregate.services → services. → ServicesRenderer)

| Step | Status | Evidence |
|---|---|---|
| Create action | 💀 0 callers | services/actions.ts:18; admin page read-only |
| Update/Delete | ❌ don't exist | — |
| Image | ❌ no field | Offering has no imageUrl; metadata never written |
| Duration | ❌ dropped | service.ts returns null; aggregate reads metadata.duration (never set) |
| Renderer | ✅ but display-only | renderers.tsx:524-551; no buy button |
| Live | ✅ action calls afterContentChange (but action is dead) | :26 |

### I. COURSES (Offering type `course` → aggregate.courses → courses. → CoursesRenderer)

| Step | Status | Evidence |
|---|---|---|
| Create action | 💀 0 callers | courses/actions.ts:23; admin page "coming soon" |
| Update/Delete | ❌ don't exist | — |
| Price | ❌ hardcoded 0 | courses/service.ts:48 |
| Image/Category | ❌ never persisted | metadata.imageUrl/category read in aggregate :153-154 but create never writes metadata |
| Renderer | ✅ but display-only | renderers.tsx:484-520; no buy button |

### J. LINKS

| Link kind | Storage | Write path | Renderer | Storefront invalidation |
|---|---|---|---|---|
| Affiliate links (Links Manager) | AffiliateLink | `src/actions/link.actions.ts` (**active**) | LinksRenderer (aggregate.links) | ❌ none — revalidates /admin/links only |
| Social links (profile) | Brand.socialLinks | profile/service.ts:68 | LinksRenderer (identity.socialLinks) + jsonld sameAs | ✅ via updateProfile |
| Hero CTA links | hero_data.ctaLink/ctaSecondaryLink | settings.actions.ts | HeroRenderer | ✅ |
| Footer links | ❌ **no storage** | — | FooterRenderer renders copyright only | — |

### K. MEDIA LIBRARY (canonical source audit)

| Feature | Uploader | Folder | Canonical? | AssetReference? |
|---|---|---|---|---|
| Hero video/poster | MediaUploadField → uploadAsset | hero | ✅ | ❌ none |
| Profile avatar | MediaUploadField | profile (entityType=profile, entityId=tenantId) | ✅ | ✅ **only live writer** |
| Products | ImageManager → uploadAsset | products (entityType=product, **no entityId**) | ⚠️ | ❌ guard fails (service.ts:43,81) |
| Milestones | MediaUploadField | milestones | ✅ | ❌ none |
| Gallery | **none** (no upload UI) | gallery (allowed, unused) | ❌ | — |
| Games | **none** (text input) | games (allowed, unused) | ❌ | — |
| Courses/Services | **none** | — | ❌ | — |
| Testimonials | **none** (no avatar input) | — | ❌ | — |
| Content Feed | raw URLs from social sync | — | ❌ | — |
| Library picker | AssetPicker → uploadAsset | library | ✅ | — (component 💀 dead) |

Allowed folders (`validator.ts:40-51`): `profile, gallery, hero, products, timeline, milestones, games, feed, library, general`. Unused-but-allowed: `gallery, timeline, games, feed, general`.

### L–O. BUILDER / THEME / LAYOUT / RUNTIME — see §5 and §7.

### P. WEBSITE HEALTH — see §8-scoring subsection.

### Q. ACQUISITION — see §9.

---

## 3. Broken Mapping Report

Each row: **Origin → Destination | Expected | Actual | Root cause.**

### CRITICAL

| # | Origin → Destination | Expected | Actual | Root cause |
|---|---|---|---|---|
| B1 | `Profile brandColors` → `Brand.brandColors` / `brand_config` | colors persisted | colors **silently dropped**, lost on refresh | `profile/service.ts:59-94` never writes colors; `getProfile` reads colors from `brand_config` (provisioning-only) :30-34. Storefront theme actually reads `Website.themeColors` (publishing/service.ts:123-137) — a third source |
| B2 | `avatarAssetId`/`bannerAssetId` (profile upload) → `Brand.avatarAssetId` | asset id persisted | **stripped by validator** | `profileUpdateSchema` (validators.ts:10-22) omits them; zod strips at profile/actions.ts:23 |
| B3 | Links Manager save → storefront | storefront shows new link | storefront cache never invalidated | active `src/actions/link.actions.ts:78,111,138,187,216` revalidate only `/admin/links`; the wired copies in `features/links/actions.ts` have **0 callers** |
| B4 | Hero form alignment fields (4) → HeroRenderer | focal-point alignment applies | fields silently dropped | aggregate `hero` never copies them (website-aggregate.ts:59-72); only consumer `HeroBanner` (`[domain]/_components/hero-banner.tsx`) is dead code |
| B5 | Hero form Tagline → HeroRenderer | hero tagline renders | dropped at aggregate | same as B4; rendered tagline comes from `Brand.tagline` |
| B6 | Hero empty-string clears | field clears | field cannot be cleared | `settings.actions.ts:81,120` strip empty strings before write + JSONB `COALESCE(||)` merge never removes keys |

### HIGH

| # | Origin → Destination | Expected | Actual | Root cause |
|---|---|---|---|---|
| B7 | Gallery create/reorder UI → GalleryImage | creator adds/reorders media | **no UI exists**; only DB-seeded rows appear | `createGalleryItem`/`updateGalleryOrder` (gallery.actions.ts:13,28) zero callers; `GalleryEditor` has no upload/URL field; empty-state `onCreate` unwired |
| B8 | Gallery video item → GalleryRenderer | video renders | renders image placeholder with `url=""` | `GalleryService.create` stores `imageUrl:""` for videos (gallery/service.ts:31); renderer ignores `videoUrl`/`isVideo` (renderers.tsx:141-173) |
| B9 | Milestone image → TimelineRenderer | image renders on storefront | **never rendered** | renderer drops `imageUrl` (renderers.tsx:226-251) |
| B10 | Milestone edit → imageUrl | existing image preserved | blank input converts to null | `parsed.data.imageUrl \|\| null` (milestone.actions.ts:139) |
| B11 | Course image/category → CoursesRenderer | renders | always null | `courses/service.ts:41-52` never writes `metadata`; aggregate reads `metadata.imageUrl/category` (website-aggregate.ts:153-154) |
| B12 | Service duration → ServicesRenderer | renders duration | always null | `services/service.ts` returns duration null; never writes metadata |
| B13 | Services/Courses create → storefront | appears | **impossible** — actions have 0 callers; admin pages read-only / "coming soon" | dead actions; no UI (services/actions.ts:18, courses/actions.ts:23) |
| B14 | Testimonial avatar/rating → TestimonialsRenderer | avatar + stars render | ignored; initial-letter circle, no stars | renderer never reads them (renderers.tsx:307-315); avatar not even editable |
| B15 | `markChangesPending` | every content/theme change flags snapshot stale | only **builder saves** flag it | wired only at builder.actions.ts:83; `content-change.ts:9-12` deliberately skips it; theme.actions.ts:52 skips it |
| B16 | Preview/live version numbering | independent sequences | shared sequence → unique violation | publishing-repository.ts:18 vs :50 + schema.prisma:158 |
| B17 | Builder theme selection → storefront | selected theme applies after publish | **never applies even after publish** | autosave writes `p.theme` on each Page (workspace.tsx:92-95, builder-service.ts:63); publish reads `Website.themePackageId` (service.ts:116) |

### MEDIUM

| # | Origin → Destination | Expected | Actual | Root cause |
|---|---|---|---|---|
| B18 | Section `visible` toggle | persisted + published | **lost on reload** | section-manager.tsx:194-200 mutates store in place without `markDirty()` |
| B19 | Multi-block section → snapshot | all blocks | only first block published | publishing/service.ts:165-166 `s.slots[0]!` |
| B20 | Custom domain publish | custom domain revalidated | only subdomain revalidated | publishing/service.ts:217 vs content-change.ts:32-36 |
| B21 | Rollback → builder pages | pages restored | pages **deleted** | snapshot.ts:49-70 reads `data.canonical` (never written by serializer); returns `[]`; builder-service.ts:53 deleteMany |
| B22 | Builder load | DB pages | stale onboarding artifact wins forever | builder.actions.ts:27-54 artifact-first; `builder_artifact` written once at onboarding (onboarding.actions.ts:240-242) and never updated |
| B23 | Theme identity | one theme system | two systems, divergent IDs | `neon-dark` (schema.prisma:98, personalizer.ts:186) vs `com.creatos.neon-dark` (themes/creator.ts:6); resolver-new.ts:44-49 silently falls back |
| B24 | Theme appearance save | "changes pending" flag | dashboard keeps "Live" | updateTheme (theme.actions.ts:52) doesn't call markChangesPending |
| B25 | Preview snapshot | preview reflects custom colors | preview omits color/font overrides | publishing/service.ts:267 (preview) vs :125-144 (publish) |
| B26 | Profile influencer_data fields (contactEmail/categories/languages/location) | render somewhere | never rendered | aggregate reads only Brand + hero_data + seo + testimonials + faq |
| B27 | Product image in edit drawer | existing images shown | empty grid while editing | openEdit never sets form.images (products-page.tsx:39-55) |
| B28 | `razorpayOrderId` | unique per order | `""` on create → concurrent insert collision | checkout.actions.ts:61 writes `razorpayOrderId:""` under `@unique` (schema.prisma:365) |
| B29 | Webhook product orders | durable dedup + amount check | no BillingEvent, no amount verification, silent retry suppression | route.ts:63-80; only SaaS path writes BillingEvent |
| B30 | Health "Products" check | PUBLISHED products only | `isActive` only — drafts score | engine.ts:54 vs builder-overview.actions.ts:122 |
| B31 | Health `done` vs `score` | aligned | done=true at 1 item while score=20-25% | engine.ts:81-88 (done `>0`, score `count*multiplier`) |
| B32 | BusinessProfile.category → provisioning | category drives template/theme | category dropped on every path | acquire.actions.ts:90-106 builds input without category; ProvisioningInputBase (provisioning-service.ts:26-50) has no category field |

---

## 4. Duplicate Data Report

### 4.1 Fields stored in 2+ places

| Concept | Locations | Who wins |
|---|---|---|
| Name | `Brand.name` · `Tenant.name` · legacy `influencer_data.name` (provisioning-service.ts:164) · legacy `brand_config.name` (:157) | aggregate falls back Brand→Tenant (website-aggregate.ts:52) |
| Tagline | `Brand.tagline` · `hero_data.tagline` (dropped) · `influencer_data.tagline` · `brand_config.tagline` | Brand |
| Bio | `Brand.bio` · `influencer_data.bio` · `brand_config.bio` | Brand |
| Social links | `Brand.socialLinks` · `AffiliateLink` table · legacy `influencer_data.social` | merged at render (LayoutEngine.ts:192-202) |
| Colors | profile `brandColors` (dropped) · `brand_config` colors (legacy) · `Website.themeColors` (real source) | Website.themeColors |
| Avatar | `Brand.avatarUrl` · legacy `influencer_data.profileImage` | Brand |
| Cover/Banner | `coverUrl` (blueprint types.ts:39, business-types.ts:88) · `coverImage` (content gallery types.ts:37) · `bannerUrl` (Brand, snapshot.ts:80) | bannerUrl (unrendered) |
| Avatar URL vs asset | `Brand.avatarUrl` + `Brand.avatarAssetId` | asset id overrides URL when present (website-aggregate.ts:176-179) |
| Timeline naming | `TimelineEvent` model · "milestone" UI/actions · `timeline` aggregate key · legacy `PublicMilestoneData` | — |

### 4.2 Settings keys written vs read

| Key | Written | Read | Status |
|---|---|---|---|
| `brand_config` | provisioning only (:187) | profile getProfile (:21,26-33) | written once, never updated by UI |
| `influencer_data` | profile :74-94, provisioning, super-admin | profile :22, public.service :114 | 4 fields stored but never rendered |
| `hero_data` | settings :87,133, provisioning :190 | settings.service :60 | ✅ (5 fields dropped at aggregate) |
| `seo` | seo/service :26-27, provisioning :188 | settings.service :204 | ✅ |
| `faq` | faq/service :29-30,44-45 | aggregate :34 | ✅ but no UI to create |
| `testimonials` | testimonials/service :43-44,63-64 | aggregate :33 | ✅ |
| `builder_artifact` | onboarding :240-242, super-admin :170-172 | builder.actions :33-44 | ✅ **but causes stale-load bug (B22)** |
| `onboarding_completed` | onboarding :437-439 | lifecycle :45 | ✅ |
| `onboarding_source` | onboarding :220-228 | super-admin dedup :78 | ⚠️ write-mostly |
| `provisioning_meta` | provisioning :191 | **never** | 💀 dead write |
| `theme_config` | settings :259 | getThemeConfig :139-145 (0 consumers) | 💀 dead path |

### 4.3 Dead code inventory

**Actions (0 callers):** `features/links/actions.ts` (all 4) · `features/services/actions.ts` (`createService`/`listServices`) · `features/courses/actions.ts` (all 3) · `listProducts`/`getProduct` (products/actions.ts:11,18) · `createGalleryItem`/`updateGalleryOrder` (gallery.actions.ts:13,28) · `createFAQItem`/`deleteFAQItem` (faq/actions.ts) · `updateSocialChannels` (settings.actions.ts:155) · `updateThemeConfig` (settings.actions.ts:237) · `previewWebsite` (publish.actions.ts:58)

**Services/methods:** `SettingsService.updateHeroData` (:75) · `SettingsService.getAllSettings` (:25) · `getThemeConfig` (:139) · `getWorkspaceSettings`/`updateWorkspaceSettings` (:160,182) · `getPublicPageData` (public.service.ts:111) · `storage.service` (only affiliate delete) · legacy `AssetRegistry`/`AssetResolver` (media/registry.ts, media/resolver.ts) · `assetProcessor`/`processingQueue` (media/processing — assets stuck QUEUED forever, nothing calls processNext)

**Components:** `MediaUpload`, `ImageUploader`, `ui/ImageUpload`, `ui/VideoUpload`, `ui/image-uploader`, `AssetPicker`, `HeroBanner`, `VideoCarousel` (hardcoded YouTube IDs, :7-28), `components/public/*` (HeroSection, VideoHero, TimelineSection, GallerySection, ContentFeed, AffiliateGrid, ProductGrid×2, InstagramFeed), dashboard orphans (below)

**In-memory duplicate implementations (disconnected from Prisma):**
- `src/lib/content/entities/product/*` — `InMemoryProductRepository` (fields `title/visibility/variants/seo` that don't exist on Prisma Product); reachable only via dead `hooks/dashboard/useProducts.ts`
- `src/lib/commerce/purchases.ts` (`PurchaseService`), `commerce/registry.ts` (`offeringRegistry`), `commerce/providers/interface.ts` (`CheckoutProvider`) — exported, zero importers; real checkout uses Prisma directly
- `src/lib/registry/cache.ts` `RegistryCache` — no TTL; `marketplace/registry.ts` queryCache never read

**Orphaned dashboard subsystem:**
- Components: `DashboardHero`, `HealthScore`, `ProgressChecklist`, `QuickStartGuide`, `ActivityFeed`, `ActivityTimeline` (only `OnboardingChecklist` + `StorefrontStatusCard` live)
- Hooks: `useProducts`, `useGallery`, `useDashboardStats`, `usePlatformStatus`, `useAsyncState` — entire `src/hooks/dashboard/` orphaned
- Lib: `lib/dashboard/health.ts`, `quickstart.ts`, `activity.ts`, `activity-service.ts`, `types.ts`
- `QuickCard` type (features/dashboard/types.ts:45) unused

**Competing health scorers (5 implementations):** `dashboardService.getHealthChecks` (5 binary, orphaned) · `WebsiteHealthEngine.evaluate` (15 weighted, LIVE) · `lib/dashboard/health.computeHealthChecks` (6 checks, orphaned) · `builder-overview.calculateHealthScore` (:386, used) · `business-intelligence/health-engine.calculateHealth` (used only by unwired recommendation-engine). Plus `dashboardAppService.getStats` (orphaned). See §8.

**Unused schema assetId columns:** `Product.imageAssetId` (:338) · `GalleryImage.assetId` (:449) · `TimelineEvent.imageAssetId` (:477) · `Game.logoAssetId` (:494) · `ContentFeedItem.thumbnailAssetId` (:541) · `AffiliateLink.imageAssetId` (:388) — none written by feature code. Only `Brand.avatarAssetId`/`bannerAssetId` are read (website-aggregate.ts:171-183).

**Unused media folders:** `gallery, timeline, games, feed, general` are allowed but no uploader sends them.

---

## 5. Builder Audit (complete lifecycle)

### 5.1 Every save
1. `workspace.tsx:87-112` autosave (2s debounce) / toolbar save (:150-158) / bottom-bar save (:199-212) → `saveBuilderPages` (builder.actions.ts:63-90)
2. `workspacePolicy.assertCanEdit` (:66-72)
3. `builderService.save(websiteId, pages)` — `deleteMany` all Page rows (:53) then recreate Page (:56-66), Section (:69-78), Block (:81-91)
4. `markChangesPending(tenantId)` (:83) — flips `state:"live"→"draft"` only (publishing/service.ts:238-243); never touches `liveVersion`

**Bugs:**
- Section visibility toggle **never saved** — `section-manager.tsx:194-200` mutates without `markDirty()`
- Autosave may not fire — `BuilderWorkspace` never subscribes to `builderEvents`; no `useSyncExternalStore`; `isDirty` is a plain getter (store.ts:93); autosave only runs after an unrelated re-render
- Ctrl+S is a no-op — `saveCommand.execute` (commands.ts:82-87) returns saved without calling the action
- Theme selection persists to `Page.theme` (per-page) — never read at publish (see §5.3)

### 5.2 Every publish
`publishingService.publish` (service.ts:81-230):
1. Loads tenant, asserts `assertCanPublish`, loads builder pages from **DB rows** (`loadBuilderPages` → `builderService.load`), website theme fields, live aggregate, navigation
2. Resolves theme (`themeResolver.resolveForSnapshot`, fallback `com.creatos.neon-dark`)
3. `createPublish` (publishing-repository.ts:12-39): `nextVersion = (liveVersion ?? 0) + 1`; new `PublishSnapshot` `state:"live"`; upsert `PublishStatus` → `state:"live"`, `liveVersion:nextVersion`
4. Revalidates `/`, `/admin/dashboard`, `/${subdomain}` — **not custom domain** (:214-220)

**Bugs:** only first block per section published (:165-166); zero-slot sections emit `moduleId = s.name` → "Unknown component" on storefront; ISR 60s; publish-after-preview version collision (B16); `validateBeforePublish` only warns.

### 5.3 Theme persistence chain
- Selection: builder `ThemeCard` → autosave writes `page.theme` (workspace.tsx:92-95) — **never read at publish** (publish reads `website.themePackageId`, service.ts:116). So builder-picked themes **never apply**.
- Appearance page: `updateTheme` (theme.actions.ts:14-57) → `website.themeColors/themeFonts/themeConfig` — reaches publish, but **no markChangesPending** (dashboard stays "Live").
- Deprecated: `settings.actions.ts updateThemeConfig` → `theme_config` Setting via raw SQL — **never read at publish**.
- ID mismatch: default/provisioning use `"neon-dark"`; new registry uses `"com.creatos.neon-dark"` → `resolver-new.ts:44-49` silently falls back; `ThemeCard` active-state never matches.

### 5.4 Every version
- List: `publishSnapshotService.list` (snapshot.ts:96-104); dashboard lists only `state:"live"` (dashboard/service.ts:38-43)
- Restore: `publishingService.rollback` (service.ts:310-335) → `publishSnapshotService.rollback` (snapshot.ts:39-74) → **broken** — reads `data.canonical` which the serializer never emits (snapshot-serializer.ts:14-23), returns `{pages:[]}` → `builderService.save(website.id, [])` **deletes all pages** (builder-service.ts:53). Test asserts the bug: `tests/unit/snapshot.test.ts:61-68`.
- UI: no component calls `rollbackToVersion`/`listSnapshots`; `StorefrontStatusCard` version history is display-only (no restore button).

### 5.5 Snapshot loading
`loadBuilderPages` (builder.actions.ts:47-61): tries `builder_artifact` Setting **first** (:51-54); only if absent loads DB pages (:56). `builder_artifact` is written once at onboarding and never updated → builder always loads the frozen onboarding artifact, ignoring real DB edits; a subsequent save can overwrite DB rows with artifact content. (B22)

### 5.6 Symptom → root cause

| Symptom | Root cause |
|---|---|
| Left panel disappears | "No sections yet" when active page has 0 sections (section-manager.tsx:222-226), caused by rollback wiping pages (5.4) or artifact/DB divergence (5.5); `ResizablePanel` registers global mouse listeners in render with no cleanup (panel.tsx:38-42); `ThemeCard` returns null when no theme |
| Publish partially works | only first block per section (service.ts:165-166); builder theme never published (5.3); version collision after preview (B16); stale artifact overwrites edits (B22) |
| Dashboard says unpublished while storefront is live | `markChangesPending` flips `state` to draft but storefront serves by `liveVersion` (snapshot.ts:84-94); conversely content/theme changes never flip state → "Live" while stale. Provisioning writes `state:"draft"` while returning `websiteStatus:"published"` (provisioning-service.ts:184 vs :295-297) |
| Builder becomes blank | rollback deletes pages (5.4); empty pages skip hydration (store.ts:26) |
| Preview/live mismatch | preview reads `state:"preview"` snapshots (snapshot.ts:26-37), live reads `liveVersion` (:84-94); no UI creates preview snapshots; version collision; preview omits theme overrides |

---

## 6. Media Audit

### 6.1 Canonical flow
`MediaService.upload/replace/delete` (`src/lib/media/service.ts`) → `uploadAsset`/`deleteAsset`/`replaceAsset` actions → `MediaUploadField`. Validates MIME via `mediaValidator`, dedupes by SHA-256 checksum, writes `Asset` (+ optional `AssetReference` when `entityType && entityId`), deletes guarded by `MediaReferenceError` when `referenceCount > 0`.

### 6.2 Feature conformance to Rule 3 (single media source)

| Feature | Uses canonical uploadAsset? | Chooses existing? | Replace? | Delete protection? |
|---|---|---|---|---|
| Hero | ✅ | ❌ | ❌ | ❌ no AssetReference |
| Products | ✅ | ❌ | ❌ | ❌ no entityId → no reference |
| Gallery | ❌ no upload at all | ❌ | ❌ | — |
| Timeline | ✅ | ❌ | ⚠️ text URL only | ❌ |
| Games | ❌ text input | ❌ | ❌ | — |
| Testimonials | ❌ no avatar input | ❌ | ❌ | — |
| Courses/Services | ❌ | ❌ | ❌ | — |
| Content Feed | ❌ raw sync URLs | ❌ | ❌ | — |
| Profile avatar | ✅ | ❌ | ❌ | ✅ only writer of AssetReference |

**Rule 3 violation:** 8 of 10 features cannot "choose existing / replace / delete / reuse" from the Media Library; only Profile and Products upload at all; 4 features (Gallery, Games, Courses, Services, Testimonials) have no upload UI whatsoever.

### 6.3 Duplicate upload implementations (all bypass canonical)

| # | Component | Mechanism | Status |
|---|---|---|---|
| 1 | `shared/MediaUpload.tsx:26-40` | direct `supabaseClient.storage.upload` | 💀 0 importers |
| 2 | `admin/ImageUploader.tsx:19-33` | direct supabase | 💀 0 importers |
| 3 | `ui/ImageUpload.tsx` | local preview only | 💀 0 importers |
| 4 | `ui/VideoUpload.tsx` | local preview only | 💀 0 importers |
| 5 | `ui/image-uploader.tsx` | local preview only | 💀 0 importers |
| 6 | `lib/supabase.ts:34-72` uploadImage/deleteImage/listImages | direct supabase | 💀 0 importers |
| 7 | `services/storage.service.ts:18-43` | supabaseAdmin remove | ⚠️ affiliate.actions.ts delete cleanup only |
| 8 | `media/registry.ts` AssetRegistry | own upload + duplicate AssetReference | 💀 0 importers |
| 9 | `media/resolver.ts` AssetResolver | prisma variant resolution | 💀 0 importers |
| 10 | `shared/AssetPicker.tsx` | canonical (listAssets/uploadAsset) but unused | 💀 0 importers |

**Key facts:** only Profile creates `AssetReference` (entityType=profile, entityId=tenantId, profile-page.tsx:61-63). Products set `entityType:"product"` with **no entityId** (ImageManager.tsx:53) → guard at service.ts:43/81 fails → no reference. Every other feature stores raw URL strings, so library delete/purge has **no reference guard** for product/hero/milestone/gallery/games/testimonial/course/service media. `MediaReferenceError` (service.ts:334-339) is effectively unreachable in practice.

### 6.4 Resolution gap
Only `Brand.avatarAssetId`/`bannerAssetId` go through `mediaService.resolveUrls` (website-aggregate.ts:171-183). Everything else — product imageUrl, gallery imageUrl/videoUrl, links imageUrl, testimonials avatarUrl, timeline imageUrl, games logoUrl, contentFeed thumbnailUrl, courses metadata.imageUrl, hero videoUrl/posterUrl — is read as a raw frozen URL. `next.config.mjs:9-13` allows only `images.unsplash.com`, `**.vercel.app`, `**.supabase.co`. `MEDIA_STORAGE_PROVIDER` is unset in every `.env*`; provider defaults to supabase-by-key-presence (providers/factory.ts:32-39).

---

## 7. Storefront Synchronization Audit

### 7.1 What is LIVE (Rule 1 compliance)

| Area | Live? | Mechanism |
|---|---|---|
| Hero (title/subtitle/CTA/badge/video/poster) | ✅ | aggregate reads hero_data every request; afterContentChange on updateHeroData/updateHeroPartial |
| Profile (name/tagline/bio/avatar/social) | ✅ | aggregate reads Brand every request; afterContentChange on updateProfile |
| Products | ✅ | productRepository.findPublished; afterContentChange on CRUD |
| Gallery | ⚠️ | read live; but **no UI can create/reorder** (B7) |
| Testimonials | ✅ (create/delete) | afterContentChange; no edit |
| FAQ | ⚠️ | read live; **no UI to create** |
| Timeline | ✅ | afterContentChange; **images never render** (B9) |
| Games | ✅ | afterContentChange |
| Content Feed | ✅ | afterContentChange (cron sync does not revalidate, but page is dynamic) |
| Services/Courses | ⚠️ | read live; **dead actions, no UI** (B13) |
| Links | ❌ **not invalidated** | active path revalidates only /admin/links (B3) |
| SEO | ✅ | autosaved; read via aggregate.seo → metadata |
| Media | ⚠️ | uploadAsset does NOT afterContentChange; deleteAsset does (media.actions.ts:49,62) |

### 7.2 What requires Publish (Rule 2)

| Item | Correct? |
|---|---|
| Layout/section ordering | ✅ snapshot-only |
| Section visibility | ⚠️ toggle lost (B18) |
| Theme | ⚠️ builder theme never published (B17); appearance theme requires publish but no pending flag (B24) |
| Navigation | ✅ snapshot-only |
| Builder-added/deleted sections | ✅ snapshot-only (but only first block per section — B19) |

### 7.3 Cache correctness

- Storefront is effectively **dynamic every request**: `revalidate = 60` (page.tsx:12) is inert because the page reads `searchParams.preview` (:58, Dynamic API). `middleware` also sends `Cache-Control: no-store` (middleware.ts:43).
- `afterContentChange` revalidates `/${customDomain ?? subdomain}` — **one of the two** (content-change.ts:32). Publish revalidates `/${subdomain}` only (service.ts:217).
- **Consequence:** the revalidation gaps (B3 links) and custom-domain gaps are **latent today** but become load-bearing the moment ISR is enabled (`generateStaticParams` or removal of `searchParams`). All `revalidateTag` = 0, `unstable_cache` = 0.

---

## 8. Prioritized Recovery Plan

Legend: effort S (<0.5d) · M (≈1d) · L (2d+) · Risk H/M/L · Dependencies listed.

### CRITICAL (launch-blocking)

| # | Issue | Files | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| C1 | **Fix rollback** — read `layout.pages` (top-level), not `data.canonical`; only `builderService.save` non-empty pages; update liveVersion/publishedAt; mark pending | snapshot.ts:49-70, publishing/service.ts:310-335, builder.actions.ts:106-117, tests/unit/snapshot.test.ts | S | H | — |
| C2 | **Separate preview/live version sequences** (e.g., negative or separate counter; or namespace) | publishing-repository.ts:18,50, schema.prisma:158 | S | H | — |
| C3 | **Persist profile brandColors** → `brand_config` (or `Website.themeColors`); stop dropping `input.brandColors`; add colors to `updateProfile` write | profile/service.ts:59-94, profile-page.tsx:98-112 | S | H | — |
| C4 | **Wire storefront invalidation into the ACTIVE links path** (`src/actions/link.actions.ts`); delete or repoint the dead `features/links` copies | link.actions.ts:78,111,138,187,216 | S | M | — |
| C5 | **Wire `markChangesPending` into theme + content changes** (align with Rule 2: only builder flags, but theme is presentation → theme save should flag; content stays un-flagged) — decide and implement uniformly; fix provisioning `state:"draft"` vs result `"published"` desync | publishing/service.ts:232-249, theme.actions.ts:52, provisioning-service.ts:184,295-297 | M | H | — |
| C6 | **Make Gallery creatable** — wire `createGalleryItem` into gallery-page (upload via MediaUploadField folder `gallery`), wire `updateGalleryOrder` reorder UI, add media replacement to GalleryEditor | gallery-page.tsx, GalleryEditor.tsx, gallery/service.ts:16-47 | M | M | K |
| C7 | **Fix hero alignment fields + tagline** — map `videoDesktopAlignment/videoMobileAlignment/imageDesktopAlignment/imageMobileAlignment` + `tagline` into aggregate.hero and into HeroRenderer (or delete the dead alignment UI — architectural decision: **keep fields, complete the mapping** to honor the existing settings form) | website-aggregate.ts:59-72, renderers.tsx:39-113, delete HeroBanner dead-code | S | M | — |

### HIGH

| # | Issue | Files | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| H1 | **Gallery video rendering** — store `videoUrl` not `imageUrl:""`; renderer reads `videoUrl`/`isVideo` | gallery/service.ts:31, renderers.tsx:141-173 | S | M | — |
| H2 | **Timeline images** — TimelineRenderer renders `imageUrl`; edit-drawer uses MediaUploadField; don't null images on blank | renderers.tsx:226-251, milestones-manager.tsx:319-322, milestone.actions.ts:139 | S | M | — |
| H3 | **Testimonials avatar + rating** — add avatar upload + edit action; renderer renders avatar + stars | testimonials actions/service/page, renderers.tsx:292-324 | S | M | — |
| H4 | **Course/service persistence** — write `metadata` (imageUrl/category/duration); un-hardcode course price; add update/delete; wire admin UI (or explicitly defer these areas) | courses/service.ts:48, courses/service.ts:41-52, services/service.ts, admin/courses/page.tsx, admin/services/page.tsx | M | M | — |
| H5 | **Publish custom-domain revalidation** — revalidate both subdomain and customDomain in publish and afterContentChange | publishing/service.ts:214-220, content-change.ts:32-36 | S | L | — |
| H6 | **Publish all blocks per section** — map every slot, not just `slots[0]` | publishing/service.ts:163-169 | S | M | — |
| H7 | **Builder visibility toggle** — call `markDirty()`/immutable update in `toggleVisibility` | section-manager.tsx:194-200 | S | M | — |
| H8 | **Builder theme path** — write selected theme to `Website.themePackageId` (not `Page.theme`); reconcile `neon-dark` vs `com.creatos.neon-dark` IDs; ThemeCard active state | workspace.tsx:92-95, theme.actions.ts, schema.prisma:98, personalizer.ts:186, resolver-new.ts:44-49 | M | H | — |
| H9 | **Builder artifact-first load** — drop `tryLoadFromArtifact` (or only use it pre-first-publish) so DB pages are the source of truth | builder.actions.ts:27-54 | S | M | — |
| H10 | **Version restore UI** — add restore button to StorefrontStatusCard wired to `rollbackToVersion` (after C1) | StorefrontStatusCard.tsx:175-196, publish.actions | S | M | C1 |
| H11 | **Checkout unique-order race** — use a generated idempotency key / nullable+unique-partial for razorpayOrderId, or create order after Razorpay returns order_id | checkout.actions.ts:61, schema.prisma:365 | S | M | — |
| H12 | **Webhook product-path hardening** — amount verification, durable BillingEvent dedup, surface errors to Razorpay (retry) | route.ts:63-80 | S | M | — |
| H13 | **Health engine correctness** — products check uses PUBLISHED+isActive+!archived; align `done` with `score>=100`; fix publish href; add orders/revenue check; render all 15 checks | engine.ts:54,81-91, dashboard-page.tsx:146 | S | M | — |
| H14 | **Acquisition classifier** — add film/media keywords; de-weight generic "business"; enforce confidence threshold + manual-review fallback; pass category/industry into provisioning | intelligence/types.ts:177-193, niche-detector.ts, acquisition/acquire.actions.ts:90-106, provisioning-service.ts:26-50 | M | M | — |

### MEDIUM

| # | Issue | Files | Effort | Risk | Depends on |
|---|---|---|---|---|---|
| M1 | Profile `avatarAssetId/bannerAssetId` preserved through validator + UI | validators.ts:10-22, profile/service.ts | S | M | — |
| M2 | Render influencer_data fields (contact/location) or remove | website-aggregate.ts, profile form | S | L | — |
| M3 | Product edit-drawer shows existing images | products-page.tsx:39-55 | S | L | — |
| M4 | AssetReferences for product/hero/milestone/gallery/games uploads + delete guard end-to-end | ImageManager.tsx:53, settings-form, milestones-manager, media.actions | M | M | — |
| M5 | Resolve all storefront media via `resolveUrls` (or document raw-URL contract) | website-aggregate.ts:50-169 | M | M | — |
| M6 | Delete dead uploaders (10 items, §6.3) + orphaned dashboard/commerce/content-entity/media-registry code | §4.3 inventory | S | L | — |
| M7 | FAQ admin UI (create/edit/delete) | faq actions + page | S | L | — |
| M8 | Uniform `afterContentChange` (uploadAsset too) + remove misleading `revalidatePath("/")` in settings actions | media.actions.ts:14-53, settings.actions.ts:96-97,142-143 | S | L | — |
| M9 | Single source for `profileCompletion` (include SEO, or drop the metric); reconcile the 5 health scorers into one | dashboard/service.ts:33-34, engine.ts, lib/dashboard/*, builder-overview.actions.ts:386-408 | S | L | — |
| M10 | Hero empty-field clearing (allow `null` on empty string) | settings.actions.ts:81,120, settings.service.ts:91-96 | S | M | — |
| M11 | `razorpayOrderId`/`BillingEvent` for product orders; `planCode` default hardening | route.ts:38,63-80 | S | L | H12 |
| M12 | Footer links model + renderer (or document as out-of-scope) | LayoutEngine.ts:203-204, FooterRenderer | S | L | — |
| M13 | Media processing worker start (or remove QUEUED queue) | media/processing/*, service.ts:92 | M | L | — |

### LOW

| # | Issue | Files | Effort |
|---|---|---|---|
| L1 | `RegistryCache`/`IntelligenceCache` TTL/eviction | lib/registry/cache.ts, ai/cache.ts | S |
| L2 | Domain attach revalidation | domain.actions.ts | S |
| L3 | ISR decision: tags + custom-domain coverage + `unstable_cache` on storefront reads | page.tsx, publishing/service.ts, content-change.ts | M |
| L4 | Ctrl+S no-op fix; builder store reactivity | commands.ts:82-87, workspace.tsx:87-112 | S |
| L5 | Delete `VideoCarousel` hardcoded IDs | public/VideoCarousel.tsx | S |
| L6 | `MEDIA_STORAGE_PROVIDER` explicit in env files | .env* | S |
| L7 | Cover/banner naming standardization | blueprint/types.ts, business-types.ts, Brand | S |

**Aggregate effort:** ~19 S, ~10 M, ~3 L → roughly **1.5–2.5 focused engineering weeks**, dominated by C5/M4/M5/H8/H14.

---

## Appendix — Verified execution traces (reference)

- **Storefront read:** middleware → `[domain]/page.tsx:14-25` → `getPublishedPageData` (published.service.ts:13-34) → `publishSnapshotService.getLive` (snapshot.ts:84-94) → `mergeLiveContent` (live-content.ts:17-31) → `websiteAggregateService.build` (website-aggregate.ts:12-186) → `layoutEngine.resolve` (LayoutEngine.ts:11-23) → `DataBoundRenderer` → registry renderer.
- **Content write (live):** editor → action → repository/service → Prisma row → `afterContentChange` (content-change.ts:22-49) → revalidate `/<storeRoot>` + layout.
- **Publish (presentation):** `publishWebsite` (publish.actions.ts:23) → `publishingService.publish` (service.ts:81-230) → `builderService.load` DB rows → aggregate + theme + nav → `createPublish` vN (publishing-repository.ts:12-39) → revalidate `/`, `/admin/dashboard`, `/${subdomain}`.
- **Builder load:** `loadBuilderPages` (builder.actions.ts:47-61) → artifact-first (`builder_artifact` Setting) → else DB `Page/Section/Block`.
- **Rollback (broken):** `rollbackToVersion` (builder.actions.ts:106-117) → `publishingService.rollback` (service.ts:310-335) → `snapshot.ts:39-74` reads `data.canonical` (never present) → `{pages:[]}` → `builderService.save(_,[])` deletes pages.
- **Aggregate mappings:** identity=Brand+asset-resolve (:50-58,171-183) · hero=hero_data subset (:59-72) · products=findPublished (:73-83) · gallery (:84-93) · links (:94-99) · seo (:100-103) · testimonials=setting (:104-113) · faq=setting (:114-119) · timeline (:120-127) · games (:128-134) · contentFeed (:135-143) · courses=offering.type course (:144-156) · services=offering.type coaching (:157-168).
- **`markChangesPending`:** defined publishing/service.ts:232-249; called only builder.actions.ts:83; flips only `live→draft`.
