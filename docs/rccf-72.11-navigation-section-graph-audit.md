# RCCF-72.11 — Navigation / Section Graph Reconciliation (Audit)

**Status:** COMPLETE (AUDIT ONLY — no app-code, no DB, no test, no commit, no push)
**Date:** 2026-08-20
**Ticket:** RCCF-72.11 (per RCCF-72.8 §12 combined-ticket recommendation)
**Predecessors:** RCCF-72.2 (S2/S3/S5/S7 source), RCCF-72.8 (Creator Remediation Consolidation), RCCF-72.3 (PG2), RCCF-72.4 (N1)
**Scope:** Section graph (registries/construction/rendering) ↔ navigation reconciliation; S2 + S3 as ONE architectural problem.

---

## 1. Executive Summary

S2 (stale one-shot auto-nav) and S3 (dead "Contact" anchor) are **two symptoms of a single
architectural divergence**: the Creator navigation is derived independently from the canonical
**section graph** and is never reconciled with it.

- **Navigation authority** = `Setting["navigation"]` (per-tenant, persisted), baked into the
  published snapshot at publish time.
- **Default generation** (`NavigationService.generateDefaults`) keys nav items off **content
  counts** (+ one unconditional Contact), NOT off what is actually **placed/rendered** in the
  Builder layout / resolved storefront document.
- **It runs once** (`getOrGenerate` returns the existing setting forever) → content additions
  never surface (S2); and it emits **Contact unconditionally** whenever a website exists → a
  dead anchor when no `contact` section renders (S3).

The fix direction is therefore NOT "patch individual links" but **derive navigation from the
canonical section graph** (the set of sections actually present and renderable in the resolved
storefront document), so nav can never expose a dead anchor or go stale.

**Historical numbers verified against CURRENT source:** 23 registered components (not 24), 13
Builder-constructible, 10 Builder-unreachable — the 72.4-N1 figures **still hold**.

**FINAL VERDICT: B — READY WITH DESIGN GAPS.** One product decision (auto-add nav items vs
manual-authority) must be locked before implementation. See §18.

---

## 2. Current Section Registry

There is **NO single canonical graph**. Three independent lists coexist and can diverge:

| Registry | File | Entries | Purpose |
|---|---|---|---|
| **Renderer registry** | `src/lib/registry/components/builtins.ts` (via `componentRegistry`) | **23** | Registered component ids; `renderer`, `category`, feature flags; `getAll()` |
| **Builder catalog** | `src/features/builder/components/section-manager.tsx` `SECTION_CATALOG` | **13** | What the Builder "Add Section" picker can construct |
| **Section Intelligence registry** | `src/modules/experience-intelligence/domain/section-registry.ts` | **15 bases** | priority / collapse-rule / content-check metadata for adaptive visibility |

Additional, disconnected lists:
- **Page/Foundation registry** (`src/lib/pages/registry.ts` → `runtime.ts`) — `PAGE_REGISTRY`,
  `generateNavigation`, `generateFooter`, `getNavPages`. **No runtime storefront consumer**
  (foundation/blueprint generation only). A 4th navigation-shaped source.
- **`NavigationService.generateDefaults`** (`src/lib/navigation/service.ts`) — its own inline
  section→anchor list keyed by content counts.

**Divergence examples (current source):**
- `pricing` is in the Section Intelligence registry but has **no renderer** (deprecated,
  `isDeprecatedSection("pricing.")` → true; dropped from layouts).
- `bookings`, `embed`, `social`, `affiliateLinks` bases have renderers but are **absent from the
  Section Intelligence registry** (so adaptive visibility knows nothing about them).
- `links.default` is registered + renderable + has a nav generator entry, but is **NOT in the
  Builder catalog** (not constructible via Builder).
- `hero.gaming/fitness/education`, `bookings.default`, `embed.*`, `social.*`,
  `affiliateLinks.default` are registered + renderable but **not Builder-addable**.

**Canonical chain (what actually drives the storefront):**

```
ComponentRegistry (renderers)          <- per-section metadata
   │
   ├─ Builder SECTION_CATALOG  → persisted Website/Builder layout (builderStore pages/sections)
   │                              ↓
   │                           publish snapshot (builderPages → snapshot.layout.pages)
   │                              ↓
   │                           LayoutEngine.buildPages / composeSectionConfig (resolve moduleId,
   │                              compose content, presentation, hasContent)
   │                              ↓
   │                           section-pipeline.resolveRenderableSections (filter hidden/empty)
   │                              ↓
   │                           StorefrontPage → ExperienceSection(id=base) + DataBoundRenderer
   │
   └─ NavigationService.generateDefaults → Setting["navigation"] → baked into snapshot.navigation
         ↓ (independent, content-count-driven)
      LayoutEngine.buildNavigation (verbatim) → StorefrontNav
```

**Conclusion:** the **component registry** is the closest to canonical for *what exists and
renders*, and the **Builder layout (persisted)** is the canonical *section graph of a given
tenant*. Navigation is derived from **neither** — it is derived from content counts.

---

## 3. Current Navigation Architecture

**Navigation authority:** `Setting["navigation"]` (key `navigation`), per tenant
(`tenantId_key` composite). Persisted, and baked into `snapshot.navigation` at publish
(`src/lib/publishing/service.ts:175` → `navigationService.getOrGenerate(tenantId)`).

**Pipeline (trace):**

```
Setting["navigation"] (or generateDefaults)
   ↓ getOrGenerate
persisted nav (one-shot; never regenerated if non-empty)
   ↓ publish (baked into snapshot.navigation)
LayoutEngine.buildNavigation(snapshot)  → filter visible, pass through verbatim
   ↓ resolveStorefrontNavigation(page-resolver)  → rewrites ONLY type==="page" hrefs; anchors untouched
   ↓ StorefrontNav (desktop + mobile)  → render anchors via scrollIntoView(#id), pages via href
```

**Every navigation surface:**

| Surface | Source | Transformation | Filter | Render | Notes |
|---|---|---|---|---|---|
| Storefront desktop nav | snapshot.navigation | LayoutEngine.buildNavigation (visible-only) | resolveNavHrefs (page only) | `StorefrontNav` desktop | anchor `href=undefined`, JS scroll (S5) |
| Storefront mobile nav | same | same | same + `slice(0,5)` cap | `StorefrontNav` mobile bottom bar | 5-item cap; no overflow |
| Admin nav editor | `getNavigation` → `getOrGenerate` | — | — | `NavigationManager` | anchors cannot be removed; reset re-derives |
| Admin sidebar | separate `ADMIN_NAV` (nav-visibility.ts) | capability filter | — | admin layout | NOT the storefront nav (different system) |
| Builder section picker | `SECTION_CATALOG` | registry-validated | — | `SectionManager` | 13 entries; NOT plan-gated (F4) |
| Foundation/blueprint nav | `pages/runtime.ts` `generateNavigation` | PAGE_REGISTRY | — | — | no runtime consumer |

**Hardcoded ids/labels/arrays found:**
- `NavigationService.generateDefaults` — inline list of `{ id, label, href:"#base" }` with
  hardcoded `#contact` (unconditional, S3) and a hardcoded `#hero` "Home".
- `StorefrontNav.NAV_ICON` — hardcoded icon map keyed by nav id (hero/about/products/gallery/
  links/contact/testimonials/faq/timeline/games/contentFeed). Ids not in the map render no icon.
- `resolveModuleId` COMPAT_MAP — base→module id aliases.
- `section-manager.tsx` `SECTION_CATALOG` / `EDIT_LINKS` / `CONTENT_LABELS` — three hardcoded maps.

---

## 4. Complete Section Matrix

All **23** registered components (`builtins.ts`), classified across every dimension.

Legend — Constructible: in Builder `SECTION_CATALOG` · Renderer: has `renderer` · Persistable:
has a LayoutEngine `composeSectionConfig` branch · Reachable-B: reachable from Builder picker ·
Reachable-S: reachable on storefront (rendered when placed) · Nav-gen: `generateDefaults` emits
an anchor · Plan: plan-affecting · Status: INTENTIONAL (renderer/legacy/generation) vs
GAP (registered but Builder-unreachable).

| Section id | Registered | Constructible | Renderer | Persistable | Reach-B | Reach-S | Nav-gen | Route | Plan | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| hero.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Home `#hero` | home | all | INTENTIONAL |
| hero.gaming | ✓ | ✗ | ✓ | ✓ | ✗ | ✓(if placed) | — | home | all | GAP (Builder-unreachable variant) |
| hero.fitness | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | — | home | all | GAP |
| hero.education | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | — | home | all | GAP |
| gallery.grid | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `#gallery` | home | all | INTENTIONAL |
| products.grid | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `#products` | home / `[slug]` | all | INTENTIONAL |
| timeline.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `#timeline` | home | all | INTENTIONAL |
| links.default | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | `#links` | home | all | GAP (renders Hero social; not Builder-addable) |
| affiliateLinks.default | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | — | home | all | GAP |
| footer.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | home | all | INTENTIONAL (no nav) |
| testimonials.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `#testimonials` | home | all | INTENTIONAL |
| faq.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `#faq` | home | all | INTENTIONAL |
| contact.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `#contact` (UNCONDITIONAL) | home | all | INTENTIONAL (S3 anchor source) |
| newsletter.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | home | all | INTENTIONAL (no nav) |
| courses.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | home | Launch=0 (disabled) | INTENTIONAL (no nav) |
| services.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | home | Launch=3 | INTENTIONAL (no nav) |
| bookings.default | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | — | home | Launch=0 | GAP (no intelligence entry) |
| embed.spotify | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | — | home | all | GAP |
| embed.youtube | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | — | home | all | GAP |
| social.discord | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | — | home | all | GAP |
| social.instagram | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | — | home | all | GAP |
| games.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `#games` | home / `[slug]` | all | INTENTIONAL |
| contentFeed.default | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `#contentFeed` | home | all | INTENTIONAL |

Additional registered-only / non-renderer entries:
- `pricing` (intelligence base only) — **no renderer**, deprecated prefix, dropped from layouts.
- `about.*` — deprecated prefix, dropped from layouts (Hero is identity).
- **Navigation-adjacent but non-section:** `navigation` appears in `ALWAYS_VISIBLE_SECTIONS`
  metadata but has no component id.

**Totals (current source):** Registered = **23** · Builder-constructible = **13** ·
Builder-unreachable = **10** — matches the historical 72.4-N1 numbers exactly.

**Dead-link exposure (the S2/S3 failure class):** a nav anchor is dead iff the nav emits it but
the corresponding rendered section is absent. `generateDefaults` keys on **content counts**, so
a nav anchor can be emitted even when:
- the section was **never placed** in the layout (products>0 but no `products` section), or
- the section is **filtered out** at render (adaptive visibility / hidden / empty), or
- it's the **unconditional `#contact`** with no `contact` section (S3).

---

## 5. S2 Root Cause

**S2 — "Navigation auto-generation is one-shot; it never regenerates as content grows."**

`NavigationService.getOrGenerate` (`src/lib/navigation/service.ts:89-93`):

```ts
async getOrGenerate(tenantId) {
  const existing = await this.get(tenantId);
  if (existing.length > 0) return existing;   // ← one-shot
  return this.generateDefaults(tenantId);
}
```

`generateDefaults` only runs when `Setting["navigation"]` is empty. Once a nav setting exists
(first publish), it is returned verbatim forever — never re-derived when the creator adds
products/gallery/timeline/etc. Publishing calls `getOrGenerate` (service.ts:175), so the stale
value is baked into every future snapshot.

**Why the item exists:** it was emitted at generation time from a historical content count.
**Where it comes from:** `generateDefaults` inline section→anchor list.
**Canonical entity it points to:** a section base (`#products`, `#gallery`, …).
**Can it be constructed/rendered:** possibly (content grew) but nav is never updated → **stale**.
**Does the route exist:** anchors are homepage-scoped; the base may or may not be rendered.

Creator recovery exists only via **manual reset** (`resetNavigation` → `resetToDefaults` →
`generateDefaults`), or manual edit in the nav editor.

---

## 6. S3 Root Cause

**S3 — "Dead 'Contact' nav anchor (no contact section)."**

`NavigationService.generateDefaults` (`service.ts:81-83`):

```ts
if (website?.id) {
  nav.push({ id: "contact", label: "Contact", href: "#contact", type: "anchor", ... });
}
```

Contact is appended **unconditionally** whenever a website exists, with **no check** that a
`contact` section is present in the resolved document. Storefront rendering gives each section
`id = moduleId.split(".")[0]` (`StorefrontPage.tsx:202`), so `#contact` only scrolls if a
`contact.*` section actually renders. On layouts without a contact section (e.g. Launch A:
hero/products/timeline/links/footer), the anchor targets a non-existent id →
`scrollIntoView` is a no-op → **dead link** (verified in 72.2: click → scrollY unchanged).

**Determination:** S3 is **not** a dead route and **not** a missing renderer. It is a
**navigation-vs-section-graph divergence**: nav emits an anchor for a section that is not in the
graph. It is the same root class as S2, differing only in trigger (unconditional emission vs
stale emission).

---

## 7. Shared Architectural Root

S2 and S3 are **one defect**: the navigation model is **not derived from the canonical section
graph** (the set of sections present + renderable in the tenant's resolved storefront document).
It is derived from:

1. **Content counts** (`generateDefaults` reads product/gallery/timeline/… row counts), and
2. **hardcoded unconditional entries** (`#hero` Home, `#contact` Contact).

Neither is reconciled against what the Builder layout actually places or what the render pipeline
actually renders. Concretely:

- Nav is generated from **"how much content exists"**, not **"which sections are on the page"**.
- Nav is **persisted and frozen** (one-shot), decoupling it from later content/layout changes.
- Anchors are keyed by **section base id** but nothing guarantees the base is rendered
  (`resolveAdaptiveVisibility`, `visible:false`, `shouldRenderSection` "auto"+empty, or simply
  "never added to layout").

The canonical graph already exists (Builder layout → snapshot → `LayoutEngine` → section
pipeline). Navigation simply never consults it. Fixing this one divergence resolves **both** S2
(regenerate from the graph) and S3 (only emit anchors whose section renders).

---

## 8. Intentional vs Accidental Unreachability

**Intentional (do NOT make nav-visible / do NOT add to Builder):**
- **Hero variants** (`hero.gaming/fitness/education`) — legitimately registered renderers; only
  `hero.default` is the canonical Builder hero. Variants exist for generation/AI. Not nav items.
- **`footer.default`** — a footer, never a nav anchor (correct).
- **`newsletter.default`, `courses.default`, `services.default`, `bookings.default`,
  `affiliateLinks.default`, `embed.*`, `social.*`** — real renderable sections but **deliberately
  not nav anchors** (nav is a curated top-level menu; sub-section navigation is not a product
  requirement today). They also are intentionally **not** in the Builder catalog in several cases
  (bookings/embed/social/affiliateLinks) — though this "intent" is not documented and may be a gap
  (see §16).
- **`pricing`, `about`** — deprecated / removed sections (no renderer). Correctly dropped.

**Accidental (the S2/S3 class — MUST be fixed):**
- Nav anchors emitted by content count that don't correspond to a rendered section.
- The unconditional `#contact`.
- Stale persisted nav that no longer matches the graph.

**Guiding principle (Phase 6):** navigation should expose **only sections intentionally
user-reachable and actually present+renderable in the graph** — NOT every registered renderer.

---

## 9. Plan / Capability Behavior

**Current state: navigation is NOT capability-gated.** `generateDefaults` performs no plan
checks; the storefront nav is snapshot-only (no plan reads at render); the Builder catalog is not
plan-gated (that is the separate 72.1-F4 finding, 72.14 ticket).

Per plan (canonical `src/config/commerce/plans.ts` featureOverrides):

| Section | Launch | Growth | Scale | Nav exposure today |
|---|---|---|---|---|
| hero / gallery / timeline / links / testimonials / faq / footer / contact / newsletter / embed / social | AVAILABLE | AVAILABLE | AVAILABLE | `#hero`, `#gallery`, `#timeline`, `#links`, `#testimonials`, `#faq`, `#contact` (by count/unconditional) |
| products | AVAILABLE | AVAILABLE | AVAILABLE | `#products` (by count) |
| games | AVAILABLE | AVAILABLE | AVAILABLE | `#games` (by count) |
| contentFeed | AVAILABLE | AVAILABLE | AVAILABLE | `#contentFeed` (by count) |
| services | LOCKED (limit 3) | AVAILABLE (∞) | AVAILABLE (∞) | — (no nav gen) |
| courses | UNSUPPORTED (limit 0) | AVAILABLE | AVAILABLE | — (no nav gen) |
| bookings | UNSUPPORTED (limit 0) | AVAILABLE | AVAILABLE | — |

**Finding:** because nav is derived from content counts + the rendered graph (post-fix) rather
than from plan checks, plan-blocked sections that **cannot render** will naturally produce **no
nav anchor** (e.g. a Launch tenant cannot add a courses section with content, so `#courses` never
appears). The canonical capability resolver should be consulted only to decide
AVAILABLE/LOCKED/HIDDEN for *Builder constructibility and nav* — never by adding plan-code checks.
**Recommendation:** the derived-nav fix should key off the **resolved section graph** (which is
itself plan-constrained at construct time), keeping nav free of direct plan-code branching.

---

## 10. Tenant Isolation

- **Admin nav load:** `navigationService.getOrGenerate(tenantId)` where `tenantId` comes from
  `getServerSession` → `session.user.tenantId` (`navigation.actions.ts` `requireTenant`). Scoped.
- **Persistence:** `Setting` row keyed `tenantId_key { tenantId, key:"navigation" }` — tenant-scoped.
- **Storefront nav:** read from the tenant's **own** published `snapshot.navigation` (baked at
  publish). No cross-tenant read.
- **Page-type nav** (`type:"page"`) resolves through `resolvePageBySlug` against the tenant's own
  document; an unknown slug → 404 (no fabrication, no leak).
- **No cross-tenant exposure found.** Nav (like all storefront data) is tenant-derived and
  snapshot-isolated. The only prior isolation gap (S1 anonymous preview leak) is a separate
  security ticket (72.9, already closed) and unrelated to nav derivation.

---

## 11. Mobile Behavior

- **Storefront mobile nav:** `StorefrontNav` mobile bottom bar, `visibleSections.slice(0, 5)`
  cap, `min-w-[48px]`/`min-h-[44px]` touch targets. No horizontal overflow observed at
  1440/390/375/320 (verified in 72.2 responsive matrix; `scrollWidth === clientWidth`).
- **Same data as desktop** (snapshot nav), so any dead/stale anchor affects both; the 5-item cap
  only trims, never fixes correctness.
- **Builder / admin sidebar:** independent systems; no new overflow introduced by nav changes.
- **This ticket does NOT redesign navigation visually.** The fix only changes *which items* are
  emitted (graph-derived), not the layout/styles. Mobile behavior (cap, no overflow) is preserved.

---

## 12. Exact Files Involved

**Navigation authority / generation:**
- `src/lib/navigation/service.ts` — `getOrGenerate` (S2 one-shot), `generateDefaults`
  (S3 unconditional Contact; content-count anchors), `save`, `resetToDefaults`.
- `src/actions/navigation.actions.ts` — `getNavigation`/`saveNavigation`/`resetNavigation`.
- `src/app/admin/website/navigation/page.tsx` + `_components/navigation-manager.tsx` — nav editor
  (manual override; anchors non-removable; reset re-derives).

**Publish / snapshot:**
- `src/lib/publishing/service.ts:175` — bakes `getOrGenerate` into snapshot at publish.
- `src/lib/storefront/layout-engine/LayoutEngine.ts:122` (`buildNavigation`), `buildPages`.
- `src/lib/storefront/page-resolver.ts` — `resolveStorefrontNavigation` (page-href only),
  `resolveNavHrefs`, `resolvePageBySlug`.

**Rendering:**
- `src/components/storefront/StorefrontNav.tsx` — desktop/mobile nav render (S5 anchors).
- `src/components/storefront/StorefrontPage.tsx` — `id = moduleId.split(".")[0]` (anchor targets).
- `src/lib/storefront/section-pipeline.ts` — `resolveRenderableSections` (render-time filter).
- `src/modules/section-presentation/application/runtime.ts` — `shouldRenderSection`,
  `sectionHasContent`, `isPermanentSection`.
- `src/modules/experience-intelligence/application/composition.ts` — `resolveAdaptiveVisibility`.

**Section registries / construction:**
- `src/lib/registry/components/builtins.ts` + `registry.ts` + `types.ts` — 23 registered.
- `src/features/builder/components/section-manager.tsx` — Builder `SECTION_CATALOG` (13).
- `src/modules/experience-intelligence/domain/section-registry.ts` — 15 intelligence bases.
- `src/lib/registry/resolve-module.ts` — `resolveModuleId`, `isDeprecatedSection` (about/pricing).
- `src/modules/section-presentation/domain/types.ts` — `OPTIONAL_SECTIONS`,
  `ALWAYS_VISIBLE_SECTIONS`.

**Disconnected generation sources:**
- `src/lib/pages/runtime.ts` + `registry.ts` — foundation/blueprint nav (`PAGE_REGISTRY`), no
  runtime consumer.

**Admin sidebar (separate):**
- `src/lib/capabilities/nav-visibility.ts` — `ADMIN_NAV`, `filterNavForPlan`, `isNavItemVisible`
  (unrelated to storefront nav; referenced for the matrix only).

---

## 13. Minimal Implementation Design

**Direction (evidence-supported): ONE canonical section graph → capability/plan filtering →
navigation model → Builder/storefront navigation.**

Smallest architecture-preserving change — **derive the auto-nav from the resolved section graph
instead of content counts**, and keep manual nav as an explicit override:

1. **Compute the tenant's canonical section graph at publish time** (the same source the
   snapshot uses): the Builder layout pages → `LayoutEngine` → the renderable-section set
   (module base ids after `resolveRenderableSections` filter, i.e. what will actually render).
   - No new DB schema. Reuse `buildPages`/`composeSectionConfig`/`shouldRenderSection`
     (or a lighter projection: "which section bases are present and non-hidden in the layout").
2. **`generateDefaults` builds nav from that graph** — one anchor per renderable section base
   (in graph order), dropping Contact unless a `contact` section is actually renderable, and
   dropping any content-count anchor whose base is not in the graph. This kills both S2 and S3:
   - S3: no Contact anchor when no contact section renders.
   - S2: nav is regenerated from the current graph at each publish.
3. **Reconciliation policy (PRODUCT DECISION — §18):**
   - Option A (auto-reconcile): at publish, if the nav setting matches the last generated shape
     (or is empty), regenerate from the current graph (keeps manual edits as overrides).
   - Option B (explicit regen only): keep one-shot but add a "stale" signal + one-click regen
     (smaller change; S2 remains until user acts).
   - Recommended: **Option A with an "edited" flag** — auto-add new graph anchors, never remove
     manual anchors, so the menu grows correctly and never silently drops user work.
4. **Storefront render:** keep `snapshot.navigation` as the authority (unchanged);
   `LayoutEngine.buildNavigation` stays verbatim. Optionally harden `StorefrontNav` to skip an
   anchor whose target `id` is absent (defense-in-depth) — but the primary fix is at generation.
5. **Do NOT:** add plan-code checks in nav; duplicate section lists; add route-by-route
   exceptions; delete renderers to hide links; redesign navigation visually.

**Scope guard:** touch only the nav generation path (`navigation/service.ts` + publish wiring +
a nav-editor stale hint). Leave `SECTION_CATALOG`, renderers, section pipeline, Builder, and the
23-registry untouched. The 10 Builder-unreachable sections and plan-gated catalog are separate
tickets (72.4-N1 / 72.1-F4 → 72.14), not this one.

---

## 14. Regression Test Plan

- **Navigation generation (new unit):**
  - graph with `contact` renderable → nav includes `#contact`; graph without → **no** `#contact`.
  - graph with `products` section + products>0 → `#products`; products>0 but **no products
    section** → no `#products` (S2/S3 class).
  - regeneration from changed graph: add a section → nav gains its anchor; remove/hide a section
    → anchor dropped (Option A) or stale-hint shown (Option B).
  - manual-edit override preserved (auto-add does not clobber user anchors).
  - order follows graph order (RCCF-AUDIT-10B parity preserved).
- **Publish wiring:** publishing bakes graph-derived nav; existing nav setting present →
  behavior per reconciliation policy.
- **Storefront render:** `LayoutEngine.buildNavigation` unchanged for existing snapshots;
  `resolveStorefrontNavigation` page-href resolution intact; anchor targets match rendered
  section ids.
- **Existing suites:** `storefront-loader.test.ts` (resolveStorefrontNavigation order parity),
  `experience-intelligence.test.ts` (adaptive visibility), section-presentation tests — must
  remain green.
- **Plan behavior:** Launch (courses disabled, services 3) — no phantom nav for unconstructible
  sections; Growth/Scale unaffected.
- **Tenant isolation:** nav generation scoped to the session tenant; no cross-tenant leakage.

---

## 15. Browser QA Plan

- **Launch tenant** with content but a sparse layout (e.g. products>0 but no products section):
  verify the storefront nav shows **no dead `#products`** and **no dead `#contact`** when absent.
- **Growth tenant** with a contact section: verify `#contact` renders and scrolls.
- **Add-content flow:** add a section in Builder → publish → nav auto-gains the anchor
  (S2 closed).
- **Manual override:** edit nav in the editor → publish → manual items preserved, new graph
  anchors added (no clobber).
- **Mobile:** 1440/390/375/320 — no horizontal overflow; mobile 5-item cap intact; no dead tap
  targets.
- **Storefront unchanged:** `/rccf-7164-scale-qa`, `/rccf7151-launch`, `/rccf7151-growth` render
  clean; 0 console errors.
- **Tenant isolation:** two tenants never share nav/content.
- **Restore:** QA fixtures (created sections/content) deleted; tenant state returned to baseline.

---

## 16. Deferred Findings

- **10 Builder-unreachable sections** (hero.gaming/fitness/education, links.default,
  affiliateLinks.default, bookings.default, embed.spotify/youtube, social.discord/instagram):
  registered + renderable but not in the Builder catalog. Intent for most is plausible
  (variants, sub-menus) but **not documented**; whether to expose some in the Builder (e.g.
  `links`, `affiliateLinks`, `bookings`) is a product decision for a separate ticket (72.4-N1
  umbrella / Builder-catalog work). Not this ticket.
- **`pricing`/`about`** deprecated sections — correctly dropped; no action.
- **`bookings`/`embed`/`social`/`affiliateLinks` absent from the Section Intelligence registry** —
  adaptive visibility has no content-check for them; today they render via `config.hasContent`
  in `composeSectionConfig`. Coherence cleanup, not navigation.
- **72.1-F4 (Builder catalog leaks Courses/Games to Launch) / 72.4-N3 (analytics/SEO route
  gates)** — separate capability-gating ticket (72.14). Nav fix must not preempt it.
- **S5 (anchors `href=undefined`)** — JS-only anchors remain; a hardening follow-up could give
  anchors real `href="#id"` and rely on native jump when the target exists. Out of the S2/S3
  reconciliation scope; optional polish.
- **`NAV_ICON`** map in `StorefrontNav` is hardcoded per nav id; if the graph ever surfaces new
  bases, icons should be registry-derived. Deferred.

---

## 17. Acceptance Invariants

1. Navigation exposes **only** sections that are present and renderable in the tenant's resolved
   section graph.
2. **No dead anchor**: every emitted anchor's target base renders on the published storefront.
3. **No stale nav**: nav reflects the current graph after publish (per chosen reconciliation
   policy); content additions surface; removals/hides don't leave dead links.
4. **Manual overrides preserved**: user-authored nav items (including page/external) are not
   silently clobbered by auto-generation.
5. **Order parity**: rendered nav order == persisted == published snapshot == live DOM
   (RCCF-AUDIT-10B invariant holds).
6. **No plan-code checks in nav**; plan-constrained sections that cannot render produce no anchor.
7. **Tenant isolation**: nav/content strictly per authenticated tenant; no cross-tenant exposure.
8. **No visual redesign**: desktop/mobile styles, 5-item cap, and zero-horizontal-overflow
   behavior unchanged.
9. **No renderer deletions, no section-list duplication, no route-by-route exceptions.**
10. **No unrelated working-tree changes absorbed**; surgical, architecture-preserving diff.

---

## 18. Final Verdict

**B — READY WITH DESIGN GAPS.**

The audit conclusively proves S2 and S3 share **one architectural root**: navigation is derived
from content counts (+ an unconditional Contact) and persisted one-shot, **never reconciled with
the canonical section graph** (the set of sections actually placed and rendered). The canonical
graph already exists (Builder layout → snapshot → `LayoutEngine` → `resolveRenderableSections`);
navigation simply never consults it. The historical registry figures (23/13/10) hold against
current source.

The implementation direction is clear and architecture-preserving (derive auto-nav from the
renderable section graph; keep manual nav as an override; no plan-code branching; no visual
redesign). It is **not** blocked on architecture (C) — the graph is already canonical enough to
derive from.

**Blocking product decision (D) before implementation:**
1. **Reconciliation policy** — on publish, should nav (a) auto-regenerate from the graph while
   preserving manual edits (recommended, closes S2 fully), or (b) only regenerate on explicit
   reset + show a "stale" hint (smaller change, S2 persists until user acts)? This must be
   locked to implement the fix correctly.
2. Confirm **manual nav is an intentional override** (auto-add new anchors is acceptable; auto-
   remove of user anchors is not).

Once 1 (and 2) are decided, RCCF-72.11 is ready for implementation with the §13 design.

**No code, DB, test, commit, or push made in this audit.**
