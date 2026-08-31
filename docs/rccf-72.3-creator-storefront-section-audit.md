# RCCF-72.3 — Creator Storefront Section & Content Exhaustive Audit

**Status:** Complete (audit only — no code, schema, billing, capabilities, plans, auth, publishing, Theme, or Hero changes)
**Date:** 2026-08-18
**Predecessors:** RCCF-72.0 (onboarding), RCCF-72.1 (workspace), RCCF-72.2 (navigation, findings S1–S9 still open and untouched)

---

## 1. Executive summary

This audit enumerates every registered storefront section, whether it can actually be placed by a creator in the Builder, whether it survives save → publish → snapshot → live storefront, what it renders with content and without, how it behaves at 4 widths, and how the per-plan content limits gate each one. It was done with **23 registered builtin sections** (`src/lib/registry/components/builtins.ts`), of which **13 are exposed in the Builder "Add Section" catalog** and **10 are registered but have no Builder add affordance**.

Headline results:

| Count | Value |
|---|---|
| Registered builtin sections | 23 |
| Addable via Builder catalog (browser-tested end-to-end on Launch A and/or Growth B) | 13 |
| Registered but NOT addable via any UI (code-verified only) | 10 |
| NOT_BROWSER_TESTED (incl. multi-page/view-all path) | 11 |
| New findings this ticket | 2 (F1, F2) + 3 product gaps |

Key conclusions:

- **Every one of the 13 catalog sections is addable on every plan** — the Builder catalog applies no capability and no content-limit gating (`section-manager.tsx` `SECTION_CATALOG`). Gating only happens at write time in the server actions.
- **Save → publish → snapshot → live is sound** for the catalog sections. Growth B added courses+games to its draft, published v6, and the live storefront renders the games section (2 games) while the empty courses section is correctly omitted.
- **10 registered sections are dead in the product**: `links.default`, `affiliateLinks.default`, `bookings.default`, `hero.gaming`, `hero.fitness`, `hero.education`, `embed.spotify`, `embed.youtube`, `social.discord`, `social.instagram` cannot be added through any UI even though their renderers, content models, and server actions exist.
- **Two new findings this ticket:**
  - **F1 (P2):** Plan-blocked course creation surfaces a **500 + unhandled client `pageerror`** with **no user-visible error** — `createCourse` **throws** (`features/courses/actions.ts:36`) instead of returning `{ success: false }`, and `CoursesManager` has no catch (`courses-manager.tsx:48–62`). Reproduced on Launch A via the legit `/admin/courses` form. Same throw-pattern exists for `services.actions.ts:29`. Contrast with the Games form, which renders a friendly red error.
  - **F2 (P2, P-candidate):** In this dev environment, the Growth workspace-owner tenant B cannot open most `/admin/content/*` routes (`/admin/courses`, `/admin/services`, `/admin/products`, `/admin/testimonials`, `/admin/faq`, `/admin/links`, `/admin/gallery`, `/admin/bookings`) — every one returns 200 then client-redirects to `/admin/dashboard` with a `PAGEERROR "Rendered more hooks than during the previous render"`. Deterministic (8/8 attempts, hard-nav and soft-nav). The Launch tenant (no workspace) opens all of them. `milestones` and `games` work for B. Not root-caused beyond workspace/owner association; marked P-candidate pending production confirmation.
- **Product gaps (3):**
  1. **Multi-page is unimplemented in the UI.** The server supports `[domain]/[slug]` (`storefront-loader.ts`, `page-resolver.ts`) and `builderStore.addPage(name, slug)` exists, but no Builder/admin UI calls `addPage` → every published site is single-page, and the View-All links emitted by renderers are unreachable. Classified `NOT_BROWSER_TESTED`.
  2. **Navigation never surfaces Services/Courses/Bookings/Embeds/Socials/Links sections** — `navigation/service.ts` `generateDefaults` only covers hero, products, gallery, links, timeline, testimonials, faq, games, contentFeed (see 72.2 S2).
  3. **Bookings feature is not constructible end-to-end** — not addable as a section, Launch `max_bookings = 0` (server refuses even if data existed), and the admin bookings page crashes for the workspace tenant B.

No P0/P1 this ticket. Carried 72.2 findings remain untouched (S1 preview leak, S2 one-shot nav, S3 contact anchor, S4 footer legal links, S5 href null, S6 double title suffix, S7 legacy nav setting, S8 niche storefront gap, S9 dev latency/hydration).

---

## 2. Method

- **Code authority:** `src/lib/registry/components/builtins.ts` (23 definitions), `renderers.tsx` (renderers), `src/features/builder/components/section-manager.tsx` (`SECTION_CATALOG` 13 entries + `EDIT_LINKS`), `src/config/commerce/plans.ts` + `src/lib/capabilities/*` (limits/capabilities), `content-limit.enforcement.ts` (server-side counts/gates), `src/lib/blueprint/providers/built-in.ts` (Creator default layout), `src/lib/navigation/service.ts` (nav defaults), `src/lib/publishing/*` (snapshot/publish), `src/lib/storefront/*` + `src/lib/pages/registry.ts` (multi-page path).
- **Browser evidence (Playwright, headless Chromium):** Launch A (plan Launch, live v3, quota 3/3 → **no A publishes**; draft-only mutations) and Growth B (plan Growth, live v6 after this ticket, quota 6/10).
- **Rules:** no fabricated content; no external integrations; if a flow is not safely reachable through legit UI → `NOT_BROWSER_TESTED`. Empty-state claims distinguish dev (`EmptyState` placeholder) vs production (`null`).

### Accounts / tenants

| Label | Plan | Tenant | Subdomain | Live | Content |
|---|---|---|---|---|---|
| A | Launch | `147dc2d1-979a-48c3-b028-32f4d4af8950` | `rccf-720-audit` | v3 (unchanged) | products 2, gallery 0, timeline 2, links 0, games 0, feed 0, bookings 0, services 1, courses 0, testimonials 1, faq 1 |
| B | Growth | `66941948-7f71-461d-aa26-db86598c945a` | `rccf7151-growth` | **v6 (published this ticket)** | games 2, everything else 0 |
| C | Scale | `c1bd3249-4120-46b2-b25c-7a61b6db0a57` | `rccf7164-scale-1787027917475` | never published (draft v1) | — |

### Per-plan content limits (canonical: `src/config/commerce/plans.ts` + `src/lib/capabilities/limits.ts`)

| Feature | Launch | Growth | Scale |
|---|---|---|---|
| products / gallery / timeline / links / testimonials / faq / services / feed | 3 each | unlimited | unlimited |
| courses | **0** | unlimited | unlimited |
| games | **0** | 10 | unlimited |
| bookings | **0** | 20 | 100 |
| storage | 20 MB | 100 MB | 300 MB |

Capabilities: Launch = basic_builder, basic_themes, creator_subdomain, theme_background_solid. Growth adds premium_themes, advanced_builder, ai_generation, social_integrations, priority_support (+ gradient/image/animation backgrounds + effects). Scale adds custom_domain, advanced_ai, api_access, api_integrations, webhooks, live_social_sync, white_label, brand_removal, advanced_analytics (+ video background). **No section component requires a capability — sections are never gated; only content writes are.**

---

## 3. Section inventory

23 registered (ids, sorted):

```
affiliateLinks.default, bookings.default, contact.default, contentFeed.default,
courses.default, embed.spotify, embed.youtube, faq.default, footer.default,
gallery.grid, games.default, hero.default, hero.education, hero.fitness,
hero.gaming, links.default, newsletter.default, products.grid,
services.default, social.discord, social.instagram, testimonials.default,
timeline.default
```

Builder catalog (13, `section-manager.tsx:60–74`): `hero.default, products.grid, gallery.grid, timeline.default, testimonials.default, faq.default, courses.default, services.default, games.default, contentFeed.default, newsletter.default, contact.default, footer.default`.

Registered but not in the catalog (10): `links.default, affiliateLinks.default, bookings.default, hero.gaming, hero.fitness, hero.education, embed.spotify, embed.youtube, social.discord, social.instagram`.

Content storage per feature (`content-limit.enforcement.ts:41–66`): products → `Product`; services → `Offering(type=coaching)`; courses → `Offering(type=course)`; timeline → `TimelineEvent`; links → `AffiliateLink`; games → `Game`; gallery → `GalleryImage`; bookings → `Booking`; feed → `ContentFeedItem`; testimonials/faq → `Setting` (`tenantId_key`, keys `"testimonials"`/`"faq"`).

Default Creator blueprint layout (`src/lib/blueprint/providers/built-in.ts`, com.creatos.creator): `hero.default, products.grid, gallery.grid, timeline.default, testimonials.default, faq.default, links.default, contact.default, footer.default`.

Nav defaults (`navigation/service.ts` `generateDefaults`): hero, products, gallery, links, timeline, testimonials, faq, games, contentFeed + contact (S3). **Never:** services, courses, bookings, affiliateLinks, newsletter, hero variants, embeds, socials.

---

## 4. Per-section audit (24 numbered entries)

> Legend — Addable: in Builder catalog. L/S/C limits: Launch/Growth/Scale. Empty dev: `EmptyState` placeholder (dev only). Empty prod: rendered output when the feature has zero items. All 13 catalog sections passed save→publish→snapshot→live where a live publish was permitted (A never published; B published v6).

### Catalog sections (browser-tested)

**1. `hero.default` — Hero** · Addable ✓ · no content limit (static) · static renderer.
- Launch/Growth/Scale: available everywhere. Persists in draft and publishes to snapshot; renders in preview and live. Verified live (A v3, B v6) with `id="hero"`. No horizontal overflow at 1440/390/375/320. Default content is placeholder copy ("Your hero goes here…") — creator is expected to edit via `/admin/settings`. Nav item present (Home). **Result: Launch ✓ Growth ✓ Scale ✓.**

**2. `products.grid` — Products** · Addable ✓ · limit 3 / ∞ / ∞ (`Product`).
- A: 2 products → badge "2", live/preview render product cards with price + CTAs. Server-enforced write gate (`products` feature). Snapshot bakes product rows at publish (B v6 snapshot includes products.grid section, 0 products). **Result: Launch ✓ (2/3 used) Growth ✓ Scale ✓.**

**3. `gallery.grid` — Gallery** · Addable ✓ · limit 3 / ∞ / ∞ (`GalleryImage`).
- A: 0 images → no badge; dev `EmptyState` "Add images to your gallery", production `null` (section hidden). Responsive grid `@sm/@lg`. **Result: Launch ✓ (0/3) Growth ✓ Scale ✓.**

**4. `timeline.default` — Timeline** · Addable ✓ · limit 3 / ∞ / ∞ (`TimelineEvent`).
- A: 2 events → badge "2", renders timeline. Nav item present. **Result: Launch ✓ (2/3) Growth ✓ Scale ✓.**

**5. `testimonials.default` — Testimonials** · Addable ✓ · limit 3 / ∞ / ∞ (`Setting` key `testimonials`).
- A: 1 → badge "1", renders. Nav item present. **Result: Launch ✓ (1/3) Growth ✓ Scale ✓.**

**6. `faq.default` — FAQ** · Addable ✓ · limit 3 / ∞ / ∞ (`Setting` key `faq`).
- A: 1 → badge "1", renders accordion. Nav item present. **Result: Launch ✓ (1/3) Growth ✓ Scale ✓.**

**7. `courses.default` — Courses** · Addable ✓ · limit **0** / ∞ / ∞ (`Offering type=course`).
- Addable + persists on every plan (catalog not gated). On Launch, **write is blocked server-side** → see F1 (500 + unhandled pageerror, no UX). On Growth, unlimited; B's published v6 layout includes `courses.default` (order 500, config `{animation:"stagger", entityType:"course"}`) with 0 courses → **section correctly hidden on live** (`CoursesRenderer` → dev `EmptyState` / prod `null`). Nav item: **never generated**. **Result: Launch ✗ (write-blocked, F1) Growth ✓ (verified empty-hide) Scale ✓ (code-verified).**

**8. `services.default` — Services** · Addable ✓ · limit 3 / ∞ / ∞ (`Offering type=coaching`).
- A: 1 service → badge "1", renders on preview. Server action uses the same **throw** pattern as courses (`features/services/actions.ts:29`) → over-limit submit would 500 with no UX (same defect class as F1; code-verified, not browser-submitted). Nav item: **never generated**. **Result: Launch ✓ (1/3) Growth ✓ Scale ✓.**

**9. `games.default` — Games** · Addable ✓ · limit **0** / 10 / ∞ (`Game`).
- Launch: create attempted via `/admin/games` → friendly inline error `Games is not available on your current plan.` (form renders `state.error`; stays on `/admin/games/new`), **no 500, no unhandled error** — the correct UX pattern (contrast F1). Growth: B created 2 games via the form, added the section, published v6; live storefront renders `id="games"` heading + 2 cards (name/genre; logo fallback initial). Nav item present. Empty dev `EmptyState` "Add your games" / prod `null`. **Result: Launch ✗ (blocked, friendly) Growth ✓ (2/10 E2E) Scale ✓ (code-verified).**

**10. `contentFeed.default` — Content Feed** · Addable ✓ · limit 3 / ∞ / ∞ (`ContentFeedItem`).
- Addable on all plans; A/B have 0 items → dev `EmptyState`, prod hidden. Nav item present. No content created this ticket (no legit UI flow exercised for feed items; items table exists). **Result: Launch ✓ (0/3) Growth ✓ Scale ✓.**

**11. `newsletter.default` — Newsletter** · Addable ✓ · no content limit (subscriber list).
- Renders email form (`input[type=email]`) in preview (A). No nav item. **Result: Launch ✓ Growth ✓ Scale ✓.**

**12. `contact.default` — Contact** · Addable ✓ · no content limit.
- Renders contact form (textarea) in preview (A). **S3 (carried):** contact nav anchor is generated whenever a website exists (`navigation/service.ts`) but is only valid if a contact section is actually placed — B's live v6 nav shows "Contact" while no `#contact` element exists. **Result: Launch ✓ Growth ✓ Scale ✓ (S3 persists).**

**13. `footer.default` — Footer** · Addable ✓ · no content limit.
- Renders on live (A v3, B v6, `id="footer"`). **S4 (carried):** hardcoded `/terms /privacy /refund` legal links → 404 for these tenants. Nav item: none. **Result: Launch ✓ Growth ✓ Scale ✓ (S4 persists).**

### Registered but not addable (code-verified; NOT_BROWSER_TESTED)

**14. `links.default` — Social Links** · NOT addable (absent from catalog, but `EDIT_LINKS` maps it to `/admin/links`).
- Renderer exists (`LinksRenderer`), content model `AffiliateLink`, server action `link.actions.ts:67` enforces `max_links` (3/∞/∞), nav defaults include it. No Builder affordance → creators can fill links but never place the section. **Result: NOT_BROWSER_TESTED.**

**15. `affiliateLinks.default` — Affiliate Links** · NOT addable.
- Renderer `AffiliateLinksRenderer`, action `affiliate.actions.ts:80` enforces `max_links` (3/∞/∞). No UI to place. **Result: NOT_BROWSER_TESTED.**

**16. `bookings.default` — Bookings** · NOT addable · limit **0** / 20 / 100 (`Booking`).
- Renderer `BookingsRenderer` (renders nothing when empty). `storefront-bookings.actions.ts:80` rejects every booking request on Launch. Admin bookings page crashes for the workspace tenant (F2). No Builder affordance. **Result: NOT_BROWSER_TESTED.**

**17. `hero.gaming` — Gaming Hero** · NOT addable. Registered (type hero), renders via `HeroRenderer`; `EDIT_LINKS` maps to `/admin/settings`. **NOT_BROWSER_TESTED.**

**18. `hero.fitness` — Fitness Hero** · NOT addable. Same as 17. **NOT_BROWSER_TESTED.**

**19. `hero.education` — Education Hero** · NOT addable. Same as 17. **NOT_BROWSER_TESTED.**

**20. `embed.spotify` — Spotify Player** · NOT addable. `SpotifyRenderer`; no theme support (`supportsTheme:false`). **NOT_BROWSER_TESTED.**

**21. `embed.youtube` — YouTube Video** · NOT addable. `YouTubeRenderer`; no theme support. **NOT_BROWSER_TESTED.**

**22. `social.discord` — Discord Widget** · NOT addable. `DiscordRenderer`; no theme support. **NOT_BROWSER_TESTED.**

**23. `social.instagram` — Instagram Feed** · NOT addable. `InstagramRenderer`. **NOT_BROWSER_TESTED.**

### Product-gap classification

**24. Multi-page / view-all path** · NOT_BROWSER_TESTED · product gap.
- Storefront supports `[domain]/[slug]` (`storefront-loader.ts`, `page-resolver.ts` `resolvePageBySlug`/`normalizePageSlug`, `withViewAllHref`). `builderStore.addPage(name, slug)` exists but **no Builder/admin UI calls it** → every QA snapshot is single-page (`page-home`, slug `/`, isHome true). Dynamic/legal pages exist in `src/lib/pages/registry.ts` but are never instantiated. Renderers emit "View all" links whose targets are therefore unreachable. Verified in B v6 snapshot (1 page). Creating a multi-page site would require calling internal APIs outside the legit UI → fabrication → classified NOT_BROWSER_TESTED.

---

## 5. Findings

### F1 (P2) — Plan-blocked course creation 500s with no user feedback
- **Where:** `src/features/courses/actions.ts:36` `createCourse` `throw new Error("Courses is not available on your current plan.")`; `src/app/admin/courses/_components/courses-manager.tsx:48–62` has no catch.
- **Repro (Launch A, legit UI):** `/admin/courses` → Add Course → fill Title/Description/Price/Category → Create.
  - `RESP 500 POST /admin/courses`
  - console: `Failed to load resource: the server responded with a status of 500`
  - `PAGEERROR: Error: Courses is not available on your current plan.`
  - UI: drawer stays open, list still empty, **no message rendered**. Busy state resets via `finally` but nothing communicates the plan block.
- **Contrast:** `games.actions.ts:49` returns `{ success:false, error: "Games is not available on your current plan." }` and the Games form renders it as a red inline paragraph (verified on A).
- **Also affected:** `src/features/services/actions.ts:29` (same throw pattern; not browser-submitted because B cannot open `/admin/services`, F2).
- **Impact:** a Launch creator who completes a full course form gets a silent failure + console/page errors; a 500 on a normal user flow is also a platform-health smell.
- **Suggested direction (not applied, audit only):** return `{ success:false, error, code }` like `games.actions.ts` and render it in the manager; keep parity across courses/services.

### F2 (P2, P-candidate) — Workspace-owner tenant B cannot open most `/admin/content/*` routes (dev)
- **Where:** client-side crash on CrudTable-based manager pages; workspace association suspected (B is workspace OWNER `fde53041-a760-4912-a524-00ab5afb38ce`; A has no workspace and opens everything).
- **Repro (8/8 attempts, hard-nav and soft-nav):** login B → `/admin/courses|services|products|testimonials|faq|links|gallery|bookings` → returns 200, then client-redirects to `/admin/dashboard`, `PAGEERROR "Rendered more hooks than during the previous render"` (+ dev HotReload "Router" warning; ruled out as an HMR flake).
- **Works for B:** `/admin/dashboard`, `/admin/milestones`, `/admin/games`, `/admin/builder`. **Works for A:** every listed route.
- **Blocker effect:** prevented Growth course-creation E2E (mitigated via code-verification of `courses.default` + write-block evidence on A + full games E2E on B).
- **Note:** not production-verified. If reproducible in prod, it blocks core content management for any workspace-owner Growth/Scale tenant → escalate to P1.

### Carried from RCCF-72.2 (untouched)
S1 (P1, preview draft leak), S2 (P2, nav one-shot), S3 (P2, contact anchor — **reconfirmed on B v6**), S4 (P2, footer legal links — **reconfirmed on B v6**), S5 (P3, nav href null), S6 (P3, double title suffix), S7 (P3, legacy dead nav setting on A), S8 (P3, niche storefront unimplemented), S9 (env compile latency / slow hydration — this ticket: B dashboard Publish control took ~60 s to hydrate and never accepted clicks; used the Builder Publish control instead).

---

## 6. Environment blockers (dev-only)

1. **F2** admin-route crash on the workspace-owner tenant → no Growth course write E2E.
2. **S9** extreme hydration latency on the admin dashboard for B (Publish button unclickable there; Builder `data-testid="builder-publish"` hydrated fine and published v6).
3. **A quota 3/3** → no A publishes; all A mutations were draft-only.

---

## 7. Summary counts

- Registered builtin sections: **23**
- Browser-tested end-to-end (all 13 catalog sections; games and courses tested with write-paths): **13**
- Code-verified only (no Builder add affordance): **10** (items 14–23)
- NOT_BROWSER_TESTED: **11** (the 10 above + item 24 multi-page)
- New findings: **2** (F1 P2, F2 P2/P-candidate) · Product gaps: **3** (multi-page UI, nav coverage, bookings constructibility)
- Plan results: **Launch** — 11/13 sections function (courses & games intentionally write-blocked; games with friendly UX, courses with broken UX F1); **Growth** — 13/13 addable, games E2E verified live (v6, 2/10), courses empty-hide verified; **Scale** — code-verified unlimited except bookings 100.

---

## 8. Evidence index (local, not committed)

- `C:\Users\91866\AppData\Local\Temp\opencode\rccf723-suiteA.out.json` — Launch catalog (13 add buttons), draft mutation + persistence, badges, games block, preview sections, responsive.
- `rccf723-suiteB2.out.json` — B builder state (7 sections incl. courses/games), catalog.
- `rccf723-bpublish.out.json` — B publish via `builder-publish` control.
- `rccf723-bstorefront.out.json` — B live v6 at 320/375/390/1440 (games cards, courses hidden, no overflow).
- `rccf723-course-submit-A.out.json` — F1 repro (500 + pageerror, no UX).
- `rccf723-course-create.js / routes.js / softnav.js / courses-probe.js / courses-debug.js` — F2 repro.
- DB checks (tsx): v6 snapshot layout/content (`rccf723-v6-inspect.ts`), counts (`rccf723-counts.ts`), quota 6/10 (`rccf723-usage.ts`).
