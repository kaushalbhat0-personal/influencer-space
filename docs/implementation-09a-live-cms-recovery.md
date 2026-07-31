# IMPLEMENTATION-09A — Live CMS & Storefront Synchronization Recovery

**Type:** Implementation. LIVE CONTENT phase only (Rule 1 compliance).
**Date:** 2026-07-31
**Status:** Complete. Verified.
**Source of truth:** `docs/audit-01-live-cms-storefront-synchronization.md`.
**Out of scope (deferred to 09B+):** Builder, publishing lifecycle, versioning, rollback, theme system, layout system, navigation, preview, acquisition, website health, business intelligence, blueprint engine, runtime engine.

---

## 1. Architecture Summary

Unchanged architecture. Content writes stay LIVE; the storefront rebuilds the aggregate on every request (`mergeLiveContent` → `websiteAggregateService.build`). This phase closed every **integration gap** in that chain:

```
Editor → server action → live table → afterContentChange() → revalidate subdomain + custom domain
                                                              → next request rebuilds aggregate → renderer
```

New shared media primitives (single canonical path, Rule 3):

```
MediaField (single) / MediaFieldMulti (array) ──► uploadAsset / listAssets / replaceAsset / removeAssetReference
        └── MediaPickerDialog (choose existing + search + filter + upload)
```

Every feature now routes uploads through `uploadAsset` (canonical `MediaService.upload`), can **choose existing** from the library, **replace**, **remove**, and previews inline.

---

## 2. Files Changed

### New files
- `src/components/shared/MediaField.tsx` — canonical single-media field (upload / choose-existing / replace / remove / preview; dereferences old asset on change).
- `src/components/shared/MediaFieldMulti.tsx` — canonical multi-media field (bulk upload / choose-existing / remove; dereference on remove).
- `src/components/shared/MediaPickerDialog.tsx` — library picker with search, image/video filter, upload.
- `src/components/gallery/GalleryAddDrawer.tsx` — gallery create UI (multi upload, caption, status, featured).
- `src/app/admin/services/_components/services-manager.tsx` — Services CRUD.
- `src/app/admin/courses/_components/courses-manager.tsx` — Courses CRUD.
- `src/app/admin/faq/_components/faq-manager.tsx` — FAQ CRUD.
- `src/features/courses/validators.ts` — course schema (price, imageUrl, category).

### Modified files
- `src/lib/publishing/content-change.ts` — revalidates BOTH subdomain and custom domain.
- `next.config.mjs` — `serverActions.bodySizeLimit: 25mb` (hero video uploads previously exceeded the 1MB default → the upload action boundary failed).
- `src/modules/tenant/application/website-aggregate.service.ts` — hero tagline + 4 alignment fields; services imageUrl/category.
- `src/types/snapshot.ts` — `HeroContent.tagline` + alignment; `services` imageUrl/category.
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — services branch passes imageUrl/category.
- `src/lib/registry/components/renderers.tsx` — HeroRenderer (tagline + responsive alignment via `HeroMedia`); GalleryRenderer (videos); TimelineRenderer (images); TestimonialsRenderer (avatar + rating); ServicesRenderer (image + category).
- `src/actions/settings.actions.ts` — empty strings → JSON null (hero fields now clearable).
- `src/services/settings.service.ts` — `patchHeroData` JSONB merge removes null keys.
- `src/features/profile/{validators,service,components/profile-page}.tsx` — `avatarAssetId`/`bannerAssetId` preserved; `brandColors` persisted to `brand_config`; avatar via MediaField.
- `src/features/products/components/products-page.tsx` — edit drawer loads existing images; passes entityId.
- `src/components/products/ImageManager.tsx` — library picker + entityId references + assetId tracking.
- `src/features/gallery/components/gallery-page.tsx` — Add Media button + drawer + reorder (move left/right) wired to `updateGalleryOrder`.
- `src/components/gallery/{GalleryCard,GalleryEditor}.tsx` — move controls; editor media replace.
- `src/lib/gallery/service.ts` (no change needed — create already stores videoUrl).
- `src/app/admin/milestones/_components/milestones-manager.tsx` — create + edit image via MediaField (replaces text URL).
- `src/features/testimonials/{actions,service,types,components/testimonials-page}.tsx` — edit action + avatar upload.
- `src/app/admin/games/_components/games-form.tsx` — logo via MediaField.
- `src/features/services/{types,validators,service,actions}.ts` — full CRUD + metadata (imageUrl/duration/category).
- `src/features/courses/{types,validators,service,actions}.ts` — full CRUD + price + metadata.
- `src/app/admin/services/page.tsx`, `src/app/admin/courses/page.tsx`, `src/app/admin/faq/page.tsx` — CRUD admin UI.
- `src/actions/link.actions.ts` — `afterContentChange` on all 5 mutations.
- `src/actions/media-library.actions.ts` — `removeAssetReference` / `createAssetReference` actions.
- `src/components/shared/MediaField.tsx` / `MediaFieldMulti.tsx` — dereference old asset on remove/replace (delete protection).
- `src/app/api/cron/sync-socials/route.ts` — `afterContentChange` per synced tenant.
- `src/lib/supabase.ts` — removed dead `uploadImage`/`deleteImage`/`listImages`/`getPublicUrl`.
- `src/lib/media/index.ts` — removed legacy `AssetRegistry`/`AssetResolver` re-exports.

### Deleted (dead code, verified 0 importers)
- `src/components/shared/MediaUpload.tsx`
- `src/components/shared/MediaUploadField.tsx` (superseded by MediaField)
- `src/components/shared/AssetPicker.tsx`
- `src/components/admin/ImageUploader.tsx`
- `src/components/ui/ImageUpload.tsx`, `src/components/ui/VideoUpload.tsx`, `src/components/ui/image-uploader.tsx`
- `src/lib/media/registry.ts`, `src/lib/media/resolver.ts`
- `src/features/links/actions.ts` (dead duplicate; active path is `src/actions/link.actions.ts`)

---

## 3. Integration Summary

| Area | Create | Update | Delete | Upload | Choose existing | Replace | Live storefront |
|---|---|---|---|---|---|---|---|
| Hero | ✅ form | ✅ form | ✅ clear | ✅ MediaField | ✅ | ✅ | ✅ |
| Profile | ✅ form | ✅ autosave | ✅ | ✅ MediaField | ✅ | ✅ | ✅ |
| Products | ✅ | ✅ | ✅ | ✅ ImageManager | ✅ | ✅ | ✅ |
| Gallery | ✅ **NEW** | ✅ | ✅ | ✅ MediaFieldMulti | ✅ | ✅ | ✅ |
| Testimonials | ✅ | ✅ **NEW edit** | ✅ | ✅ avatar | ✅ | ✅ | ✅ |
| Timeline | ✅ | ✅ | ✅ | ✅ MediaField | ✅ | ✅ | ✅ |
| Games | ✅ | ✅ | ✅ | ✅ MediaField | ✅ | ✅ | ✅ |
| Services | ✅ **NEW full CRUD** | ✅ | ✅ | ✅ MediaField | ✅ | ✅ | ✅ |
| Courses | ✅ **NEW full CRUD** | ✅ | ✅ | ✅ MediaField | ✅ | ✅ | ✅ |
| FAQ | ✅ **NEW admin** | ✅ **NEW** | ✅ **NEW** | — | — | — | ✅ |
| Links | ✅ | ✅ | ✅ | — | — | — | ✅ **NOW wired** |
| Content Feed | cron sync | pin/hide/delete | ✅ | — (raw sync URLs) | — | — | ✅ **NOW revalidates** |
| SEO | ✅ autosave | ✅ | — | — | — | — | ✅ (verified live via `mergeLiveContent`) |

---

## 4. Fixed Mappings

| # | Field | Before | After |
|---|---|---|---|
| 1 | Hero `tagline` | written to `hero_data`, dropped at aggregate | mapped → LayoutEngine → HeroRenderer |
| 2 | Hero `videoDesktopAlignment`/`videoMobileAlignment`/`imageDesktopAlignment`/`imageMobileAlignment` | dropped | mapped → HeroRenderer via `responsiveAlignmentClass` (mobile + `sm:` desktop object-position) |
| 3 | Hero empty-string clears | sticky (couldn't clear fields) | empty string → JSON null → key removed from `hero_data` |
| 4 | Profile `brandColors` | silently discarded | persisted to `brand_config` (primaryColor/secondaryColor/accentColor), merged preserving other keys |
| 5 | Profile `avatarAssetId`/`bannerAssetId` | stripped by validator | preserved → persisted → aggregate asset resolution |
| 6 | Services `imageUrl`/`category`/`duration` | never persisted (metadata never written) | written to `Offering.metadata`, mapped through aggregate → renderer |
| 7 | Courses `price` | hardcoded `0` | form-driven |
| 8 | Courses `imageUrl`/`category` | never persisted | written to `Offering.metadata` |
| 9 | Gallery video items | `url=""` + renderer ignored video | renderer uses `videoUrl`/`isVideo` |
| 10 | Timeline milestone images | mapped but never rendered | TimelineRenderer renders `imageUrl` |
| 11 | Testimonials `avatarUrl`/`rating` | mapped but never rendered | renderer renders avatar + stars |
| 12 | Links Manager saves | no storefront invalidation | `afterContentChange` on all 5 mutations |
| 13 | `afterContentChange` | revalidated `customDomain ?? subdomain` (one) | revalidates **both** |

---

## 5. Fixed Renderers

- **HeroRenderer** — renders `tagline`; media uses `HeroMedia` + `responsiveAlignmentClass` (focal-point alignment now honored).
- **GalleryRenderer** — renders video items (`videoUrl` + `isVideo`); falls back to image placeholder.
- **TimelineRenderer** — renders milestone `imageUrl`.
- **TestimonialsRenderer** — renders `avatarUrl` (round image) and `rating` (stars).
- **ServicesRenderer** — renders `imageUrl` (card image) and `category` badge.
- **CoursesRenderer** — already rendered image/category/price (now receives real data).

---

## 6. Media Integration Summary

- **One canonical upload path:** `MediaField`/`MediaFieldMulti` → `uploadAsset` → `MediaService.upload`. The MediaPickerDialog reuses `listAssets`/`uploadAsset`.
- **All features can now upload, choose existing, replace, and remove** (Hero, Profile, Products, Gallery, Timeline, Games, Courses, Services, Testimonials).
- **Delete protection works:** every upload with a known entity (edit modes + hero + profile) creates an `AssetReference`; MediaField/Multi **dereference** on remove/replace so legitimately-removed media can be deleted from the library, while in-use media is guarded (`MediaReferenceError`).
- **Reference coverage note:** create-mode uploads (entity id unknown at upload time) do not create a reference until the entity is saved and re-edited. Documented as a known limitation; the reference is created on first edit.
- **Cleanup:** 9 dead/duplicate upload implementations removed (`MediaUpload`, `MediaUploadField`, `AssetPicker`, `ImageUploader`, 3 UI pickers, `media/registry`, `media/resolver`); dead supabase helpers removed.

---

## 7. Live Synchronization Summary

Every content save now satisfies: **Database → afterContentChange → revalidation → live storefront** (no Publish).

- Content actions already wired (products, profile, testimonials, faq, seo, gallery, milestones, games, services, courses, content-feed, settings) — verified in audit; retained.
- **Newly wired:** `src/actions/link.actions.ts` (all 5 mutations), cron social sync (`sync-socials`), hero/profile/gallery/... uploads via the content save that follows.
- **Custom domains:** `afterContentChange` revalidates both `/{subdomain}` and `/{customDomain}`.
- **SEO:** `generateMetadata` reads the live-merged snapshot (`mergeLiveContent` replaces `content` incl. `seo`) — live confirmed.
- **Upload failures:** `serverActions.bodySizeLimit: 25mb` removes the default 1MB limit that broke hero video uploads; `MediaField` guards and surfaces errors instead of crashing.

---

## 8. Verification Checklist

- [x] `npx tsc --noEmit` — clean.
- [x] `npm run build` — passes (all routes compile, storefront `[domain]` included).
- [x] `npm run test` — **29 failed / 1631 passed** — identical to the verified pre-existing baseline; zero new regressions, no reductions.
- [x] Feature suites: products, courses, services, testimonials, faq, gallery, links, dashboard, layout-engine, provisioning — 162/162 passing.
- [x] Every content area updates storefront immediately (live aggregate + revalidation).
- [x] Media Library reusable across all features (single canonical path).
- [x] No broken mappings remain for the live-content surface (hero tagline/alignment, services/courses metadata, gallery video, timeline image, testimonial avatar/rating).

---

## 9. Remaining Deferred Items (Builder/Publishing only — 09B+)

- Builder section visibility toggle persistence, multi-block section publishing, builder theme → `Website.themePackageId`, theme ID reconciliation.
- Publishing lifecycle: rollback fix, preview/live version collision, custom-domain publish revalidation.
- Version history restore UI.
- Acquisition classifier improvement, website health scoring consolidation.
- Media: asset references for create-mode uploads, `resolveUrls` for all storefront media, processing worker.
- Content Feed: Media Library picker for manual feed items (feed is currently sync-generated).
