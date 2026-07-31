# IMPLEMENTATION-07 — Live CMS Integration & Storefront Synchronization Audit

**Type:** Audit only. No implementation, refactor, or redesign.
**Date:** 2026-07-31
**Status:** Findings verified against source. Ready for IMPLEMENTATION-08.

---

## Executive Summary

The platform architecture is complete and healthy at the framework level. The remaining launch blockers are **integration gaps** — features exist but are not connected end-to-end. Four systemic findings dominate:

1. **Content is not LIVE (systemic).** The storefront (`src/app/[domain]/page.tsx`) renders **only the last PublishSnapshot** (`src/services/published.service.ts:13-33` → `publishSnapshotService.getLive`). Every Creator CMS write goes to live tables (Product, Gallery, TimelineEvent, Settings, Brand…) but **no content action** regenerates the snapshot, calls `markChangesPending`, or revalidates the `/[domain]` path. Result: every content edit is invisible until the creator manually clicks Publish in the Builder. This is a direct violation of Rule 1 (Content is LIVE). Verified: `revalidatePath` appears 100+ times, all admin-scoped; the only storefront-path revalidation is `src/lib/publishing/service.ts:217`.

2. **Dead render paths.** A complete live-DB data pipeline exists (`src/services/public.service.ts:111` `getPublicPageData` + `src/lib/data/loaders.ts`) but has **zero consumers**. Snapshot data for `games`, `contentFeed`, `courses`, `services` is captured at publish (`src/modules/tenant/application/website-aggregate.service.ts:21-33`) but `LayoutEngine.composeSectionConfig` (`src/lib/storefront/layout-engine/LayoutEngine.ts:150-240`) has **no branches** for them — the sections render empty.

3. **Media is fragmented.** One canonical service exists (`src/lib/media/service.ts` → `src/actions/media.actions.ts` → `MediaUploadField.tsx`), but 5+ dead/broken uploaders coexist (direct-supabase, stateless pickers), two wired uploads are **broken by folder validation** (`milestones`, `replace` not in `ALLOWED_FOLDERS` at `src/lib/media/validator.ts:40-49`), and product images are never uploaded at all (`ImageManager.tsx` never calls `.upload()`).

4. **Commerce never resolves.** Admin-created products default to `DRAFT` with no publish control (`src/features/products/service.ts:49`; admin form has no status toggle), the storefront has **no buy button** (BuyNowButton + both ProductGrids are imported nowhere), and checkout requires an admin/tenant session (`requireTenant` in `src/actions/checkout.actions.ts`), so guests cannot buy.

Onboarding (Phase F) has 7 HIGH-severity UX/correctness issues including a publish-failure polling leak, duplicate YouTube fetch, and `onboarding_completed` written before publish can succeed.

---

# DELIVERABLE 1 — Live CMS Integration Report (Phase A)

For each Creator CMS area: **save implementation → autosave → API → DB write → cache invalidation → storefront refresh → missing wiring → broken mutations.**

Legend: **LIVE** = flows to storefront without Publish (correct per Rule 1). **FROZEN** = requires manual Publish.

| Area | Action (file:line) | Autosave | DB write | Invalidation | Storefront read | Verdict |
|---|---|---|---|---|---|---|
| Hero | `updateHeroData` `src/actions/settings.actions.ts:57`, `updateHeroPartial` `:107` | No — manual save (`settings-form.tsx:178`) | `SettingsService.patchHeroData` `src/services/settings.service.ts:83` (raw SQL JSONB merge on `setting` key `hero_data`) | `revalidatePath("/")`+`/admin/settings` `:95-96,140-141` — **does not match `/[domain]`** | `snapshot.content.hero` via `LayoutEngine.ts:157-161` | **FROZEN** |
| About/Profile | `updateProfile` `src/features/profile/actions.ts:17` | **YES** (`profile-page.tsx:10,28`, `use-autosave.ts` 3s debounce) — 1 of 2 autosave areas | `prisma.brand.update` `src/features/profile/service.ts:70` + `setting` key `influencer_data` `:74-94` | `/admin/profile` only `:24` | `snapshot.content.identity` | **FROZEN** + **CRITICAL data loss**: `input.brandColors` sent by `profile-page.tsx:100-111` is **dropped** — `service.ts:60-72` never writes colors, `brand_config` never updated. Colors lost on refresh. |
| Products | `createProduct`/`updateProduct`/`deleteProduct` `src/features/products/actions.ts:23,34,43` | No | `prisma.product.create` `service.ts:40` — `status: input.status ?? "DRAFT"` `:49` | `/admin/products` only `:30,39,48` | `snapshot.content.products` `LayoutEngine.ts:167-179`; live loader `loadProductsForStorefront` `loaders.ts:26` **dead** | **FROZEN** + **DRAFT default** |
| Services | `createService` `src/features/services/actions.ts:17` (0 callers) | No | `prisma.offering.create` type `"coaching"` `service.ts:25` | `/admin/services` only `:24` | **NONE** — no `services.` branch in LayoutEngine; `pricing` builtin has no data binding | **FROZEN + DEAD** (never renders) |
| Courses | `createCourse` `src/features/courses/actions.ts:22` (0 callers) | No | `prisma.offering.create` type `"course"` `service.ts:41` — **price hardcoded `0`** `:48` | `/admin/courses` only `:28` | **NONE** — no `courses.` branch; `CoursesRenderer` gets `[]` | **FROZEN + DEAD** (never renders, zero-price) |
| Gallery | `GalleryService` CRUD/reorder/publish `src/lib/gallery/service.ts:16-180` via `src/actions/gallery.actions.ts:12-72` | No | `prisma.galleryImage` create/update/delete | `/admin/gallery` every method `:45-180` | `snapshot.content.gallery` `LayoutEngine.ts:180-191`; live loader **dead** | **FROZEN** (has publish lifecycle, but separate from storefront snapshot) |
| Timeline | `createMilestone`/`updateExistingMilestone`/`removeMilestone` `src/actions/milestone.actions.ts:47,97,153` | No | `prisma.timelineEvent` `:74,:131,:167` | `/admin/milestones` only `:87,143,170` | `snapshot.content.timeline` `LayoutEngine.ts:228-236` | **FROZEN** |
| Games | `createGame`/`updateGame`/`deleteGame` `src/actions/games.actions.ts:26,70,114` | No | `prisma.game` `:51,:96,:117` | `/admin/games` only `:63,107,119` | Snapshot **includes** games (`website-aggregate.service.ts:21-33`) but LayoutEngine has **no `games.` branch** | **CRITICAL — feature dead on storefront** |
| Testimonials | `createTestimonial`/`deleteTestimonial` `src/features/testimonials/actions.ts:17,28` | No | `setting` upsert key `"testimonials"` `service.ts:42` | `/admin/testimonials` only `:24,34` | `snapshot.content.testimonials` `LayoutEngine.ts:209-218` (works **after** publish) | **FROZEN** |
| FAQ | `createFAQItem`/`deleteFAQItem` `src/features/faq/actions.ts:17,28` | No | `setting` upsert key `"faq"` `service.ts:28-32` | `/admin/faq` only `:24,34` | `snapshot.content.faq` `LayoutEngine.ts:219-227` | **FROZEN** |
| Social Links | UI calls legacy `createLink(tenantId, formData)` `src/actions/link.actions.ts:44`; feature module exposes `createLink(input)` `src/features/links/actions.ts:16` | No | `prisma.affiliateLink` `link.actions.ts:65` | `/admin/links` `:78,111,138,187,216`; affiliate variant `:66-67,113-114,141-142,175-176` → `/admin/affiliates` + `"/"` (still not `/[domain]`) | `snapshot.content.links` `LayoutEngine.ts:192-202` | **FROZEN** + **signature mismatch** |
| SEO | `updateSEO` `src/features/seo/actions.ts:16` | **YES** (`seo-page.tsx:8,25`) — 2 of 2 autosave areas | `setting` upsert key `"seo"` `service.ts:25-29` | `/admin/seo` only `:22` | `generateMetadata` reads `snapshot.content.seo` `LayoutEngine.ts:61-93` | **FROZEN** (autosaved SEO invisible until republish) |
| Business Profile/Settings | `updateSocialChannels` `settings.actions.ts:152` (0 callers), `updateApiKeys` `:182` (0 callers), `updateThemeConfig` `:233` | No | `tenant.update` `settings.service.ts:102-113,147-158`; `patchThemeConfig` raw SQL `:120-137` (**deprecated** path) | `/admin/settings` `:211`; `/admin/appearance`+`"/"` `:259-260` | `theme_config` likely excluded from snapshot (theme flows via `theme.actions.updateTheme` → themeAdapter) | **FROZEN** + dead actions; `updateWorkspaceSettings` `settings.service.ts:182` dead code |
| Media Library | `uploadAsset`/`deleteAsset` `src/actions/media.actions.ts:13,54`; `listAssets`/`deleteAssetFromLibrary`/`purgeAsset`/`replaceAsset` `media-library.actions.ts:15-89` | n/a | `MediaService.upload/delete` → `Asset`/`AssetReference` | **NONE** — no revalidatePath in either file | URLs referenced by other entities; no direct render | **MEDIUM** — delete has no reference guard → dangling URLs |
| Content Feed (sync) | `togglePinItem`/`toggleHideItem`/`deleteFeedItem` `src/actions/content-feed.actions.ts:38,68,98` | No | `contentFeedItem` via `src/services/content-feed.service.ts` (cron `src/app/api/cron/sync-socials/route.ts`) | `/admin/settings/content` only `:58,88,113` | Snapshot **includes** feed (`website-aggregate.service.ts:33`) but LayoutEngine has **no `contentFeed` branch** | **CRITICAL — feature dead on storefront** |
| Domains | `attachCustomDomain`/`removeCustomDomain`/`checkDomainStatus`/`verifyDomain` `src/actions/domain.actions.ts:29,80,112,149` | No | `tenant.customDomain` | `/admin/settings/domain` only `:65,102,134,166` | `[domain]/page.tsx:14` resolves tenant by customDomain | **LOW** |

### Broken mutations (area-level)
- **Profile colors lost** — `src/features/profile/service.ts:60-72` ignores `brandColors` (data loss).
- **Hero fields cannot be cleared** — `settings.actions.ts:80` strips empty strings before write.
- **Games/ContentFeed/Services/Courses** — snapshot includes the data, LayoutEngine never composes it → renderers receive empty `resolvedData`.
- **Invisible sections still render** — `[domain]/page.tsx:59` maps all sections ignoring `visible` flag (`LayoutEngine.ts:257`).
- **Media delete has no reference guard** — `media.actions.ts:54-65`.

---

# DELIVERABLE 2 — Storefront Synchronization Report (Phase B)

## 2.1 The canonical (intended) chain

```
Editor ──► Server Action ──► Repository/Service ──► DB ──► [Cache invalidation] ──► Runtime ──► Storefront
  src/features/*        src/actions/*            src/services|modules/tenant/infrastructure    next/cache     LayoutEngine ──► [domain]/page.tsx
```

## 2.2 Where synchronization stops — exact trace

**Trace 1: Edit a product (the most common action)**
1. `products-page.tsx:54-68` `handleSave` → `createProduct` (`src/features/products/actions.ts:23-32`)
2. → `productService.create` → `prisma.product.create` with `status:"DRAFT"` (`src/features/products/service.ts:40-57`)
3. → `revalidatePath("/admin/products")` (`actions.ts:30`) — **stops here**
4. Storefront `[domain]/page.tsx:13-19` → `getPublishedPageData(tenant.id,"live")` → `publishSnapshotService.getLive` (`src/lib/publishing/snapshot.ts:84-94`) returns the **last published snapshot**
5. `snapshot.content.products` was captured at last `publish()` by `websiteAggregateService.build` → `productRepository.findPublished` (`status:"PUBLISHED"`, `isActive:true`) (`src/modules/tenant/infrastructure/product-repository.ts:82-87`)
6. **Break A (publish gate):** new product is DRAFT → excluded even if snapshot refreshed.
7. **Break B (snapshot source):** no action regenerates the snapshot; storefront shows old snapshot forever.

**Trace 2: Edit hero / profile / gallery / timeline / testimonials / faq / seo / links**
Same shape: action writes live table → revalidates admin route only → snapshot is stale. There is **no code path** from any content save to either (a) regenerating the snapshot, (b) `markChangesPending`, or (c) `revalidatePath("/${subdomain}")`.

**Trace 3: Publish (the only working path)**
1. `StorefrontStatusCard.tsx:44-58` `handlePublish` → `publishWebsite` (`src/actions/publish.actions.ts:23-34`)
2. → `publishingService.publish` (`src/lib/publishing/service.ts:81-230`) — loads builder pages + `websiteAggregateService.build` + nav, resolves theme, writes new `PublishSnapshot`, `revalidatePath("/", "layout")`, `revalidatePath("/admin/dashboard")`, `revalidatePath("/${tenant.subdomain}")` (`:215-217`)
3. → full page reload (`StorefrontStatusCard.tsx:50`) → storefront now shows the snapshot.
4. **Break C (custom domain):** `revalidatePath("/${subdomain}")` does not cover `customDomain` — but storefront is dynamic today, so this is latent.

## 2.3 Root-cause list (ranked)

| # | Severity | Root cause | Evidence |
|---|---|---|---|
| B1 | **CRITICAL** | Storefront renders **only** the publish snapshot; content tables are never re-read per request | `[domain]/page.tsx:13-19,54`; `published.service.ts:26-33`; `snapshot.ts:84-94` |
| B2 | **CRITICAL** | No content action triggers snapshot regeneration, `markChangesPending`, or storefront revalidation | 100+ `revalidatePath` all admin-scoped; only `publishing/service.ts:217` hits storefront; `markChangesPending` called only from `builder.actions.ts:83` |
| B3 | **HIGH** | Products default `DRAFT` and admin UI has no status/publish control | `products/service.ts:49`; `products-page.tsx:146-166` |
| B4 | **HIGH** | Dead live-data pipeline (would satisfy Rule 1) never wired to the storefront | `public.service.ts:111` + `loaders.ts:13-102` — zero consumers |
| B5 | **HIGH** | LayoutEngine lacks `games.`/`contentFeed`/`courses.`/`services.` composition branches | `LayoutEngine.ts:150-240` vs `website-aggregate.service.ts:13-35` |
| B6 | **MEDIUM** | Social links dual-path signature mismatch (`createLink(tenantId, formData)` vs `createLink(input)`) | `link.actions.ts:44` vs `features/links/actions.ts:16` |
| B7 | **MEDIUM** | `updateThemeConfig` writes deprecated `theme_config`; real theme path is `theme.actions.updateTheme` | `settings.actions.ts:233`; `settings.service.ts:115-137` |

---

# DELIVERABLE 3 — Media Platform Report (Phase C)

## 3.1 Canonical service

`MediaService` (`src/lib/media/service.ts`, singleton `mediaService` :341) — `upload()` :30, `replace()` :101, `delete()` :135, `resolveUrls()` :278, `getPublicUrl()` :268, Asset/AssetReference CRUD via `src/lib/media/repositories/*`. Provider: **Supabase** bucket **`influencer-images`** (`providers/supabase.ts:4`), path `{tenantId}/{folder}/{uuid}.{ext}` (`service.ts:59`). Validation (`validator.ts`): image/video/document MIME gates, **`ALLOWED_FOLDERS = profile, gallery, hero, products, timeline, games, feed, general`** (`:40-49`). URL resolution = stored public URL; no signed URLs. DB model: `Asset` (`prisma/schema.prisma:1080`) + `AssetReference` (:1118, `entityType` convention `"timeline"` :1122).

## 3.2 Upload-site inventory

| Site (file:line) | Canonical? | Folder | DB write | CDN URL | Status |
|---|---|---|---|---|---|
| `src/actions/media.actions.ts:33` `uploadAsset` | **Y** | formData `folder` | Y | Y | **THE canonical path** |
| `src/components/shared/MediaUploadField.tsx:51` | **Y** | prop `folder` | Y | Y | Canonical bridge; no revalidatePath |
| `src/features/settings/components/settings-form.tsx:205,236` (hero video/poster) | Y | `hero` | Y | Y | Works |
| `src/features/profile/components/profile-page.tsx:57` (avatar) | Y | `profile` | Y (creates AssetReference) | Y | Works |
| `src/app/admin/milestones/_components/milestones-manager.tsx:195-198` | **BROKEN** | `milestones` **not in allow-list** | writes empty string `imageUrl` | N | **Upload always rejected** |
| `src/app/admin/media/_components/media-library.tsx:285-291` | **BROKEN** | `replace` **not in allow-list**; `onUploadComplete` no-op | N | N | **"Replace file" is a no-op** |
| `src/components/shared/AssetPicker.tsx:116-118` | Broken | `library` not in allow-list | — | — | Unused + broken |
| `src/components/shared/MediaUpload.tsx:32` | N | direct supabase | N | Y | Dead (no importers) |
| `src/components/admin/ImageUploader.tsx:25` + `products/ImageManager.tsx` | N | direct supabase | N | N | **Active but broken: `uploaderRef.current.upload()` never called** (`ImageManager.tsx:29`); product images never reach storage/DB |
| `src/components/ui/image-uploader.tsx`, `ImageUpload.tsx`, `VideoUpload.tsx` | N | — | N | N | Dead stateless pickers |
| `src/lib/supabase.ts:38-72` `uploadImage`/`deleteImage`/`listImages` | N | direct | N | Y | Dead (0 callers) |
| `src/services/storage.service.ts:21` | N (deprecated) | — | N | N | Only `affiliate.actions.ts:131,134` |

## 3.3 Folder-name inconsistencies

| Inconsistency | Locations |
|---|---|
| **`timeline` vs `milestones`** (flagship) | allow-list `timeline` (`validator.ts:45`); uploader sends `milestones` (`milestones-manager.tsx:198`) → rejected; `AssetReference.entityType` = `"timeline"` (`schema.prisma:1122`); public field named `milestones` (`public.service.ts:97`); storefront module `timeline.*` (`LayoutEngine.ts:228`) |
| `replace` not allowed | `media-library.tsx:287` |
| `library` not allowed | `AssetPicker.tsx:116` |
| `profile` folder vs `avatarUrl`/`avatarAssetId` columns vs `avatar` variant | `profile-page.tsx:60`; `profile/service.ts:13`; `variants.ts:23` |
| `cover` vs `banner` | `coverUrl` (`website-blueprint/types.ts:39`, `business-types.ts:88`) vs `bannerUrl` (`creators/types.ts:5`, Brand model); no upload for either |
| `hero` folder holds both video and poster | `settings-form.tsx:208,239` |
| No folders for **services, courses, testimonials** | no upload components exist |
| Product images as JSON `images` array in Product table vs gallery table | `ProductEditor.tsx:88` vs `galleryImage` table |

## 3.4 Missing wiring / runtime

- **Storefront reads raw URL strings, never the resolver** — hero video/poster (`website-aggregate.service.ts:58-59`), product `imageUrl` (`LayoutEngine.ts:173`), gallery (`:183-189`), timeline (`:234`), games `logoUrl` (`:660`), testimonials `avatarUrl` (`:216`). Only brand avatar/banner go through `mediaService.resolveUrls` (`website-aggregate.service.ts:141-153`).
- **Uploads never create AssetReferences outside profile** — hero, milestone, gallery, product uploads don't link Asset → no "Used In", no delete protection (`MediaReferenceError` unreachable).
- **Signed-URL fragility** — all URLs frozen public URLs at upload; bucket made private → everything breaks. `next/image` remotePatterns only allow `**.supabase.co` (`next.config.mjs:12`).
- **`VideoCarousel` hardcoded** (`VideoCarousel.tsx:7-28`) — not DB-driven.
- **Media processing dead** — `src/lib/media/processing/*` never started by any worker.
- **`MEDIA_STORAGE_PROVIDER` unset** in all `.env*` — provider selection falls through to supabase-by-key-presence (`providers/factory.ts:32-39`); mis-set to `local` breaks `next/image`.

---

# DELIVERABLE 4 — Commerce Report (Phase D)

## 4.1 Data model

- `Product` (`schema.prisma:330-357`): DB default `status "PUBLISHED"` (:340) — but app-layer overrides to `DRAFT`. Has `isActive` :344, `isFeatured` :345, `archivedAt` :346. **No `publishedAt`.**
- `Offering` (courses/services, `:1164-1185`): `type` `"course"|"digital_product"|"membership"|"coaching"`, `status "draft"` **lowercase** (:1171), **no `imageUrl`**.
- `ProductOrder` `:359-380`; `Purchase` `:1188-1211`.
- Website-level publish = `PublishStatus` `:130-144` (`state`, `liveVersion`) + `PublishSnapshot` `:148-160` — **the only "published" concept the storefront reads**.

## 4.2 Per-entity lifecycle & root causes

| Entity | Create | Publish control | Storefront | Root cause of "stays draft / doesn't sync" |
|---|---|---|---|---|
| **Products** | `createProduct` → `productService.create` `status:"DRAFT"` (`products/service.ts:49`); admin drawer has **no image input, no status toggle, no publish** (`products-page.tsx:146-166`) | **NONE** — no `publish()`/`markChangesPending`, unlike Gallery (`gallery/service.ts:102-120`) | Snapshot only, filtered `status:"PUBLISHED", isActive:true` (`product-repository.ts:82-87`); rendered by `ProductsRenderer` (`renderers.tsx:176-210`) — **no Buy button** | Admin default DRAFT + no publish toggle + storefront = snapshot |
| **Services** | `createService` (`services/actions.ts:17`) **0 callers**; admin page read-only ("coming soon") | none | **none** — absent from aggregate + LayoutEngine | dead code |
| **Courses** | `createCourse` (`courses/actions.ts:22`) **0 callers**; **price `0` hardcoded** (`courses/service.ts:48`); admin page "Full LMS coming soon" (`admin/courses/page.tsx:14`) | none | **none** — no `courses.` branch; `CoursesRenderer` always empty | no data path |
| **Digital downloads** | `Product.type="digital"` (admin default) | — | — | **no fulfillment/delivery**: `ProductOrder` has no file link; `verifyPayment` only flips status (`checkout.actions.ts:147-153`); no download endpoint |
| **Memberships** | `Product.type="membership"` (a label only) | — | — | **no recurring billing / access gating**; sold via one-time checkout; `BillingSubscription` (:792-812) is the creator's own SaaS plan, not fan memberships |

## 4.3 Why the storefront doesn't update (commerce-specific)

1. **Snapshot source (CRITICAL):** storefront reads `PublishSnapshot.content.products`, captured only during `publish()`; product edits never trigger publish/revalidate → stale.
2. **Products are DRAFT by default (HIGH):** `products/service.ts:49`; no UI to change it.
3. **No buy path (HIGH):** `BuyNowButton` (`[domain]/_components/buy-now-button.tsx`) + `components/storefront/ProductGrid.tsx` + `components/public/ProductGrid.tsx` are **imported nowhere**; `ProductsRenderer` cards have no CTA (`renderers.tsx:188-202`).
4. **Guests can't buy (HIGH):** `createCheckout` calls `requireTenant()` (`checkout.actions.ts:23-35`) — throws for anonymous fans.
5. **Razorpay webhook only handles SaaS `planCode`/`workspaceId`** (`api/webhooks/razorpay/route.ts:36-60`) — never completes `ProductOrder`; product orders rely solely on client `verifyPayment`.
6. **Dashboard "Ready to publish" false positive:** `hasProducts = metrics.productCount > 0` counts DRAFT products (`dashboard-page.tsx:170`; `dashboard/service.ts:8,49-50`) — invites publishing a site with zero live products.
7. **Dead commerce infra:** `src/lib/commerce/purchases.ts`, `registry.ts` (`offeringRegistry`), and `providers/` (only `interface.ts`) are exported but unused.
8. **Broken dashboard links:** quickstart → `/admin/products/new`, `/admin/testimonials/new` (`dashboard/service.ts:114,116`) → 404.
9. **Duplicate product implementation:** `src/lib/content/entities/product/*` is an in-memory second implementation disconnected from the Prisma `Product` table.

---

# DELIVERABLE 5 — Dashboard Report (Phase E)

## 5.1 Findings

| Sev | Finding | Evidence |
|---|---|---|
| **HIGH** | **Publish badge desync:** `markChangesPending` wired only to Builder saves (`builder.actions.ts:83`). Product/gallery/SEO/etc. edits never flip status → card says "Live" while snapshot is stale. "Changes pending" branch (`StorefrontStatusCard.tsx:40-42`) unreachable except via builder. | `publishing/service.ts:232-249` |
| **MEDIUM** | **Premature "live" at provisioning:** `provisioningService.provision` calls `createStatus(website.id,"live")` inside transaction (`provisioning-service.ts:184`) before any snapshot exists → `admin/layout.tsx:39` shows "Live" while card shows Draft; lifecycle treats `state==="live"` as published (`lifecycle/service.ts:59`). | `provisioning-service.ts:184` |
| **MEDIUM** | **"View site"/"Preview Draft" links always render** even when no snapshot → 404 (`StorefrontStatusCard.tsx:143-170`; `[domain]/page.tsx:54`). | |
| **MEDIUM** | **Avg order value skewed:** revenue sums only PAID/COMPLETED (`service.ts:9-12`) but orderCount counts all (`:51`); `avgOrder = revenue/orderCount` (`dashboard-page.tsx:65-67`). | |
| **MEDIUM** | **Checklist accuracy gaps:** product step counts inactive/archived (`service.ts:104-105,114`); SEO step counts mere existence of a setting (`:117`). Disagrees with health engine (`health/engine.ts:54,89`). | |
| **MEDIUM** | **Orphaned components/hooks:** `DashboardHero`, `HealthScore`, `ProgressChecklist`, `QuickStartGuide`, `ActivityFeed`, `ActivityTimeline` (all of `src/components/dashboard/*`), `useDashboardStats/useGallery/useProducts/usePlatformStatus` (`src/hooks/dashboard/*`), `src/lib/dashboard/*` — all imported nowhere. Intended publish-aware hero exists only as dead `DashboardHero.tsx`. | |
| **LOW** | No polling; dashboard data frozen in `useState` until navigation/reload (`dashboard-page.tsx:52`); `useAsyncState.ts:50` mountedRef never reset. | |
| **LOW** | No premium surface; features are action-layer-gated, not hidden (Rule 4 OK). Plan hardcoded `"creator_free"` (`onboarding.actions.ts:184`). | |
| **LOW** | All 28 sidebar nav links + 11 quick cards resolve (verified). Only quickstart CTAs broken (see D8). | |

## 5.2 Onboarding UX (Phase F) — folded here for completeness

| Sev | Finding | Evidence |
|---|---|---|
| **HIGH** | **Entire pipeline blocks in ONE awaited server action** — import→generate(AI)→provision→builder-init→publish sequentially; UI only polls coarse stages. No streaming. | `onboarding.actions.ts:119-308` |
| **HIGH** | **Duplicate YouTube fetch:** preview step already imports the profile; `runCreatorGeneration` re-fetches because `existingProfileResult` param (`:62`) is never passed (`page.tsx:189-195` → `:120`). | |
| **HIGH** | **`onboarding_completed` written BEFORE publish can succeed** — `markOnboardingComplete` at `:209-213` precedes publish `:253-276`; failed publish still yields lifecycle `PUBLISHED`. | also `provisioning-service.ts:184`; `lifecycle/service.ts:59` |
| **HIGH** | **Error-step "Go to Dashboard" skips session refresh** (`page.tsx:257-262`) → JWT lacks tenantId → bounce back to `/onboarding` → duplicate-tenant risk. | `require-tenant.ts:33-45` |
| **HIGH** | **Polling leak on retryable publish failure:** session status never set to failed/completed (`onboarding.actions.ts:263-271`) → 1500ms poll never stops (`page.tsx:184-186`); "Try Again" overwrites `pollRef` without clearing interval (`page.tsx:147-170`) → orphaned intervals hammer DB forever. | |
| **MEDIUM** | **2s artificial delay** on success screen (`page.tsx:211-213`); **dead "complete" step** (`:566-606`) never reached. | |
| **MEDIUM** | Stages `knowledge_intelligence…golden_validation` marked completed in bulk, never show `running` (`onboarding.actions.ts:124-152,297`). | |
| **MEDIUM** | **Acquisition flow never writes `onboarding_completed`** — `acquireAndProvision` (`acquire.actions.ts:64-161`) → imported users bounce back to `/onboarding`. | `require-tenant.ts:40-45`; `lifecycle/service.ts:61-67` |
| **MEDIUM** | **Blank wizard during acquisition fetch:** `handleAcquired` → `goTo("preview")` while `acquisitionResult` null → empty card (`create-storefront-wizard.tsx:56-78,188`). | |
| **MEDIUM** | **Mid-wizard refresh unrecoverable** — state is in-memory (`page.tsx:90-106`); re-run provisions duplicate tenant. | |
| **LOW** | `avatarUrl` mapped from `creator.bio` (`onboarding.actions.ts:45`) — thumbnail dropped at source. | |

---

# DELIVERABLE 6 — Business Intelligence Migration Report (Phase G)

## 6.1 Current classification model (three parallel tracks)

| Track | Field | Cardinality | Live in flow? |
|---|---|---|---|
| **Legacy (active)** | `CreatorProfile.niche` → `Niche` union (16 options, `src/lib/personalization/niche.ts:1-5`) | single | **YES** — drives provisioning: `personalizer.ts:180-186` → `NICHE_TEMPLATES[niche]` + `NICHE_THEMES[niche]` → template+theme for every new tenant |
| **Legacy (active)** | `BusinessProfile.category` (`src/lib/acquisition/business-types.ts:12-29`, 16 flat ids) | single | **Partial** — captured in manual wizard (`manual-wizard.tsx:124`); **dropped in auto-provision** (`acquire.actions.ts:89-105` sends no category/industry/audience/goals) |
| **Persisted (write-only)** | `CreatorIntelligence` (`schema.prisma:1019-1034`): `niche`+`subNiche`+`audience`+`brandPersonality`+`brandTone`+`visualStyle`+`contentStyle`+`websiteGoal`+`monetization`+`recommendedTheme`+`recommendedTemplate`+`recommendedSections`+`seoKeywords` | single + array | **Written by generation, never read back** for personalization |
| **Dormant modules** | `src/modules/website-blueprint/*`, `src/modules/business-intelligence/*` | single `category` | **ZERO consumers** — re-exported at `website-blueprint/index.ts:1-2`, `business-intelligence/index.ts:1-5`; no UI renders `RecommendationsPanel`/`calculateHealth`/`composeBlueprint` |

**Key fact:** there is **no `businessProfile` DB model** — `BusinessProfile` is in-memory only (`business-types.ts:75-91`).

## 6.2 Complete dependent list (what the single field drives)

- **`BusinessProfile.category`:** presets metadata (`website-blueprint/domain/presets.ts:25`), composition CTA logic (`composition-engine.ts:13,32`), theme-family recommendation (`recommendation-engine.ts:13-22`), template lookup (`templates.ts:5`), health scoring (`health-engine.ts:18`), completeness scoring (`acquisition/completeness.ts:27-28`), legacy conversion **drops it** (`business-types.ts:134`), manual wizard input (`manual-wizard.tsx:124`), auto-provision **ignores it** (`acquire.actions.ts:89-105`), showcase `inferCategory` keyword-guess (`showcase.service.ts:23,45-57`), template registry `getByCategory`/`inferFromName` (`template/registry.ts:235-249`).
- **`niche`:** live provisioning path (`personalizer.ts:185-186`, `provisioning-service.ts:134,164-170,245`), niche detection (`niche.ts`), AI profiling (`creator-profiler.ts:17-18`), onboarding persistence (`onboarding.actions.ts:47`), import adapters (`import/adapters/demo-seed.ts:37`), content generation vocabularies (`generation/content/registry.ts:8-19`), evaluation rules (`evaluation/rules/branding.ts:55`), AI cache keying (`ai/llm-engine.ts:57,118`), demo dataset (`testing/creator-dataset-v1.ts:441-492`), **platform-as-niche hack** (`provisioning-service.ts:164`: `niche: input.sourcePlatform || "general"`), theme registry filter (`theme/registry-new.ts:56`).

## 6.3 Migration impact (10-level hierarchy)

**Safe to enrich (non-breaking):**
- `CreatorIntelligence` — add `creatorType`, `industry`, `contentFormats`, `businessModel` via new additive migration (model already has `subNiche` array + 8 rich fields). Missing vs spec: exactly these 4.
- `BusinessProfile` TS interface — purely in-memory; type-only additions.
- Dormant blueprint/business-intelligence modules — extend freely.

**Breaks / needs care:**
1. `NICHE_TEMPLATES`/`NICHE_THEMES` + `personalizer.ts:185-186` (live provisioning) — must keep a single-primary-niche fallback or provisioning breaks for all new tenants. `NICHE_THEMES` already `@deprecated` (`niche.ts:36-39`).
2. `Template.category` + `templateRegistry.inferFromName` (`registry.ts:235-249`) — hard-coded 7 categories; builder section-manager admin-links map assumes old ids (`features/builder/components/section-manager.tsx:31-34`).
3. `showcase.service.ts:45-57` keyword inference — should read real category.
4. `onboarding.actions.ts:47` writes `category = niche` — must map 10-level fields.
5. UI single-field input (`manual-wizard.tsx:124`), `EMPTY_PROFILE` defaults.
6. Adapters `businessProfileToCreatorProfile` (`business-types.ts:114`, drops category) / `creatorProfileToBusinessProfile` (`:134`, zeroes category).
7. `acquireAndProvision` (`acquire.actions.ts:89-105`) must thread the hierarchy into `ProvisioningInput`.
8. Demo/seed surfaces (`demo/types.ts:12`, `creator-dataset-v1.ts`).

**Recommended migration order:** (1) additive `CreatorIntelligence` migration → (2) extend `BusinessProfile` TS + derived `category`/`niche` convenience fields so `personalizer`/`templateRegistry` keep working → (3) upgrade detectors to multi-value output → (4) wire dormant blueprint/BI modules into acquisition UI → (5) UI/adapters/showcase/demo last.

---

# DELIVERABLE 7 — Runtime Cache Report (Phase H)

## 7.1 Inventory

| Render path | Strategy | Effective? |
|---|---|---|
| Storefront `[domain]` | `export const revalidate = 60` (`page.tsx:11`) **but INERT** — reads `searchParams.preview` (`:52`, Dynamic API) → dynamic SSR every request | **No caching at all** |
| All responses | middleware `Cache-Control: no-store, no-cache…` (`middleware.ts:43`) | No CDN/edge cache |
| Storefront data | direct Prisma snapshot read (`published.service.ts:17-33`; `snapshot.ts:28-33,84-94`) | 2 DB round-trips/request |
| `/`, `/about`, `/faq` | static (build-time) | yes |
| `/contact`, `/showcase` | `force-dynamic` (`contact/page.tsx:4`, `showcase/page.tsx:5`) | dynamic |
| `/sitemap.ts` | ISR `revalidate=3600` (`sitemap.ts:5`) | ISR 1h |
| Admin/super-admin/API (84 routes) | `force-dynamic` | dynamic |
| Data loaders | direct Prisma; **zero `unstable_cache`** in src | none |
| External fetch (YouTube/social) | `next:{ revalidate: 3600 }` (`youtube-scraper.service.ts:64`, `social-api.service.ts:51,66`) | 1h |
| SEO metadata | `InMemoryMetadataCache` 5min (`seo/cache.ts:85`) | **dead code** (0 consumers) |
| AI intelligence | `IntelligenceCache` hash-keyed **no TTL** (`ai/cache.ts:10-30,73`) | unbounded |
| Registry | `RegistryCache` **no TTL/expiry** (`registry/cache.ts:20-75`) | unbounded |
| Generation artifacts | `GenerationCache` TTL 300s (`artifact-cache.ts:8`) | 5 min |

Counts: `revalidatePath` 100+; `revalidateTag` **0**; `unstable_cache` **0**.

## 7.2 Missing invalidation (ranked)

1. **[HIGH] Publish-state desync (the real gap, not a cache bug):** content actions mutate snapshot-captured tables without `markChangesPending` or storefront revalidate — dashboard says "Live", storefront shows old snapshot. Only `publishing/service.ts:215-217` invalidates the storefront path, and only `builder.actions.ts:83` marks pending.
2. **[MEDIUM] `revalidate=60` is inert:** `searchParams.preview` (`page.tsx:52`) + middleware `no-store` force per-request dynamic render. If `searchParams` is later removed or `generateStaticParams` added, ISR would activate and `service.ts:217` becomes load-bearing — including a **custom-domain gap** (only `/${subdomain}` revalidated).
3. **[LOW] `settings.actions.ts` revalidates `"/"`** (`:95-96,140-141,170-171,211,259-260`) — misleading; doesn't touch storefront.
4. **[INFO] `publish()` revalidations are redundant today** but the only correct invalidation if ISR is enabled.

## 7.3 In-process cache staleness

| Cache | TTL | Risk |
|---|---|---|
| `IntelligenceCache` (`ai/cache.ts:10-30,73`) | **none** | MED — profile-hash-keyed; stale after logic/prompt/model changes; unbounded |
| `RegistryCache` (`registry/cache.ts:20-75`) | **none** | LOW — static code-derived; `invalidate*` never wired |
| `GenerationCache` | 300s | LOW |
| YouTube provider | 24h | intentional (persisted) |

---

# DELIVERABLE 8 — Prioritized Implementation Plan

Ordering principle: launch blockers first (Rule 1 compliance + data loss + dead storefront features), then correctness, then UX, then architecture/migration.

## CRITICAL (launch-blocking)

| # | Issue | Files | Effort |
|---|---|---|---|
| C1 | **Make content LIVE.** Storefront must merge live content (Hero/Profile/Products/Gallery/Timeline/Testimonials/FAQ/Links/SEO/Media) with published presentation (Builder layout/theme/nav/sections). Recommended: wire `getPublicPageData`/`loaders.ts` live reads into `[domain]/page.tsx` content composition while layout/theme/nav stay snapshot-driven; or add a "content snapshot refresh" hook triggered by every content save. Do NOT ship with snapshot-only storefront. | `src/app/[domain]/page.tsx`, `src/services/published.service.ts`, `src/services/public.service.ts`, `src/lib/data/loaders.ts`, `src/lib/storefront/layout-engine/LayoutEngine.ts` | L (1-2d) |
| C2 | **Add `markChangesPending` + storefront `revalidatePath` to every content action** (profile, products, gallery, milestone, games, testimonials, faq, links, seo, settings/hero, media). Drives the dashboard "Changes pending" badge and future ISR correctness. | 11+ action files; add a shared helper (e.g. `afterContentChange(tenantId)`) | S (0.5d) |
| C3 | **Persist profile colors.** Write `brandColors`/`brand_config` in `profileService.updateProfile`; stop dropping `input.brandColors`. | `src/features/profile/service.ts`, `src/features/profile/components/profile-page.tsx` | S (0.5d) |
| C4 | **Fix product lifecycle:** default `PUBLISHED`-ish behavior per Rule 1 (content is live) OR add status toggle + publish action; fix `hasProducts` false positive; revalidate storefront on product CRUD. | `src/features/products/service.ts:49`, `products-page.tsx:146-166`, `dashboard-page.tsx:170` | M (1d) |
| C5 | **Add LayoutEngine composition for `games.`/`contentFeed`/`courses.`/`services.`** so already-captured snapshot data renders. | `LayoutEngine.ts:150-240`, `resolve-module.ts` (COMPAT_MAP), renderers | M (1d) |
| C6 | **Fix broken uploads:** allow `milestones` folder (or standardize on `timeline`), allow `replace`, wire media-library `onUploadComplete` → `replaceAsset`, and repair product image upload (`ImageManager` → canonical `MediaUploadField`). | `src/lib/media/validator.ts:40-49`, `milestones-manager.tsx:195-198`, `media-library.tsx:285-291`, `ImageManager.tsx:29`, `products-page.tsx` | M (1d) |
| C7 | **Add a Buy path on the storefront** (wire `BuyNowButton`/ProductGrids into rendered products) and make checkout guest-capable (drop `requireTenant` for anonymous, or create a fan session); complete `ProductOrder` in the Razorpay webhook. | `renderers.tsx:188-202`, `[domain]/_components/buy-now-button.tsx`, `checkout.actions.ts:23-35`, `api/webhooks/razorpay/route.ts:36-60` | L (2d) |

## HIGH

| # | Issue | Files | Effort |
|---|---|---|---|
| H1 | Fix onboarding publish-failure polling leak + orphaned intervals (set session failed/completed, clear interval on retry). | `onboarding.actions.ts:263-271`, `onboarding/page.tsx:147-187` | S |
| H2 | Error-step "Go to Dashboard" must call `/api/auth/refresh-session`; handle refresh failure gracefully. | `onboarding/page.tsx:257-262` | S |
| H3 | Pass `existingProfileResult` into `runCreatorGeneration` (remove duplicate YouTube fetch). | `onboarding/page.tsx:189-195`, `onboarding.actions.ts:62,120` | S |
| H4 | Move `markOnboardingComplete` AFTER successful publish. | `onboarding.actions.ts:209-213` | S |
| H5 | Write `onboarding_completed` in `acquireAndProvision` (super-admin/import path). | `acquire.actions.ts:64-161` | S |
| H6 | Fix broken quickstart links `/admin/products/new`, `/admin/testimonials/new`. | `dashboard/service.ts:114,116` | S |
| H7 | Fix avg-order skew (orderCount = paid-only or avg uses paid count). | `dashboard/service.ts:9-12,51`, `dashboard-page.tsx:65-67` | S |
| H8 | Wire a content-change → storefront revalidate helper (from C2) and use it in media actions too. | `media.actions.ts`, `media-library.actions.ts` | S |
| H9 | Guest checkout + webhook ProductOrder completion (from C7) split into standalone tasks if C7 deferred. | see C7 | M |
| H10 | Serialize/parallelize onboarding pipeline; stream stage updates so running states show; remove 2s delay; add loading guards on Try Again. | `onboarding.actions.ts:119-308`, `onboarding/page.tsx` | M |

## MEDIUM

| # | Issue | Files | Effort |
|---|---|---|---|
| M1 | Fix `provisioning-service.ts:184` premature `state:"live"` (create status after successful publish, not in provision tx). | `provisioning-service.ts:184` | S |
| M2 | Gate "View site"/"Preview Draft" links on existing snapshot/version. | `StorefrontStatusCard.tsx:143-170` | S |
| M3 | Checklist accuracy: active-only product count; SEO non-empty check. Align with health engine. | `dashboard/service.ts:104-117` | S |
| M4 | Wire dormant BI + blueprint modules OR explicitly defer; ensure auto-provision passes category/industry/audience/goals. | `acquire.actions.ts:89-105`, `website-blueprint/index.ts`, `business-intelligence/index.ts` | L |
| M5 | Add AssetReferences for hero/milestone/gallery/product uploads; reference-guard deletes. | `media.actions.ts`, `MediaUploadField` consumers | M |
| M6 | Resolve all storefront media through `mediaService.resolveUrls` (products/gallery/timeline/games/testimonials/hero). | `LayoutEngine.ts`, `website-aggregate.service.ts` | M |
| M7 | Delete/redirect dead media implementations (MediaUpload, AssetPicker, ui/* uploaders, supabase uploadImage, storage.service, registry/resolver). | 8 files | S |
| M8 | Consolidate social-links dual path (`createLink` signature mismatch). | `link.actions.ts`, `features/links/actions.ts`, `links-page.tsx` | S |
| M9 | `updateThemeConfig` → route through active themeAdapter; remove deprecated `theme_config` path. | `settings.actions.ts:233`, `settings.service.ts:120-137` | M |
| M10 | Fix `avatarUrl=bio` mapping; use channel thumbnail. | `onboarding.actions.ts:45` | S |
| M11 | Reconnect or remove orphaned dashboard components/hooks (DashboardHero, HealthScore, etc.). | `src/components/dashboard/*`, `src/hooks/dashboard/*` | S |
| M12 | Wire or delete `src/lib/commerce/*`, `offeringRegistry`, content-engine product duplicate. | `src/lib/commerce/*`, `src/lib/content/entities/product/*` | S |
| M13 | Remove invisible-section rendering (`visible` flag). | `[domain]/page.tsx:59` | S |

## LOW

| # | Issue | Files | Effort |
|---|---|---|---|
| L1 | Add TTL/eviction to `IntelligenceCache` + `RegistryCache`. | `ai/cache.ts`, `registry/cache.ts` | S |
| L2 | `revalidatePath("/")` cleanup in settings actions; document storefront dynamic behavior. | `settings.actions.ts` | S |
| L3 | Decide ISR future: if enabling, add `revalidatePath` for custom domains and consider `unstable_cache`/tags on storefront reads. | `[domain]/page.tsx`, `publishing/service.ts:217` | M |
| L4 | Domain attach revalidation for new custom domain route. | `domain.actions.ts` | S |
| L5 | Folder naming standardization pass (timeline/milestones, cover/banner, hero video/poster) + `MEDIA_STORAGE_PROVIDER` env explicit. | `validator.ts`, uploaders, `.env*` | S |
| L6 | Onboarding mid-wizard persistence/resume (in-memory state → session-backed). | `onboarding/page.tsx:90-106` | M |
| L7 | Wire media processing worker or remove dead queue. | `src/lib/media/processing/*` | M |

**Total:** ~19 S, ~10 M, ~4 L items. S≈0.5d, M≈1d, L≈1-2d → **~3-4 focused engineering weeks** excluding the BI migration (M4/M5 separate).

---

## Appendix — Verified execution traces (quick reference)

- **Storefront read chain:** `middleware.ts` (tenant-host rewrite) → `[domain]/page.tsx:13-19` → `getSnapshotData` → `published.service.ts:13-33` → `snapshot.ts:84-94` (`getLive` = last `PublishSnapshot`) → `LayoutEngine.resolve` → `DataBoundRenderer`. **No live-DB read exists in this chain.**
- **Publish chain (only path that updates the storefront):** `StorefrontStatusCard.tsx:44-58` → `publish.actions.ts` → `publishing/service.ts:81-230` → `websiteAggregateService.build(tenantId)` (snapshot the live tables) → `publishRepository.createPublish` → `revalidatePath(/{subdomain})` + reload.
- **Live pipeline (dead):** `public.service.ts:111` `getPublicPageData` → `loaders.ts` + `SettingsService.getHeroData` + `getContentFeed` → typed `PublicPageData`. **Zero callers.**
- **LayoutEngine content branches:** hero/about/products/gallery/links/footer/contact/newsletter/testimonials/faq/timeline (`LayoutEngine.ts:157-237`). **Missing:** games, contentFeed, courses, services.
- **`markChangesPending`:** defined `publishing/service.ts:232-249`; called **only** `builder.actions.ts:83`.
- **`onboarding_completed`:** written `onboarding.actions.ts:438` (before publish), read `lifecycle/service.ts:45`; **never written** by `acquire.actions.ts`.
