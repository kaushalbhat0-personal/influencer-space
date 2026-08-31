# RCCF-72.4 — Creator Product Surface & Niche Readiness Audit

**Status:** Complete (audit only — no code, schema, billing, capabilities, plans, auth, publishing, Theme, Hero, Builder, or storefront changes; do-not-fix list honored)
**Date:** 2026-08-18
**Predecessors:** RCCF-72.0 (onboarding), RCCF-72.1 (workspace), RCCF-72.2 (navigation, S1–S9 open/untouched), RCCF-72.3 (storefront sections, F1–F2 open/untouched)

---

## 1. Executive verdict

This audit establishes the **complete product surface** a creator can reach after signup (32 admin surfaces), **which storefront sections are constructible end-to-end** (13 of 23 registered), **what each plan actually grants and enforces** (marketing capabilities vs. the effective feature matrix), **how navigation is generated** and why many sections are unreachable, and **whether the creator's "niche" drives anything at runtime** (it does not). It was done with **code-verified evidence** (canonical registries/configs/actions/snapshot/storefront) plus the **browser evidence already captured in 72.0–72.3**.

Headline results:

| Count | Value |
|---|---|
| Registered storefront sections | 23 |
| Constructible end-to-end (Builder addable + data surface + renders live) | 13 |
| Registered but no Builder UI affordance (10) | links, affiliateLinks, bookings, hero.gaming, hero.fitness, hero.education, embed.spotify, embed.youtube, social.discord, social.instagram |
| Registered sections with a renderer | 23 / 23 (all have renderers; the 10 above are UI-unreachable, not render-missing) |
| Admin product surfaces (nav) | 30 entries + 2 footer actions (32 total) |
| Content types with a live content model | 10 (products, gallery, services, courses, timeline, links, games, testimonials, faq, feed) + bookings (model exists, not constructible) |
| Niche values stored in the product | ≥16 observed across generation inputs (gaming, education, finance, technology, photography, fitness, food, travel, comedy, music, art, news, sports, lifestyle, default, general) |
| Niche consumers at runtime (Builder / storefront / snapshot) | **0** — niche is generation-time metadata only (S8 carried) |
| P0 / P1 / P2 / P3 (new this ticket) | 0 / 0 / 2 new / 2 new (+ carried F1–F2, S1–S9 from 72.2/72.3) |

Key conclusions:

- **The Creator product surface is broad but shallow at the edges.** 13 sections, 8 content managers, 30 admin routes exist; but multi-page (View-All links), nav coverage, bookings, and 10 registered sections are not constructible through the UI, and two admin write flows crash with a 500 + unhandled pageerror instead of a friendly error (F1, carried).
- **Sections are never capability-gated, only content writes are.** The Builder catalog is identical on every plan; per-plan limits are enforced server-side at write time (`content-limit.enforcement.ts` + actions) and baked into the published snapshot. Confirmed coherent.
- **Niche is a generation-time only signal (B-level metadata).** It is stored in `Setting.influencer_data.niche` at provisioning, consumed by the generation pipeline (layouts, personas, SEO, page composition, theme selection), but it is **not** persisted into `buildRuntimeSnapshot` and **not** read by the Builder or the storefront (which renders from the snapshot + the theme's own category). A "gaming" creator gets a generic storefront with the same 13 sections as an education creator. **S8 (72.2) is confirmed and intentionally not fixed.**
- **Plans scale monotonically and publish-quota is enforced** (Launch 3 lifetime → Growth 10/month → Scale/Enterprise unlimited); content limits scale 3→∞, 0→10→∞ (games), 0→20→100 (bookings), storage 20→100→300 MB.
- **Coherence risks are non-functional today:** `analytics_basic` and `seo` are base-granted to *every* plan (so Analytics/SEO show in nav for Launch too — observed in 72.1), `analytics_advanced` has no distinct runtime surface, and `ai_credits` is sold as a limit but is not enforced (AI generation is unlimited on all tiers, per `features.ts`).
- No P0/P1 this ticket. All 72.2 S1–S9 and 72.3 F1–F2 findings remain open and untouched, per the ticket's do-not-fix list.

---

## 2. Method

- **Code authority (this ticket):** `src/config/admin-nav.ts` (30 nav entries + gating), `src/config/commerce/plans.ts` (plans, capabilities, featureOverrides, `featuresForPlan`, `COMMERCE_CAPABILITY_TO_FEATURE`), `src/lib/capabilities/{constants,features,engine,limits,plans,nav-visibility}.ts`, `src/lib/publishing/publish-policy.ts`, `src/modules/billing/application/content-limit.enforcement.ts`, `src/lib/navigation/service.ts` (nav defaults), `src/lib/registry/components/{builtins,registry,renderers}.ts(x)` (23 sections, all with renderers), `src/features/builder/components/section-manager.tsx` (SECTION_CATALOG 13), `src/modules/provisioning/application/provisioning-service.ts:209` (niche write), `src/lib/storefront/build-snapshot.ts` (no niche), `src/components/storefront/StorefrontPage.tsx:148-152` (theme-category only), `src/lib/creation/industry/registry.ts` (8 industries), `src/lib/blueprint/providers/built-in.ts` (11 blueprints), `src/features/analytics/components` + `src/app/admin/analytics/page.tsx` (no capability gate), `src/features/{courses,services,bookings}/actions.ts`, `src/actions/{games,link,affiliate}.actions.ts`.
- **Browser evidence:** carried from 72.0/72.1/72.2/72.3 — accounts A (Launch), B (Growth), C (Scale); B's live v6 storefront verified at 320/375/390/1440; nav + admin surfaces observed in 72.1; F1/F2 captured in 72.3. No new browser work this ticket (all Phase 4/5/6/8/9 claims are code-verified).
- **Rules:** no fabricated content; no external integrations; `NOT_VERIFIED` where no browser evidence exists and the surface wasn't code-audited to completion; empty-state claims distinguish dev vs. production; no behavior changes.

### Accounts / tenants (carried from 72.3)

| Label | Plan | Tenant | Subdomain | Live | Notes |
|---|---|---|---|---|---|
| A | Launch | `147dc2d1-979a-48c3-b028-32f4d4af8950` | `rccf-720-audit` | v3 (unchanged) | quota 3/3; F1 captured here |
| B | Growth | `66941948-7f71-461d-aa26-db86598c945a` | `rccf7151-growth` | v6 | quota 6/10; workspace OWNER; F2 admin crash; 2 games live |
| C | Scale | `c1bd3249-4120-46b2-b25c-7a61b6db0a57` | `rccf7164-scale-1787027917475` | never published | draft v1 |

---

## 3. Master feature inventory

All 32 surfaces (30 nav entries + View Website + Sign Out) with status. Gating column = `requiredCapability` on the nav item (UX only; server gates remain authoritative).

| # | Surface | Route | Gated on | Status | Evidence |
|---|---|---|---|---|---|
| 1 | Dashboard | `/admin/dashboard` | — | READY | 72.1 browsed |
| 2 | Create Website | `/admin/create` | — | READY | 72.0 generation pipeline |
| 3 | Hero | `/admin/settings` | — | READY | 72.1/72.3, live hero |
| 4 | Gallery | `/admin/gallery` | max_gallery | READY | A 0/3; add+render in 72.1/72.3 |
| 5 | Content Feed | `/admin/settings/content` | max_feed | READY | server action exists; nav item present |
| 6 | Timeline | `/admin/milestones` | max_timeline | READY | A 2/3 renders |
| 7 | Testimonials | `/admin/testimonials` | max_testimonials | READY | A 1/3 renders |
| 8 | FAQ | `/admin/faq` | max_faq | READY | A 1/3 renders |
| 9 | Links | `/admin/links` | max_links | READY (data) | link.actions.ts:67; section dead-in-builder (S2/§4) |
| 10 | Games | `/admin/games` | max_games | READY | B 2 games, live v6 |
| 11 | Products | `/admin/products` | max_products | READY | A 2/3; Buy Now CTA |
| 12 | Services | `/admin/services` | max_services | PARTIAL | F1 throw pattern (services.actions.ts:29) |
| 13 | Courses | `/admin/courses` | max_courses | PARTIAL | F1 (courses.actions.ts:36, 500+pageerror) |
| 14 | Orders | `/admin/orders` | max_orders | NOT_VERIFIED | orders gate; no orders flow browser-tested |
| 15 | Customers | `/admin/customers` | max_orders | NOT_VERIFIED | same gate; no browser evidence |
| 16 | Bookings | `/admin/bookings` | max_bookings | PARTIAL/BROKEN | F2 crash (B); not constructible; Launch limit 0 |
| 17 | Payments | `/admin/payments` | — | READY | billing/payments surface exists |
| 18 | Builder | `/builder` | — | READY | add/save/publish verified end-to-end (72.3 v6) |
| 19 | Themes | `/admin/themes` | — | READY | theme selection verified (72.x) |
| 20 | Templates (Blueprints) | `/admin/blueprints` | — | PARTIAL | 11 blueprints, most `comingSoon` (see §8) |
| 21 | Appearance | `/admin/appearance` | — | READY | backgrounds verified (theme tickets) |
| 22 | Navigation | `/admin/website/navigation` | — | PARTIAL | S2 (one-shot generated nav) + S3 (contact anchor) |
| 23 | Analytics | `/admin/analytics` | analytics_basic | PARTIAL (coherence) | page loads for all plans; NO server capability gate; advanced surface missing |
| 24 | Messages | `/admin/messages` | — | NOT_VERIFIED | no browser evidence |
| 25 | Brand (Knowledge) | `/admin/knowledge` | — | NOT_VERIFIED | generation-time; no runtime surface evidence |
| 26 | Goals | `/admin/goals` | — | NOT_VERIFIED | no browser evidence |
| 27 | Account | `/admin/profile` | — | READY | 72.0/72.1 |
| 28 | SEO | `/admin/seo` | seo | PARTIAL | base-granted (see §12); page exists; no capability gate; not functionally verified |
| 29 | Domain | `/admin/settings/domain` | custom_domain | PARTIAL | Scale+ only; creator_subdomain is the default |
| 30 | Billing | `/admin/billing` | — | READY | upgrades/publish-quota surfaced |
| 31 | Notifications | `/admin/notifications` | — | NOT_VERIFIED | no browser evidence |
| 32 | Integrations | `/admin/integrations` | api_access | NOT_VERIFIED | Scale+ gate; no runtime surface evidence |

Status counts: **READY 17**, **PARTIAL 7** (Services, Courses, Templates, Navigation, Analytics, SEO, Domain), **PARTIAL/BROKEN 1** (Bookings), **NOT_VERIFIED 7** (Orders, Customers, Messages, Brand, Goals, Notifications, Integrations). *(17 + 7 + 1 + 7 = 32.)*

**Legacy/dead surfaces:** `creator_free/pro/elite` plan codes + `partner_*`/`agency_*` codes and the `LEGACY_PLAN_MAP` (STARTER/PRO/FREELANCER/GROWTH/ENTERPRISE) remain resolvable for tenant back-compat but have no signup path (registration is FREE-only via `getSignupEligiblePlans`). `RESERVED_PLAN_CODES` (`agency_enterprise`, `addon_ai`, `addon_storage`, `addon_team`, `addon_whitelabel`) are reserved but not implemented — **future**.

**Future/filler capabilities with no distinct runtime surface:** `marketplace_access`, `custom_components`, `bulk_publish`, `automation`, `multiple_brands`, `white_label`, `brand_removal`, `advanced_analytics` — granted to Growth/Scale marketing lists but no dedicated UI/runtime consumer found. **Filler** (design intent, not bug).

---

## 4. Section readiness matrix (23 registered)

Legend — Addable: in Builder `SECTION_CATALOG` (13). All 23 have renderers (`renderers.tsx`; 20 unique renderer functions, HeroRenderer shared by the 4 hero variants). L/S/C = Launch/Growth/Scale limits.

| Section | Addable | Limit L/S/C | Renderer | Live-verified | Readiness |
|---|---|---|---|---|---|
| hero.default | ✓ | — | ✓ | A v3, B v6 | READY |
| products.grid | ✓ | 3/∞/∞ | ✓ | A v3, B v6 | READY |
| gallery.grid | ✓ | 3/∞/∞ | ✓ | A (empty→hidden) | READY |
| timeline.default | ✓ | 3/∞/∞ | ✓ | A v3 | READY |
| testimonials.default | ✓ | 3/∞/∞ | ✓ | A v3 | READY |
| faq.default | ✓ | 3/∞/∞ | ✓ | A v3 | READY |
| courses.default | ✓ | 0/∞/∞ | ✓ | B v6 (empty→hidden) | READY (storefront) / **F1** (Launch write) |
| services.default | ✓ | 3/∞/∞ | ✓ | — | READY (storefront) / **F1**-pattern (Launch write) |
| games.default | ✓ | 0/10/∞ | ✓ | B v6 (2 cards) | READY |
| contentFeed.default | ✓ | 3/∞/∞ | ✓ | — | READY (renderer; nav item present) |
| newsletter.default | ✓ | — | ✓ | — | READY |
| contact.default | ✓ | — | ✓ | A v3 | READY |
| footer.default | ✓ | — | ✓ | A v3, B v6 | READY |
| links.default | ✗ | 3/∞/∞ | ✓ | — | **PARTIAL** — renderer+model+action exist, no UI affordance |
| affiliateLinks.default | ✗ | 3/∞/∞ | ✓ | — | **PARTIAL** — same pattern |
| bookings.default | ✗ | 0/20/100 | ✓ | — | **BROKEN end-to-end** — no add affordance, Launch=0, admin crashes on B (F2) |
| hero.gaming | ✗ | — | ✓ | — | **PARTIAL** — generation-emittable only |
| hero.fitness | ✗ | — | ✓ | — | **PARTIAL** — generation-emittable only |
| hero.education | ✗ | — | ✓ | — | **PARTIAL** — generation-emittable only |
| embed.spotify | ✗ | — | ✓ | — | **PARTIAL** — no add affordance, never emitted |
| embed.youtube | ✗ | — | ✓ | — | **PARTIAL** — no add affordance, never emitted |
| social.discord | ✗ | — | ✓ | — | **PARTIAL** — no add affordance |
| social.instagram | ✗ | — | ✓ | — | **PARTIAL** — no add affordance |

Readiness counts: **READY 13** · **PARTIAL 9** · **BROKEN 1** (bookings end-to-end). **13 constructible, 10 UI-unreachable.**

Nav coverage of sections (`navigation/service.ts` `generateDefaults`): hero, products, gallery, links, timeline, testimonials, faq, games, contentFeed (+ contact, S3). **Never surfaced in nav:** services, courses, bookings, affiliateLinks, newsletter, hero variants, embeds, socials — matches the reachability gap above (S2, carried).

---

## 5. Content model matrix

| Feature | Limit key | Store | Write gate | Notes |
|---|---|---|---|---|
| Products | max_products | `Product` | ✓ | Buy Now CTA live |
| Gallery | max_gallery | `GalleryImage` | ✓ | — |
| Services | max_services | `Offering(type=coaching)` | ✓ | F1 throw on Launch (services.actions.ts:29) |
| Courses | max_courses | `Offering(type=course)` | ✓ | F1 throw on Launch (courses.actions.ts:36) |
| Timeline | max_timeline | `TimelineEvent` | ✓ | — |
| Links | max_links | `AffiliateLink` | ✓ | section not addable (S2) |
| Games | max_games | `Game` | ✓ | friendly error UX (games.actions.ts:49) |
| Testimonials | max_testimonials | `Setting` key `testimonials` | ✓ | — |
| FAQ | max_faq | `Setting` key `faq` | ✓ | — |
| Feed | max_feed | `ContentFeedItem` | ✓ | — |
| Bookings | max_bookings | `Booking` | ✓ | not constructible (see §4) |

All 11 content models exist and all writes go through the server-side limit gate. The gate is **feature-consistent** across all content types (unlike the coarse UX-only nav gating).

---

## 6. Launch / Growth / Scale capability matrix (effective)

**Content limits (`featureOverrides` in `src/config/commerce/plans.ts`, canonical):**

| Feature | Launch | Growth | Scale | Enterprise |
|---|---|---|---|---|
| products/gallery/services/testimonials/faq/timeline/links/feed | 3 each | ∞ | ∞ | ∞ |
| courses | **0** | ∞ | ∞ | ∞ |
| games | **0** | 10 | ∞ | ∞ |
| bookings | **0** | 20 | 100 | ∞ |
| orders | 10 | 100 | ∞ | ∞ |
| ai_credits | 0 | 500 | 2000 | — *(not enforced, §12)* |
| storage | 20 MB | 100 MB | 300 MB | — |
| team members / api calls | 1 / 1000 (base) | 1 / 1000 | **10 / 10000** | — |
| hero video | 12 MB / 15 s (enabled) | same | same | same |

**Capabilities (`capabilities[]`, marketing + engine-derived):**

- **Launch:** basic_builder, basic_themes, creator_subdomain, theme_background_solid
- **Growth adds:** premium_themes, advanced_builder, ai_generation, social_integrations, priority_support, theme_background_gradient/image/animation, theme_effects_particles/glow/noise/blur
- **Scale adds:** custom_domain, advanced_ai, api_access, api_integrations, webhooks, live_social_sync, white_label, brand_removal, advanced_analytics, theme_background_video, theme_effects_custom

**Effective grants for every plan (via `BASE_FEATURES` in `src/lib/capabilities/plans.ts`, regardless of `capabilities[]`):** analytics_basic ✓, seo ✓, export_data ✓, basic_builder ✓, template_library ✓, navigation_editor ✓, media_storage ✓, max_messages 100, max_websites 1, max_api_calls 1000, custom_domain ✗, custom_branding ✗, remove_branding ✗, premium_themes ✗, api_access ✗, webhooks ✗, white_label ✗, automation ✗, bulk_publish ✗, custom_components ✗, api_integrations ✗, marketplace_access ✗.

**Publish quota (`src/lib/publishing/publish-policy.ts`):** Launch **3 lifetime** → Growth **10/month** → Scale/Enterprise **unlimited**. Verified metered in `PlanUsage` (B: 6/10 used Aug 2026).

**Scale boundary verdict (Phase 11):** strictly monotonic Launch → Growth → Scale for every limit and capability; no cap on pages/sections/nav-items (single-page product anyway). The only non-tier-differentiated capability is hero video (enabled on all three tiers with identical 12 MB/15 s limits).

---

## 7. Navigation readiness

- **Admin nav:** 30 entries across 6 groups; capability-gated UX-only via `isNavItemVisible` → `capabilityService.limit()` (`nav-visibility.ts`). `analytics_basic` and `seo` base-granted ⇒ Analytics/SEO visible on **all** plans (observed for Launch in 72.1).
- **Storefront nav:** generated at provisioning/nav-build by `generateDefaults` — hero, products, gallery, links, timeline, testimonials, faq, games, contentFeed + contact. Snapshot-backed, section-anchored.
- **Readiness issues (carried, untouched):** S2 — generated nav is effectively one-shot, no regeneration on content change; S3 — Contact anchor missing (nav link points at a nonexistent `#contact`); services/courses/bookings/affiliateLinks/newsletter/hero-variants/embeds/socials never appear in nav; multi-page absent so no cross-page nav exists.
- **Frozen:** nav generation, `navigation_editor`, and the storefront nav pipeline are not changed by this ticket.

---

## 8. Niche architecture

**Write path (provisioning, `provisioning-service.ts:209`):**

```
input.category || personalization.niche || sourcePlatformLabel || "general"
→ Setting { key: "influencer_data", value: { ..., niche, ... } }
```

**Consumers (generation-time only, driven by `kg.creator.niche`):** layouts/strategies, persona/registry selection, SEO composition, page composition, theme selection (the "gaming"/"education"/... variants in §4 are emitted here).

**Non-consumers (runtime):**

| Consumer | Read of niche? | Actual input |
|---|---|---|
| Builder catalog (`section-manager.tsx`) | **No** | static `SECTION_CATALOG` (13 items, identical for all plans/niches) |
| Storefront (`StorefrontPage.tsx:148-152`) | **No** | `snap.theme.packageId → themeRegistry.getById() → themeDef.category` |
| Published snapshot (`build-snapshot.ts`) | **No** | no niche field (0 matches for niche/industry) |
| Runtime renderers / nav | **No** | snapshot + theme category |

**Industry registry (`src/lib/creation/industry/registry.ts`):** 8 industries, in-memory, consumed only by the admin Create-Website wizard and client `recommendationEngine`. Not persisted as a runtime key.

**Blueprints (`src/lib/blueprint/providers/built-in.ts`):** 11 defined; most `comingSoon`; only `com.creatos.creator` is applied at provisioning (single generic layout — `hero.default, products.grid, gallery.grid, timeline.default, testimonials.default, faq.default, links.default, contact.default, footer.default`).

**`CreatorIntelligence.niche` (schema ~1359):** written by AI import/generation; no runtime storefront consumer.

---

## 9. Niche readiness matrix

| Question | Answer |
|---|---|
| Is niche stored? | Yes — `Setting.influencer_data.niche` (per-tenant) + `CreatorIntelligence.niche` |
| Niche values observed in product | gaming, education, finance, technology, photography, fitness, food, travel, comedy, music, art, news, sports, lifestyle, default, general (≥16; dataset v1 covers ≥11) |
| Does generation use it? | Yes — layout/persona/SEO/theme selection |
| Does the Builder use it? | **No** — static catalog |
| Does the storefront use it? | **No** — snapshot + theme category only |
| Is it persisted in the published snapshot? | **No** (`build-snapshot.ts` has no niche field) |
| Does any runtime surface vary by niche? | **No** |
| Runtime consumers of niche: **0**. Storefront-consumed "category" signals: 1 (theme category). | |

Verdict: **niche is generation-time metadata (B-level)**, confirmed as **S8** (carried, intentionally not fixed). A niche-aware storefront would require (a) persisting niche (or a derived `pageTheme`/variant id) into the snapshot at publish and (b) a renderer/section pipeline that keys off it — both out of scope.

---

## 10. Gap classification (P0–P3)

**P0:** none. **P1:** none.

**P2 (new this ticket — 2):**
- **N1:** 10 registered sections have no Builder UI affordance while their renderers/models/actions are complete → constructible only by generation; links/affiliateLinks/newsletter additionally have no nav coverage. (Bookings is the extreme: not addable, Launch=0, admin crash F2.)
- **N2:** `analytics_advanced` (Scale, "advanced_analytics") and `ai_credits` (0/500/2000) have no runtime enforcement or distinct surface — sold capabilities vs. effective behavior diverge (see §12). No code change this ticket.

**P2 (carried, untouched):** F1 (course/service write → 500 + unhandled pageerror, no UX), F2 (workspace-owner admin content-route crash, P-candidate), multi-page UI missing (View-All links unreachable), services/courses/bookings not in nav.

**P3 (carried, untouched):** S1 preview leak, S2 one-shot nav, S3 contact anchor, S4 footer legal links, S5 null href, S6 double title suffix, S7 legacy nav setting, S8 niche storefront gap, S9 dev latency.

**Product gaps (5, final):** (1) multi-page UI missing; (2) nav never covers services/courses/bookings/affiliateLinks/newsletter/hero-variants/embeds/socials; (3) bookings not constructible end-to-end; (4) 10 sections UI-unreachable; (5) niche not persisted to snapshot / not consumed at runtime.

---

## 11. Scale boundary

- Content limits, publish quota, storage, team/api (Scale 10/10000), and capability sets all scale strictly upward. No inversion found.
- hero video is identical across tiers (non-differentiated — benign).
- Publish metering is per-period (monthly for Growth) and lifetime for Launch; verified in `PlanUsage` (B 6/10).
- Nothing gates page/section/nav counts beyond the single-page product shape; no max-pages config exists (consistent with §10 multi-page gap).

---

## 12. Coherence findings

1. **Two sources of truth for "what a plan includes":** `COMMERCE_PLANS[].capabilities` (marketing) vs. `BASE_FEATURES + featuresForPlan + featureOverrides` (effective). `analytics_basic`/`seo`/`export_data`/`basic_builder`/`template_library`/`navigation_editor`/`media_storage` are base-granted to every plan yet absent from all creator `capabilities[]` arrays. Consequence: Analytics + SEO show for Launch (observed 72.1) — benign, but the marketing matrix is not the enforcement matrix.
2. **`analytics_advanced` has no runtime surface** — `/admin/analytics` does not check it (only `requireTenant`), and the page is identical for every plan. Sold as Scale-only, effectively universal.
3. **`ai_credits` is not enforced** — `features.ts` documents "no credit ledger exists; AI generation is currently unlimited for all tiers". Launch's 0 is cosmetic.
4. **Three names for AI:** capability `ai_generation`/`advanced_ai`, feature `ai_automation`, feature `ai_credits` — fragmented naming across marketing vs. engine.
5. **`webhooks`** is platform-managed inbound only; creator-configurable outbound webhooks are explicitly not implemented (`features.ts:145`). Marketing vs. reality documented inline — good.
6. **Nav gating is UX-only by design** — but for Analytics/SEO there is **no server gate at all** (route is tenant-only), so a Launch tenant can hit `/admin/analytics` directly even though it's marketed as a Growth+ item. Low severity (no data exfiltration; analytics are tenant-scoped) — **P-candidate**.

---

## 13. Security / authority sanity

Canonical authority chain confirmed end-to-end (no new runtime plan-code checks introduced; all enforcement is registry/DB-driven):

```
tenant (middleware + requireTenant)
  → plan (BillingPlan.subscription → capabilityService incl. runtime overrides)
    → content limits (content-limit.enforcement.ts counts, write-time)
      → server actions (courses/services/games/bookings/links/affiliate — all gated)
        → Builder mutation (builder.actions saveBuilderPages → BuilderService.save → Prisma)
          → publish quota (resolvePublishPolicy + PlanUsage metering)
            → buildRuntimeSnapshot (single-authority snapshot)
              → storefront (snapshot-only, zero live reads)
```

- All storefront content writes are tenant-scoped and limit-checked server-side. ✓
- Storefront is snapshot-only; no live DB reads in production render. ✓
- Nav gating remains UX-only; middleware/route guards are the authority. ✓ (one gap: §12.6 analytics/SEO route has no capability gate — P-candidate.)
- No secrets/config leaks, no new plan-code branching added.

---

## 14. Environment issues (dev, not product)

- **S9 (carried):** extreme dev latency / hydration failure — B's dashboard Publish button never hydrated (~60 s); Builder publish control worked. Documented, not fixed.
- **F2 (carried, P-candidate):** workspace-owner tenant B crashes on most `/admin/content/*` routes ("Rendered more hooks than during the previous render"), deterministic 8/8; Launch tenant (no workspace) unaffected. Dev-environment reproduction; production status unconfirmed.

---

## 15. P0 / P1 / P2 / P3 (final)

| Priority | Count | Items |
|---|---|---|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 4 (2 new, 2 carried) | N1 (10 sections UI-unreachable + no nav), N2 (analytics_advanced/ai_credits no enforcement), F1 (course/service write UX), F2 (workspace-owner admin crash, P-candidate) |
| P3 | 2 new + carried S1–S9 | N3 (analytics/SEO route has no capability gate — P-candidate), N4 (sections are never capability-gated, only writes — by-design note), S1–S9 (72.2, untouched) |

---

## 16. Product gaps (final)

1. Multi-page UI missing (View-All links unreachable).
2. Nav never covers services/courses/bookings/affiliateLinks/newsletter/hero-variants/embeds/socials.
3. Bookings not constructible end-to-end.
4. 10 registered sections UI-unreachable (links, affiliateLinks, bookings, hero.gaming/fitness/education, embed.spotify/youtube, social.discord/instagram).
5. Niche not persisted to snapshot / not consumed at runtime (S8).

---

## 17. Legacy / dead / future

- **Legacy:** legacy creator plan codes `creator_free/pro/elite` + `LEGACY_PLAN_MAP` (STARTER/PRO/FREELANCER/GROWTH/ENTERPRISE) remain resolvable for tenant back-compat; no signup path. (`partner_*`/`agency_*` are the separate current B2B family, not legacy.) Legacy nav Setting (S7) carried.
- **Dead-in-UI:** the 10 registered-but-unaddable sections (renderers/models/actions live, no product affordance).
- **Future:** `ai_credits` (no ledger), outbound webhooks, 10 `comingSoon` blueprints, `RESERVED_PLAN_CODES` addons (ai/storage/team/whitelabel/agency_enterprise), marketplace_access/custom_components/bulk_publish/automation/multiple_brands/white_label/brand_removal/advanced_analytics (granted, no distinct surface).

---

## 18. Recommended implementation sequence (for a future implementation ticket)

1. **F1 first** — replace `throw` with `{ success:false, error }` in `courses.actions.ts:36` / `services.actions.ts:29` and add catch-toast in managers (matches games UX). Smallest, highest-visible fix.
2. **Nav coverage** — extend `generateDefaults` to include services/courses when limits > 0; fix S3 contact anchor (carried, requires nav ticket).
3. **Expose the 10 dormant sections** in the Builder catalog (gated where needed) so the registered registry ≠ product surface again; reassess links/affiliateLinks/newsletter against intent.
4. **Niche → snapshot** (S8): persist `niche`/derived theme-variant into `buildRuntimeSnapshot` and let the storefront key off it — the only way niche becomes a runtime capability.
5. **Multi-page UI** — wire `builderStore.addPage` to a UI affordance so View-All links become reachable.
6. **Coherence cleanup** — reconcile `capabilities[]` vs. effective matrix; decide enforcement for analytics_advanced + ai_credits (or relabel marketing).
7. **F2 / S9** — investigate workspace-owner admin crash and dev hydration separately (P-candidate).

---

## 19. Frozen surfaces

Per ticket constraints, the following are frozen and unchanged this audit: preview leak (S1), nav generation (S2/S3), footer legal links (S4), niche runtime behavior (S8), courses/services error handling (F1), workspace-owner admin routes (F2), multi-page, plan/capability/publish config, auth/onboarding/billing, Theme/Hero/Builder/storefront.

---

## 20. Evidence log

- **Code:** `admin-nav.ts` (30+2 surfaces, gating), `plans.ts:133-341` (Launch/Growth/Scale configs), `plans.ts:677-701` (capability→feature map), `plans.ts:774-781` (`featuresForPlan`), `capabilities/{plans,engine,limits,features,nav-visibility}.ts` (BASE_FEATURES, resolve semantics), `publish-policy.ts` (quota), `builtins.ts` (23 sections, all with `renderer`), `renderers.tsx` (20 renderer exports), `registry.ts` (`getAll` non-deprecated), `section-manager.tsx:60-74` (13-item catalog), `provisioning-service.ts:205-209` (niche write), `build-snapshot.ts` (no niche — 0 matches), `StorefrontPage.tsx:148-152` (theme category only), `industry/registry.ts` (8 industries), `blueprint/providers/built-in.ts` (11 blueprints), `app/admin/analytics/page.tsx` (tenant-only, no capability gate), `features/courses/actions.ts:36` + `features/services/actions.ts:29` (throw pattern), `games.actions.ts:49` (friendly UX contrast), `content-limit.enforcement.ts` (counts/gates).
- **Browser (carried):** 72.0 generation, 72.1 workspace/admin nav, 72.2 navigation, 72.3 suite B2 (B v6 publish + live storefront at 320/375/390/1440; F1/F2 capture). No new browser work this ticket.

---

## 21. Final numbers

| Metric | Value |
|---|---|
| Features (admin surfaces) discovered | 32 |
| READY | 17 |
| PARTIAL (+ PARTIAL/BROKEN Bookings) | 8 |
| NOT_VERIFIED | 7 |
| Registered sections | 23 |
| Addable (constructible) sections | 13 |
| Registered but UI-unreachable sections | 10 |
| Content types with live model | 11 (incl. bookings) |
| Constructible content types | 10 (bookings excluded) |
| Capabilities per plan (marketing list) | Launch 4 · Growth 13 · Scale 22 |
| Effective base-grants common to all plans | 7 (analytics_basic, seo, export_data, basic_builder, template_library, navigation_editor, media_storage) |
| Publish quota | Launch 3 lifetime · Growth 10/mo · Scale ∞ |
| Niches discovered | ≥16 |
| Runtime niche consumers (Builder/storefront/snapshot) | 0 |
| Storefront category signals (theme category) | 1 |
| P0 / P1 / P2 / P3 | 0 / 0 / 4 / 11 (2 new P2 + F1/F2 carried; 2 new P3 N3/N4 + 9 carried S1–S9) |
| Product gaps | 5 |
| Environment issues (dev) | 2 (S9 latency; F2 workspace-owner admin crash — dev reproduction) |
| Legacy creator plan codes / aliases resolvable | 8 (creator_free/pro/elite + 5 LEGACY_PLAN_MAP keys) |
| Future-only capabilities/surfaces | 8 (marketplace_access, custom_components, bulk_publish, automation, multiple_brands, white_label, brand_removal, advanced_analytics) + addon reservations + comingSoon blueprints |
