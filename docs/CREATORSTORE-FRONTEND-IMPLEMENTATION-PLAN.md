# CreatorStore Frontend Implementation Plan v1.0

> **Status:** Engineering-ready | Exact build order | All libraries pinned
> **Aligns with:** Design System + UI Specification + Product Blueprint
> **Principle:** No engineer should guess. Every decision is made here.

---

## 1. Recommended Free UI Ecosystem

### Core Stack

| Library | Version | Why | Where | NOT Where |
|---------|---------|-----|-------|-----------|
| **shadcn/ui** | latest | Component primitives with full source control. The industry standard for Tailwind-based React apps. | All primitives: Button, Input, Select, Dialog, Dropdown, Tabs, Sheet, Command, Toast, etc. | Custom AI-specific components (build those yourself using shadcn patterns) |
| **Radix UI** | latest | Headless accessible primitives that shadcn/ui is built on. Use directly for custom components that shadcn doesn't cover. | Custom overlays, compound components. Already included with shadcn/ui. | Don't use standalone — use shadcn/ui wrappers when available |
| **Tailwind CSS** | v3 (existing) → v4 (migrate when stable) | Utility-first CSS. Dark mode. Existing project uses v3 with custom config. Keep v3 for now, migrate to v4 when stable. | Every component. Every page. | Don't write custom CSS files. Use Tailwind utilities + `@apply` in component layer for reusable patterns |
| **Lucide React** | latest | Single icon library. Never mix. Already partially used in project. | Every icon in the entire product. | No other icon library |
| **Recharts** | latest | Composable, accessible charting. Lightweight. Well-maintained. | Analytics dashboard, revenue charts, data visualization. | Don't use for non-chart data display (use tables/cards) |
| **TanStack Table** | v8 | Headless table with sorting, filtering, pagination, column visibility. | Orders table, customers table, admin tables, audit log. | Don't use for simple lists (<10 items) — use a Card grid |
| **React Hook Form** | latest | Performant, lightweight form handling. Integrates with Zod. | All forms: login, signup, settings, product editor, wizard. | Don't use for single-field search inputs |
| **Zod** | latest | Schema validation. Already used in server actions. | Form validation, API schema validation. | — |
| **dnd-kit** | latest | Modern drag-and-drop. Already used in Builder. | Builder canvas. Product/gallery reorder. | Don't use for simple list sorting (use up/down buttons) |
| **Motion (Framer Motion)** | latest | Declarative animations. Already used in project. | Page transitions, card animations, AI cinematic, score counter, hover effects. | Don't over-animate. Every animation must have purpose. |
| **cmdk** | latest | Command palette. Vercel-built. Accessible. | Global Cmd+K search across products, orders, customers, pages. | — |
| **next-themes** | latest | Theme provider for Next.js. | Dark mode (always on for now, light mode toggle later). | — |
| **tailwind-merge** | latest | Merge Tailwind classes without conflicts. | Every component that accepts `className` prop. | — |
| **class-variance-authority** | latest | Type-safe component variant API. | Buttons, badges, cards — any component with variants. | Don't use for single-variant components |

### UI Component Libraries to Pull From (not install — cherry-pick code)

| Library | What to Use | How to Integrate |
|---------|-------------|------------------|
| **shadcn/ui** | Install as primary component source. Copy into `src/components/ui/`. | `npx shadcn-ui@latest add button input dialog ...` |
| **Magic UI** | Animated components: confetti, particles, marquee, border-beam | Copy individual component files. Adapt styles to CreatorStore tokens. |
| **Motion Primitives** | Ready-made Motion animations: fade-in, slide-up, scale-in | Copy or reference pattern. Adapt to `--duration-*` and `--ease-*` tokens. |
| **React Bits** | Background animations, text effects | Copy pattern for AI cinematic effects. Never for core UI. |

### Normalization Strategy

All third-party components MUST be wrapped in a CreatorStore adapter that:
1. Applies CreatorStore color tokens (not the library's defaults)
2. Uses CreatorStore typography tokens
3. Respects `--radius-*` tokens
4. Supports `className` override

Example wrapper pattern:
```tsx
// src/components/ui/button.tsx (shadcn/ui adapted)
import { cva } from "class-variance-authority";
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius-md)] text-sm font-medium transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-[var(--brand-primary)] text-white hover:shadow-[var(--shadow-glow-cyan)]",
        secondary: "border border-[var(--surface-overlay)] bg-transparent hover:border-[var(--brand-accent)]",
        ghost: "hover:bg-[var(--surface-raised)]",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);
```

---

## 2. Folder Structure

```
src/
├── app/                          # Next.js App Router (existing, extend)
│   ├── (marketing)/              # Landing, pricing, blog, legal
│   ├── admin/                    # Creator dashboard
│   │   ├── _components/          # Dashboard shell (sidebar, layout)
│   │   ├── dashboard/
│   │   ├── orders/               # NEW
│   │   ├── customers/            # NEW
│   │   ├── analytics/            # NEW
│   │   ├── seo/                  # NEW
│   │   ├── email/                # NEW
│   │   ├── ai-assistant/         # NEW
│   │   ├── onboarding/           # NEW (Setup Wizard)
│   │   └── [...]                 # Existing pages preserved
│   ├── super-admin/
│   │   ├── revenue/              # NEW
│   │   ├── tenants/
│   │   ├── agencies/             # NEW
│   │   ├── generate/             # NEW (AI Flow)
│   │   ├── subscriptions/        # NEW
│   │   ├── themes/               # NEW
│   │   └── [...]                 # Existing pages preserved
│   ├── agency/
│   │   └── [agencyId]/
│   │       ├── clients/          # NEW
│   │       ├── websites/         # NEW
│   │       ├── generate/         # NEW
│   │       ├── templates/        # NEW
│   │       ├── analytics/        # NEW
│   │       ├── team/             # NEW
│   │       └── [...]             # NEW pages
│   └── [domain]/                 # Storefront
│
├── components/
│   ├── ui/                       # shadcn/ui primitives + CreatorStore wrappers
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── command.tsx           # cmdk wrapper
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   └── [...]
│   ├── layout/                   # Shell components
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── page-header.tsx
│   │   └── shell.tsx
│   ├── ai/                       # AI-specific components
│   │   ├── template-card.tsx
│   │   ├── strategy-card.tsx
│   │   ├── score-ring.tsx
│   │   ├── section-toggle.tsx
│   │   ├── deployment-card.tsx
│   │   ├── wizard-step.tsx
│   │   └── ai-chat-bubble.tsx
│   ├── data/                     # Data display components
│   │   ├── data-table.tsx        # TanStack Table wrapper
│   │   ├── metric-card.tsx
│   │   ├── stat-card.tsx
│   │   ├── chart.tsx             # Recharts wrapper
│   │   └── activity-feed.tsx
│   ├── content/                  # Content display
│   │   ├── product-card.tsx
│   │   ├── gallery-card.tsx
│   │   ├── order-card.tsx
│   │   └── customer-card.tsx
│   ├── forms/                    # Form components
│   │   ├── media-upload.tsx
│   │   └── rich-text-editor.tsx
│   ├── feedback/                 # Feedback components
│   │   ├── empty-state.tsx
│   │   └── error-alert.tsx
│   ├── admin/                    # Existing admin components (preserved)
│   ├── public/                   # Existing public components (preserved)
│   ├── marketing/                # Existing marketing components (preserved)
│   ├── shared/                   # Existing shared components (preserved)
│   └── theme/                    # Existing theme components (preserved)
│
├── hooks/
│   ├── dashboard/                # Existing dashboard hooks (preserved)
│   ├── use-reduced-motion.ts     # NEW
│   └── use-command-palette.ts    # NEW
│
├── lib/
│   ├── design-system/
│   │   └── tokens.ts             # Design tokens as TS constants (mirrors CSS variables)
│   ├── ai-generation/            # Existing AI pipeline (preserved)
│   ├── application/              # Existing application services (preserved)
│   ├── content/                  # Existing content platform (preserved)
│   ├── platform/                 # Existing platform core (preserved)
│   └── builder/                  # Existing builder (preserved)
│
├── styles/
│   ├── globals.css               # CSS variables, component classes, animations
│   └── design-tokens.css         # NEW: All token declarations
│
├── types/
│   └── design-system.ts          # NEW: TypeScript types for design tokens
│
└── actions/                      # Server actions (existing, extend)
    ├── order.actions.ts          # NEW
    ├── customer.actions.ts       # NEW
    ├── analytics.actions.ts      # NEW
    └── [...]
```

---

## 3. Implementation Phases

### PHASE 1: Design System Foundation (Week 1)

**Goal:** Every component and token ready before any new screen is built.

**Deliverables:**
1. CSS variables declared in `globals.css` (all `--surface-*`, `--brand-*`, `--color-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-*`, `--focus-ring`)
2. shadcn/ui primitives installed + styled with CreatorStore tokens:
   - `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
   - `Badge` (all variants: default, success, warning, danger, info)
   - `Avatar`, `Tooltip`, `Popover`, `DropdownMenu`
   - `Dialog`, `Drawer` (Sheet), `AlertDialog`
   - `Tabs`, `Accordion`, `Progress`
   - `Command` (cmdk wrapper), `Toast` (Sonner wrapper)
   - `Skeleton`, `Table`, `Pagination`
3. Layout components: `Shell`, `Sidebar` (collapsible, mobile-responsive), `Topbar`, `PageHeader`, `Container`
4. Data components: `MetricCard`, `StatCard`, `Chart` (Recharts wrapper — Line, Bar, Donut)
5. Feedback components: `EmptyState`, `ErrorAlert`
6. `tailwind.config.ts` updated with all token mappings
7. Storybook or component catalog page (simple route: `/dev/components`)

**Dependencies:** None
**Acceptance:** Every component renders correctly in dark theme. All tokens documented.

### PHASE 2: AI Generation Flow (Week 2)

**Goal:** The signature onboarding experience is complete end-to-end.

**Deliverables:**
1. AI components: `TemplateCard`, `StrategyCard`, `ScoreRing`, `ChecklistGrid`, `RecommendationCard`, `SectionToggle`, `DeploymentCard`, `WizardStep`
2. Screens built:
   - `/super-admin/generate` — Template → Strategy → URL input → Analysis → Report → Preview → Provision → Invitation
   - Same flow at `/agency/[id]/generate`
3. `Stepper` component (horizontal + dot variants)
4. `DevicePreview` component (mobile/tablet/desktop frames)
5. Integration with existing AI pipeline (`WebsiteGenerationPipeline`)
6. Server actions for generation: `generateWebsite.action.ts`

**Dependencies:** Phase 1
**Acceptance:** Full URL → deployed website flow works. Score ring animates. Provision progress live-updates.

### PHASE 3: Creator Dashboard Expansion (Week 3-4)

**Goal:** Completing the creator experience.

**Deliverables:**
1. Job-based sidebar (preserving existing layout, reorganizing navigation)
2. Orders page: table + filters + detail drawer
3. Customers page: search + cards/table toggle + detail drawer
4. Analytics page: KPIs + charts (Recharts)
5. Setup Wizard route: `/admin/onboarding`
6. AI Assistant route: `/admin/ai-assistant` (basic chat, Phase 3 minimal — full conversational agent in v3)
7. Messages added to sidebar (existing route)
8. Notifications bell component + dropdown + toast integration
9. Global search via Cmd+K (cmdk)

**Dependencies:** Phase 1, Phase 2 (for wizard components)
**Acceptance:** All new creator pages functional. Orders and customers show real data from Prisma.

### PHASE 4: Super Admin (Week 5)

**Goal:** Operational platform management.

**Deliverables:**
1. Revenue dashboard: MRR/ARR cards + charts
2. Tenants → Tenant detail page
3. Agencies list → Agency detail page
4. Generate queue page (if not done in Phase 2)
5. Subscriptions management
6. Themes & Templates management
7. Platform settings

**Dependencies:** Phase 1, Phase 2
**Acceptance:** All super admin metrics accurate. Tenant management functional.

### PHASE 5: Agency Portal (Week 6)

**Goal:** Agency self-service experience.

**Deliverables:**
1. Agency dashboard with cross-client metrics
2. Clients list + Client detail page
3. Websites management
4. AI Generation flow (reuse from Phase 2, scoped to agency)
5. Templates library
6. Analytics (across all clients)
7. Team management
8. Billing for agencies

**Dependencies:** Phase 1, Phase 2, Phase 3 (reuse chart/table components)
**Acceptance:** Agency can manage clients, generate websites, view analytics.

### PHASE 6: Customer Storefront (Week 7)

**Goal:** End-customer purchase experience.

**Deliverables:**
1. Cart functionality
2. Checkout flow integration
3. Order confirmation page
4. Customer account: `/account` route with orders, downloads, profile
5. Membership gating UI (members-only content)
6. Course player (if courses are built)

**Dependencies:** Phase 1, Phase 3 (orders/customers)
**Acceptance:** Complete purchase flow works. Customers see order history.

### PHASE 7: Polish & Remaining Pages (Week 8)

**Goal:** Production readiness.

**Deliverables:**
1. SEO tools page
2. Email campaigns page (basic)
3. Blog CMS (dynamic, replacing hardcoded content)
4. All loading states (Skeleton) on every page
5. All empty states (EmptyState) on every new page
6. All error states (ErrorAlert) with retry buttons
7. Accessibility audit + fixes
8. Performance audit (Lighthouse >90)
9. E2E tests for critical flows (Playwright)
10. Mobile QA pass on all screens

**Dependencies:** All previous phases
**Acceptance:** Full product passes accessibility, performance, and E2E tests.

---

## 4. Coding Standards

### Component Rules
1. One component per file. Maximum 250 lines.
2. Use named exports. No default exports for components.
3. `"use client"` only when needed. Prefer Server Components.
4. Props interface exported: `export interface ButtonProps { ... }`
5. `className` always accepted and forwarded via `cn()` (tailwind-merge + clsx).
6. Variants defined with `cva` (class-variance-authority).

### Styling Rules
1. Never write custom CSS for positioning/colors/typography. Use Tailwind utilities.
2. Custom CSS only in `globals.css` for: CSS variables, `@layer components` reusable classes, `@keyframes` animations.
3. Design tokens referenced via CSS variables, not hardcoded values.
4. Third-party library styles overridden with `!important` only as last resort. Prefer selector specificity.

### Accessibility Rules
1. Every interactive element is keyboard-accessible.
2. Every form input has a `<label>` associated via `htmlFor`.
3. Modals trap focus. Drawers trap focus.
4. `aria-label` on icon-only buttons.
5. `role="alert"` on error messages.
6. `role="status"` on loading indicators.
7. Color contrast verified in dev tools.

### Performance Rules
1. Images use `next/image` with proper sizing.
2. Charts are lazy-loaded (dynamic import with `ssr: false`).
3. Tables use virtual scrolling for >100 rows.
4. `useMemo` and `useCallback` where profiling shows benefit. Not preemptively.
5. Bundle analysis with `@next/bundle-analyzer` before production.

### File Naming
1. Components: `kebab-case.tsx` for files, PascalCase for components.
2. Hooks: `use-kebab-case.ts` for files, `useCamelCase` for hooks.
3. Types: `types.ts` within feature folders.
4. Actions: `entity.actions.ts` within `src/actions/`.

---

## 5. Testing Strategy

### Unit Tests (Vitest)
- **Component rendering tests:** Every component renders without error
- **Hook tests:** `useProducts`, `useGallery`, `useDashboardStats`, new hooks
- **Utility tests:** Design token helpers, `cn()`, variant generation
- **Coverage target:** 80%+ on new code, 70%+ overall

### Integration Tests (Vitest + Testing Library)
- **Form flows:** Login → dashboard, signup → onboarding, settings save
- **AI flow:** Template select → strategy → generate (mock pipeline)
- **Table interactions:** Sort, filter, paginate, row click

### E2E Tests (Playwright)
- **Critical paths (5 tests):**
  1. Super admin generates website for YouTube handle
  2. Creator logs in, adds product, publishes
  3. Customer visits storefront, buys product
  4. Agency creates client, generates website
  5. Creator runs setup wizard end-to-end

### Visual Regression (Optional — Percy/Chromatic)
- Screenshot comparison on design system page
- Not mandatory for v1

---

## 6. RCCF Implementation Prompts

The following are independent OpenCode prompts. Each can be executed in sequence.

### Prompt 1: Design System Foundation
```
Implement the CreatorStore Design System using shadcn/ui, Tailwind CSS, and the
tokens defined in docs/CREATORSTORE-DESIGN-SYSTEM.md.

Deliverables:
1. All CSS custom properties declared in src/styles/globals.css
2. shadcn/ui primitives installed and styled: Button, Input, Select, Dialog,
   DropdownMenu, Sheet, Tabs, Progress, Badge, Avatar, Skeleton, Command, Toast
3. Layout components: Shell (sidebar+content), Sidebar (collapsible, mobile overlay),
   Topbar, PageHeader, Container
4. Data components: MetricCard, StatCard, Chart wrapper (Recharts: Line, Bar, Donut)
5. Feedback: EmptyState, ErrorAlert
6. All components documented with Storybook-style stories or a /dev/components page

Rules:
- Preserve existing design tokens (s8ul-cyan, neon classes, admin-card classes)
- Extend only. Never rename existing CSS classes.
- All new components use CSS variable tokens, never hardcoded hex values.
- Every component accepts className via tailwind-merge (cn helper).
- Variants use class-variance-authority (cva).
- Dark theme only for v1.

Acceptance: Every component renders correctly. All tokens visual.
```

### Prompt 2: AI Generation Flow UI
```
Build the complete AI Generation Flow as specified in
docs/CREATORSTORE-UI-SPECIFICATION.md, Section 3.

Routes:
- /super-admin/generate — Template → Strategy → Analysis → Report → Preview →
  Provision → Invitation
- /agency/[id]/generate — Same flow, scoped to agency

Components to build (all in src/components/ai/):
- TemplateCard: 3×3 grid, icon+label, glass bg, cyan glow on select
- StrategyCard: Selectable cards (Fast/Balanced/Premium), radio-card pattern
- ScoreRing: SVG circular progress, gradient stroke, animated count-up
- ChecklistGrid: 2-column detected/missing items
- SectionToggle: 2-column checkbox grid for enabling/disabling sections
- DeploymentCard: Animated step list with progress bar
- WizardStep: Content card wrapper for setup wizard steps
- DevicePreview: Mockup frame with device selector (mobile/tablet/desktop)
- Stepper: Horizontal numbered steps (desktop) → dot indicators (mobile)

Integration:
- Wire to existing WebsiteGenerationPipeline in src/lib/ai-generation/
- Server action: src/actions/generate-website.action.ts
- SSE or polling for provision progress updates

Rules:
- All cards use Design System tokens (glass bg, radius tokens, glow shadows)
- Cinematic: darker bg (#050508), centered layouts, scan-line animation
- Score ring counts up on appear using spring animation
- Provision steps animate sequentially, active step pulses
- Mobile: stacked layout, bottom sheets for actions

Acceptance: Full URL → deployed website flow works end-to-end without page refresh.
```

### Prompt 3: Creator Dashboard
```
Build Creator Dashboard expansion as specified in
docs/CREATORSTORE-UI-SPECIFICATION.md, Section 4.

Routes:
- /admin/orders — Table + filters + detail drawer
- /admin/customers — Search + cards/table toggle + detail drawer
- /admin/analytics — KPIs + Line/Bar/Donut charts
- /admin/onboarding — 7-step Setup Wizard
- /admin/ai-assistant — Basic chat interface
- /admin/seo — SEO tools page
- /admin/email — Email campaigns page (basic)

Sidebar: Reorganize into job-based groups (Website, Content, Sell, Grow, Settings).
Underlying routes unchanged. Only the sidebar navigation tree changes.

Components:
- DataTable: TanStack Table wrapper with sort, filter, paginate, column toggle
- OrderCard, CustomerCard: Detail cards for mobile view
- MetricCard with trend indicator (up/down arrow + percentage)
- Chart components (Line, Bar, Donut via Recharts)
- DateRangePicker for analytics filtering
- AIChatBubble, ActionCard for AI Assistant

Integration:
- Server actions for orders, customers, analytics
- Chat interface prepared for future AI Agent (Phase 3: echo bot, Phase 5: real AI)

Rules:
- Existing pages preserved as-is (Products, Gallery, Timeline, Links, Games, Content Feed,
  Appearance, Domain, Billing, Settings, Builder)
- Messages route added to sidebar (page already exists)
- All tables have loading skeletons, empty states, error states with retry
- Mobile: tables become horizontal scroll, charts stack, sidebar hamburger overlay

Acceptance: All new pages functional. No existing pages broken. Sidebar shows job groups.
```

### Prompt 4: Super Admin + Agency
```
Build Super Admin and Agency portals as specified in
docs/CREATORSTORE-UI-SPECIFICATION.md, Sections 5 and 6.

Super Admin routes:
- /super-admin/revenue — MRR/ARR/Churn/LTV cards + revenue charts
- /super-admin/tenants/[id] — Tenant detail with tabs
- /super-admin/agencies — Agency list
- /super-admin/agencies/[id] — Agency detail with tabs
- /super-admin/generate — AI Queue (if not done in Prompt 2)
- /super-admin/subscriptions — Subscription management
- /super-admin/themes — Theme library
- /super-admin/api-keys — API key management
- /super-admin/support — Support tickets
- /super-admin/settings — Platform settings

Agency routes:
- /agency/[id] — Agency dashboard
- /agency/[id]/clients — Client list
- /agency/[id]/clients/[clientId] — Client detail with tabs + impersonate
- /agency/[id]/websites — Managed websites
- /agency/[id]/generate — AI Generation (reuse from Prompt 2)
- /agency/[id]/templates — Template library
- /agency/[id]/analytics — Cross-client analytics
- /agency/[id]/domains — Client domain management
- /agency/[id]/team — Team management
- /agency/[id]/billing — Agency billing
- /agency/[id]/marketplace — Agency marketplace listing
- /agency/[id]/settings — Agency profile + white-label

Components: Reuse all Phase 1-3 components. New: AgencyMetricCard, ClientCard, ImpersonateButton.

Rules:
- Super admin preserves ALL existing pages (Dashboard, Audit, Health, Features).
  Add new pages to existing sidebar.
- Agency replaces the skeleton portal. All links from sidebar must work.
- Agency AI flow is identical to Super Admin flow, scoped to the agency's clients.
- Revenue charts use Recharts (already built in Phase 1).

Acceptance: Super Admin has full platform command. Agency can manage clients independently.
```

### Prompt 5: Storefront + Checkout
```
Build the customer storefront and checkout experience.

Routes:
- /[domain]/account — Customer portal (order history, downloads, profile)
- /[domain]/account/orders — Order list
- /[domain]/account/orders/[id] — Order detail
- /[domain]/cart — Shopping cart (NEW)
- /[domain]/checkout — Checkout page (NEW)

Components:
- Cart sidebar/drawer with items, quantities, total
- Checkout form: email, payment method (Razorpay), order summary
- Order confirmation page with order ID, download links
- Customer account: order history table, profile form, membership status

Integration:
- Cart state: React Context or Zustand (lightweight, no Redux needed)
- Razorpay checkout integration (existing — extend)
- Server actions for order creation, customer lookup

Rules:
- Storefront layout preserved (existing /[domain] page).
  Add cart icon in nav, account link in footer.
- Cart is a slide-over drawer on desktop, bottom sheet on mobile.
- Checkout is a single-page flow: review → pay → confirmed.
- No login required for purchase. Email collected during checkout.

Acceptance: Complete purchase flow: browse → add to cart → checkout → pay → confirmation.
```

### Prompt 6: Polish & Production Readiness
```
Production polish pass across the entire CreatorStore frontend.

Scope:
1. Loading states: Add <Skeleton /> variants to EVERY page that fetches data.
2. Empty states: Add <EmptyState /> with illustration + CTA to every new page.
3. Error states: Add <ErrorAlert /> with retry button to every page.
4. Accessibility: Audit and fix keyboard navigation, focus trapping, aria labels,
   heading hierarchy, color contrast on EVERY screen.
5. Performance: Lazy-load charts and heavy components. Add loading.tsx files
   for route-level Suspense boundaries. Verify <Image /> usage throughout.
6. Mobile QA: Test every page at 375px, 768px, 1024px widths.
   Fix sidebar overlay, table horizontal scroll, form stacking, modal bottom sheets.
7. Toast notifications: Wire toast system for all mutation actions.
   (product created, order placed, settings saved, generation complete, etc.)
8. E2E Tests: Add Playwright tests for 5 critical paths.
9. Blog: Replace hardcoded blog with dynamic CMS (or at minimum, fix dead guide links).

Rules:
- Preserve existing functionality. This is polish, not redesign.
- Every skeleton, empty, and error state uses Design System components.
- Toasts appear at bottom-right on desktop, bottom-center on mobile.

Acceptance: Lighthouse >90 performance, >90 accessibility. No unhandled loading/error states.
```

---

## 7. Dependency Graph

```
Phase 1 (Design System)
    │
    ▼
Phase 2 (AI Flow)
    │
    ├──────────────────────┐
    ▼                      ▼
Phase 3 (Creator)    Phase 4 (Super Admin)
    │                      │
    ├──────────────────────┤
    ▼                      ▼
Phase 5 (Agency)     Phase 6 (Storefront)
    │                      │
    └──────────┬───────────┘
               ▼
        Phase 7 (Polish)
```

Phases 3 and 4 can run in parallel after Phase 2. Phase 5 requires Phase 3 components. Phase 6 is mostly independent after Phase 1.

---

## 8. Acceptance Criteria Per Phase

| Phase | Criteria |
|-------|----------|
| 1 | All primitives render. Token catalog complete. `tsc --noEmit` passes. |
| 2 | Full generation flow works: template → deployed website. Score ring animates. |
| 3 | Orders/Customers/Analytics pages functional. Job-based sidebar. Wizard runs. |
| 4 | Revenue dashboard accurate. Tenant/Agency management works. |
| 5 | Agency can manage clients, generate websites, view analytics. |
| 6 | Customer can browse, cart, checkout, see order history. |
| 7 | Lighthouse >90 P/A. E2E pass. No unhandled states. Mobile QA green. |

---

*CreatorStore Frontend Implementation Plan v1.0 — July 2026*
*Every decision made. Every dependency mapped. Ready for execution.*
