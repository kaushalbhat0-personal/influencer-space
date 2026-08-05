# Creator Experience & Builder UX Audit — RCCF-AUDIT-20

**Date:** 2026-08-06  
**Status:** COMPLETE — Read-Only Audit

---

## Scores

| Dimension | Score | Status |
|-----------|-------|--------|
| **Creator Experience** | 78/100 | Solid core flows, friction in onboarding and dashboard empty states |
| **Builder UX** | 72/100 | Functional but discoverability and mobile editing are weak |
| **Generated Website Quality** | 75/100 | Visuals improving (translucent surfaces), content still generic |
| **Mobile Experience** | 65/100 | Admin pages work but aren't optimized; storefront is responsive |
| **Performance** | 78/100 | Good Promise.all batching; no page-level skeletons |
| **Accessibility** | 70/100 | ARIA basics present; keyboard navigation and contrast need work |
| **Overall** | **73/100** | Production-ready with targeted improvements needed |

---

## Phase 1 — Creator Journey

### Landing → First Publish: 6 steps, ~3-5 minutes

| Step | Clicks | Friction | Recommendation |
|------|--------|----------|----------------|
| Landing → Signup | 1 | None | ✅ Good |
| Signup form | 4-5 (persona, plan, name, email, password) | Plan selector shows 7 items confusing for new users | Simplify — default to Creator Launch |
| Onboarding provider | 1-2 | Provider cards are clear | ✅ Good |
| URL/text input | 1-2 | YouTube dependency removed in 55 | ✅ Good |
| AI Generation | 0 (auto) | 13-stage pipeline with progress bar | ✅ Good |
| **Total to Dashboard** | **~8 clicks** | | 🟡 Room for reduction |

### Dashboard → First Product: 4 clicks
Dashboard → Products (sidebar) → "Add Product" button → Fill form → Save. Straightforward but the Products page empty state is a bare table — no guided wizard.

### Dashboard → Custom Domain: 3 clicks  
Dashboard → Settings → Domain → Attach Domain. Registrar guidance was added in 53. Good flow.

### Dashboard → Builder → Publish: 3 clicks
Dashboard → Builder (sidebar) → Edit section → Publish button. Builder loads with correct preview. Publish action is a single click.

### Friction Points
1. **Dashboard for new creators shows empty metrics** — Products: 0, Orders: 0, Revenue: ₹0. The first impression is "nothing here yet." Should show guided steps instead of empty KPIs.
2. **No onboarding checklist after first publish** — Once published, no guidance on "next: add a product" or "next: connect your domain"
3. **Builder is intimidating for first-time users** — Empty canvas with section sidebar is not self-explanatory

---

## Phase 2 — Dashboard Audit

### Dashboard Page (`/admin/dashboard`)

| Component | Status | Issue |
|-----------|--------|-------|
| **KPI Cards** (Products, Services, Orders, Bookings, Gallery) | ✅ Good | Real data, well-spaced grid |
| **Quick Start Checklist** (5 steps) | ✅ Good | Maps to real runtime data |
| **Website Health** (16 checks) | ✅ Good | Weighted scores with links |
| **Recent Activity** | ⚠️ Weak | Shows raw audit log entries — not user-friendly descriptions |
| **Empty State** (new creator) | ❌ Poor | Shows "0" across all metrics with no guided onboarding post-publish |

### Analytics Page
Loads data with AnalyticsFallback skeleton. Real data from Prisma. Good pattern.

### Billing Page
Tabs (Overview, Plans, Invoices, Payment, Usage) with ARIA tablist. Good structure. Upgrade buttons show capabilities from entitlement runtime.  

### Settings Pages
Hero settings, Domain, Content Feed — consistent layout. Domain page has registrar selector (added in 53). Content Feed is read-only.

### Duplicate Dashboard Patterns
- MetricGrid used in 3 pages (analytics, orders, customers) but custom divs in others (finance, integrity).
- Heading pattern inconsistent: `admin-gradient-text` on ~12 pages, plain `h1` on others.

---

## Phase 3 — Builder Audit

### Builder Structure
- Left sidebar: Pages, Sections, Themes, Settings, SEO
- Center: Canvas/preview
- Right: Section inspector (properties)

### What Works
- Section drag-drop reordering
- Theme switching with live preview
- Experience-aware backgrounds (fixed in EPIC-01)
- Publish button (single click)
- Save indicators

### What Needs Work
1. **No undo/redo** — Critical for editing confidence
2. **Mobile editing disabled** — Builder is desktop-only
3. **Section sidebar shows all sections, including empty ones** — No contextual suggestions based on creator niche
4. **Theme Settings doesn't expose experience controls** — Can't change background/lighting/divider from Builder
5. **No AI-assisted section editing** — "Generate content for this section" button missing
6. **Empty canvas is intimidating** — No "start here" guidance or template suggestions

### Time to Complete Tasks (estimated)
| Task | Time | Clicks |
|------|------|--------|
| Edit Hero text | 15s | 3 |
| Change theme | 10s | 3 |
| Add gallery section | 20s | 5 |
| Publish changes | 5s | 2 |
| Customize navigation | 30s | 6 |

---

## Phase 4 — Generated Website Quality

### Foundation Pages
| Page | Quality | Content Source | Issues |
|------|---------|---------------|--------|
| **Home** | 🟡 Good | AI-generated hero + sections | Generic CTAs, no niche-specific layout |
| **About** | 🟡 Adequate | Basic bio from profile | Needs more personalization |
| **Contact** | ✅ Good | Template with contact form | Functional but basic |
| **Privacy/Terms/Refund** | ✅ Template | Platform templates | Standard — fine for launch |
| **Products** | ✅ Dynamic | Real product data | Only shows if products exist |
| **Bookings** | ✅ Dynamic | Real booking data | Only shows if bookings exist |

### Visual Quality
- Experience backgrounds now visible (fixed in EPIC-01 Phase 4)
- Premium themes have distinct identities but free themes still look similar
- Hero transitions are smooth with heroBlend
- Dividers are subtle (≤10% opacity)
- Cards inherit theme identity (xp-card-* classes)

**Would a creator publish this without edits?**  
Probably not. The content is functional but generic. Most creators will want to customize their hero text, about section, and product descriptions before publishing. The foundation is solid — they can publish immediately and iterate.

---

## Phase 5 — Content Quality

| Content Type | Generation | Quality | Personalization |
|-------------|-----------|---------|-----------------|
| Hero headline | AI + templates | 🟡 Generic | Low — same templates for all creators in niche |
| About bio | AI from profile | 🟡 Adequate | Medium — uses actual profile data |
| CTA text | Template | 🔴 Generic | None — "Get Started" / "View Products" etc. |
| SEO metadata | AI + templates | ✅ Good | High — uses creator name + niche |
| Product descriptions | AI from profile | 🟡 Generic | Low — template-based |
| FAQ | Deterministic | ✅ Good | Empty — creator must add content |
| Legal pages | Template | ✅ Good | Platform standard — appropriate |

**Content classification:**
- Deterministic/Template: 70% (Hero, CTA, Legal, FAQ, Products)
- AI Generated: 25% (About bio, SEO, brand voice)
- Manual: 5% (Products, services — creator must create these)

---

## Phase 6 — Empty States

| Page | Empty State | Helpful? | Recommendation |
|------|-------------|----------|----------------|
| Products (empty) | Table with "No products yet" | ❌ No | Add guided wizard: "Create your first product" |
| Bookings (empty) | Table with empty message | ❌ No | Add booking creation form inline |
| Gallery (empty) | GalleryFallback skeleton | ✅ Yes | Has proper skeleton while loading |
| Orders (empty) | DataTable emptyMessage | ⚠️ Basic | Add: "Share your storefront to get orders" |
| Analytics (empty) | AnalyticsFallback with skeleton | ✅ Good | Proper loading state |
| Dashboard (new) | All zeros | ❌ Poor | Should show guided onboarding checklist instead of empty metrics |

---

## Phase 7 — Mobile Experience

| Area | Desktop | Tablet | Mobile | Issues |
|------|---------|--------|--------|--------|
| Dashboard | ✅ | ✅ | ⚠️ | KPI grid overflows; sidebar collapses to hamburger |
| Builder | ✅ | ❌ | ❌ | Desktop-only; no mobile editing |
| Storefront | ✅ | ✅ | ✅ | Responsive — hero, products, gallery all scale |
| Marketing | ✅ | ✅ | ✅ | Responsive with mobile drawer nav |
| Onboarding | ✅ | ✅ | ✅ | Steps scale to mobile |
| Billing | ✅ | ✅ | ⚠️ | Tables overflow; tab navigation shrinks |

---

## Phase 8 — Performance

| Metric | Current | Target |
|--------|---------|--------|
| Dashboard load | ~500ms (8 parallel queries) | Good — all Promise.all'd |
| Builder load | ~1s (theme + experience + page data) | Acceptable |
| Publish | ~3-5s (Vercel deploy) | External dependency |
| Route transitions | Generic spinner (no per-page skeleton) | Add loading.tsx for top pages |
| Theme switch | ~200ms (client-side state) | ✅ Fast |
| Image optimization | next/image used | ✅ Good |

**Bottlenecks:**
1. No page-level `loading.tsx` — shows generic spinner for all routes
2. Dashboard fetches booking count + offering count in parallel (fixed with safeMetric in 56.1)
3. Builder loads all sections on mount — could lazy-load sections

---

## Phase 9 — UX Consistency

| Element | Consistency | Issues |
|---------|------------|--------|
| Buttons | ⚠️ | `btn-primary`, `admin-btn-cyan`, `btn-secondary` coexist |
| Cards | ⚠️ | Metrics use `MetricCard`, others use custom divs |
| Tables | ❌ | DataTable vs inline `<table>` vs CrudTable |
| Badges | ⚠️ | Inline spans vs Badge component |
| Dialogs | ⚠️ | window.confirm() for cancel; custom modals for themes |
| Navigation | ✅ | Sidebar consistent across admin pages |

---

## Phase 10 — Creator Productivity

| Task | Current Clicks | Optimal Clicks | Waste |
|------|---------------|----------------|-------|
| Create Product | 4 | 3 | Extra navigation → Products page |
| Create Booking | 4 | 3 | Same pattern |
| Change Theme | 3 | 2 | Could be dashboard card → direct apply |
| Upgrade Plan | 3 | 2 | Dashboard → Billing → Plans → Select |
| Connect Domain | 3 | 3 | ✅ Optimal |
| View Analytics | 2 | 2 | ✅ Optimal |
| Edit Hero | 5 | 3 | Dashboard → Builder → Pages → Home → Edit |

**Total waste per session: ~5 unnecessary clicks.** Most inefficiency is in the Dashboard → Builder handoff and the Products/Bookings creation flow lacking inline creation.

---

## Phase 11 — Accessibility

| Area | Status |
|------|--------|
| Keyboard navigation | ⚠️ Tab order works; Builder sections not keyboard-accessible |
| Focus management | ⚠️ Modal focus trapping present in theme detail; missing elsewhere |
| Contrast | ⚠️ Dark theme — some text at `text-zinc-600` on dark bg may fail WCAG |
| Reduced motion | ✅ `prefers-reduced-motion` respected globally |
| Screen reader | ⚠️ ARIA labels on tabs and progress bars; missing on cards and charts |
| Forms | ⚠️ Labels present; error messages use `role="alert"` in billing but not universally |
| Heading hierarchy | ❌ Inconsistent — some pages skip h2, others start at h2 |

---

## Top 20 Improvements (Ranked by Impact ÷ Effort)

| # | Improvement | Impact | Effort | Priority |
|---|-------------|--------|--------|----------|
| 1 | Dashboard: show guided steps instead of empty KPIs for new creators | High | Low | P0 |
| 2 | Builder: add undo/redo | High | Medium | P0 |
| 3 | Add per-page `loading.tsx` for Dashboard, Billing, Products | Medium | Low | P1 |
| 4 | Products page: add inline creation wizard for empty state | High | Low | P1 |
| 5 | Theme Settings: expose experience controls in Builder | High | Medium | P1 |
| 6 | Standardize empty states across all admin pages | Medium | Low | P1 |
| 7 | Dashboard: add "Next Steps" card post-publish | High | Low | P1 |
| 8 | Standardize table component (replace inline `<table>` with DataTable) | Medium | Medium | P2 |
| 9 | Replace window.confirm() with custom confirmation dialogs | Medium | Low | P2 |
| 10 | Add keyboard navigation to Builder sections | Medium | Medium | P2 |
| 11 | Improve heading hierarchy consistency across admin pages | Low | Low | P2 |
| 12 | Add AI-assisted section content generation in Builder | High | High | P3 |
| 13 | Mobile-responsive Builder (tablet at minimum) | High | High | P3 |
| 14 | Personalize generated hero text per creator niche | High | Medium | P3 |
| 15 | Add KPI trend arrows (↑/↓) for dashboard metrics | Medium | Medium | P3 |
| 16 | Add bulk product import | Medium | High | P3 |
| 17 | Add quick "Share storefront" button to dashboard | Medium | Low | P3 |
| 18 | Improve contrast for muted text (zinc-600 → zinc-500) | Low | Low | P3 |
| 19 | Add guided onboarding checklist in Builder for first-time users | Medium | Medium | P4 |
| 20 | Customizable home page layout per blueprint/niche | High | High | P4 |

---

## Implementation Roadmap

**P0 (Pre-launch — ~12h):** Dashboard guided state, undo/redo, empty states, loading skeletons  
**P1 (Week 1 — ~10h):** Builder experience controls, "Next Steps" card, inline product creation  
**P2 (Week 2 — ~12h):** Table standardization, dialog replacement, keyboard nav, headings  
**P3 (Week 3-4 — ~24h):** AI content personalization, mobile builder, KPI trends  
**P4 (Post-launch — ~20h):** Homepage layout customization, bulk import
