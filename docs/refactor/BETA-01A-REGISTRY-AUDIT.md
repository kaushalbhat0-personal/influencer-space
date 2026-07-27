# BETA-01A — Registry & Rendering Integrity Audit

## Executive Summary

**Architecture health score:** 8/10 (structure is correct, runtime integrity has gaps)

**Functional health score:** 5/10 (storefront renders Unknown components for AI-generated sections)

The canonical rendering pipeline is architecturally correct. However, the LayoutEngine has a vocabulary gap: it passes AI-generation section types directly to the ComponentRegistry without resolving them to canonical registry IDs.

**Critical issues:** 1
**High issues:** 2
**Medium issues:** 3
**Low issues:** 2

---

## Registry Inventory

| Registry ID | Type | Renderer | Status |
|-------------|------|----------|--------|
| `hero.default` | hero | HeroRenderer | ✅ VALID |
| `hero.gaming` | hero | HeroRenderer | ✅ VALID |
| `hero.fitness` | hero | HeroRenderer | ✅ VALID |
| `hero.education` | hero | HeroRenderer | ✅ VALID |
| `about.default` | about | AboutRenderer | ✅ VALID |
| `gallery.grid` | gallery | GalleryRenderer | ✅ VALID |
| `products.grid` | products | ProductsRenderer | ✅ VALID |
| `timeline.default` | timeline | TimelineRenderer | ✅ VALID |
| `links.default` | links | LinksRenderer | ✅ VALID |
| `footer.default` | footer | FooterRenderer | ✅ VALID |
| `testimonials.default` | testimonials | TestimonialsRenderer | ✅ VALID |
| `faq.default` | faq | FaqRenderer | ✅ VALID |
| `contact.default` | contact | ContactRenderer | ✅ VALID |
| `newsletter.default` | newsletter | NewsletterRenderer | ✅ VALID |
| `pricing.default` | pricing | PricingRenderer | ✅ VALID |
| `courses.default` | courses | CoursesRenderer | ✅ VALID |
| `embed.spotify` | embed | SpotifyRenderer | ✅ VALID |
| `embed.youtube` | embed | YouTubeRenderer | ✅ VALID |
| `social.discord` | social | DiscordRenderer | ✅ VALID |
| `social.instagram` | social | InstagramRenderer | ✅ VALID |

**20 components registered.** All have renderers. No dead entries. No duplicates.

---

## Builder Vocabulary Audit

| Source | Section Type | moduleId Used | Registry Match |
|--------|-------------|---------------|----------------|
| Builder default store (`store.ts:60`) | Hero | `hero.default` | ✅ `hero.default` |
| Builder default store (`store.ts:67`) | About | `about.default` | ✅ `about.default` |
| Builder `insertComponent()` | (from registry) | registry ID | ✅ (matches) |
| AI Generation (`layouts/base.ts:33`) | featured_products | `featured_products` | ❌ `products.grid` expected |
| AI Generation (`layouts/base.ts:39`) | product_grid | `product_grid` | ❌ `products.grid` expected |
| AI Generation (`layouts/base.ts:44`) | content_feed | `content_feed` | ❌ No registry match |
| AI Generation (`layouts/base.ts:56`) | social_links | `social_links` | ❌ `links.default` expected |
| AI Generation (`layouts/base.ts:65`) | contact_form | `contact_form` | ❌ `contact.default` expected |
| AI Generation (`section-composer.ts:37`) | featured_products | `featured_products` | ❌ `products.grid` expected |
| AI Generation (`section-composer.ts:37`) | product_grid | `product_grid` | ❌ `products.grid` expected |

**Key finding:** The Builder is correct (uses registry IDs). The AI generation pipeline uses a SEPARATE vocabulary that was never mapped to registry IDs.

---

## Snapshot Audit

For AI-generated (onboarding) snapshots, sections stored in `layout.pages[].sections[].moduleId` contain the generation vocabulary:

| Generation Type | Stored in Snapshot as `moduleId` | Expected Registry ID |
|----------------|----------------------------------|---------------------|
| `featured_products` | `featured_products` | `products.grid` |
| `product_grid` | `product_grid` | `products.grid` |
| `content_feed` | `content_feed` | (no match — `timeline.default`?) |
| `social_links` | `social_links` | `links.default` |
| `contact_form` | `contact_form` | `contact.default` |

For Dashboard-published snapshots, sections use Builder vocabulary which IS canonical (e.g., `hero.default`, `products.grid`). These are correct.

---

## LayoutEngine Audit

**File:** `src/lib/storefront/layout-engine/LayoutEngine.ts`

The LayoutEngine passes `section.moduleId` directly from the snapshot to the StorefrontDocument without any resolution:

```typescript
sections: page.sections.map((section) => ({
  moduleId: section.moduleId,    // ← PASSED THROUGH, NEVER RESOLVED
  config: { ...section.config },
  ...
}))
```

**It does NOT call `resolveModuleId()`.** The old `extractSlots()` function (deleted in D3) did call `resolveModuleId()`, but the LayoutEngine doesn't.

**Impact:** If the snapshot contains `moduleId: "featured_products"`, the StorefrontDocument will contain `moduleId: "featured_products"`, and ComponentRenderer will fail to find it in the registry.

---

## ComponentRenderer Audit

**File:** `src/lib/renderer/index.tsx`

```typescript
const def = componentRegistry.get(componentId);
if (!def) {
  return <div>Unknown component: {componentId}</div>;  // ← THIS IS THE FALLBACK
}
```

When `componentId = "featured_products"`:
- `componentRegistry.get("featured_products")` → `undefined`
- Renders: `"Unknown component: featured_products"`

The registry has 20 components. None use underscores. All follow the pattern `{type}.{variant}`.

---

## Registry Consistency Matrix

| Builder Section | Snapshot `moduleId` | LayoutEngine Output | Registry Lookup | Renderer Exists | Status |
|----------------|---------------------|-------------------|----------------|-----------------|--------|
| Hero | `hero.default` | `hero.default` | `hero.default` | HeroRenderer | ✅ VALID |
| About | `about.default` | `about.default` | `about.default` | AboutRenderer | ✅ VALID |
| Gallery | `gallery.grid` | `gallery.grid` | `gallery.grid` | GalleryRenderer | ✅ VALID |
| Products | `products.grid` | `products.grid` | `products.grid` | ProductsRenderer | ✅ VALID |
| Featured Products (AI) | `featured_products` | `featured_products` | `featured_products` | ❌ NOT FOUND | **❌ BROKEN** |
| Product Grid (AI) | `product_grid` | `product_grid` | `product_grid` | ❌ NOT FOUND | **❌ BROKEN** |
| Content Feed (AI) | `content_feed` | `content_feed` | `content_feed` | ❌ NOT FOUND | **❌ BROKEN** |
| Social Links (AI) | `social_links` | `social_links` | `social_links` | ❌ NOT FOUND | **❌ BROKEN** |
| Contact Form (AI) | `contact_form` | `contact_form` | `contact_form` | ❌ NOT FOUND | **❌ BROKEN** |
| Links | `links.default` | `links.default` | `links.default` | LinksRenderer | ✅ VALID |
| Footer | `footer.default` | `footer.default` | `footer.default` | FooterRenderer | ✅ VALID |
| Testimonials | `testimonials.default` | `testimonials.default` | `testimonials.default` | TestimonialsRenderer | ✅ VALID |
| FAQ | `faq.default` | `faq.default` | `faq.default` | FaqRenderer | ✅ VALID |
| Contact | `contact.default` | `contact.default` | `contact.default` | ContactRenderer | ✅ VALID |

**5 broken paths, all originating from the AI generation pipeline.**

---

## Settings Data Flow — Hero Title

| Step | File | Value | Status |
|------|------|-------|--------|
| Settings UI saves | `settings.actions.ts` | `updateHeroPartial()` → `SET("hero_data")` | ✅ |
| Database | `Setting` table, key `hero_data` | `{ title: "Hello" }` | ✅ |
| WebsiteAggregateService | `website-aggregate.service.ts:30` | `hero.title = "Hello"` | ✅ |
| PublishedSnapshot | `PublishedSnapshot.content.hero` | `{ title: "Hello", ... }` | ✅ |
| LayoutEngine | `LayoutEngine.ts` | Does NOT extract hero content into section config | **❌ MISSING** |
| HeroRenderer | `renderers.tsx` | Receives `props` but hero title is NOT in config | **❌ BROKEN** |

**The LayoutEngine does NOT inject hero content into the hero section's config.** The `buildPages()` method only passes through `section.config` which comes from the builder layout config — NOT from `snapshot.content.hero`. So the hero renderer receives a config with `{}` (empty) instead of `{ title: "Hello", ... }`.

This is the second major issue — the LayoutEngine was designed to inject content into section configs but never implemented it.

---

## Builder Preview Audit

Builder preview uses `features/builder/preview/index.ts` which creates a preview frame. The Builder's main rendering (workspace) uses the same `ComponentRenderer` and `ComponentRegistry`. Both share the same rendering infrastructure.

However, the Builder preview may load data differently — it may read from `publishSnapshotService` or use its own snapshot format. This needs investigation but is out of scope for this audit.

---

## Dead Code Inventory

| File | Status | Evidence |
|------|--------|----------|
| `src/lib/builder/artifact-loader.ts` | **DEAD** | Entire file — `storefrontToBuilderPages()` only used by deleted builder artifact loading path. Zero current importers. |
| `src/lib/generation/composition/types.ts:2` | **ACTIVE** | `SectionType` union — still used by generation engine. The types themselves are valid generation types; they just need resolution to registry IDs. |

---

## Root Causes

### BUG-001 — LayoutEngine Missing Content Injection

**Issue:** Hero title, subtitle, CTA, and all business content from `PublishedSnapshot.content` is never injected into section configs.

**Evidence:**
- `LayoutEngine.ts` `buildPages()` at line: copies `{ ...section.config }` only — does NOT read from `snapshot.content`
- `HeroRenderer.tsx` receives config `{}` instead of `{ title: "Hello" }`
- The LayoutEngine design document specified content injection but it was never implemented

**Root cause:** The LayoutEngine was implemented as a transformation-only pass-through. The content merging step (matching section types to `snapshot.content.*` data) was scoped but never coded.

**Files:** `src/lib/storefront/layout-engine/LayoutEngine.ts`

**Runtime impact:** All business content (hero title, subtitle, CTA, products, gallery, links) appears as empty/placeholder in storefront rendering.

**Canonical fix:** The LayoutEngine's `buildPages()` must read `snapshot.content` and merge matching data into section configs:
- `moduleId` starts with `"hero."` → inject `snapshot.content.hero`
- `moduleId` is `"products.grid"` → inject `snapshot.content.products`
- `moduleId` starts with `"gallery."` → inject `snapshot.content.gallery`
- `moduleId` starts with `"links."` → inject `snapshot.content.links`

---

### BUG-002 — Generation Vocabulary Not Resolved

**Issue:** AI generation pipeline uses `featured_products`, `social_links`, `contact_form`, `product_grid`, `content_feed` as section types. The LayoutEngine passes these directly to ComponentRegistry which has no matching components.

**Evidence:**
- `src/lib/generation/composition/layouts/base.ts:33` produces type `"featured_products"`
- `src/lib/generation/composition/types.ts:2` defines `SectionType` union with these values
- `src/lib/registry/resolve-module.ts:17-20` has a COMPAT_MAP but it does NOT include `featured_products`, `product_grid`, `content_feed`, `social_links`, or `contact_form`
- LayoutEngine does not call `resolveModuleId()`

**Root cause:** The generation engine and the rendering registry evolved independently. Generation uses semantic section types (`featured_products`, `social_links`) while the registry uses canonical dotted IDs (`products.grid`, `links.default`). The bridge (`resolveModuleId`) existed but was never completed for all generation types, and is not called by the LayoutEngine.

**Files:**
- `src/lib/generation/composition/types.ts` — defines generation vocabulary
- `src/lib/generation/composition/layouts/base.ts` — produces these types
- `src/lib/registry/resolve-module.ts` — incomplete COMPAT_MAP
- `src/lib/storefront/layout-engine/LayoutEngine.ts` — doesn't call resolveModuleId

**Runtime impact:** Storefront renders "Unknown component: featured_products" (and similar) for sections created by the AI generation pipeline during onboarding.

**Canonical fix:** 
1. Add missing mappings to `COMPAT_MAP` in `resolve-module.ts`: `featured_products` → `products.grid`, `product_grid` → `products.grid`, `social_links` → `links.default`, `contact_form` → `contact.default`, `content_feed` → (needs a registry entry or map to `timeline.default`)
2. Have LayoutEngine call `resolveModuleId()` on every section's `moduleId` in `buildPages()`

---

### BUG-003 — Gallery Page Crashes

**Issue:** Gallery admin page crashes. Needs separate investigation but likely related to the dead `features/gallery/actions.ts` or `features/gallery/service.ts` that was deleted in REF-01B, while the gallery page (`admin/gallery/page.tsx`) still has dependencies.

**Evidence:** To be determined with a focused investigation.

---

## Recommended Fix Order

| Priority | Bug | Effort | Risk |
|----------|-----|--------|------|
| **P0** | BUG-002 — Generation vocabulary not resolved (LayoutEngine needs `resolveModuleId()`) | 30 min | LOW — additive change in LayoutEngine |
| **P0** | BUG-001 — Content not injected into sections (LayoutEngine needs to merge `snapshot.content`) | 1 hour | MEDIUM — changes LayoutEngine output |
| **P1** | BUG-003 — Gallery page crashes | Unknown | Unknown — needs investigation |

## Not Fixed (Intentionally Left)

- `src/lib/builder/artifact-loader.ts` — entire file is dead. Delete during next cleanup pass.
- `src/lib/registry/resolve-module.ts` — after BUG-002 fix, the COMPAT_MAP needs updating to include all 5 missing generation types. Do not remove `resolveModuleId` — it's needed by `rollback()` in snapshot.ts.
