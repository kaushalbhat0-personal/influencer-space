# RCCF-MKT-02-R1 — Marketing Truth Fixes + Homepage Positioning & IA Implementation — Closure

## 1. Executive Verdict

**Classification: A — COMPLETE (staged, not committed).**

All screenshot-independent marketing work mandated by the ticket was implemented, tested, and verified:

| Workstream | Status |
|---|---|
| Marketing truth fixes (mojibake, claims, pricing, blog, testimonials) | COMPLETE |
| Homepage positioning ("Your presence. Your business.") | COMPLETE |
| Homepage IA (19 → ~9 narrative sections) | COMPLETE |
| Responsive audit | COMPLETE |
| Accessibility audit | COMPLETE |
| SEO/metadata | COMPLETE |
| Real storefront screenshots | **DEFERRED — user will provide** |
| Payment architecture | UNTOUCHED |
| DIRECT_CREATOR | UNTOUCHED |
| Commit | NOT CREATED |
| Push | NOT PERFORMED |

> **Mandatory disclosure:** Real successful Razorpay test-mode storefront screenshots were not available during this RCCF, so no screenshot evidence was fabricated or substituted. Asset replacement remains pending user-provided screenshots.

---

## 2. Baseline (Phase 1)

Captured before any edit; preserved byte-for-byte:

| Check | Result |
|---|---|
| `git status --short` | 61 modified tracked files + extensive pre-existing untracked set (RCCF-70.x–73.x work). Untouched. |
| `git diff --stat` | 61 files, 1208 insertions(+), 580 deletions(-) |
| `git diff --cached --stat` | empty — nothing staged at baseline |

Prior docs consumed: `docs/rccf-mkt-01-marketing-frontend-audit.md`, `docs/rccf-mkt-02-marketing-positioning-homepage-closure.md` (the blocked predecessor). All MKT-01/MKT-02 findings were reconfirmed against current source before editing.

## 3. Audit Findings Implemented (Phase 2 — Truth Fixes)

### P0-1 Screenshot references (catalogued, NOT replaced — deferred)

Every active reference identified; grep confirms no other marketing surface references captures:

| # | Location | Surface | Disposition |
|---|---|---|---|
| 1 | `src/app/layout.tsx` (OG images) | site-wide OpenGraph | reference kept; asset DEFERRED |
| 2 | `src/app/layout.tsx` (Twitter images) | Twitter card | reference kept; asset DEFERRED |
| 3 | `src/components/marketing/Hero.tsx` | hero preview frame | reference kept; asset DEFERRED |
| 4–5 | old `StorefrontShowcase.tsx` imgs | homepage proof band | component redesigned to typography-only (§17 option B); rendered capture refs eliminated; canonical paths documented in-file for future wiring |

No new asset filenames were invented (guardrail test pins this).

### P0-2 Mojibake — FIXED
- `src/app/features/page.tsx`: 4 instances (`â€"` → em dash) — metadata ×2, subhead, CTA button.
- `src/app/about/page.tsx`: 2 instances — metadata title/description.
- Sweep of all marketing surfaces (`src/components/marketing/**`, `src/lib/marketing/**`, all marketing routes): clean. Out-of-scope mojibake noted for the record: `src/app/onboarding/page.tsx` (authenticated app surface, already modified by unrelated in-flight work — left untouched) and a comment inside `src/app/api/webhooks/razorpay/route.ts` (payment file — frozen).

### P0-3 `/about` — FIXED
- Broken duplicated sentence ("…on CreatorStore.\ninto a real business.") → rewritten as one coherent sentence.
- "Today, thousands of creators…" story paragraph → replaced with a truthful statement ("CreatorStore is new, and we grow with the creators who build on it…"). No replacement claim is unsupported.

### Pricing truth — FIXED
- `/pricing` title duplication ("Pricing — CreatorStore — CreatorStore") → metadata title is now `"Pricing"` only (template appends brand once). Homepage had the same latent bug → home now uses `title: { absolute }`.
- Stale hardcoded "paid plans from ₹999/month" → `generateMetadata()` now derives the live minimum creator price from runtime plans (`Math.min` over `getPublicPricingData()`), so metadata always matches whatever the DB-authoritative runtime says (currently ₹699 Growth live).
- FAQ dataset answer hardcoded figures (₹999 / ₹1,995) removed → "See the pricing page for current plan rates."
- Pricing-page FAQ schema "(₹999/month)" figure removed → "use Creator Growth or higher".
- Billing logic, plan registry, comparison matrix, partner economics copy: UNTOUCHED. Runtime pricing remains the single authority.

### Blog payment contradiction — FIXED
- UPI post: "No third-party payment gateways" removed → now accurately states checkout runs through Razorpay (UPI/cards/net banking/wallets, payouts to your linked account).
- Unsupported "90% of Indian digital transactions" statistic removed (no invented replacement).
- Unverifiable settlement-timing promise ("money appears within seconds") replaced with customer-side truth ("confirm at checkout in seconds").
- Guides were audited — already accurate (they name Razorpay).

### Fabricated social proof — REMOVED
- `TESTIMONIALS` (6 named fictional people, "3x sales" claims) deleted from `src/lib/marketing/content.ts`.
- `SOCIAL_PROOF_STATS` ("10,000+ storefronts", "5,000+ creators", "99.9% uptime") deleted from `messaging.ts`.
- Neither was referenced by any UI; both are now unreconstructable landmines. No replacement testimonials/stats were manufactured. Trust-kit architecture files (empty `SEED_TESTIMONIALS`, registry) preserved untouched for future real content.

## 4. Homepage IA Before → After (Phase 3–5)

Old (19 sections): Hero · trust-bar · BeforeAfter · HowItWorks · AIDemo · PlatformOverview(8 cards) · SmartPlatform(6) · CreatorJourney(7) · BuilderShowcase(6) · SellAnything(8) · Manage(6) · CreatorShowcase(6 fake creators, empty placeholders) · Agency(5) · StorefrontShowcase(2×404 imgs) · ComparisonTable(15 rows) · Pricing+FAQ · FinalCta · Footer · JSON-LD.

New (~9 narrative sections):

| # | Section | Source |
|---|---|---|
| 1 | **Hero** — "Your presence. Your business." + professional-home support line, broadened checkmarks, HeroInput CTA architecture unchanged, preview frame retained (deferred asset) | `Hero.tsx` rewritten |
| 2 | Trust strip — platforms/payments (unchanged, quiet) | kept |
| 3 | **Core idea** — "Everything you do online. One home." composed layered-site visual (website/work/links/store + dashboard note) | `CoreIdea.tsx` NEW |
| 4 | **How it works** — ONE semantic `<ol>` timeline (profile → brand learned → home built → make it yours → launch & grow) | `HowItWorks.tsx` rewritten (merges HowItWorks+CreatorJourney) |
| 5 | **Showcase** — "Show what you do." audience breadth (creators/freelancers/artists/educators/businesses); fictional creators + empty placeholders eliminated | `CreatorShowcase.tsx` rewritten |
| 6 | **Sell** — "Turn what you offer into something people can buy." compact 6-tile cloud incl. roadmap-honest memberships wording; Razorpay/UPI/100% framing | `SellAnything.tsx` rewritten |
| 7 | **Promote** — "Give everything you share a home." social/content/brand-campaign/external links | `PromoteBand.tsx` NEW |
| 8 | **Build** — "Build a site that feels like yours." existing builder capability checklist | `BuilderShowcase.tsx` rewritten |
| 9 | **Grow** — "Build it once. Grow it over time." Presence→Showcase→Sell→Promote→Grow conceptual progression | `GrowBand.tsx` NEW |
| 10 | **Product experience** — typography-only honest capability summary; screenshot slots DEFERRED | `StorefrontShowcase.tsx` rewritten |
| — | Pricing (runtime suite, unchanged) · **FinalCta** — closes on positioning · Footer | FinalCta rewritten |

Retired from the page (component files retained, unmounted — reversible, zero collateral): BeforeAfter, AIDemo, PlatformOverview, SmartPlatform, CreatorJourney, Manage, Agency, ComparisonTable, old StorefrontShowcase image presentation. Partner path preserved via nav CTA, FinalCta button, and `/pricing` partner tab.

Navigation: trimmed to Features · Showcase · Pricing · About (+ Sign In, Start as Creator, Become a Partner). Blog/Contact moved to footer weight (both already linked there). Every href verified against an existing route (guardrail-tested). No routes invented.

Copy discipline honored: no "AI" overclaims (rccf-68 guardrail spirit), internal jargon ("Planner DAG") removed, every remaining claim maps to shipped product evidence.

## 5. Components Changed

| File | Change |
|---|---|
| `src/app/page.tsx` | new composition (~9 sections), absolute title, broadened truthful description/schema |
| `src/components/marketing/Hero.tsx` | positioning rewrite; CTA architecture & deferred img ref kept |
| `src/components/marketing/CoreIdea.tsx` | NEW — §11 core idea |
| `src/components/marketing/PromoteBand.tsx` | NEW — §14 promote |
| `src/components/marketing/GrowBand.tsx` | NEW — §16 grow progression |
| `src/components/marketing/CreatorShowcase.tsx` | rewrite — truthful showcase breadth |
| `src/components/marketing/SellAnything.tsx` | rewrite — compact non-limiting commerce |
| `src/components/marketing/BuilderShowcase.tsx` | rewrite — build checklist |
| `src/components/marketing/HowItWorks.tsx` | rewrite — single semantic timeline |
| `src/components/marketing/StorefrontShowcase.tsx` | rewrite — typography proof band + deferred-asset documentation |
| `src/components/marketing/FinalCta.tsx` | rewrite — positioning close |
| `src/components/marketing/SectionTracker.tsx` | tracked ids match new IA |
| `src/components/marketing/MarketingNav.tsx` | nav simplification (existing routes only) |
| `src/components/marketing/Pricing/faq.tsx` | h3→h2 heading-level fix |
| `src/app/features/page.tsx` | mojibake ×4 + canonical |
| `src/app/about/page.tsx` | mojibake ×2 + broken sentence + canonical |
| `src/app/pricing/page.tsx` | title fix, runtime-derived metadata, schema figure removal, canonical |
| `src/app/faq/page.tsx` | canonical |
| `src/app/blog/[slug]/page.tsx` | UPI post truth fixes + post canonicals |
| `src/app/layout.tsx` | root metadata broadened (OG/Twitter text; images deferred) |
| `src/lib/marketing/content.ts` | TESTIMONIALS removed; story claim fixed; FAQ figures removed |
| `src/lib/marketing/messaging.ts` | SOCIAL_PROOF_STATS removed |
| `tests/unit/rccf60-partner-pricing-truth.test.ts` | MODERNIZED stale guardrail (see Regression Coverage) |
| `tests/unit/rccf-mkt-02r1-marketing-truth.test.ts` | NEW — 22 source-level truth guardrails |
| `tests/unit/rccf-mkt-02r1-homepage-structure.test.tsx` | NEW — 8 render/a11y structure tests |

## 6. Regression Coverage

New suites (30 assertions-groups, all green):
- **Truth**: mojibake absence across every marketing file; "thousands of creators"/"90%"/"No third-party payment gateways" absent; Razorpay named in UPI post; TESTIMONIALS/SOCIAL_PROOF_STATS exports absent; scale stats absent.
- **Pricing**: title exact-match guard (template-safe); runtime derivation present + stale token absent; pinned partner line intact; FAQ figures absent.
- **Positioning/IA**: hero headline; absolute home title; new sections composed + retired components absent from page; final CTA positioning without urgency/count patterns.
- **Screenshot safety**: capture refs limited to canonical pair in layout+hero; no rendered `<img>` captures outside hero; no invented asset filenames.
- **Navigation**: every nav/footer href resolves to an existing `page.tsx` route.
- **Render/a11y**: single H1 + headline text; HowItWorks renders exactly 5 step headings (old duplicate-DOM bug class pinned shut); semantic `<ol>`; FinalCta persona links exact; CoreIdea/Grow/Showcase/Proof render contracts.

Stale-guardrail modernization (per skill rule — modernized, never deleted):
- `rccf60-partner-pricing-truth.test.ts` previously PINNED the stale token "paid plans from ₹999". Updated to assert: "Creator plans from Free" present, stale token ABSENT, runtime derivation present. Recorded here per skill discipline.

Dependent suites re-run green: rccf57 (agency domain), rccf58, rccf60 (+storage), rccf68 marketing-copy suite (MESSAGING_PILLARS import preserved deliberately — it is messaging architecture, not fabricated proof, and an existing test consumes it).

## 7. Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | CLEAN |
| `npx eslint` (all 25 touched files) | CLEAN (zero warnings/errors) |
| `npm run build` | ✓ Compiled successfully (warnings pre-existing in unrelated files) |
| `npx vitest run tests/unit/rccf-mkt-02r1-*` | 30/30 pass |
| Touched dependent suites (rccf57/58/60×2/68) | 66/66 pass |
| `npx vitest run` (full) | 4372 pass / 22 fail in 10 files — **all pre-existing**, see below |
| `npx prisma validate` | valid |
| `git diff --check` | clean (pre-existing CRLF notices on `tests/fixtures/*` only) |

**Full-suite failure classification (honest):** the 22 failures (rccf66 whatsapp-commerce, rccf68 tenant-retry flake, rccf70-4-3 dashboard render, rccf71-1/2/3/5.1/6.1 theme-chain source pins) read exclusively files modified by OTHER in-flight RCCFs (`dashboard-page.tsx`, `StorefrontPage.tsx`, `admin/settings/page.tsx`, renderers/theme/commerce runtimes). Verified decisively: the identical failures reproduce in a temp copy of this working tree with ALL MKT-02-R1 changes reverted. Zero overlap with this ticket's change set; none consume marketing surfaces.

## 8. Responsive & Accessibility Verification

Structural audit against repo conventions: all bands use the shared rhythm (`px-4 sm:px-8`, `py-20 sm:py-28`), grids collapse 1→2→3 columns at sm/lg, hero stacks below lg (preview hidden below lg — pre-existing convention), Grow progression renders vertically on mobile with connector arrows and horizontally on lg+, alternating showcase rows stack under sm, widest fixed element (224px label column) fits 320px viewports, tables none (comparison table removed). No horizontal-overflow-prone constructs introduced.

Accessibility: single H1 per page preserved; every band uses H2 with H3 children (heading skip fixed in homepage FAQ); HowItWorks duplicate-DOM heading sets eliminated (one semantic ordered list, CSS-only orientation); `role="list"`/`aria-label`s on grouped content; icons/connectors `aria-hidden`; all interactive elements remain native links/buttons; nav drawer semantics untouched; no contrast regressions (new muted text ≥ zinc-500).

SEO: canonicals added (/features, /about, /pricing via generateMetadata, /faq, blog posts); duplicated-brand titles eliminated (home absolute, pricing "Pricing"); OG/Twitter text reflects positioning; Organization schema description broadened truthfully. Deferred (documented, out of scope): sitemap additions for blog posts/guides/legal pages; per-page OG images beyond home; next/image adoption.

## 9. Protected Work (Phase 10)

- Working tree after edits: **81 modified tracked files = 61 baseline (byte-preserved) + exactly 20 from this RCCF.**
- New untracked files: exactly 5 (CoreIdea, PromoteBand, GrowBand, two test suites) + this closure doc.
- The 22 pre-existing full-suite failures were proven independent of this diff via isolated-copy reproduction (§7).
- Frozen surfaces untouched: checkout, Razorpay adapters, payment-account runtime, webhooks, refunds, commerce strategy registry, ProductOrder schema, fulfillment, DIRECT_CREATOR/PLATFORM_COLLECT, Prisma schema/migrations, builder, publishing, storefront renderer, Stitch assets.

## 10. Staged Files (Phase 11 — staged ONLY, not committed)

```
A  docs/rccf-mkt-02r1-marketing-positioning-homepage-closure.md
M  src/app/about/page.tsx
M  src/app/blog/[slug]/page.tsx
M  src/app/faq/page.tsx
M  src/app/features/page.tsx
M  src/app/layout.tsx
M  src/app/page.tsx
M  src/app/pricing/page.tsx
A  src/components/marketing/CoreIdea.tsx
M  src/components/marketing/BuilderShowcase.tsx
M  src/components/marketing/CreatorShowcase.tsx
M  src/components/marketing/FinalCta.tsx
A  src/components/marketing/GrowBand.tsx
M  src/components/marketing/Hero.tsx
M  src/components/marketing/HowItWorks.tsx
M  src/components/marketing/MarketingNav.tsx
M  src/components/marketing/Pricing/faq.tsx
A  src/components/marketing/PromoteBand.tsx
M  src/components/marketing/SectionTracker.tsx
M  src/components/marketing/SellAnything.tsx
M  src/components/marketing/StorefrontShowcase.tsx
M  src/lib/marketing/content.ts
M  src/lib/marketing/messaging.ts
M  tests/unit/rccf60-partner-pricing-truth.test.ts
A  tests/unit/rccf-mkt-02r1-homepage-structure.test.tsx
A  tests/unit/rccf-mkt-02r1-marketing-truth.test.ts
```

## 11. Screenshot Blocker — Deferred Asset Task

**MKT-02 Asset Replacement — Pending User Screenshots.**

Required future assets (canonical filenames confirmed — they match the currently-referenced paths):
- `public/marketing-assets/storefront/01-desktop.png` (desktop, ≥1440px wide)
- `public/marketing-assets/storefront/02-mobile.png` (mobile, 390×844-class)

Acceptance for supplied captures: successful Razorpay test-mode storefronts; no 404/error states; no internal RCCF/QA/probe tenants or content; visually presentable; genuine CreatorStore output.

Replacement locations when assets arrive:
1. Drop-in: hero (`src/components/marketing/Hero.tsx`) — same path, zero code change.
2. Drop-in: OG + Twitter (`src/app/layout.tsx`) — same path, zero code change.
3. Wire-up: `src/components/marketing/StorefrontShowcase.tsx` — desktop/mobile frame pair (in-file TODO documents the slots; currently typography-only by design).

Guardrails keep this honest until then: the truth test forbids rendering captures anywhere except the hero and forbids any non-canonical asset filename.

## 12. Recommendation

Proceed. The staged diff is marketing-only, fully guarded by regression tests, and reversible (retired components remain on disk). Release gate before shipping marketing: complete §11 asset replacement with user-supplied captures. Commit/push await explicit instruction.

**STOP.**
