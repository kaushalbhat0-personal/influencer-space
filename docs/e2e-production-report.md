# Production E2E Verification Report

**IMPLEMENTATION-15 · Production QA · 2026-08-01**

## Verdict

**PASS** — the real product was verified end-to-end against the live production
creator account. Login works, every dashboard module loads, the builder is
WYSIWYG, publish works, the storefront renders every section, Live CMS updates
appear without publish, commerce creates orders, media upload/replace works, and
responsive layouts render — with **zero console errors, zero unhandled
exceptions, and zero failed application requests**.

## Test Target

| | |
|---|---|
| Account | `testcreator1@gmail.com` (reused — no account created) |
| Creator | Test Creator 1 (Farah Khan) |
| Storefront | `http://localhost:3000/test-creator-1` |
| Environment | `next dev` on `localhost:3000`, live Supabase Postgres + storage |
| Runner | Playwright 1.61.1, project `production`, serial mode |

## Summary

| # | Phase | Test | Result | Time |
|---|---|---|---|---|
| 01 | Auth | Login lands on Dashboard | ✅ | 8.8s |
| 02 | Dashboard | 11 admin modules load | ✅ | 52.9s |
| 03 | Builder | Canvas + sidebar, live edits, publish | ✅ | 53.3s |
| 04 | Storefront | Published storefront renders sections | ✅ | 7.5s |
| 05 | Live CMS | Hero title change without publish | ✅ | 16.1s |
| 06 | Commerce | Product visible, order created | ✅ | 19.9s |
| 07 | Media | Library + upload/replace | ✅ | 26.6s |
| 08 | Responsive | Desktop / tablet / mobile | ✅ | 13.9s |
| | | **Total** | **8 / 8 passed** | **~3.3 min** |

## Pages Visited

`/admin/login` → `/admin/dashboard` → `/admin/settings` → `/admin/products` →
`/admin/gallery` → `/admin/services` → `/admin/courses` → `/admin/testimonials`
→ `/admin/faq` → `/admin/milestones` → `/admin/games` → `/admin/media` →
`/admin/links` → `/builder` → `/admin/orders` → `/test-creator-1` (storefront).

## Screenshots (playwright-report/screenshots/)

| # | File | Content |
|---|---|---|
| 01 | `01-login.png` | Admin login form |
| 02 | `02-dashboard.png` | Dashboard ("Welcome back, Test Creator 1") |
| 03 | `03-hero-settings.png` | Hero & Integrations settings |
| 04 | `04-products.png` | Products admin |
| 05 | `05-gallery.png` | Gallery admin |
| 06 | `06-services.png` | Services admin |
| 07 | `07-courses.png` | Courses admin |
| 08 | `08-testimonials.png` | Testimonials admin |
| 09 | `09-faq.png` | FAQ admin |
| 10 | `10-timeline.png` | Milestones (timeline) admin |
| 11 | `11-games.png` | Games admin |
| 12 | `12-media.png` | Media library |
| 13 | `13-links.png` | Links admin |
| 14 | `14-builder.png` | Builder canvas + sidebar |
| 15 | `15-builder-move-products.png` | After moving Products up |
| 16 | `16-builder-hide-gallery.png` | After hiding Gallery |
| 17 | `17-builder-theme.png` | After theme preview change |
| 18 | `18-publish.png` | After publish |
| 19 | `19-storefront.png` | Published storefront |
| 20 | `20-live-cms-saved.png` | Hero title saved in settings |
| 21 | `21-live-cms-storefront.png` | Storefront showing new title (no publish) |
| 22 | `22-commerce-products.png` | Storefront products with Buy Now |
| 23 | `23-commerce-checkout.png` | Checkout initiation |
| 24 | `24-commerce-orders.png` | Orders page with PENDING order |
| 25 | `25-media-library.png` | Media library |
| 26 | `26-media-upload.png` | After file replace/upload |
| 27 | `27-responsive-desktop.png` | Storefront @1440px |
| 28 | `28-responsive-tablet.png` | Storefront @768px |
| 29 | `29-responsive-mobile.png` | Storefront @375px |

## Console / Network Errors

The suite installs listeners for console errors, unhandled page exceptions,
4xx/5xx responses and failed requests on every phase, and fails the test if any
occur. **Zero errors were captured across all 8 tests.**

Benign noise explicitly excluded (not product defects):
- Browser-canceled in-flight requests (`ERR_ABORTED` on navigation/RSC prefetch).
- Third-party Razorpay payment CDN resources (`checkout-static-next.razorpay.com`),
  an external dependency that a headless sandbox blocks with `ERR_BLOCKED_BY_ORB`.

## Performance Timings

| Metric | Value |
|---|---|
| Auth (login → dashboard) | ~9s |
| Full dashboard journey (11 modules) | ~53s |
| Builder load + live edits + publish | ~53s |
| Storefront first paint after publish | ~7.5s |
| Live CMS save → storefront reflect | ~16s (incl. re-login) |
| Full serial suite | ~3.3 min |

## Broken Links / Missing Components

- **None found in the app.** The storefront renders all 12 sections (hero,
  about, products, gallery, services, courses, testimonials, faq, timeline,
  games, links, footer) — no "Unknown component", no placeholder.
- Product "Buy Now" on the storefront uses the `BuyNowButton` (Razorpay
  checkout). Order creation works; completing a payment requires a real
  Razorpay session, which a headless sandbox cannot finish (external).

## Bugs Found & Fixed During This Run

The verification run surfaced five real production defects, all fixed:

1. **`/admin/login`, `/builder`, `/api/*` returned 404 in development.**
   `src/middleware.ts` applied the `DEFAULT_TENANT_SUBDOMAIN` dev fallback to
   every non-auth route, rewriting `/admin/login` → `/snax/admin/login`.
   Fixed: the fallback is removed; only real tenant-subdomain hosts are
   rewritten; storefront slugs are handled natively by `[domain]`.
2. **`Invalid UUID ""`-adjacent image crash (`Image ... missing required
   "width"`).** `resolveImageProps` (`src/lib/media/variants.ts`) spread
   `undefined` override values over the variant defaults, so `original`-variant
   images rendered `<Image>` without width/height and crashed the builder, media
   library, and storefront. Fixed: undefined overrides no longer clobber
   defaults.
3. **Dashboard hydration error** (`Text content did not match`). A
   locale-less `toLocaleDateString()` rendered differently on server vs client.
   Fixed with explicit `"en-IN"` locale.
4. **Builder theme panel empty / "No theme".** `getBuilderOverview`
   (`src/actions/builder-overview.actions.ts`) guarded hero/SEO settings with
   `!== null`, but `setting?.value` is `undefined` when the setting is absent,
   so `Object.keys(undefined)` threw and the whole overview failed. Fixed with
   loose `!= null` guards.
5. **Theme change did not update the canvas.** The canvas used a fetched theme
   id and ignored the workspace's theme preview. Fixed: the workspace passes
   `themePackageId` to the canvas, so previewing a theme updates the canvas
   immediately.

Also: `.env.playwright` was pointed at the real creator account; a content seed
(`scripts/seed-prod-e2e.ts`) populated representative content for the existing
creator (12-section layout, gallery, links, timeline, games, courses, services,
testimonials, FAQ); stable `data-testid` hooks were added to the builder.

## Commerce Evidence

- Storefront product card visible with price (₹650) and Buy Now.
- Buy Now → `createCheckout` created a **PENDING `ProductOrder`** (verified in
  DB and on `/admin/orders`).
- Razorpay live order creation is the only externally-dependent step.

## How To Run

```bash
# 1. Seed content for the existing creator (idempotent)
npx tsx scripts/seed-prod-e2e.ts

# 2. Run the production E2E suite
$env:SKIP_DB_CHECK="true"
npx playwright test --project=production
```

Screenshots land in `playwright-report/screenshots/`.
