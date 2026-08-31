# RCCF-70.4.1 — Stitch → Repository Presentation Implementation Audit

## 1. Executive Verdict

**B — MAPPING COMPLETE; implementation MAY begin on a presentation-only basis.**

The validated canonical Stitch screen set (`Premium Creator OS`) was compared
against the live repository surfaces for all four targets. Findings:

- **Design tokens already map 1:1** (Stitch-DNA §4). The implementation is about
  consistent *application* of existing tokens, not new token definitions.
- **Products surface** has three concrete presentation-only gaps against Stitch
  (missing commerce-mode column, raw type-id labels instead of labels, no
  filters) — all resolvable without touching data/actions.
- **Builder surface** has the largest gap: Stitch's properties rail edits Hero
  **content** (headline/subtitle/actions/media), while the repo builder edits
  only presentation overrides. Closing it is feasible but requires the
  RCCF-70.4.7 product decision (see §8, §16).
- **Storefront surface** matches the strongest; only optional cosmetic additions
  and a few Stitch-only concepts that MUST NOT be copied (Sign In, footer
  Help/API links) were found.
- **Publishing** is already canonical (`publishWebsite()` +
  `getPublishFailurePresentation()` in both `AdminPublishControl` and
  `StorefrontStatusCard`) and must not be duplicated.

No fabricated analytics from rejected screens were used as reference. The
truth-clean Dashboard (`ab7028fa…`) is the only Dashboard reference.

No application code was modified. No commit was made.

---

## 2. Stitch References

| Item | Reference |
|---|---|
| Project | `projects/11634137981023354897` (Creator-Store) |
| Design system | `assets/1738427339068984141` — Premium Creator OS (DARK, INTER, ROUND_EIGHT, seed `#6366F1`, overrides `#6366F1`/`#8B5CF6`/`#F59E0B`) |
| Dashboard | `ab7028fa9f924830b7a623089f8e0789` ("Your Studio - Dashboard Overview", DESKTOP) |
| Products | `316007766d09424ea5c3899ad6089da9` ("Products Management - Premium Creator OS", DESKTOP) |
| Builder | `8f47c0820077419eadccfca5c9cf195a` ("Premium Creator OS - Builder (Desktop)", DESKTOP) |
| Storefront | `a11fd81adf414039a37b6fe351e7a1f2` ("Premium Creator Storefront - Desktop", DESKTOP) |
| Rejected reference | `735f886cd48c4800b260172af1f5ea16` (fabricated analytics) — NEVER a reference |
| Near-miss reference | `52c5009f5b1c4ffba72994f3d0ca9f7f` ("Stripe" help text, unsupported) — NOT a reference |

Stitch HTML for all four canonical screens was inspected directly in RCCF-70.3
and re-verified here. The embedded design MD ("Premium Creator Operating System"
direction: dark-first, high-density, Inter, 4px rhythm, controlled accent,
restrained gradients/glass/rounding) is documented in `docs/design/Stitch-DNA.md`
§3–§4 and matches this audit's token comparison.

---

## 3. Repository Surfaces

| Surface | Route | Page | Primary components |
|---|---|---|---|
| Dashboard | `/admin/dashboard` | `src/app/admin/dashboard/page.tsx` | `dashboard-page.tsx`, `admin-sidebar.tsx`, `admin-layout-client.tsx`, `StorefrontStatusCard`, many widget cards |
| Products | `/admin/products` | `src/app/admin/products/page.tsx` | `products-page.tsx`, `crud-table.tsx`, `feature-page.tsx`, `EditEntityDrawer` |
| Builder | `/builder` | `src/app/builder/page.tsx` → `loader.tsx` | `workspace.tsx`, `toolbar.tsx`, `sidebar.tsx`, `properties.tsx`, `interactive-canvas.tsx`, `mobile-panel.tsx` |
| Storefront | `/[domain]` | `src/app/[domain]/page.tsx` | `StorefrontPage.tsx`, `StorefrontNav.tsx`, `renderers.tsx`, `storefront-loader.ts` |

---

## 4. Dashboard Comparison

Stitch reference: `ab7028fa…` — structure: admin sidebar (Dashboard/Products/
Builder/Orders/Payments/Settings/Billing + Upgrade Plan), topbar (search,
brand, notifications), welcome heading, storefront status card (domain, Live,
"Last published just now", Open Storefront / Copy Link), four quick actions
(Create Product, Open Builder, Edit Appearance, View Orders, View Payments),
Recent Products empty-state ("Your products appear here." + Create First
Product), publishing card ("Publishing Active", plan copy), Platform
Capabilities card (Read Documentation / Visit Help Center), mobile bottom nav.

| Concern | Stitch | Repository | Match | Action |
|---|---|---|---|---|
| Sidebar nav | 8 items + Upgrade Plan | `admin-sidebar.tsx` capability-filtered nav (more items) | **MATCH** (superset) | Keep repo (capability truth). Apply token polish only. |
| Topbar | search, brand, notifications | WorkspaceSwitcher, ⌘K search, `AdminPublishControl`, Builder link, View site, bell | **PARTIAL** | Keep repo (richer, canonical). Align visual density. |
| Welcome | "Your Studio" heading | `FeaturePage` "Welcome back, {creator}" | **MATCH** | Keep repo (real creator name). |
| Storefront status | domain, Live, last-published, Open/Copy | `StorefrontStatusCard` (status, version history, usage, publish, restore) | **MATCH** (superset) | Keep repo — publishing UX is canonical (RCCF-70.6.5.x). |
| Quick actions | Create Product / Open Builder / Edit Appearance / View Orders / View Payments | 14 `QUICK_CARDS` tiles (Products/Bookings/Services/Courses/Gallery/Orders/…/Appearance/Billing/Settings) + "Open Builder" header link | **PARTIAL** | Repo already has quick cards; add a literal "Create Product" entry/action and "Edit Appearance" tile parity where missing. No new routes. |
| Empty state | Products empty-state with CTA | Dashboard has store empty banner ("Let's set up your store") | **PARTIAL** | Keep repo banner; optional wording polish. |
| Publishing card | plan copy ("unlimited publishes…") | `StorefrontStatusCard` + `publish-usage`/`publish-policy` dynamic messaging | **MATCH** (better) | Keep repo dynamic messaging. Do NOT hardcode Stitch's static "unlimited" copy (Launch=3, Grow=10, Scale=unlimited). |
| Capabilities card | Read Documentation / Help Center | Platform Capabilities present in repo? Not on dashboard; help exists in sidebar/settings | **PARTIAL** | Optional presentation-only addition (links to existing docs/help routes). |
| Metrics | none (truth-clean) | Real metrics (products/orders/revenue/bookings/gallery/avg order, health scores) | **MATCH** | Repo metrics are server-derived real data — NOT fabricated; keep. |
| Cards/typography/spacing | 4px rhythm, tonal surfaces, `#27272A` raised | `admin-card`/`GlassCard`/`admin-table` + token vars | **MATCH** | Token-consistent polish only (DS-5 radius). |

**Do NOT introduce:** fabricated revenue/order/storage/visitor/conversion numbers.
**Keep:** `StorefrontStatusCard` publish UX and `AdminPublishControl`.

---

## 5. Products Comparison

Stitch reference: `31600776…` — header "Products" + **Create Product**; search;
filters (Status: All/Active/Draft/Hidden; Type: Digital/Physical/Service/
Booking; Commerce: All/ONLINE/WHATSAPP/BOTH); table columns **Product | Price |
Commerce Mode | Status | Actions**; status badges; empty state "No products
found…".

| Concern | Stitch | Repository | Match | Action |
|---|---|---|---|---|
| Page header | "Products" + Create Product | `FeaturePage` "Products"/"Manage your products." + **"Add Product"** `btn-primary` | **PARTIAL** | Rename to "Create Product" (presentation-only). |
| Search | present | `CrudTable` client-side search on name | **MATCH** | Keep. |
| Status filter | All/Active/Draft/Hidden | **NONE** in live route; orphaned `ProductsToolbar.tsx` has status tabs; `buildProductWhere()` supports ACTIVE/INACTIVE/DRAFT/PUBLISHED/ARCHIVED | **MISSING** | Client-side filter over existing `initialData` (presentation-only). Do NOT build server-side filtering now (query layer frozen). |
| Type filter | Digital/Physical/Service/Booking | **NONE** | **MISSING** | Client-side filter (presentation-only) using `PRODUCT_TYPE_REGISTRY` labels. |
| Commerce filter | All/ONLINE/WHATSAPP/BOTH | **NONE** | **MISSING** | Client-side filter over `commerceMode` (presentation-only). Modes stay exactly ONLINE/WHATSAPP/BOTH. |
| Table columns | Product/Price/Commerce Mode/Status/Actions | Name/Status/Price/**Type(raw id)**/Actions — **no commerce column** | **PARTIAL** | Add Commerce Mode column (`ProductData.commerceMode` already exists — presentation-only). Render type via `PRODUCT_TYPE_BY_ID[type].label` ("Digital Product") instead of raw `"digital"`. |
| Status badges | Active/Draft/Hidden | `PUBLISHED`→default(grey), `DRAFT/ARCHIVED`→warning(amber) | **PARTIAL** | Repo status vocabulary (PUBLISHED/DRAFT/ARCHIVED) is authoritative — do NOT adopt "Hidden". Polish badge variant mapping (e.g. PUBLISHED→success). |
| Commerce badges | ONLINE/WHATSAPP/BOTH pills | badges only on storefront renderer, not admin table | **MISSING** | Add admin commerce-mode badges reusing existing mode constants. |
| Empty state | "No products found…" | `CrudTable` `emptyMessage` | **PARTIAL** | Keep; align copy with Stitch wording. |
| Create/edit | create button + row actions | Pencil+Trash icons → `EditEntityDrawer` | **MATCH** | Keep. |
| Mobile | table | `div.overflow-x-auto` horizontal scroll; no card view | **PARTIAL** | Optional responsive card treatment (presentation-only). |

**Commerce modes remain EXACTLY ONLINE/WHATSAPP/BOTH** (`src/config/commerce/commerce-mode.ts`). No additional modes.

---

## 6. Builder Comparison

Stitch reference: `8f47c082…` — header (Pages/Assets/Library, Save, Publish),
left sections rail (Hero, Featured Products, Newsletter, Footer + Layout/Themes/
Data/Logic/Help/Feedback icons), device switcher (desktop/tablet/smartphone,
"1440 × 900"), storefront URL, canvas with **Hero section rendered**, right
properties rail editing **Hero: Content (Headline, Subtitle), Actions (Primary
Button, Link To Select Page), Media (Background Image upload, recommended
2880×1620, max 5MB), Overlay Opacity**.

| Concern | Stitch | Repository | Match | Action |
|---|---|---|---|---|
| Workspace shell | toolbar + left rail + canvas + right rail | `workspace.tsx`: `BuilderToolbar` + `ResizablePanel(left)` + `InteractiveCanvas` + `ResizablePanel(right)` + mobile bar/sheets | **MATCH** | Keep structure. |
| Left rail | Sections list + Add Section + tool icons | `BuilderSidebar` → `SectionManager` (13-section catalog, list w/ counts, add grid, reorder/duplicate/delete) | **MATCH** (superset) | Keep. |
| Canvas | renders Hero + sections | `InteractiveCanvas` via same runtime as storefront (LayoutEngine→ComponentRenderer), device frames 375/768/1200 | **MATCH** | Keep. Repo device widths (375/768/1200) are canonical — ignore Stitch's "1440×900" label. |
| Properties rail | **Hero content editing** (headline/subtitle/actions/media/overlay) | `BuilderProperties`→`WebsitePanel`: only `SectionPresentationPanel` (title/description overrides, visibility) + ThemeCard + progress. **No content/actions/media panels.** | **MISMATCH (major)** | See §8 Hero decision + §16. Requires RCCF-70.4.7 wiring to existing `hero_data` pipeline — NOT in initial visual RCCFs. |
| Toolbar | Save, Publish, device, visibility/settings | Save (`saveBuilderPages`), Publish (`publishWebsite` + `getPublishFailurePresentation`), undo/redo, device switcher, PreviewDraftToggle | **MATCH** | Keep; publish remains canonical. |
| Device switcher | desktop/tablet/mobile | desktop/tablet/mobile = 375/768/1200 | **MATCH** | Keep repo widths. |
| Mobile | — | `BuilderMobilePanel` bottom sheets (Sections/Properties) with a11y | **MATCH** | Keep. |
| Save | Save button | `performSave` (theme apply + `saveBuilderPages`), autosave 2s | **MATCH** | Keep. |
| Publish | Publish button | `handlePublish` → `publishWebsite()`; failure via translator | **MATCH** | Keep (RCCF-70.6.5.x canonical). |
| "Pages/Assets/Library" tabs | present | not present (repo has no Assets/Library concept) | **MISSING** | Do NOT add — Stitch-only concept; requires product decision (§16). |
| Section selection | highlight + edit | `builderStore.select/isSelected` highlight; Hero edit link → `/admin/settings` | **MATCH** | Keep. |

**Builder is the highest-priority visual surface** but its Stitch properties
content-editing is the one place that crosses into data. Initial visual work
(RCCF-70.4.5) = shell polish only; Hero composition (RCCF-70.4.7) is the
content-capability change.

---

## 7. Storefront Comparison

Stitch reference: `a11fd81a…` — header nav (Home/Products/Services/About/Contact
+ **Sign In**), hero (name, tagline, Shop Products/View Services CTAs), products
grid (cards: name, price, description, **Order** button, ONLINE/BOTH badges),
mobile bottom nav (Home/Shop/Services/Profile), footer (© + Privacy/Terms/**Help
Center**/**API Reference**).

| Concern | Stitch | Repository | Match | Action |
|---|---|---|---|---|
| Header nav | Home/Products/Services/About/Contact | `StorefrontNav`: persisted nav pill row (desktop) + first-5 bottom nav (mobile) | **MATCH** | Keep. |
| Sign In | present | none on storefront (auth is `/admin/login`, not a public storefront login) | **MISMATCH** | **Do NOT copy** — no public sign-in capability exists; product/architecture decision (§16). |
| Hero | name + tagline + CTAs | `HeroRenderer`: media, avatar, live badge, name/title, tagline/bio, primary+secondary CTAs, social links | **MATCH** | Keep. |
| Product cards | name, price, desc, Order, ONLINE/BOTH badge | `ProductsRenderer` cards: image, Featured badge, name, desc, price, Buy Now / Order on WhatsApp CTAs (by mode) | **MATCH** | Keep CTAs as canonical commerce truth. Optional: add mode chips (presentation-only). |
| Commerce CTA | "Order" | ONLINE→BuyNowButton (Razorpay), WHATSAPP→wa.me link, BOTH→both; inert in preview | **MATCH** | Immutable — do not invent checkout flows. |
| Services | display | `ServicesRenderer` display-only; Book CTA only when `bookable` | **MATCH** | Keep. |
| Courses | display-only | Courses display-only (no Buy/Enroll/checkout) | **MATCH** | Keep. |
| Responsive grids | 12-col/container | `@container/main` + `@sm/main:`/`@lg/main:`; `RESPONSIVE_GRID` | **MATCH** | Keep — canonical model. |
| Footer | © + Privacy/Terms/Help Center/API Reference | `FooterRenderer`: copyright + social + Terms/Privacy/Refunds | **PARTIAL** | Do NOT add Help Center / API Reference links (routes not established as storefront links) — §16. |
| Mobile bottom nav | Home/Shop/Services/Profile | first-5 visible items bottom nav | **MATCH** | Keep. |

---

## 8. Hero Architecture Audit

### 8.1 Canonical pipeline (unchanged, authoritative)

```
Setting("hero_data") → WebsiteAggregateService.build
  → resolveHeroMediaForRuntime (src/lib/media/hero-media.ts:72)
  → LayoutEngine.composeSectionConfig (hero: ctaText→cta, ctaSecondaryText→ctaSecondary)
  → HeroRenderer (renderers.tsx:96)
```

- **Data authority:** `Setting` row key `hero_data` (SettingsService,
  `updateHeroData`/`updateHeroPartial`/`updateHeroSocialLinks` in
  `src/actions/settings.actions.ts`; zod `heroPartialSchema`).
- **Authoring UI today:** `/admin/settings` (`SettingsForm` +
  `SettingsLivePreview` which runs the SAME `resolveHeroMediaForRuntime` and
  mirrors `composeSectionConfig`).
- **Renderer:** `HeroRenderer` (single renderer, all `hero.*` variants).
- **Builder today:** holds only the slot + `presentation` overrides
  (titleOverride/descriptionOverride/visible); **never owns content**
  (`presentation.ts isPresentationKey` contract); Hero sidebar edit link →
  `/admin/settings`.
- **Media decision:** `resolveHeroMediaForRuntime` — single decision point,
  precedence video → poster → background → placeholder.
- **Preview path:** builder `InteractiveCanvas` and Settings live preview both
  use the aggregate + real `HeroRenderer` (previewMode inerts CTAs/links).

### 8.2 Hero field matrix

| Field | Current Owner (data authority) | Stitch Builder (properties) | Stitch Storefront | Decision |
|---|---|---|---|---|
| video | `hero_data.videoUrl` (settings; assertHeroVideoWrite RCCF-67.3; 12MB/15s validation) | Media → background image only shown | rendered (video→poster swap) | **Keep in Settings (data mgmt).** Builder may reference/choose media via existing action. |
| poster | `hero_data.posterUrl` (settings) | — | rendered fallback | Settings (data); Builder can pick. |
| background | `hero_data.backgroundUrl` (settings) | "Background Image" upload | rendered | Settings (data); Builder can pick. No second resolver. |
| profile image | `hero_data.profilePictureUrl` (settings) | — | avatar | Settings (data). |
| name | `hero_data.title`/`name` | — | h1 | Settings (data). |
| headline | `hero_data.title` (primary heading) | **Headline** editable | h1 | **Settings remains authority.** Builder composition may edit via `updateHeroPartial` (no duplicate state). |
| subtitle/tagline | `hero_data.subtitle`/`tagline` | **Subtitle** editable | rendered | same as headline. |
| bio | `hero_data.bio` (settings) | — | bio or subtitle fallback | Settings (data). |
| primary CTA | `hero_data.ctaText`/`ctaLink` | **Primary Button + Link To (Select Page)** | primary button | **Decision needed:** "Select Page" implies page-targets not currently in the hero contract (ctaLink is a URL). Product decision (§16) — keep URL-based today. |
| secondary CTA | `hero_data.ctaSecondaryText`/`ctaSecondaryLink` | — | secondary button | Settings (data). |
| social links | `hero_data.socialLinks` (also `/admin/links` page, single source via updateHeroSocialLinks) | — | social chips | Keep `/admin/links` authority. |
| focal alignment | `hero_data.*Alignment` (desktop/mobile) | — | `responsiveAlignmentClass` | Settings (data). |
| live badge | `hero_data.liveBadgeText`/`showLiveBadge` | — | ping red dot | Settings (data). |
| overlay | theme/`heroBlend` | "Overlay Opacity 80%" | ExperienceSection gradient | **Presentation-layer** (Theme Runtime authority) — do not add a duplicate overlay control. |

### 8.3 Hero decision (data management vs visual composition)

- **Data management (stays in `/admin/settings`):** media upload/registration,
  identity/name/bio, social links, focal alignment, live badge, validation
  (MP4 constraints), asset ownership. These are the Settings responsibility.
- **Visual composition (candidate for Builder, RCCF-70.4.7):** select Hero
  section, edit headline/subtitle/CTAs, choose/use existing media, control
  presentation — all writing through the **existing** `hero_data` Setting and
  the **existing** `updateHeroPartial` action, rendered by the **existing**
  resolver+renderer. No new state, no second resolver, no server-authority move.
- **Hard rules (do NOT):** create duplicate Hero state; create a second
  resolver; move server authority; delete existing Hero settings until the
  audit proves every field has a canonical destination (proven here in §8.2 —
  all fields have a canonical owner, so RCCF-70.4.7 may proceed once the
  page-target CTA decision is made).

---

## 9. Design Token Comparison

Source: `src/app/globals.css`, `tailwind.config.ts`, Stitch design system
(Stitch-DNA §4). Tokens map 1:1 already.

| Token | Stitch | Repository | Match |
|---|---|---|---|
| surface-root | `#0A0A0B` | `--surface-root` | MATCH |
| surface-base/card | `#18181B` | `--surface-base`/`--surface-card` | MATCH |
| surface-raised | `#27272A` | `--surface-raised`/`--surface-card-hover` | MATCH |
| surface-overlay | `#3F3F46` | `--surface-overlay` | MATCH |
| primary | `#6366F1` | `--brand-primary` | MATCH |
| primary-hover | `#4F46E5` | `--primary-hover` | MATCH |
| secondary | `#8B5CF6` | `--brand-secondary` | MATCH |
| accent | `#F59E0B` | `--brand-accent` | MATCH |
| success/warning/danger/info | `#22C55E/#F59E0B/#EF4444/#3B82F6` | `--color-*` | MATCH |
| text-primary/secondary/muted | `#FAFAFA/#A1A1AA/#71717A` | `--text-*` | MATCH |
| border | `rgba(255,255,255,0.08)` | `--border` | MATCH |
| focus ring | primary-based | `--focus-ring` | MATCH |
| body font | Inter | `body{font-family:Inter}` (globals.css:182) | MATCH |
| display font | Inter 700/800 | `font-display` → Inter | MATCH |
| mono | JetBrains Mono | `font-mono` | MATCH |
| spacing | 4px rhythm | Tailwind 4px scale | MATCH |
| radius | roundness 8 (controls md/lg, cards xl, containers 2xl, badges full) | `--radius-*` scale exists; application inconsistent (DS-5) | **PARTIAL (application)** |
| elevation | subtle dark | `--shadow-elevation`/`-hover` | MATCH |
| glass | controlled | `.xp-surface-glass`, `GlassCard` | MATCH (used sparingly) |

**Conclusion:** token layer = MATCH. Implementation work is **application
consistency** (DS-5 radius direction, DS-1 button consolidation, badge variant
mapping). No token redefinition required. `ui/Button.tsx` (rounded-md, static
indigo) is a latent inconsistency vs `.btn-*` token classes (DS-1/DS-5) — resolve
in RCCF-70.4.2.

---

## 10. Component Mapping

| Stitch Pattern | Existing Component | Match | Action |
|---|---|---|---|
| Button (primary/secondary/ghost/danger) | `.btn-primary/.btn-secondary/.btn-ghost/.btn-danger` (globals.css:264-300); `ui/Button.tsx` (static indigo, rounded-md) | **PARTIAL** | Consolidate on token classes; align `ui/Button.tsx` radius/tokens (DS-1, DS-5). |
| Card | `ui/Card.tsx` (`.admin-card`), `GlassCard.tsx`, `.xp-card-*` | MATCH | Keep. |
| Badge | `ui/Badge.tsx` (rounded-full, variants); `.admin-badge-*` | MATCH | Keep; add commerce-mode badge treatment (admin products). |
| Input | `ui/Input.tsx`; `.admin-input`/`.admin-select` | MATCH | Keep. |
| Table | `ui/Table.tsx`; `.admin-table` | MATCH | Keep. |
| PageHeader | `feature-page.tsx` (FeaturePage) | MATCH | Keep. |
| Sidebar | `admin-sidebar.tsx` | MATCH | Keep (capability truth). |
| Dialog/Drawer | `EditEntityDrawer.tsx`; ad-hoc modals (DS-3) | **PARTIAL** | No canonical primitive — defer (DS-3). |
| Tabs | ad-hoc (3 impls) (DS-3) | **PARTIAL** | Defer canonical primitive. |
| Toast | ad-hoc (4 impls) (DS-3) | **PARTIAL** | Defer canonical primitive. |
| EmptyState | `ui/EmptyState.tsx`; CrudTable emptyMessage | MATCH | Keep. |
| Status | `PublishStatusBadge.tsx`, `BillingStatusBadge.tsx` | MATCH | Keep. |
| BottomSheet | `mobile-panel.tsx` (builder); admin drawer | MATCH | Keep. |
| StatCard/MetricCard | `ui/data/MetricCard.tsx`; dashboard `MetricGrid` | MATCH | Keep. |
| Skeleton | `LoadingSpinner.tsx`; `.animate-pulse` blocks | **PARTIAL** | No Skeleton primitive (DS-3) — defer. |
| Commerce badge (new) | none in admin | **MISSING** | New presentation-only primitive (RCCF-70.4.2). |
| Product type label | `PRODUCT_TYPE_REGISTRY` labels | **MISSING** in admin table (raw id shown) | Presentation-only fix. |

Prefer existing primitives; do not duplicate when equivalent exists.

---

## 11. Responsive Mapping

| Breakpoint | Stitch intent | Repository | Match | Action |
|---|---|---|---|---|
| 320/375/390/430 | mobile-first | verified zero-overflow (RCCF-RESPONSIVE-01) | MATCH | Keep. |
| 768 | tablet | verified | MATCH | Keep. |
| 1024+ | desktop | `lg:` admin drawer→static; Builder rails visible | MATCH | Keep. |
| 1280/1440/1920 | wide | `xl:`/`2xl:` grids; `max-w-6xl` admin content | MATCH | Keep. |
| Storefront container model | 12-col | `@container/main` + `@sm/main:`/`@lg/main:` (tailwind.config.ts:33-39) | MATCH | Keep (canonical). |
| Builder frames | desktop/tablet/mobile | 375/768/1200 device frames | MATCH | Keep (ignore Stitch "1440×900" label). |
| Admin | responsive drawer | `admin-sidebar` mobile drawer + focus trap | MATCH | Keep. |
| Builder mobile | bottom sheets | `mobile-panel.tsx` bottom sheets | MATCH | Keep. |
| Products mobile | table | horizontal scroll | PARTIAL | Optional responsive card treatment (presentation-only). |

Do not introduce a competing breakpoint system. Repository model is canonical.

---

## 12. Accessibility Mapping

| Aspect | Repository evidence | Match | Action |
|---|---|---|---|
| Focus | global `:focus-visible` ring (globals.css:173-177) | MATCH | Keep. |
| Motion | global `prefers-reduced-motion` (globals.css:55-64); MotionSafe | MATCH | Keep. |
| Admin drawer | focus trap + Escape + body scroll lock (`admin-sidebar.tsx`) | MATCH | Keep. |
| Builder mobile sheets | `role="dialog"`, `aria-modal`, Escape, focus return, scroll lock (`mobile-panel.tsx`) | MATCH | Keep. |
| Storefront | `SkipLink`, `#main-content`, semantic `main` | MATCH | Keep. |
| Publish errors | `role="alert"` (AdminPublishControl) | MATCH | Keep. |
| Icons/buttons | aria-labels on icon buttons (pencil/trash) | MATCH | Verify in RCCF-70.4.8 QA. |
| Contrast | zinc-400/500/600 + amber/emerald on dark | MATCH | Spot-check in QA. |

Stitch focus/interaction intent is satisfied by the existing global system.

---

## 13. Publishing Mapping

| Stitch | Repository | Match | Action |
|---|---|---|---|
| Publish button (builder) | `workspace.tsx handlePublish` → `publishWebsite()` + `getPublishFailurePresentation` | **MATCH** | Keep canonical. |
| Publish button (admin) | `AdminPublishControl` (topbar), `StorefrontStatusCard` | **MATCH** | Keep canonical (RCCF-70.6.5.x). |
| Publish badge | `PublishStatusBadge` | **MATCH** | Keep. |
| Publish limits | — | `publish-policy.ts` (Launch 3 / Grow 10 / Scale unlimited) + `publish-usage.ts` dynamic messaging | Keep repo — **do NOT** duplicate plan limits or create client-side quota logic. |
| Failure UX | — | `getPublishFailurePresentation()` (quota/trial/technical) | Keep canonical. |

Do not create another publish action, client-side quota logic, or duplicate plan
limits. Stitch's static "unlimited publishes" copy must not replace repo's
dynamic messaging.

---

## 14. Truth / Capability Conflicts (Stitch items NOT to copy)

1. **Fabricated analytics** (rejected `735f886c…`) — never introduce revenue/
   order/storage/visitor/conversion numbers anywhere.
2. **Storefront "Sign In"** — no public storefront login capability; auth is
   admin-only. Requires product/architecture decision (§16).
3. **Storefront footer "Help Center / API Reference"** — not established
   storefront routes; requires product decision.
4. **Builder "Pages/Assets/Library" tabs + "Data/Logic" icons** — not repo
   concepts; require product decision.
5. **Products status vocabulary "Active/Draft/Hidden"** — repo uses
   PUBLISHED/DRAFT/ARCHIVED (authoritative). Keep repo.
6. **Builder Hero content editing** — must route through existing `hero_data`
   pipeline only (RCCF-70.4.7); never a second resolver/state.
7. **Stitch static publish copy ("unlimited…")** — replace with repo dynamic
   plan messaging.
8. **Stitch "Order" button label** — repo uses Buy Now / Order on WhatsApp
   (canonical commerce truth); keep repo.
9. **"Stripe integration" help text** (near-miss `52c5009f…`) — repo uses
   Razorpay; never reference Stripe.

---

## 15. Presentation-Only Changes (safe to implement without product decisions)

1. **RCCF-70.4.2 (primitives):** button consolidation (DS-1), radius direction
   (DS-5) across `.btn-*`/`ui/Button`, admin commerce-mode badge primitive,
   product-type label helper, badge variant mapping (PUBLISHED→success).
2. **RCCF-70.4.3 (dashboard):** token-consistent card/typography/spacing polish;
   "Create Product" quick action; Edit Appearance tile parity; welcome header
   density. Publishing card keeps repo messaging.
3. **RCCF-70.4.4 (products):** rename "Add Product"→"Create Product"; add
   Commerce Mode column + badges; render type via registry labels; add client-side
   status/type/commerce filters over existing `initialData`; empty-state copy;
   optional responsive card view. No server/query changes.
4. **RCCF-70.4.5 (builder):** shell polish only (toolbar/sidebar/properties
   density, borders, radii, focus). No content editing.
5. **RCCF-70.4.6 (storefront):** optional mode chips on product cards; card
   hover polish; token consistency. No commerce behavior changes.
6. **RCCF-70.4.8 (QA+a11y):** contrast/focus/label spot checks; responsive
   verification at 320–1920.

---

## 16. Changes Requiring Product Decisions (defer)

1. **Builder Hero composition (content editing in Builder properties)** —
   headline/subtitle/CTA/media editing writing through `hero_data` +
   `updateHeroPartial`. The audit proves a canonical destination for every
   field (§8.2); the open question is **primary CTA "Link To (Select Page)"** —
   the current contract is URL-based (`ctaLink`), not page-target-based. Decide
   whether to keep URL-based CTAs (no contract change) or add page-target
   resolution (contract + resolver change → larger RCCF).
2. **Storefront "Sign In"** — public login capability (auth/architecture
   decision).
3. **Storefront footer Help Center / API Reference** — route/capability
   decision.
4. **Builder Assets/Library + Data/Logic tabs** — information-architecture
   decision.
5. **Products server-side search/filter** — query-layer change (frozen; do not
   implement in this workstream).
6. **Products mobile card table** — responsive presentation decision
   (default: keep horizontal scroll, optional card view).
7. **Canonical Tabs/Dialog/Toast/Skeleton primitives (DS-3)** — primitive
   RCCF decision.

---

## 17. Changes Forbidden by Architecture

- Any Prisma/schema/migration/repository change.
- Server action changes (including adding server-side product filtering).
- Auth/session or tenant-resolution changes (incl. public storefront login).
- `capabilityService`, plan definitions, billing enforcement changes.
- Checkout/Razorpay/webhook/WhatsApp/affiliate/booking/service behavior changes.
- Media lifecycle / hero media registration changes.
- Publishing pipeline changes (new action, client quota logic, duplicated
  plan limits).
- Builder state/events/commands/query/persistence changes.
- `WebsiteAggregate`/`PublishedSnapshot`/`LayoutEngine`/`DataBoundRenderer`/
  `ComponentRenderer`/`ComponentRegistry` data-flow changes.
- Section presentation contracts.
- Theme Runtime authority (no duplicate overlay/background controls).
- Second Hero resolver or duplicate Hero state.
- Deleting existing Hero settings (until RCCF-70.4.7 lands fully).
- New commerce modes / invented checkout flows.
- Fabricated analytics anywhere.

---

## 18. Recommended Implementation Order

The mission's proposed breakdown is supported by this audit, with two notes:
(1) products filters are client-side/presentation-only so they belong in
RCCF-70.4.4 (no data work); (2) Builder Hero content (RCCF-70.4.7) is the only
change that touches data-authoring UX and is gated on the §16(1) CTA decision.

1. **RCCF-70.4.2** — Shared Premium Creator OS presentation primitives
   (button consolidation DS-1/DS-5 radius, commerce badge, type-label helper).
2. **RCCF-70.4.3** — Admin Dashboard visual implementation (presentation-only).
3. **RCCF-70.4.4** — Products CRUD visual implementation (columns, badges,
   labels, client-side filters, header label).
4. **RCCF-70.4.5** — Builder visual implementation (shell only).
5. **RCCF-70.4.6** — Storefront visual implementation (cosmetic, optional chips).
6. **RCCF-70.4.7** — Hero Builder composition / Settings responsibility cleanup
   (requires the CTA decision; writes through existing pipeline only).
7. **RCCF-70.4.8** — Cross-surface visual QA + accessibility.

Deferred/staged separately: DS-3 primitives (Tabs/Dialog/Toast/Skeleton), public
login, footer Help/API links, Builder Assets/Library, server-side filtering.

---

## 19. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep into hero content before CTA decision | Med | High | Gate RCCF-70.4.7 on §16(1); keep 70.4.2–6 presentation-only. |
| Button consolidation regressions | Med | Med | RCCF-70.4.2 isolates; run full suite + visual QA (70.4.8). |
| Client-side product filters drift from server truth | Med | Low-Med | Filters operate on server-fetched `initialData` only; no query layer. |
| Adopting Stitch copy (publish "unlimited", "Order", "Active/Hidden") | Med | Med | §14 blacklist enforced in review; keep repo messaging/vocabulary. |
| New primitives duplicating existing ones | Low-Med | Med | Prefer existing (`Card`/`Badge`/`Input`/`Table`); §10 table is the arbiter. |
| Responsive regression from polish | Low | Med | Keep breakpoint model; verify 320–1920 in 70.4.8. |
| Builder shell polish touching store state | Low | High | 70.4.5 touches presentational JSX only; never builderStore/serialize. |
| Uncommitted working-tree changes conflict | Med | Med | RCCF-70.4.x must build on the current tree; coordinate commits. |

---

## 20. RCCF-70.4 Implementation Plan

- **Phase A (presentation primitives):** RCCF-70.4.2 — button/radius
  consolidation, commerce badge, type-label helper. Verify: tsc, build, targeted
  tests, visual spot-check.
- **Phase B (admin surfaces):** RCCF-70.4.3 (dashboard) + RCCF-70.4.4
  (products). Verify: admin render tests, manual 320–1440, no data-path changes.
- **Phase C (builder + storefront):** RCCF-70.4.5 (builder shell) + RCCF-70.4.6
  (storefront). Verify: builder preview parity tests, storefront render tests.
- **Phase D (hero):** RCCF-70.4.7 — after §16(1) decision; implement Builder
  Hero composition via existing `hero_data`/`updateHeroPartial`; remove no
  fields from Settings until every field proven canonical (done in §8.2). Verify:
  hero-unification tests, preview parity, publish → live.
- **Phase E (QA):** RCCF-70.4.8 — cross-surface visual + accessibility + full
  regression suite.

Each RCCF commits independently; no RCCF modifies frozen architecture (§17).

---

## FINAL QUESTION

**Is the repository sufficiently mapped to begin presentation implementation?**

**YES.**

The design-token layer already maps 1:1 to Premium Creator OS; the storefront,
dashboard, and builder shells structurally match Stitch; the publishing pipeline
and Hero pipeline are already canonical; and the concrete gaps (products
commerce column/badges/labels/filters, dashboard quick-action parity, builder
shell polish, optional storefront chips) are all presentation-only or gated on a
single documented product decision (§16.1).

**Next RCCF:** `RCCF-70.4.2 — Shared Premium Creator OS presentation primitives`
(button consolidation DS-1/DS-5, admin commerce-mode badge, product-type label
helper, badge variant mapping). Scope is strictly presentation JSX + token
application; no data, actions, builder state, publishing, or hero-pipeline
changes.

**Blocking evidence for later:** none for 70.4.2–70.4.6. `RCCF-70.4.7`
(Builder Hero composition) is gated only on the §16.1 decision of whether the
primary CTA remains URL-based (`ctaLink`) or gains page-target resolution.

---

*End of RCCF-70.4.1 audit — evidence-backed, no application code modified.*
