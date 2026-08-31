# RCCF-72.2 — Creator Storefront & Dynamic Niche Navigation Exhaustive Audit

**Status:** COMPLETE (AUDIT ONLY — no app-code changes, no commit)
**Date:** 2026-08-18
**Scope:** Public Creator storefront (`/src/app/[domain]`) + navigation system + the question of "dynamic niche/type/persona-driven" storefront behavior, across Launch / Growth / Scale tenants, desktop & mobile widths.
**Method:** Playwright (headless Chromium, 1440×900 / 390×844 / 375×812 / 320×700) against `npm run dev` (localhost:3000, PID 18048), DB verification via Prisma, code inspection for root-cause analysis.
**Accounts used (all role ADMIN, theme `com.creatos.neon-dark`):**
- Creator A (Launch): `rccf72-1787032348339@example.com` — tenant `147dc2d1…`, subdomain `rccf-720-audit`, website `a26f96b7…`, **live v3** (pages: hero.gaming, gallery.grid, products.grid, timeline.default, links.default, footer.default); quota 3/3 (not published during this audit).
- Creator B (Growth): `rccf7151-growth@example.com` — tenant `66941948…`, subdomain `rccf7151-growth`, website `eeabc8b5…`, **live v5** (pages: hero.default, products.grid, gallery.grid, testimonials.default, footer.default); draft changes pending since publish; quota 5/10 (not published during this audit).
- Creator C (Scale): `rccf7164-scale-1787027917475@example.com` — tenant `c1bd3249…`, subdomain `rccf-7164-scale`, website `0169f633…` — **draft v1 only, never published** (no live storefront).

**Exclusions (per brief):** Agency, Super Admin, marketing frontend, admin-side nav editor UI depth, new Theme-Experience feature work, schema/billing/capability changes.

---

## 1. Findings Register (summary)

| ID | Sev | Finding | Location |
|----|-----|---------|----------|
| S1 | **P1** | **Public `?preview=true` exposes unpublished draft content with no authentication gate.** Anonymous GET of `/rccf-720-audit?preview=true` → 200 and renders draft-only content not present on the live site (Launch A draft `TimelineEvent` "Quota Probe Milestone 2027" + `probe` text is rendered in the anonymous preview; the published v3 shows only the older milestone). The storefront preview branch (`getStorefrontData` `preview: true`) rebuilds the live draft aggregate + fresh navigation and never checks the viewer is the tenant owner. Drafts, including plan-gated visual/config drafts, are publicly reachable by URL guess. | `src/lib/storefront/storefront-loader.ts` (preview branch) |
| S2 | **P2** | **Navigation auto-generation is one-shot; it never regenerates as content grows.** `NavigationService.generateDefaults` runs only when `Setting["navigation"]` is empty; once a nav setting exists (first publish) it is never re-derived. Launch A now owns 2 products + 2 timeline milestones + FAQ/testimonials, and its live v3 snapshot contains `products` and `timeline` sections — yet the storefront nav renders **only Home + Contact**. A creator must manually edit or reset nav; content additions silently never surface in nav. | `src/lib/navigation/service.ts` (`getOrGenerate`/`generateDefaults`) |
| S3 | **P2** | **"Contact" nav anchor is emitted unconditionally and is dead on these layouts.** `generateDefaults` always appends a Contact anchor when a website exists, but neither published layout contains a `contact` section (A: hero/products/timeline/links/footer; B: hero/footer with empty products/gallery/testimonials hidden). Rendered nav has a "Contact" item whose click scrolls nowhere (`scrollY` unchanged), on both tenants. Nav should only emit anchors that exist in the section graph. | `src/lib/navigation/service.ts:generateDefaults`; `src/lib/storefront/layout-engine/build-navigation.ts` |
| S4 | **P2** | **Footer legal links (Terms / Privacy / Refunds) are root-relative platform links that 404 on tenant storefront hosts.** `FooterRenderer` hardcodes `href="/terms"`, `"/privacy"`, `"/refund"`. On `localhost:3000/rccf-720-audit` the links resolve to `/rccf-720-audit/terms` → the `[domain]/[slug]` catch-all → **404 "Creator Not Found"** (verified: `/rccf-720-audit/terms` → 404, while platform `/terms` → 200). On real tenant subdomains/custom domains the same root-relative hrefs will resolve against the tenant host and 404 the same way; there is no per-tenant legal-page route. | `src/lib/registry/components/renderers.tsx:585-587` |
| S5 | **P3** | **Nav items render with no `href` attribute (JS-only anchors).** Desktop + mobile nav links have `href=null` and scroll via `onClick` + IntersectionObserver. Consequences: no middle-click/open-in-new-tab, weak keyboard semantics, and anchors are invisible to crawlers — the nav carries no crawlable paths (relevant for a storefront that also supports real page hrefs). | `src/components/storefront/StorefrontNav.tsx` |
| S6 | **P3** | **Double title suffix for tenants whose SEO title already ends in "— CreatorStore".** Root layout `title.template = "%s — CreatorStore"` + `buildMetadata` passing `seo.title` verbatim → Growth B renders `<title>RCCF 71.5.1 Growth Test — CreatorStore — CreatorStore</title>` (Launch A, seo.title without suffix, renders single suffix). | `src/app/layout.tsx:32`; storefront `buildMetadata` |
| S7 | **P3** | **Legacy dead config on Launch A's record:** `Website.themeConfig.navigation` (Home/Store/Gallery/Links) is not consumed by any runtime — nav authority is `Setting["navigation"]` + snapshot `navigation`. Confusing when inspecting tenant data; safe to ignore (or migrate/clean). | `Website.themeConfig` (Launch A) |
| S8 | **Product Gap** | **Dynamic niche/type/persona-driven storefront behavior is NOT implemented** — the primary audit question has a definitive answer: niche exists only in the generation/import pipeline (see §5). Storefront nav, sections, pages and theme are content-count/config-driven, not niche-driven. No runtime reads a niche field. | see §5 file list |
| S9 | **Env** | Dev-first-compile latency and `Error: aborted` connection aborts during navigation storms (dev-only; target pages still 200). Verified 404 pages return a clean marketing-branded "Creator Not Found" page (no stack/error leak). | dev-server logs |

---

## 2. Storefront Architecture (source of truth)

- Routes: `src/app/[domain]/page.tsx` (home) + `src/app/[domain]/[slug]/page.tsx` (named pages) — both `force-dynamic`, no caching.
- Data: `src/lib/storefront/storefront-loader.ts` → `getStorefrontData`:
  - **Published:** reads `PublishedSnapshot` (latest live row) **as-is** — zero live-content reads; fully snapshot-isolated. This is the RCCF-01/02 contract and held up in every probe.
  - **Preview (`?preview=true`):** rebuilds a live draft aggregate + fresh navigation (see S1).
- Assembly: `LayoutEngine.resolve(snapshot)` → `StorefrontDocument` (`theme`, `navigation`, `jsonLd`, `pages`, `renderingHints`), incl. `buildNavigation`, `buildTheme`, `buildPages`, `buildJsonLd`, `buildRenderingHints`.
- Render: `src/components/storefront/StorefrontPage.tsx` → `StorefrontNav` + per-section `ExperienceSection` wrapper + `DataBoundRenderer`; sections filtered by `src/lib/storefront/section-pipeline.ts` (`resolveRenderableSections` — filter-only, never reorders); page/slug resolution via `src/lib/storefront/page-resolver.ts` (`resolveStorefrontNavigation`, `resolvePageBySlug`, `withViewAllHref`, `normalizePageSlug`).
- Hrefs: `src/lib/storefront/storefront-root.ts` (`getPageHref`/`getStorefrontRootPath`) — platform-host → `/{domain}/…`, tenant subdomain → `/…`.
- Middleware: `src/middleware.ts` sets `x-tenant-host` server-side from subdomain or platform slug; platform domains derived from env.

---

## 3. Storefront Routing & Page Resolution

- Single-page layout for both live tenants: **no named pages** exist in either snapshot (`pages: []`), so `withViewAllHref` correctly renders **no "View all" links** — sections render curated on the homepage only.
- Named-route behavior tested on Launch A: `/rccf-720-audit/products` and `/rccf-720-audit/contact` both → **404 "Creator Not Found"** (correct — no such page in the snapshot; the `[domain]/[slug]` catch-all does not invent pages).
- `resolvePageBySlug` + `normalizePageSlug` by inspection handle slug normalization; no full-page storefront could be exercised because no QA tenant has published a multi-page layout (documented as a gap, not a defect).

---

## 4. Niche Discovery — implementation search

Niche/type/persona artifacts that DO exist (generation/import side only):

| Artifact | Location | Purpose |
|---|---|---|
| 8-industry registry | `src/lib/creation/industry/registry.ts` | Industry/niche taxonomy for AI generation |
| 11 blueprints (most `coming_soon`) | `src/lib/blueprint/providers/built-in.ts` | `com.creatos.creator` = manual default; `com.creatos.neon-dark` theme |
| `CreatorIntelligence.niche` | `prisma/schema.prisma` (~line 1359) | AI import side table only |
| BusinessProfile.category composition | `src/modules/website-blueprint/domain/*`, `application/composition-engine.ts`, `website-blueprint` `page-registry`/`section-registry` | Blueprint-time page/section selection from category |
| Theme decoration per category | `src/modules/theme/runtime/experience/category-decoration-packs.ts` | Experience decoration only |
| Legacy static `niche: "general"` | `src/config/influencer.ts` | Constant, unused by storefront |
| Manual onboarding | `createManualWebsite` → `applyBlueprintToWebsite("com.creatos.creator","com.creatos.neon-dark")` | Creator blueprint applied once |

## 5. Niche in Runtime — definitive verdict

**"Dynamic niche/type/persona-driven storefront behavior is not implemented."**

- No storefront loader, nav builder, section pipeline, page resolver, theme resolver, or renderer reads any niche/type/persona field.
- Storefront navigation is **content-count-driven** (`products > 0 → Products`, `gallery > 0 → Gallery`, …) via `NavigationService.generateDefaults`.
- Sections are **config/aggregate-driven**; empty sections are hidden by adaptive visibility (verified: Growth B publishes products/gallery/testimonials sections but they render hidden because content is empty).
- Theme is **config/capability-driven** (experience override + plan capability resolution), not niche-driven.
- Conclusion: a visitor visiting any creator sees the same nav/section machinery regardless of creator industry; "niche" only influences the initial generated draft (blueprint + AI import), and only partially.

---

## 6. Snapshot Pipeline (publish → document)

Verified for Growth B live v5 (`PublishSnapshot.snapshot` JSON): `theme` carries `{colors, packageId, typography{headingWeight:800}, borderRadius:"20", layoutDensity:"spacious"}`; `navigation` carries `[{hero→Home anchor}, {contact→Contact anchor}]`; experience surface/image are baked into `renderingHints`. Launch A v3 equivalent verified earlier (RCCF-72.0/72.1).

- **Publish-time baking works:** snapshot `theme` ≠ live `themeConfig` where the creator edited after publish — Growth B live `themeConfig.borderRadius=12` (draft) vs snapshot `borderRadius=20` (v5). The published storefront renders the **snapshot** value (radius 30px), preview renders the **draft** value (18px). Correct isolation.
- Theme vars flow from snapshot → inline `style` on `main` (verified `--brand-primary:#00f5ff`, `--surface-root:#09090B`, button palette cyan, etc. from the resolved experience).

---

## 7. Navigation Authority & Auto-generation

- Single authority: `Setting["navigation"]` (key `navigation`), persisted per tenant; baked into each snapshot at publish (`src/lib/publishing/service.ts` ~line 175).
- `generateDefaults` (content-count-driven): Home anchor + Contact anchor always; conditional anchors when `products/gallery/timeline/testimonials/faq/games/contentFeed/links` counts > 0.
- `getOrGenerate`: returns the existing Setting when non-empty — **never regenerates** → S2.
- Nav editor: `src/actions/navigation.actions.ts` (`saveNavigation` → Setting + `markChangesPending`; `resetNavigation` → `resetToDefaults` re-derives from current counts). A creator CAN recover from S2 via a manual nav reset.

**Measured state:**
- Launch A content (DB): products 2, timeline 2, faq 1, testimonials 1, offerings 1 — live snapshot has `products` + `timeline` sections — nav shows **only Home + Contact** (S2 confirmed).
- Growth B content (DB): all zero — nav **Home + Contact is "correct" by count**, but Contact is still dead (S3).
- Live storefront nav items (DOM): desktop + mobile both render exactly `Home`, `Contact`; all `href=null` (S5).

---

## 8. Nav Editor / Admin surface

- `src/actions/navigation.actions.ts` exposes save/reset; admin UI not re-swept this pass (out of scope per exclusions) — the data path (Setting ↔ snapshot) is verified end-to-end.
- Legacy `themeConfig.navigation` on Launch A (Home/Store/Gallery/Links) is **dead config** (S7) — the editor writes Setting, not themeConfig.

---

## 9. Section Registry (24 registered components)

`src/lib/registry/components/builtins.ts`:
- **Hero variants (4):** `hero.default`, `hero.gaming`, `hero.fitness`, `hero.education`
- **Grid/list:** `gallery.grid`, `products.grid`, `timeline.default`, `links.default`, `affiliateLinks.default`, `testimonials.default`, `faq.default`, `contentFeed.default`, `games.default`
- **Conversational/legal:** `contact.default`, `newsletter.default`, `footer.default`
- **Commerce/services:** `courses.default`, `services.default`, `bookings.default`
- **Embed/social:** `embed.spotify`, `embed.youtube`, `social.discord`, `social.instagram`
- `resolveModuleId` compat map; deprecated `about.*` / `pricing.*` correctly dropped (no runtime, no renderer).
- **On live storefronts (rendered):** `hero.gaming` (A), `hero.default` (B), `products.grid` (A), `timeline.default` (A), `footer.default` (A,B). Growth B's `products.grid`/`gallery.grid`/`testimonials.default` are **hidden** (adaptive visibility, content empty).

**Discovery value:** 4 of 24 builtins run on the QA tenants; 20 builtins (games, contentFeed, affiliateLinks, courses, services, bookings, embed/social, newsletter, fitness/education heroes, faq, contact) have no live QA render path — test coverage gap to note.

---

## 10. Runtime Section Rendering & Adaptive Visibility

- `ExperienceSection` wraps every section with the resolved experience (surface class + background layer): published Growth B shows `xp-surface-neon` on hero + footer with cyan borders and the **image background layer** (uploaded banner at clamped opacity) — the theme background capability **does** have a runtime consumer (`background-runtime.tsx`, section-level).
- Adaptive visibility (`section-pipeline.ts` + Phase-8 smart defaults): empty sections hidden. Verified visually + by DOM (`main` children = hero + footer only for B).
- No section reordering anywhere (filter-only pipeline) — order matches snapshot.

---

## 11. Theme Experience on Storefront (Phase 8 parity)

Growth B published v5 renders the full premium experience **correctly**:
- `xp-surface-neon` surfaces (cyan `rgba(34,211,238,0.5)` borders)
- image background layer (opacity-clamped, `object-cover`)
- heading weight 800, text-align start, `--radius-xl` 30px (radius 20 snapshot), `--section-spacing` 5rem (spacious)
- preview (draft radius 12) → 18px — draft/published divergence correct.

Launch A renders the neon-dark baseline (indigo primary, no custom radius — snapshot has no borderRadius override).

**Verdict:** Builder appearance → publish → storefront parity holds; snapshot theme is the single source; draft config changes are correctly isolated until republish.

---

## 12. Public Preview Mode (security) — S1 detail

- `GET /rccf-720-audit?preview=true` (anonymous, no cookies): **200**, renders draft banner "PREVIEW MODE — CHANGES ARE NOT PUBLIC" + **draft-only content** ("Quota Probe Milestone / 2027 / probe" — a timeline item added after the last publish, absent from live v3).
- `GET /rccf7151-growth?preview=true` (anonymous): **200** with the same banner (no draft content to leak for B, but the gate absence is identical).
- Root cause: `storefront-loader.ts` preview branch builds the live aggregate + `navigationService.getOrGenerate` with no ownership/auth check; any public visitor who knows or guesses a subdomain can preview unpublished drafts (including plan-gated theme/config drafts).
- **Recommended:** require the tenant session (or a signed/opaque preview token) before serving the preview branch; keep the published snapshot path public.

---

## 13. Storefront Route Matrix (tested)

| URL | Status | Result |
|---|---|---|
| `/rccf-720-audit` | 200 | Homepage, hero.gaming + products.grid + timeline.default + footer, title "RCCF 72.0 Audit — CreatorStore", nav Home/Contact |
| `/rccf-720-audit/products` | 404 | "Creator Not Found" (no such page in snapshot) ✓ |
| `/rccf-720-audit/contact` | 404 | "Creator Not Found" ✓ |
| `/rccf-720-audit?preview=true` | 200 | Draft leak (S1) ✗ |
| `/rccf7151-growth` | 200 | Hero + footer only (empty sections hidden), premium theme, **double title suffix** (S6) |
| `/rccf7151-growth?preview=true` | 200 | Same + preview banner; draft radius 18 vs pub 30 ✓ isolation |
| `/rccf7164-scale` | 404 | Correct — Scale tenant never published |
| `/does-not-exist-xyz` | 404 | Clean "Creator Not Found", no stack/error leak ✓ |
| `/rccf-720-audit/terms` | 404 | Footer legal-link defect (S4) ✗ |
| `/terms` (platform) | 200 | Platform legal page exists |

---

## 14. Responsive Matrix (horizontal overflow)

| Tenant | Width | scrollWidth = clientWidth | Nav items visible | Result |
|---|---|---|---|---|
| A | 1440 | 1440 = 1440 | Home, Contact | ✓ no overflow |
| A | 390 | 390 = 390 | Home, Contact (bottom bar) | ✓ no overflow |
| A | 375 | 375 = 375 | Home, Contact | ✓ no overflow |
| A | 320 | 320 = 320 | Home, Contact | ✓ no overflow |

- Mobile bottom bar shows 2 items (< the 5-item cap) — cap logic fine.
- No page `pageError`/`consoleError` on any width (dev-only `Failed to load resource 404` appears only on the intentional 404 pages).

---

## 15. Tenant Isolation & 404 behavior

- A and B storefronts contain **zero cross-tenant content** (no "RCCF721 Audit Product" on B; no Growth content on A) ✓.
- Non-existent subdomain → branded 404 (title "CreatorStore | Turn your content into a business", link "← Back to CreatorStore") — no leak of whether a tenant exists beyond the public 404 page ✓.
- Preview isolation is the only gap (S1) — and it is directionally *within-tenant* draft leakage, not cross-tenant.

---

## 16. Link/CTA Classification (live A + B homepages)

| Link | Kind | Target | Verdict |
|---|---|---|---|
| Nav Home / Contact | JS anchor, `href=null` | `#hero` / `#contact` | Contact dead (S3); no href (S5) |
| Hero CTA "Audit CTA 999" | internal anchor | `#` (hero link) | n/a — no href test |
| Product "Buy Now" | anchor | checkout | ✓ renders (₹500/₹100) |
| Footer Terms/Privacy/Refunds | root-relative | `/terms` etc. | **404 on tenant host** (S4) |
| "← Back to CreatorStore" (404) | internal | `/` | On tenant subdomain `/` = tenant home, not platform — minor (S9 note) |

---

## 17. Launch / Growth / Scale Results

| Tenant | Plan | Live? | Storefront | Nav | Theme | Verdict |
|---|---|---|---|---|---|---|
| A | Launch | v3 | 200, 4 sections, 0 overflow | Home+Contact (stale S2, dead contact S3) | neon-dark baseline | PASS with S2/S3 |
| B | Growth | v5 | 200, hero+footer (empty hidden), premium experience ✓ | Home+Contact (correct by count, dead contact S3) | premium image+neon+radius 20 ✓ | PASS with S3 |
| C | Scale | never published | 404 (correct) | — | — | NOT TESTABLE (no live site) |

---

## 18. View-all / Multi-page / Deep routes

- No live QA tenant has a multi-page snapshot → `withViewAllHref` path unexercised; single-page homepage curates all sections directly (verified).
- Named-page routes return 404 rather than fabricating pages ✓.

---

## 19. Final Summary Stats

| Metric | Value |
|---|---|
| Niche runtime consumers found | 0 (niche exists in generation/import only — 8-industry registry, 11 blueprints, CreatorIntelligence.niche, category decoration) |
| Section types registered | 24 (4 hero variants + 20 others) |
| Section types rendered on live QA tenants | 4 (hero.gaming, hero.default, products.grid, timeline.default, footer.default = 5 distinct; footer/hero shared) |
| Section types with no live QA render path | 20 (games, contentFeed, affiliateLinks, courses, services, bookings, embed.spotify/youtube, social.discord/instagram, newsletter, faq, contact, links, gallery, testimonials, hero.fitness/education, …) |
| Nav items per storefront | 2 (Home + Contact) — desktop & mobile |
| Nav anchors emitted | 4 per page (desktop 2 + mobile 2) |
| Nav items with real href | 0 (JS-only anchors, S5) |
| Nav items tested (clicks) | Contact ×2 → scrollY unchanged (dead, S3) |
| Storefront URLs swept | 10 (A×4, B×2, C×1, nonexistent×1, platform/tenant legal×2) |
| Responsive widths swept | 1440 / 390 / 375 / 320 — **0 horizontal overflow** |
| Console/page errors on healthy pages | 0 |
| Launch A result | LIVE v3 renders correctly; nav stale (S2) + dead Contact (S3) |
| Growth B result | LIVE v5 premium theme parity ✓; dead Contact (S3); double title (S6) |
| Scale C result | Not published → 404 (expected; no live site to test) |
| P0 | **0** |
| P1 | **1** (S1 public draft-leak preview) |
| P2 | **3** (S2 stale auto-nav, S3 dead Contact anchor, S4 footer legal 404) |
| P3 | **3** (S5 nav href-less anchors, S6 double title suffix, S7 dead themeConfig.navigation) |
| Product gaps | 1 (S8 niche-driven storefront not implemented; 20 section types unrendered on QA tenants) |
| Env / needs-prod-recheck | S9 (dev noise); multi-page storefront + full-page rendering path unexercised |

---

## 20. Blockers & Recommended Follow-up

1. **Fix S1 (P1, security):** gate the storefront preview branch on the tenant's authenticated session (or signed preview token). Verifying against public drafts must not be possible anonymously.
2. **Fix S2 (P2):** regenerate nav when the creator's content changes (re-derive on publish when counts change, or store a content-hash; keep manual edits as overrides). At minimum, surface a "nav is out of date" hint in the nav editor.
3. **Fix S3 (P2):** only emit anchors whose target section exists in the resolved document (or map Contact → the section labelled contact when present). `generateDefaults` should drop Contact when no `contact`/footer contact section is on the page.
4. **Fix S4 (P2):** footer legal links should point at the platform (absolute) legal pages, not root-relative tenant hrefs; or render per-tenant legal routes when pages exist.
5. **P3 cleanups:** give nav items `href="#…"` (S5), de-duplicate the title suffix (S6), remove/ignore legacy `themeConfig.navigation` (S7).
6. **Test coverage gap:** render the 20 unexercised section types and a multi-page snapshot on a QA tenant to close the full-page/`withViewAllHref` path.

---

## 21. Deliverables / Evidence

- Report: `docs/rccf-72.2-creator-storefront-navigation-audit.md`
- Browser probes: `C:\Users\91866\AppData\Local\Temp\opencode\rccf722-browser.js` (route matrix), `rccf722-detail.js` (ids/nav/theme vars/contact click), `rccf722-theme.js` / `rccf722-bglayer.js` / `rccf722-prevbg.js` / `rccf722-imgcheck.js` (theme-experience + background layer), `rccf722-counts.ts` (content counts), `rccf722-bsnap.ts` (snapshot v5 JSON).
- No app-code changes, no data mutations (no publishes; scale/snapshot reads only), no commit.
