# RCCF-MKT-01 — CreatorStore Marketing Frontend Comprehensive Audit

**Type:** READ-ONLY audit + Stitch visual exploration. No source, content, route, or dependency changes were made.
**Date:** 2026-08-23
**Scope:** Public marketing frontend of the Next.js App Router app (`src/app`), marketing components (`src/components/marketing/**`), marketing data (`src/lib/marketing/**`), SEO surfaces (`layout.tsx`, `sitemap.ts`, `robots.ts`), plus live rendered verification via the running dev server (localhost:3000) at 320/390/1280/1440 widths.
**Verification:** `git status --short` captured before and after; repository left byte/state-equivalent to baseline (only this report added).

---

## 1. Executive Summary

The marketing frontend is **functionally healthy and visually coherent** — a consistent dark indigo/violet system, real design tokens, honest commerce claims (100% revenue keep, 15-day trial), working conversion paths (hero URL input → `/signup`, persona-based signup), runtime-driven pricing, JSON-LD on key pages — but it has three classes of problems:

1. **Proof is broken (P0).** The single most important trust asset — the "real storefront" screenshot — is actually a screenshot of the platform's own **404 "Creator Not Found" error page**. It appears in the hero ("Your storefront, live"), in the StorefrontShowcase section, **and as the site-wide Open Graph/Twitter share image**. Anyone sharing CreatorStore anywhere sees an error page. Two more visible copy defects compound this: UTF-8 mojibake ("â€\"") on `/features` and a broken duplicated sentence on `/about`.

2. **Positioning is narrower than the product (P1).** The homepage renders **19 sections**, six of which are near-identical icon-card grids repeating overlapping claims (build/sell/manage/grow). The dominant perception produced today is *"an AI storefront builder for Indian creators who sell things"* — e-commerce-leaning — not the intended broad platform where someone can *build a presence, showcase work, share what they offer, and sell when they want*. Sell is heavily emphasized; Build/Showcase/Promote/Grow are thin or missing.

3. **Content debt is accumulating (P1–P2).** Stale hardcoded prices in FAQ copy (₹999/₹1,995) contradict live runtime pricing (₹699/₹1,999); fabricated testimonials/stats exist as dead code waiting to be reintroduced; the About page claims "thousands of creators"; blog posts contradict the payment architecture ("No third-party payment gateways" vs Razorpay); two divergent FAQ datasets render with different heading levels on different pages; the pricing page title double-appends the brand name.

**Bottom line:** the architecture and design system are worth keeping. The next RCCF should (in order): fix proof/copy P0s → reposition the homepage around a coherent Build/Showcase/Sell/Grow narrative with ~8–9 sections → reconcile content with runtime truth → then polish. Stitch explorations A–D support this: Exploration D (refined current direction) and A (broad platform) are the strongest fits for the existing architecture.

---

## 2. Route Inventory

### 2.1 Public marketing routes (audited)

| Route | Source | Rendering | Nav | Footer | Sitemap | Canonical |
|---|---|---|---|---|---|---|
| `/` homepage | `src/app/page.tsx` | `force-dynamic` | ✔ | ✔ | ✔ p=1.0 | ✔ |
| `/features` | `src/app/features/page.tsx` | static | ✔ | ✔ | ✔ p=0.9 | ✖ |
| `/pricing` | `src/app/pricing/page.tsx` | `force-dynamic` | ✔ | ✔ | ✔ p=0.9 | ✖ |
| `/showcase` | `src/app/showcase/page.tsx` | `force-dynamic` | ✔ | ✔ | ✔ p=0.8 | ✔ |
| `/about` | `src/app/about/page.tsx` | static | ✔ | ✔ | ✔ p=0.6 | ✖ |
| `/faq` | `src/app/faq/page.tsx` | static | ✖ | ✔ | ✔ p=0.7 | ✖ |
| `/blog` (+ layout) | `src/app/blog/page.tsx` / `blog/layout.tsx` | static | own chrome | ✔ | ✔ p=0.7 | ✖ |
| `/blog/[slug]` ×3 | `src/app/blog/[slug]/page.tsx` | SSG (hardcoded) | own chrome | ✔ | ✖ missing | ✖ |
| `/blog/guides` (+ `[slug]`) | `src/app/blog/guides/*` | static | own chrome | ✔ | ✖ missing | ✖ |
| `/contact` | `src/app/contact/page.tsx` | `force-dynamic` | ✔ | ✔ | ✔ p=0.5 | ✔ |
| `/privacy`, `/terms`, `/refund` | legal pages | static | ✔ | ✔ | ✖ missing | refund only |
| `/signup` | `src/app/signup/page.tsx` | dynamic | none (own) | ✖ | ✔ p=0.9 | ✖ |
| `/claim-invite` | `src/app/claim-invite/page.tsx` | utility | own | ✖ | ✖ | — |

### 2.2 Routes that look public but are NOT marketing

- `/support` — internal role-gated Support Console (`SUPPORT`/`READ_ONLY`/`SUPER_ADMIN`). Not linked from marketing chrome. Correctly excluded from footer/nav.
- `/[domain]` (+ `[slug]`) — tenant storefronts (published creator sites), not platform marketing.
- `/onboarding`, `/purchase/[orderId]` — authenticated/commerce flows.
- `/admin`, `/agency`, `/super-admin`, `/builder`, `/dev` — application surfaces (disallowed in `robots.ts` ✔).

### 2.3 Shared marketing infrastructure

- **Nav/Footer/Section primitives:** `MarketingNav.tsx`, `Footer.tsx`, `Section.tsx` (`Section`, `SectionHeading`), `SectionTracker.tsx`.
- **Homepage sections:** `Hero`, `HeroInput`, `BeforeAfter`, `HowItWorks`, `AIDemo`, `PlatformOverview`, `SmartPlatform`, `CreatorJourney`, `BuilderShowcase`, `SellAnything`, `Manage`, `CreatorShowcase`, `StorefrontShowcase`, `Agency`, `FinalCta`, `PricingFAQ.tsx`.
- **Pricing suite:** `Pricing/index.tsx`, `data.ts`, `comparison.tsx`, `faq.tsx` (all under `components/marketing/Pricing/`).
- **Trust kit (mostly unused):** `trust/TrustBadges`, `TestimonialGrid`, `TestimonialCarousel`, `MetricGrid`, `CaseStudyGrid`, `StickyCTA`, `IntegrationLogos`, `ComparisonTable`; `AgencyFeatures/{index,data}` (unused).
- **Data/content:** `lib/marketing/messaging.ts`, `lib/marketing/content.ts`, `lib/marketing/trust/{logos,comparison,testimonials,types}.ts`.
- **Theme runtime:** homepage wraps trust bar/footer in `ExperienceSection` (`THEME_EXPERIENCES.aurora`) — the same experience pipeline used by storefronts.
- **Tokens:** `globals.css` (`--surface-*`, `--brand-primary/secondary/accent`, `--text-*`, `btn-primary/secondary/ghost/danger`, `admin-input/badge`, xp-surface utilities) + `tailwind.config.ts` (indigo/violet/amber ramps, legacy `s8ul.*`/`neon.*` aliases).
- **SEO:** root `metadata` + template in `app/layout.tsx`; per-page metadata; `sitemap.ts` (tenants + core pages); `robots.ts`; JSON-LD Organization (home), Product/AggregateOffer + FAQPage (pricing), FAQPage (faq page).

---

## 3. Page-by-Page Audit

Scoring: Strong / Good / Needs refinement / Weak / Problematic. Evidence = source + live render.

---

### Route `/` — Homepage

**Purpose:** Convert visitors into creator signups (primary) and partner signups (secondary); explain the platform.

**Current sections (actual render order, 19 `<section>` elements):**

| # | id | Component | Purpose | CTA |
|---|---|---|---|---|
| 1 | hero | `Hero` + `HeroInput` | H1 "Turn your content into a business.", 4 checkmarks, URL input | "Build My Storefront — Free" → `/signup?url=` |
| 2 | trust-bar | `IntegrationLogos` (ExperienceSection wrap) | Platform/payment logos (text) | — |
| 3 | transformation | `BeforeAfter` | Before/after table (store, products, checkout, brand, analytics) | — |
| 4 | how-it-works | `HowItWorks` | 4-step timeline (desktop + mobile variants both in DOM) | — |
| 5 | ai-demo | `AIDemo` | Simulated build animation (8 stages), reduced-motion aware | "Generate Your Storefront — Free" |
| 6 | platform | `PlatformOverview` | 8 feature cards | — |
| 7 | smart-platform | `SmartPlatform` | 6 capability cards (runtime-backed features in plain language) | — |
| 8 | creator-journey | `CreatorJourney` | 7-step journey grid | — |
| 9 | builder | `BuilderShowcase` | 6 builder feature cards | "Try the Builder Free" |
| 10 | sell | `SellAnything` | 8 offer-type cards | "Start selling — Free →" |
| 11 | manage | `Manage` | 6 dashboard cards | "Start building — Free →" |
| 12 | showcase | `CreatorShowcase` | 6 fictional niche creators, **empty preview placeholders** | link to `/showcase` |
| 13 | agency | `Agency` | 5 partner cards | "Start your partner journey — Free →" |
| 14 | (none) | `StorefrontShowcase` | 2 screenshots (**both are 404 screenshots**) | — |
| 15 | comparison | `ComparisonTable` | 15-row vs Link-in-Bio/Website-builders table | — |
| 16 | pricing | `Pricing` (tabs, cycle toggle, 3+enterprise, ComparisonMatrix, `Pricing/faq.tsx` 9-Q accordion w/ H3) | Runtime plans | plan CTAs → `/signup?plan=` |
| 17 | final-cta | `FinalCta` | Dual CTA | Creator / Partner |
| 18 | footer | `Footer` (ExperienceSection wrap) | Links + contact | — |
| 19 | — | `OrganizationSchema` | JSON-LD | — |

**UX assessment:**
- Clarity: **Needs refinement** — the offer is understandable by second 3 (hero is genuinely good), but the middle of the page dilutes it: sections 3–11 make the same promise eight different ways ("we build your store", "sell anything", "everything generated").
- Hierarchy: **Weak** — no section is visually distinct; six icon-card grids back-to-back produce scroll fatigue (verified in full-page capture).
- Credibility: **Problematic** — hero proof image is a 404 screenshot; CreatorShowcase shows empty gray placeholder boxes for fictional creators.
- Visual quality: **Good** — consistent tokens, decent spacing, tasteful gradients; monotony rather than ugliness is the issue.
- Conversion: **Good structure, Weak proof** — CTAs are frequent and consistent; the demo and input lower friction; broken imagery undermines close.
- Consistency: **Good** — one design language throughout.
- Responsiveness: **Good** — no horizontal overflow at 320/390 (live-verified); tables scroll internally.
- Accessibility: **Needs refinement** — see §12 (heading skips, dual-timeline duplicate headings, contrast of muted text).

---

### Route `/features`

**Purpose:** Full capability catalog; secondary conversion page.
**Sections:** Hero (H1 + Start Free / See Pricing) → "Why CreatorStore?" (7 VALUE_PROPOSITIONS cards) → 7 PLATFORM_CAPABILITIES checklist categories (Storefront, Products, Payments, Marketing, Management, Builder, Agency) → Final CTA → Footer.

**Findings:**
- **Visible mojibake (P0):** hero subhead renders "agency tools â€" all in one platform." and final CTA button reads "Generate My Storefront â€" Free". Metadata titles/descriptions contain the same corruption ("Features â€" CreatorStore"). Root cause: double-encoded em dashes in `features/page.tsx` (lines 10–14, 122) and `about/page.tsx` (11–15). Same corruption pattern exists in `messaging.ts` BRAND strings? No — messaging.ts is clean; corruption is limited to these two page files' inline literals.
- Content is a flat catalog — exactly what the positioning brief says to avoid — but it's the designated "catalog" page, which is acceptable if the homepage carries the narrative.
- No canonical, no og:image.

Scores: clarity Good · hierarchy Needs refinement · credibility Needs refinement (mojibake) · visual quality Good · conversion Good · consistency Good · responsiveness Good · accessibility Good.

---

### Route `/pricing`

**Purpose:** Plan discovery → signup with plan param.
**Sections:** Pricing suite only (tabs Creators/Partners, monthly/yearly toggle, 3 creator cards + Enterprise strip, partner explainer box with add-on economics and runtime-derived commission example, trust items, full ComparisonMatrix, FAQ).

**Findings:**
- **Title bug (P1):** page title renders "**Pricing — CreatorStore — CreatorStore**" — `page.tsx` metadata includes the brand while the root template `%s — CreatorStore` appends it again.
- **Stale price claim (P1):** metadata description says "paid plans from ₹999/month"; live Growth plan renders **₹699/month** (Scale ₹1,999). Hardcoded marketing copy must derive from runtime like everything else on this page already does.
- Strongest page architecturally: runtime pricing, honest partner economics, Product+FAQ JSON-LD derived from runtime (never hardcoded), tabs/toggle accessible (`role="tablist"`, `role="switch"` with aria-checked).
- "automation credits (coming soon)" inside the recommended card's description — honest, but reads oddly inside a paid-tier pitch.

Scores: clarity Strong · hierarchy Good · credibility Needs refinement (stale meta price) · visual quality Good · conversion Strong · consistency Strong · responsiveness Good · accessibility Good.

---

### Route `/showcase`

**Purpose:** Social proof via real published sites; search/filter by category.
**Sections:** Header → search form → category chips → Featured grid → All-sites grid → CTA "Build Your Website".

**Findings:**
- Data-dependent and currently nearly empty in practice: live DB returns **one record** ("Test Creator", `localhost:3000/testcreator`, category Lifestyle). The page's premise ("Every site is a real, published creator storefront") is good and honest — but with one test tenant it can't carry proof duty.
- Card thumbnails are gradient placeholders with the storefront URL in mono text — acceptable, but a real screenshot thumbnail would be far stronger.
- Uses `admin-input`/`admin-card` utility names on a public page (works fine; naming debt only).

Scores: clarity Good · hierarchy Good · credibility Weak (empty state) · visual quality Good · conversion Needs refinement · consistency Good · responsiveness Good · accessibility Good.

---

### Route `/about`

**Purpose:** Mission/story/values; humanize the platform.
**Sections:** Hero → Mission → Stats (CREATOR_STATS: 100% keep, 15-day trial, 8 platforms, <2 min — all verifiable claims ✔) → Story → Values → CTA.

**Findings:**
- **Broken sentence (P0):** CTA paragraph renders "Join creators turning their content into a business on CreatorStore.\ninto a real business." — leftover fragment after a copy edit (`about/page.tsx:100–103`).
- **Unsupported claim (P1):** story paragraph asserts "Today, thousands of creators use CreatorStore…" — contradicts the otherwise-honest stats approach and the near-empty showcase.
- Mojibake in metadata ("About â€" CreatorStore") — same encoding defect family as /features.

Scores: clarity Good · hierarchy Good · credibility Needs refinement · visual quality Good · conversion Good · consistency Good · responsiveness Good · accessibility Good.

---

### Route `/faq`

**Purpose:** Objection handling.
**Sections:** Single `PricingFAQ` block — 19 questions across 5 categories (Getting Started / Storefront & Builder / Products & Payments / Agency Features / Account & Billing), native `<details>/<summary>`, plus FAQPage JSON-LD (5 curated Q&As that differ from the visible set).

**Findings:**
- Answers are honest and specific (roadmap candor on memberships; white-label limits stated plainly). Good.
- Visible FAQ (19 Qs from `content.ts`) ≠ schema FAQ (5 Qs hardcoded in page) ≠ homepage FAQ (9 Qs from `Pricing/faq.tsx`) — three datasets, drift risk (see §8).
- Contains the stale-price answer (₹999/₹1,995) contradicting runtime ₹699/₹1,999.
- Not reachable from main nav (footer only).

Scores: clarity Strong · hierarchy Good · credibility Needs refinement (price drift) · visual quality Good · conversion Good · consistency Needs refinement · responsiveness Good · accessibility Strong (native details/summary).

---

### Route `/blog`, `/blog/[slug]`, `/blog/guides*`

**Purpose:** SEO/education content.
**Sections:** Minimal editorial chrome (no MarketingNav — intentional lightweight layout, but inconsistent with site chrome); post list; article pages render sanitized inline HTML.

**Findings:**
- Only **3 posts + 3 guides**, hardcoded in TSX. Fine for now; flagged as architecture choice.
- **Content contradiction (P1):** UPI post claims "No third-party payment gateways" — the platform uses Razorpay (a gateway). Also cites "90% of Indian digital transactions happen via UPI" without source.
- Posts dated 2026-06/07 (future-ish dates relative to launch reality) — cosmetic.
- Blog posts absent from `sitemap.ts`; no canonicals; no article body OG image.

Scores: clarity Good · hierarchy Good · credibility Needs refinement · visual quality Good (clean reading layout) · conversion Needs refinement (no in-article CTAs) · consistency Needs refinement (different chrome) · responsiveness Good · accessibility Good.

---

### Routes `/contact`, `/privacy`, `/terms`, `/refund`

**Contact:** clean two-column page (support info + form via `api/support/search`-adjacent client form), canonical present, honest SLA ("one business day"), single canonical email everywhere (good RCCF-LAUNCH-POLISH-05 discipline). Address block says "CreatorStore India Pvt. Ltd." — entity naming should be verified once against legal registration (noted, not asserted wrong).
**Legal pages:** well-structured, consistent chrome, correct canonical on /refund; /terms and /privacy lack canonical alternates. Refund policy aligns with FAQ answers (7–10 business days).

Scores: contact Strong overall; legal pages Good.

---

## 4. Homepage Deep Audit

### A. First-5-second comprehension

Live-render verdict at 1440×900:
- **What is it?** Understood fast: paste your social profile → get a storefront/business. ✔
- **Who for?** "Built for Indian creators" checkmark + UPI/Razorpay mentions — clearly Indian creators. Agencies appear later. Freelancers/consultants/educators are implied by SellAnything but never named in the hero zone.
- **What can I accomplish?** Sell products/services/bookings — clear. Build a general presence/website/portfolio — **undercommunicated** (the words "website"/"presence" barely surface above the fold; "storefront" dominates).
- **Why care?** "Keep 100% of every sale" — strong, concrete. ✔
- **What next?** Input + "Build My Storefront — Free" — unambiguous. ✔ (Caveat: button starts disabled until a URL is typed; first-paint state looks inert on mobile.)

Net: comprehension of the *ecommerce-flavored* story is fast; comprehension of the *broad platform* story is effectively zero in the first screen.

### B. Dominant perception produced today

Ranked by evidence weight (copy frequency × placement × visuals):
1. **E-commerce storefront generator for Indian creators** (dominant) — hero, BeforeAfter, SellAnything, Manage, comparison table, pricing framing.
2. Website builder (secondary) — BuilderShowcase, HowItWorks step 4.
3. Agency/partner platform (tertiary, one section + nav CTA).
4. Link-in-bio alternative (only via the comparison table's frame).
5. Broad presence platform (intended) — **not currently communicated**. Nothing showcases portfolio/work/profile as a first-class outcome; "Showcase" exists as a section name but shows storefronts-to-buy-from, not work portfolios.

### C. Capability hierarchy vs intended positioning

Visual emphasis today (card counts, order): Sell/Commerce ≈ 22 cards across 4 sections; Build/Builder ≈ 14 across 3; Manage/Dashboard ≈ 14 across 2; Grow ≈ 6 (SmartPlatform half) ; Showcase-work ≈ 0; Promote-links ≈ 1 line (affiliate). Against the intended Build→Showcase→Sell→Promote→Grow spectrum, Sell is over-weighted, Showcase-work and Promote are effectively absent, Grow is present but framed as product features ("readiness checks") rather than outcomes.

### D. CTA hierarchy

- Primary repeated: "Build My Storefront — Free" (hero), "Generate Your Storefront — Free" (demo), plan CTAs, FinalCta "Start as Creator". Consistent destination `/signup` ✔.
- Secondary: persona split Creator vs Partner is consistently maintained (nav, hero links, FinalCta, pricing tabs) ✔ — this dual-path is a genuine strength.
- Conflicting/weak: mid-page text-links alternate verbs ("Start selling — Free →" emerald, "Try the Builder Free" primary, "Explore demo storefronts" dead-endish) — minor verb drift, same destination.
- Dead/weak: CreatorShowcase cards' only action goes to an essentially empty /showcase (see P1 trust gap). AIDemo "Watch Again"/"Skip to Result" are fine utilities.

---

## 5. Audience Audit

**Individual creators (creators, freelancers, educators, coaches, consultants, artists):** Well served by tone and examples (fitness, tech, art, food niches in CreatorShowcase/SellAnything; TARGET_AUDIENCES list exists in dead code). India-specific trust handled concretely (UPI brands, Razorpay, INR). Gap: non-selling creators (portfolio/presence-first users) have no mirrored message; "services & bookings" is present but coaching/consulting is not named above the fold.

**Agencies/partners:** Represented honestly and proportionally: one homepage section, dedicated pricing tab with explicit economics ("clients pay CreatorStore directly… you charge service fees separately"), FAQ category, dedicated nav CTA. Partner messaging does NOT dominate — matches the architectural creator/partner split (`persona=creator|partner` throughout). Keep as-is; do not expand partner presence on the homepage.

**Unsupported personas:** TARGET_AUDIENCES (Talent Managers, Creator Studios) exists only in unused code — correctly not marketed. Do not promote until product supports them explicitly.

---

## 6. Capability Positioning Audit (Build / Showcase / Sell / Promote / Grow)

| Capability | Representation today | Verdict |
|---|---|---|
| **Build** (website/presence) | HowItWorks, BuilderShowcase, PlatformOverview, "custom domain" claims | Present but framed as *storefront building*; generic "your own website" framing is buried |
| **Showcase** (portfolio/work/profile) | Effectively absent — CreatorShowcase shows *stores*, not work; gallery/milestones exist in product but unmarketed | Missing — biggest gap vs broad-platform intent |
| **Sell** (products/services/digital/physical) | Dominant: hero, BeforeAfter, SellAnything, Manage, comparison, pricing | Over-emphasized relative to intent; keep strong but demote from "the whole story" to "one of the four things" |
| **Promote** (brand/social/affiliate links) | One affiliate card; integration logo strip implies it | Awkward/implicit — should stay secondary, but deserves one honest sentence somewhere |
| **Grow** (audience/customers) | SmartPlatform (runtime features), blog, "Grow" journey node | Framed as internal feature names translated to plain language; outcome-level growth story (SEO, custom domain, returning customers) is scattered |

Recommendation shape (for next RCCF, not implemented here): one narrative spine — *Create your space → Fill it with your work → Offer what you want → Grow on your own domain* — with Sell and Promote living inside steps 3–4 rather than as parallel feature lists. **Do NOT** turn the five capabilities into five equal cards.

---

## 7. Navigation Audit

**Desktop:** Logo (gradient wordmark, no mark/icon) · Features · Pricing · Showcase · About · Blog · Contact · Sign In · **Start as Creator** (primary) · Become a Partner (bordered). Fixed, blurred, skip-link present.

Findings:
- 6 links + 3 actions is crowded; mental model is a flat sitemap, not a story. "Features" and "Showcase" overlap conceptually; "Blog/Contact" are footer-weight items occupying prime nav.
- Two competing right-side actions ("Start as Creator" filled + "Become a Partner" outlined) splits attention at the highest-intent pixel location. Persona split is legitimate — but partner could be a quiet text link (Stitch D tests this).
- Sign In points to `/admin/login` — label mismatch with destination naming (admin console), though functionally correct.
- No dropdowns (fine at this size); active states + `aria-current="page"` ✔.

**Mobile:** hamburger → right drawer (backdrop, `role="dialog"`, `aria-modal`, Escape close, body-scroll lock, auto-close on navigate). Accessible and smooth (MotionSafe wrappers). Drawer repeats the same 9 items — long but scannable.

Verdict: **Needs refinement** — simplify to 3–4 links (Platform/Features, Showcase, Pricing, FAQ-or-Blog), single primary CTA, partner as text link, keep Sign In.

---

## 8. Content Audit (KEEP / REFINE / REWRITE / REMOVE / MISSING)

**KEEP (working, honest, differentiated):**
- "Turn your content into a business." + "Keep 100% of every sale" (hero) — concrete, ownable.
- CREATOR_STATS (100%, 15-day, 8 platforms, <2 min) — verifiable.
- Partner economics transparency (pricing tab explainer + computed example).
- FAQ roadmap honesty (memberships "not yet available"; white-label scope precisely bounded).
- POSITIONING.is/isNot in `messaging.ts` — excellent internal compass (currently unused in UI; keep as source of truth).

**REFINE:**
- Hero subhead: name the broader outcome early, e.g. keep storefront promise but acknowledge "website" ("launch a website and storefront you fully own").
- Section headers that repeat the same claim ("complete business platform" appears in ≥4 variants) — differentiate each band's job.
- Comparison table competitor column ("Linktree / Beacons / Stan" lumped as one) — pick ONE named comparator per column or anonymize ("Link-in-bio tools").
- "automation credits (coming soon)" inside paid-plan description — move to roadmap note.
- Blog UPI post gateway claim; future post dates.

**REWRITE (broken/wrong today):**
- /features mojibake strings (hero + CTA + metadata).
- /about broken CTA sentence; "thousands of creators" claim.
- /pricing metadata "from ₹999/month" → derive from runtime or drop numbers.
- FAQ answer prices (₹999/₹1,995) → align to runtime or remove figures.
- Blog "No third-party payment gateways" → "built-in Razorpay checkout".

**REMOVE / RETIRE:**
- Duplicate messaging bands: BeforeAfter vs CreatorJourney vs HowItWorks overlap heavily — collapse to one mechanism story + one outcome story.
- Fabricated assets kept in reachable code paths risk: `TESTIMONIALS` (named people, "3x sales" claims), `SOCIAL_PROOF_STATS` ("10,000+ storefronts", "5,000+ creators"). Both currently **unreferenced** — delete or quarantine behind a clearly-marked `PLACEHOLDER` export before they get wired in.

**MISSING:**
- Any real customer proof (testimonial, screenshot, metric) that is true today.
- Portfolio/showcase-of-work messaging (non-commerce presence).
- A "who it's for" moment beyond Indian-creator signals.
- Per-page canonical URLs and og:image outside root.
- Security/trust signals near money flows (Razorpay trusted-badge style note) — optional.

---

## 9. Design System Audit

**Typography:** Inter everywhere (Google Fonts import + Geist local fonts loaded in root layout but effectively unused by marketing — dual font loading is waste). Scale: display 6xl→4xl responsive; H2 4xl/3xl; body sm/base/lg; line-height relaxed. Weights 400–700. Tracking tight on headings. Verdict: **coherent, slightly monotone** (no display serif/accent face, fine for this brand).

**Color:** Near-black base (#0A0A0B) with zinc elevation ramp; brand = indigo #6366F1 → violet #8B5CF6 gradient accents; emerald reserved for checks/success; amber sparse. Text: white / zinc-400 / zinc-500 hierarchy. Contrast: primary text strong; recurring **zinc-500/zinc-600 small text on #0A0A0B sits near WCAG AA edge (~4.5:1 for zinc-500 ≈ pass, zinc-600 fails)** — used for captions/meta (e.g., "detected", timestamps, footer). Legacy aliases (`s8ul.*`, `neon.*`) retained deliberately with migration comments.

**Spacing/rhythm:** Sections uniformly `py-20 sm:py-28` with max-w-7xl containers — consistent but undifferentiated; no alternating density; 120px-equivalent rhythm everywhere makes long pages feel longer.

**Components:** Buttons (`btn-primary/secondary/ghost/danger`) tokenized to `--brand-*` with fallbacks ✔; inputs (`admin-input`) tokenized focus rings ✔; cards are hand-rolled `rounded-xl border-white/[0.06] bg-[var(--surface-base)]/*` — repeated ad hoc rather than extracted (six+ near-identical implementations); badges via admin-badge family; FAQ accordions native details/summary; nav drawer motion-safe.

**Visual language verdict:** premium-leaning, modern, calm, dark; creator-oriented but not influencer-loud; **generic-premium** rather than distinctive — nothing visually owns "CreatorStore" yet (no illustration style, no signature component, no photography). Cohesion: high. Distinctiveness: moderate-low.

---

## 10. Responsive Audit

Verified live (Playwright) + code inspection.

| Width | Result |
|---|---|
| 320px | No horizontal overflow; hero stacks; checkmark list single-col; CTA full-width; platform chips wrap to 2 lines. Clean. |
| 390px | No overflow; input stacks above button; disabled-state button reads inert at first paint (minor). |
| 768px | Grids collapse to 2-col; timelines switch to vertical variant ✔. |
| 1024px | Desktop nav appears (lg breakpoint); hero becomes 2-col. |
| 1280–1440px | Full layout; hero preview right; max-w-7xl containment holds. |

Notes:
- Comparison tables use `overflow-x-auto` + `min-w-[600px]` — functional mobile pattern (scrollable region, no page overflow), though affordance (scroll hint) is absent.
- Images: raw `<img>` with fixed-ratio PNGs scale fluidly; hero image hidden below lg (`hidden lg:block`) — mobile loses the visual proof entirely (compounds the 404-image problem being invisible on mobile, but also means mobile users get no proof).
- Footer/nav stack correctly at all widths.
- No `next/image` usage in marketing components (LCP/CLS debt, see §15).

---

## 11. Accessibility Audit

**Strong foundations:** skip-link; `main#main-content` landmark; `aria-label` on nav; `aria-current`; labeled search input (sr-only label); `role="list"` on bullet groups; icon buttons labeled; drawer dialog semantics + Escape + scroll lock; `prefers-reduced-motion` global override AND AIDemo's JS-side reduced-motion path; focus-visible rings via tokenized `--focus-ring`; native details/summary FAQs (keyboard-free wins); form controls labeled; decorative icons `aria-hidden`.

**Issues:**
- **P1 — Heading hierarchy breaks:** homepage FAQ heading is an H3 ("Frequently asked questions" in `Pricing/faq.tsx`) directly under H2 siblings — skipped level. Homepage has exactly one H1 ✔, but StorefrontShowcase section lacks any heading id and its H2 is unanchored (minor). HowItWorks renders desktop+mobile timelines simultaneously → duplicate H3 sets in DOM/screen-reader order.
- **P2 — Low-contrast muted text:** zinc-600 on #0A0A0B for meta text (fails AA for normal text); zinc-500 borderline. Affects timestamps, "detected" chip, some footers/legal smalls.
- **P2 — Icon-only meaning:** IntegrationLogos strip is text-only (fine), but BeforeAfter relies on arrow glyph semantics (has aria-hidden ✔, acceptable).
- **P2 — Mobile menu focus trap:** drawer traps scroll and closes on Escape, but no explicit initial-focus/focus-return implementation.
- **P3 — `details` chevron rotation animation** honors reduced-motion via global rule ✔; carousel components unused so N/A.
- **P3 — Language:** `lang="en"` ✔; INR amounts read naturally.

Classification summary: no P0 a11y blockers found; one P1 (heading structure/duplication), rest P2/P3.

---

## 12. SEO Audit

**Root (`layout.tsx`):** metadataBase ✔, default title + `%s — CreatorStore` template, strong description, robots index/follow, OG + Twitter with large image — **but the shared image is the 404 screenshot (P0)**.

**Per-page:** home (title/desc/canonical ✔, Organization JSON-LD ✔), pricing (Product AggregateOffer + FAQPage JSON-LD from runtime ✔, canonical ✖, title duplication bug), faq (FAQPage JSON-LD ✔ — but schema Q&A ≠ visible list), features/about (mojibake in metadata ✖, canonical ✖), showcase/contact/refund (canonical ✔), blog posts (generated desc from HTML-strip ✔, canonical ✖, not in sitemap ✖).

**Sitemap:** core pages + up-to-1000 tenants + published inner pages ✔; missing blog posts/guides + legal pages; `revalidate 3600` reasonable.
**Robots:** disallows admin/super-admin/agency/builder/api ✔; marketing all allowed ✔.
**Heading structure:** single H1 per page verified on home; section H2s logical except noted FAQ/H3 skip and duplicated timeline H3s.
**Structured-data honesty:** Organization schema is minimal and truthful ✔; pricing offers runtime-derived ✔ (good anti-stale pattern worth reusing for FAQ answers).

Missing/stale summary: canonicals on ~60% of pages; no per-page OG images; mojibake leaking into SERP snippets on two pages; title-template duplication on /pricing; three-way FAQ dataset drift (visible/schema/homepage).

---

## 13. Conversion Funnel Audit

**Primary journey (creator):** Landing (hero input) → Understanding (demo/how-it-works) → Trust (logos, comparison, pricing) → Interest (CTA repetition) → Signup (`/signup?persona=creator[&url][&plan]`) → Onboarding (`/onboarding`, separate surface) → First meaningful action (builder/publish — out of marketing scope).

Friction points:
1. **Proof collapse at decision time** — when a visitor compares plans (bottom of page), the adjacent StorefrontShowcase images show 404s (P0).
2. Hero CTA disabled-with-empty-input pattern adds one micro-friction on mobile (alternative "Start as Creator without a URL →" exists ✔).
3. Trust handoff gap: CreatorShowcase promises "explore demo storefronts" → /showcase contains one test record (P1).
4. Signup itself is a focused full-screen flow with runtime pricing ✔ (audited boundary-only).

**Separate paths (all exist, verified):**
- Visitor → creator signup: ✔ (nav, hero, demo, section links, final CTA, plan cards).
- Visitor → agency/partner signup: ✔ (nav outline CTA, hero alt link, Agency section, pricing tab, final CTA) — proportionate.
- Visitor → login: ✔ nav "Sign In" → `/admin/login`.
- Visitor → product discovery: ✔ /features (catalog) + homepage bands.
- Visitor → pricing: ✔ nav + repeated CTAs.
- Visitor → demo/example: ⚠ AIDemo simulation works, but real examples (/showcase) are empty — the "example" leg is the weakest.

No invented flows assumed; purchase/onboarding audited only as boundaries.

---

## 14. Component Reuse Map

| Component/Primitive | Defined | Used by |
|---|---|---|
| `MarketingNav` | marketing/MarketingNav.tsx | all marketing pages except blog chrome, signup, claim-invite |
| `Footer` | marketing/Footer.tsx | all marketing pages incl. blog layout |
| `Section`/`SectionHeading` | marketing/Section.tsx | SmartPlatform, CreatorJourney, ComparisonTable, features, about — **homepage's older sections bypass it** (hand-rolled identical markup) |
| `Pricing` suite | marketing/Pricing/* | homepage + /pricing ✔ (single source) |
| `PricingFAQ` (19Q, content.ts) | marketing/PricingFAQ.tsx | /faq only |
| `Pricing/faq.tsx` (9Q, local) | marketing/Pricing/faq.tsx | homepage only — **name-collision twin of the above** |
| `IntegrationLogos`, `ComparisonTable` | trust/ | homepage only |
| TestimonialGrid/Carousel, CaseStudyGrid, MetricGrid(trust), StickyCTA, TrustBadges, AgencyFeatures | trust/, marketing/ | **unused (dead)** |
| `TESTIMONIALS`, `SOCIAL_PROOF_STATS`, `MESSAGING_PILLARS`, `TARGET_AUDIENCES`, `HERO_OUTPUT_LINES`, `POSITIONING`, `FEATURES_HERO_DATA` | lib/marketing | **unused (dead)** — FEATURES_HERO_DATA duplicates features-page inline copy |
| `SEED_TESTIMONIALS` | lib/marketing/trust/testimonials.ts | exported, consumed nowhere (empty array) |
| btn-*/admin-input tokens | globals.css | marketing + admin + onboarding (shared system ✔) |
| ExperienceSection/theme runtime | modules/theme/runtime | homepage trust bar/footer + storefront renderer (shared ✔) |

Takeaway: the system has good bones (tokens, buttons, pricing, experience runtime shared) but marketing never consolidated its section scaffolding, leaving copy-paste drift (two FAQ twins, Section bypass, dead trust kit).

---

## 15. Technical Debt / Legacy Findings

1. **404 screenshot assets** shipped as marketing proof (`public/marketing-assets/storefront/*.png`) — capture pipeline wrote error-page screenshots; no freshness guard.
2. **Mojibake literals** in `features/page.tsx`, `about/page.tsx` (double-encoded em dashes) — likely a bad editor/encoding pass during RCCF-LAUNCH-POLISH-05 edits.
3. **Dual FAQ implementations** with colliding conceptual names (`PricingFAQ` vs `Pricing/faq`) and drifting datasets (19/9/5-schema).
4. **Dead fabricated content** in reachable exports (TESTIMONIALS, SOCIAL_PROOF_STATS) — landmine for future "add testimonials" tasks.
5. **Raw `<img>`** instead of `next/image` in Hero/StorefrontShowcase (LCP, no optimization; eslint-disable comments present acknowledging it).
6. **Geist fonts loaded but unused by marketing** (Inter imported via CSS) — redundant font payload.
7. **HowItWorks double-render** of both breakpoint timelines (DOM duplication).
8. **Legacy color aliases** (`s8ul.*`, `neon.*`) intentionally retained with migration notes — tracked, fine, but still referenced by contact/legal pages (`text-s8ul-cyan`).
9. **`force-dynamic` on homepage** for runtime pricing — correctness over speed; TTFB/ISR-hybrid is a future optimization, not a defect.
10. **Blog content hardcoded in TSX** — deliberate MVP choice; flag only.
11. `SectionTracker` references section ids ("grow", "faq") that don't all exist post-refactor — harmless analytics no-ops.

---

## 16. Stitch Exploration Results

Project: **CreatorStore Marketing — RCCF-MKT-01 Explorations** (`projects/6393499897600882752`, Google Stitch MCP). Explorations only — nothing was ported into the repo.

### Exploration A — Broad Platform (screen `6c0fee83…`)
"Your presence. Your business."
- **Hierarchy:** eyebrow badge → big two-line H1 → one-line promise → single input+CTA → reassurance. Very clear.
- **Hero composition:** left copy / right floating browser-frame mockup of a *personal homepage* (not dashboard) — communicates "presence" better than the current storefront shot.
- **Messaging density:** lowest of the four; platform strip + Build/Show & Sell/Grow triad replaces all six current grids.
- **Section rhythm:** 7 bands, generous air.
- **CTA placement:** single persistent action; no persona split in nav (partner omitted) — would need re-add for our dual-path requirement.
- **Trust:** quiet monochrome logos row.
- **Mobile adaptation:** trivially stacking; input-first hero suits mobile.
- **Architecture fit:** high — same tokens, input pattern maps to `HeroInput`, triad maps to a merged section. Risk: too abstract for commerce-motivated traffic; needs one concrete "and yes, you can sell" beat.

### Exploration B — Showcase + Sell (screen `7095178e…`)
"Show what you do. Sell what you make."
- **Hierarchy:** split hero with phone mockup showing priced product cards — instantly legible commerce story.
- **Visual storytelling:** strongest of the four; "From work to sale in one flow" 3-step UI fragments; 6-tile offer band replaces SellAnything's 8 cards elegantly.
- **Messaging density:** medium; concrete (prices shown in mockup).
- **Trust:** testimonial duo + "Keep 100% of every sale" reassurance in final band.
- **Fit:** high for the Sell axis; weakest for Build/Grow; would need pairing with a presence/build beat to avoid recreating today's e-com skew.

### Exploration C — Build + Grow (screen `18b900b6…`)
"Build it once. Grow it forever."
- **Hierarchy:** centered hero, growth chips orbiting browser mockup — communicates momentum.
- **Storytelling:** visitor-journey line (Arrive → Browse → Buy/book → Return) is the clearest Grow articulation of the four; "Built to be found" custom-domain/search-result mockup is a fresh, credible SEO visual.
- **Density:** low-medium; metric trio (100%/<2min/15-day) reuses our honest stats well.
- **Fit:** high; pairs naturally with existing BuilderShowcase/PlatformOverview content; least attention to Sell detail (one pricing teaser covers it).

### Exploration D — Refined Current Direction (screen `a6f4f8e6…`)
Same voice, fixed rhythm.
- Keeps headline/checkmarks/input/trust-line and dual-persona CTAs (partner demoted to text link).
- Replaces six grids with four distinct bands: profile→platform timeline, showcase screenshot+benefits, sell-chip cloud (compact, replaces 8 cards), dashboard mini-mockup.
- Reduced comparison table to ≤5 rows; tightened pricing cards; 120px rhythm; consistent eyebrow+H2+sub header system.
- **Fit:** highest — an evolution, not a rebrand; every band has a direct mapping to existing components (timeline≈CreatorJourney, chips≈SellAnything, dashboard≈Manage).

---

## 17. Stitch Recommendation Comparison

| Criterion | A Broad | B Show+Sell | C Build+Grow | D Refined |
|---|---|---|---|---|
| Fixes feature-dump | ★★★★★ | ★★★☆ | ★★★★ | ★★★★★ |
| Broad-platform positioning | ★★★★★ | ★★☆ | ★★★★ | ★★★☆ |
| Commerce credibility | ★★☆ | ★★★★★ | ★★★ | ★★★★ |
| Trust/proof treatment | ★★★ | ★★★★ | ★★★★ | ★★★☆ (depends on real screenshots) |
| Mobile adaptation | ★★★★★ | ★★★★★ | ★★★★ | ★★★★ |
| Fit w/ existing architecture | ★★★★ | ★★★★ | ★★★★ | ★★★★★ |
| Effort to implement | Medium | Medium | Medium | Low-Medium |

**Synthesis recommendation:** Direction **D as the structural chassis** (keeps brand voice, dual-persona CTAs, proven hero input; collapses 19→~8–9 sections) **with A's positioning language** ("Your presence. Your business." register — presence before commerce) **and B's product-truth moments** (priced offer tiles inside the Sell band) **and C's grow visuals** (journey line + custom-domain/search mockup) where real screenshots exist. In short: *D's skeleton, A's soul, B and C's best organs.*

---

## 18. Recommended Information Architecture (proposal only)

```
MARKETING SYSTEM (proposed)
│
├── Positioning
│     "Your presence, your business." — presence-first, commerce-capable,
│     India-ready. One sentence everywhere; no feature enumeration.
│
├── Navigation
│     Platform (was Features) · Showcase · Pricing · FAQ   [+ Blog in footer]
│     Sign In · [Start free — primary] · For partners (text link)
│
├── Homepage (8–9 sections — see §19)
│
├── Product/Platform explanation
│     /platform (= features, rewritten as narrative: Build / Show / Sell /
│     Grow chapters + honest capability checklist at the end)
│
├── Use cases / Showcase
│     /showcase powered by REAL published sites (screenshot thumbnails);
│     homepage showcase section only renders when ≥N real sites exist,
│     else falls back to one strong annotated example.
│
├── Social proof
│     Real screenshots (re-captured), real quotes or NONE; metrics limited
│     to verifiable claims (100% keep, 15-day trial, <2 min, 8 platforms).
│
├── Pricing
│     Existing runtime-driven suite (keep); fix title, meta price, FAQ prices.
│
├── FAQ
│     ONE dataset (merge PricingFAQ + Pricing/faq), H2 heading, schema =
│     visible set (or subset), price figures removed (link to live cards).
│
├── Conversion
│     Hero input (keep) · persona split preserved · demo kept (reduced-motion ✔)
│     · sticky mobile CTA optional later.
│
└── Footer
      Grouped columns: Product / Company / Legal / Contact + status of
      /support exclusion maintained.
```

## 19. Recommended Homepage Hierarchy (proposal only)

```
Header (simplified nav)
↓
Hero — presence-first headline, input CTA, real storefront visual (FIXED asset)
↓
Trust strip — platforms + payments (exists)
↓
"One home for everything you do" — Build / Show & Sell / Grow triad (new, merges 6 grids)
↓
How it works — single timeline (merge HowItWorks+CreatorJourney+BeforeAfter)
↓
Showcase band — real screenshot + benefits (alternating layout; replaces StorefrontShowcase)
↓
Sell band — compact offer chips + one priced example (slims SellAnything)
↓
Comparison (≤6 rows) → Pricing (existing suite) → FAQ (single dataset, H2)
↓
Final CTA (dual persona) → Footer
```

Sections consciously dropped/merged: AIDemo (fold into how-it-works as optional interactive), SmartPlatform (distribute one line each into triad), Manage (dashboard mini-mockup inside Sell/Grow band), Agency homepage section (move to /pricing partner tab + nav link — reduces homepage length without losing the path), PlatformOverview (absorbed by triad).

---

## 20. Priority Matrix

| Priority | Items |
|---|---|
| **P0 — blocks comprehension/conversion/trust** | ① Replace 404 screenshots in hero, StorefrontShowcase, and OG/Twitter images (recapture real storefront). ② Fix /features mojibake (UI + metadata). ③ Fix /about broken sentence. ④ Remove/replace unsupported "thousands of creators" claim. |
| **P1 — major positioning/UX** | ⑤ Restructure homepage 19→~9 sections per §18–19 (positioning repair). ⑥ Resolve stale prices (pricing meta, FAQ copy) against runtime. ⑦ Fix "/pricing — CreatorStore — CreatorStore" title. ⑧ CreatorShowcase placeholder-cards → real examples or conditional render. ⑨ Delete/quarantine fabricated TESTIMONIALS + SOCIAL_PROOF_STATS. ⑩ Blog gateway contradiction + unsupported stat. ⑪ Nav simplification (links + single primary CTA). |
| **P2 — meaningful refinement** | ⑫ Unify FAQ datasets + fix heading levels + dedupe timeline DOM. ⑬ Add canonicals to all marketing pages; per-page OG images; blog posts into sitemap. ⑭ Extract shared Card primitive; adopt Section everywhere. ⑮ Contrast pass on zinc-600 metatext. ⑯ next/image adoption for marketing imagery. ⑰ Mobile proof: show hero visual (or substitute) below lg. |
| **P3 — polish/future** | ⑱ Sticky mobile CTA. ⑲ Showcase screenshot thumbnails pipeline. ⑳ Font consolidation (drop Geist or use it). ㉑ Comparison-table scroll affordance. ㉒ Drawer focus management. ㉓ Blog CMS/data-file migration. |

**FIX NOW:** P0 ①–④ + P1 ⑥⑦ (small, isolated, high-leverage).
**FIX NEXT:** P1 ⑤⑧⑨⑩⑪ + P2 ⑫⑬.
**OPTIONAL:** remaining P2/P3.
**DO NOT CHANGE:** runtime-driven Pricing suite architecture · persona (creator/partner) split and its proportionality · design-token system & button/input primitives · ExperienceSection theming pipeline · honest-stats approach · /support role gating & its exclusion from marketing chrome · robots disallow set · signup/onboarding funnel mechanics · partner economics model & copy.

---

## 21. Final Recommendation

Proposed target architecture (derived, not forced):

```
MARKETING SYSTEM
├── Positioning — presence-first platform; commerce is a capability, not the identity
├── Navigation — 4 links, one primary CTA, partner as quiet path
├── Homepage — 9 sections: Hero → Trust → Triad → How → Showcase → Sell → Compare → Pricing+FAQ → Final CTA
├── Product explanation — /platform narrative + honest checklist
├── Use cases — real /showcase (conditional rendering until populated)
├── Social proof — only what is true today; expand as reality expands
├── Pricing — unchanged runtime suite, de-drifted copy
├── FAQ — one dataset, one heading level, schema synced
├── Conversion — hero input + persona split preserved end-to-end
└── Footer — grouped, legal-complete, admin link retained
```

### The three foundation answers (§22)

**1) After 10 seconds, a first-time visitor should believe:**
> "CreatorStore gives me my own professional home online — a real website with my name on it, built from who I already am online."

(Not "a tool that generates a shop." The shop is *inside* that home.)

**2) After 60 seconds, they should believe CreatorStore can help them become/do:**
> "Run my whole presence and business from one place I own — show my work, offer products/services/courses whenever I'm ready, get found on my own domain, keep 100% of what I earn, and grow without switching tools."

**3) Simplest positioning statement that does this without becoming a feature list:**
> **"Your presence. Your business."**
> Supporting line: *"One home online for your work, your offers, and your audience — free to start, yours forever."*

These three answers are the proposed foundation for the next RCCF (implementation phase).

---

## 23. Verification

- Baseline `git status --short`: captured (extensive pre-existing dirty/untracked state — untouched).
- Final `git status --short`: equivalent to baseline plus exactly one new file: `docs/rccf-mkt-01-marketing-frontend-audit.md`.
- No source modifications · no staged changes · no database changes · no commits · no pushes.
- Stitch explorations remain external to the repository (project `projects/6393499897600882752`).
- Live QA performed read-only against the already-running dev server (port 3000, reused, not restarted).

## 24. Stop Condition

Audit and Stitch exploration complete. **STOP.** No implementation begun; next RCCF awaits explicit authorization.
