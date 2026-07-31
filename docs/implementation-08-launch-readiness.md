# IMPLEMENTATION-08 — Launch Readiness (Live CMS, Commerce, Media, Polish)

**Type:** Implementation.
**Date:** 2026-07-31
**Status:** Complete. Resolves the CRITICAL/HIGH findings of `implementation-07-live-cms-integration-audit.md`.
**Verification:** `npx tsc --noEmit` clean; `npm run build` passes; test suite improved 2 (29 failed / 1631 passed; all remaining failures are the verified pre-existing baseline).

---

## Architecture (approved)

```
Creator CMS (live tables) ──► afterContentChange() ──► revalidatePath("/<domain>")
Builder Snapshot (layout/theme/nav/sections) ──► mergeLiveContent() ──► Runtime composition ──► Storefront
```

- **Content is LIVE (Rule 1):** every content edit is visible on the storefront immediately, without Publish.
- **Builder presentation stays draft** until Publish (snapshot-driven layout/theme/nav/sections).
- Content changes do NOT call `markChangesPending` — only Builder saves do.

---

## PHASE B — `afterContentChange()` shared helper (C2/H8)

Created `src/lib/publishing/content-change.ts`:

- Looks up tenant `subdomain`/`customDomain`, calls `revalidatePath("/${storeRoot}")` + layout.
- Accepts `{ revalidateDashboard?: boolean }` option.
- Intentionally does **not** call `markChangesPending` (documented in header).

Wired into every content action:

- `src/features/{products,services,courses,profile,links,testimonials,faq,seo}/actions.ts`
- `src/actions/{milestone,games,gallery,content-feed,settings,media,media-library}.actions.ts`
- Settings wired at 4 spots: `updateHeroData`, `updateHeroPartial`, `updateTenantChannels`, appearance theme update.

## PHASE A — Storefront live content merge (C1)

Created `src/lib/storefront/live-content.ts` with `mergeLiveContent(snapshot, tenantId)`:

- Calls `websiteAggregateService.build(tenantId)` and overlays live content onto the snapshot.
- Falls back to baked snapshot content on error (`logger.warn`).

Wired into `src/app/[domain]/page.tsx` via the existing double-cast pattern (`layoutEngine.resolve` input).

## PHASE F — LayoutEngine composition branches (C5)

Added branches in `LayoutEngine.composeSectionConfig` for:

- `games.` (id, name, logoUrl, description, genre)
- `contentFeed.` (platform, mediaType, url, thumbnailUrl, caption, permalink)
- `courses.` (title, description, price, imageUrl, category)
- `services.` (title, description, price, duration)

All guarded with `?? []` so absent aggregates never throw. Supporting changes:

- `resolve-module.ts` COMPAT_MAP: added `games`, `contentFeed`, `services` (NOT `content_feed` — test contract requires unknown IDs pass through unchanged).
- `ServicesRenderer` added to `renderers.tsx`; `services.default` registered in `builtins.ts`.
- `ComponentCategory` extended with `"services"`.
- `WebsiteAggregate` extended with `courses[]`/`services[]`; `websiteAggregateService.build` now loads `prisma.offering` (status `published`) and maps `course`/`coaching` rows.

## PHASE D — Media standardization (C6)

- `src/lib/media/validator.ts` `ALLOWED_FOLDERS` now includes `milestones` and `library`.
- Rewrote `src/components/products/ImageManager.tsx` to call `uploadAsset` server action (entityType `product`) instead of the dead direct-Supabase path — product images now reach storage/DB.
- Media library replace flow now uses a real `ReplaceFileControl` calling `replaceAsset(assetId, formData)` with success/error feedback + `onReplaced` refresh (`folder="replace"` no-op removed).

## PHASE E — Commerce (C4, C7, H9)

- `features/products/service.ts` create defaults `status: "PUBLISHED"` (was `DRAFT`) + auto-slugs.
- Admin `ProductsPage` takes `tenantId` prop; adds type + status selectors; `ImageManager` wired (images synced to form `images`/`imageUrl`).
- `checkout.actions.ts`: removed `requireTenant()`; resolves `tenantId` from `product.tenantId`; query filters `isActive: true, status: "PUBLISHED", archivedAt: null`. Guests can now buy.
- `verifyPayment` no longer requires session.
- Razorpay webhook `payment.captured` now completes `ProductOrder` (`PENDING → COMPLETED` with `razorpayPaymentId`) from `notes.productId` + `notes.orderId`.
- Storefront buy button: `BuyNowButton` wired into `ProductsRenderer` product cards (`renderers.tsx`), passing `productId`/`productName`/`imageUrl`; graceful fallback when a product has no id.

## PHASE G — Dashboard fixes (H6, H7, M3)

`src/features/dashboard/service.ts`:

- `orderCount` now counts only `PAID`/`COMPLETED` (matches revenue → fixes avg-order skew).
- `hasProducts` (profile completion + health) counts `status: "PUBLISHED"` only — DRAFT/ARCHIVED no longer trigger "Ready to publish" false positives.
- `getHealthChecks` / `getQuickStartSteps` product counts filter `status: "PUBLISHED"`.
- Quickstart hrefs fixed: `/admin/products/new` → `/admin/products`, `/admin/testimonials/new` → `/admin/testimonials` (404 → real routes).

Test fixes (were pre-existing failures from an incomplete mock):

- Added missing `website` + `publishSnapshot` mocks to `dashboard.test.ts`; product mocks now include `status`.

## PHASE C — Autosave

Audited all Creator forms. The only forms fitting the autosave pattern (controlled inputs + dirty state + debounced save) are profile and SEO — both already use `useAutosave`. Remaining content surfaces (products, services, courses, links, testimonials, faq, gallery, games, milestones, content-feed, settings) are list-CRUD or sectioned explicit-save forms where autosave does not apply without a redesign (out of scope per "Zero redesign"). No further conversion needed.

## PHASE K — Remaining polish (M1, M2, M10, M13, H1, H2, H4, H5)

- **M1** — Provisioning no longer creates `publishStatus` as `"live"` before any snapshot exists; creates `"draft"` instead (`provisioning-service.ts:184`). Updated the provisioning unit test to match.
- **M2** — `StorefrontStatusCard` gates "Visit website" on a live snapshot and "Preview Draft" on a live/preview snapshot (no more 404 links for never-published tenants).
- **M10** — Onboarding preview `avatarUrl` now uses the real YouTube channel thumbnail (`channelMeta.thumbnailUrl`) instead of mapping from `creator.bio`.
- **M13** — `[domain]/page.tsx` filters sections where `visible === false` (previously rendered invisible sections).
- **H4** — `markOnboardingComplete` moved to AFTER successful publish (was written before publish could fail).
- **H5** — `acquireAndProvision` now writes `onboarding_completed` after successful publish (import path no longer bounces users back to `/onboarding`).
- **H1** — Onboarding wizard clears the polling/timer intervals on success, error, and retry; server marks the session `failed` on retryable publish failure.
- **H2** — Error-step "Go to Dashboard" calls `/api/auth/refresh-session` before redirecting.

## Deferred (documented)

- **H3** — Pass `existingProfileResult` into `runCreatorGeneration` to avoid the duplicate YouTube fetch. Requires threading the full `ImportProfileResult` through the client (client currently holds only a trimmed preview shape); deferred as a performance-only improvement.

---

## Regression status

- `npx tsc --noEmit` — clean.
- `npm run build` — passes.
- `npm run test` — 29 failed / 1631 passed. All 29 failures are the verified pre-existing baseline (published, capabilities, platform-api, identity, storefront-resolution, theme-packages, theme-system, theme-transactions, platform-workflows, policies-constraints, properties). Two previously-failing dashboard `getMetrics` tests now pass (incomplete mock fixed).
- Storefront route `/[domain]` still builds (~12 kB).
