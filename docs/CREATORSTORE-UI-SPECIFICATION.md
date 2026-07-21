# CreatorStore UI Specification v1.0

> **Status:** High-Fidelity Specification | Every screen designed | Component mapping complete
> **Aligns with:** Product Blueprint + Design System
> **Principle:** Specify so precisely that no engineer makes a design decision alone.

---

## 1. Screen Inventory

### By User Type

| User | Screens |
|------|---------|
| **Public** | Landing, Pricing, Signup, Login, Storefront, Blog, Contact, Legal |
| **Creator** | Dashboard, Orders, Customers, Products, Gallery, Timeline, Links, Games, Content Feed, Analytics, SEO, Email, AI Assistant, Messages, Appearance, Domain, Billing, Settings, Builder, Setup Wizard |
| **Super Admin** | Platform Dashboard, Revenue, Tenants, Agencies, AI Generation, Subscriptions, Themes, Feature Flags, Health, Audit, API Keys, Support, Settings |
| **Agency** | Dashboard, Clients, Client Detail, Websites, AI Generation, Templates, Analytics, Domains, Team, Billing, Marketplace, Settings |
| **All** | AI Flow (Template → Strategy → Analysis → Report → Preview → Provision → Invitation) |

---

## 2. Marketing Screens

### 2.1 Landing Page `/`

**Purpose:** Convert visitors into signups. Show the product, build trust, drive action.

**Target User:** Creator, Agency — unauthenticated

**Layout:**
```
┌──────────────────────────────────────────────┐
│ Top Nav: Logo │ Sign In │ Get Started        │
├──────────────────────────────────────────────┤
│                                              │
│              Hero Section                     │
│    "Built for Indian Creators" badge         │
│    Gradient headline (3xl → 5xl)             │
│    Subtitle (text-lg, zinc-400)              │
│    CTA: [Paste your YouTube URL →] (input)   │
│          [Generate Free Website] (button)     │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│           For Solo Creators                   │
│    4 feature cards in 2×2 grid              │
│    Icon + title + description                │
│    (Glass cards, hover glow)                 │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│           For Agencies                        │
│    4 feature cards in 2×2 grid              │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│           Pricing                             │
│    3 pricing cards: Solo/Free, Freelancer,   │
│    Growth. Feature comparison. CTA.          │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│    Final CTA + Footer (links, email, legal)  │
│                                              │
└──────────────────────────────────────────────┘
```

**Components:** Button (primary, lg), Input (lg), GlassCard, PricingCard, FeatureCard

**Responsive:** Single column on mobile. Pricing cards stack vertically. Input+button stack.

### 2.2 Signup `/signup`

**Layout:** Split — left side (marketing copy + benefits, hidden on mobile), right side (form)
**Components:** SignupForm (email, password, role selector: Creator/Agency), Button (primary, lg)
**States:** Default, loading, error (email taken), success → redirect

### 2.3 Login `/admin/login`

**Layout:** Centered card on dark background. Tenant-aware (accepts `?tenant=` param).
**Components:** LoginForm (email, password), Button (primary, lg), GlassCard
**States:** Default, loading, error (invalid credentials), success → role-based redirect

---

## 3. AI Generation Flow Screens

### 3.1 Template Selector

**Route:** `/super-admin/generate` or `/agency/[id]/generate`

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Generate Website                                │
│  Step 1 of 3: What kind of website?              │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │  🎨    │ │  🛒    │ │  🎓    │ │  🎮    │   │
│  │Creat.. │ │Creat.. │ │Coach/  │ │Gaming  │   │
│  │Portfol │ │Store   │ │Mentor  │ │Creator │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │  🎵    │ │  💪    │ │  📦    │ │  🏢    │   │
│  │Music   │ │Fitness │ │Digital │ │Agency  │   │
│  │Artist  │ │Coach   │ │Products│ │        │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                  │
│         [← Cancel]           [Continue →]        │
└──────────────────────────────────────────────────┘
```

**Components:** TemplateCard (3×3 grid on desktop, 2×4 on tablet, 1×9 scroll on mobile), Button (primary), Button (ghost)
**Interaction:** Click card → highlight selected → Continue enables. Cards show description on hover.
**Responsive:** 3 columns (xl) → 3 (lg) → 2 (md) → 1 scrollable (sm)

### 3.2 Strategy Selector

**Route:** Same route, step 2

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  Generate Website                                │
│  Template: Gaming Creator   Step 2 of 3           │
├──────────────────────────────────────────────────┤
│                                                  │
│     How should AI build this website?            │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ ○ Fast    30 sec                         │   │
│  │ Uses detected data only.                 │   │
│  │ Best for: Quick preview                  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ ● Balanced ★    ~1 min   [Recommended]   │   │
│  │ AI copywriting + SEO + hero              │   │
│  │ Best for: Most creators                  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ ○ Premium   2-3 min                      │   │
│  │ Full rewrite, brand voice, CTAs          │   │
│  │ Best for: Premium launches               │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│      [← Templates]             [Continue →]     │
└──────────────────────────────────────────────────┘
```

**Components:** StrategyCard (selectable radio-card pattern), Badge (Recommended), Button
**Interaction:** Click card → radio selection. Border glows cyan on selected card. Continue navigates to URL input + Analysis.
**Responsive:** Cards full-width on mobile, same layout otherwise.

### 3.3 AI Analysis

**Route:** Same route, step 3 (after URL input)

**Layout:** 2-column grid: left column (source info + theme + SEO) | right column (profile + content + sections)

```
┌──────────────────────────────────────────────────┐
│  ← Back                 Gaming Creator    Generate →│
├──────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ 🎥 Platform  │  │ 👤 Creator Profile       │  │
│  │ YouTube 95%  │  │  Avatar  Name            │  │
│  │ @techcreator │  │  50K subscribers         │  │
│  └──────────────┘  │  Bio preview...          │  │
│                    │  Social links             │  │
│  ┌──────────────┐  └──────────────────────────┘  │
│  │ 🎨 Theme     │                                │
│  │ Gaming Dark  │  ┌──────────────────────────┐  │
│  │ #7C3AED etc  │  │ 📹 Content                │  │
│  │ Inter · 12px │  │  4 recent videos          │  │
│  └──────────────┘  │  750 avg engagement        │  │
│                    │  themes: tech, reviews     │  │
│  ┌──────────────┐  └──────────────────────────┘  │
│  │ 🔍 SEO       │                                │
│  │ ██████░░ 78  │  ┌──────────────────────────┐  │
│  │ Title ✓     │  │ 📋 Sections                │  │
│  │ Desc  ✓     │  │ ☑ Products (gear)          │  │
│  │ OG: missing  │  │ ☑ Gallery (highlights)     │  │
│  └──────────────┘  │ ☑ Links (social)           │  │
│                    │ ☐ Games (preview)          │  │
│                    └──────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  ⚠️ Warnings: Banner not detected.              │
│       Alt text needed for accessibility.         │
└──────────────────────────────────────────────────┘
```

**Components:** GlassCard (for each info block), Progress (for SEO bar), Badge (platform, confidence), Avatar, Button
**States:** Loading (skeleton cards), error (invalide URL), empty (fallback profile)
**Responsive:** 2 columns (lg+) → 1 column stacked (mobile). Cards fill width.

### 3.4 AI Website Report

**Purpose:** Build trust before generation. Show score + checklist + recommendations.

**Layout:** Centered single-column with large score ring as hero

```
┌──────────────────────────────────────────────────┐
│                                                  │
│            AI Website Report                     │
│                                                  │
│       ┌──────────────────────┐                   │
│       │  ┌────────────────┐  │                   │
│       │  │                │  │                   │
│       │  │      92%       │  │  ← Score ring    │
│       │  │                │  │     (SVG circle)  │
│       │  └────────────────┘  │                   │
│       └──────────────────────┘                   │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ ✓ Detected   │  │ ⚠ Missing   │             │
│  │ ✓ Brand      │  │ ⚠ Contact   │             │
│  │ ✓ Colors     │  │ ⚠ Domain    │             │
│  │ ✓ Logo       │  │ ⚠ Payments  │             │
│  │ ✓ Hero       │  │ ⚠ Shipping  │             │
│  │ ✓ Gallery    │  │ ⚠ Privacy   │             │
│  │ ✓ Products   │  │ ⚠ Tax       │             │
│  │ ✓ Social     │  │ ⚠ OG Image  │             │
│  │ ✓ SEO        │  │              │             │
│  │ ✓ Theme      │  │              │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ 💡 Recommended: Connect Razorpay before  │   │
│  │    publishing. Add contact email.         │   │
│  │    Estimated: ~3 minutes.                 │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ 📋 Sections to include                    │   │
│  │ ☑ Hero        ☑ Products                 │   │
│  │ ☑ About       ☑ Gallery                  │   │
│  │ ☐ FAQ         ☑ Links                    │   │
│  │ ☐ Blog        ☐ Newsletter               │   │
│  │ ☑ Timeline    ☑ Contact                  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  [← Analysis]  [✏️ Edit]  [✅ Approve & Preview]│
└──────────────────────────────────────────────────┘
```

**Components:** ScoreRing (SVG circular progress with gradient, animated count-up), ChecklistGrid, RecommendationCard, SectionToggleGrid, Button
**Animation:** Score counts up from 0 on appear (1s spring). Checklist items stagger in (50ms delay each).
**States:** Loading (pulsing ring), perfect score (100% celebration animation), low score (<60, warning styling)

### 3.5 Website Preview

**Layout:** Device frame selector across top, preview fills center, actions at bottom.

```
┌──────────────────────────────────────────────────┐
│  Website Preview       [📱] [📋] [🖥️]           │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────────┐                │
│              │                  │                │
│              │  Device Frame    │                │
│              │  w/ generated    │                │
│              │  website         │                │
│              │                  │                │
│              └──────────────────┘                │
│                                                  │
├──────────────────────────────────────────────────┤
│  [← Back]  [🔄 Regenerate]  [✅ Approve & Deploy]│
└──────────────────────────────────────────────────┘
```

**Components:** DevicePreview (mockup frame), Button, SegmentedControl (device selector)
**Interaction:** Tap device icons to switch. Scroll preview within frame. Regenerate returns to Analysis.
**Responsive:** Full-width frame on mobile, 80% width on desktop.

### 3.6 Provision Progress

**Layout:** Centered. Steps animate in sequence as deployment proceeds.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│          🚀 Deploying Creator Website            │
│          techcreator.creatorspace.app             │
│                                                  │
│    ✅ Creating Tenant              1.2s          │
│    ✅ Creating Database            0.8s          │
│    ✅ Generating Theme             1.5s          │
│    ▶️  Generating Pages             2.1s (pulse) │
│    ⏳ Creating Dashboard                          │
│    ⏳ Creating Domain                            │
│    ⏳ Finalizing                                 │
│                                                  │
│    ████████████░░░░░░   4/8 stages               │
│                                                  │
│    Elapsed: 5.6s                                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Components:** DeploymentCard (step list with animated progression), Progress (overall), Skeleton (for pending steps)
**Animation:** Steps complete sequentially with green check + strikethrough animation. Active step pulses. Progress bar fills smoothly.
**States:** Running (steps animating), complete (all ✓ + summary card appears), failed (error state with retry)

**Complete State:**
```
┌──────────────────────────────────────────────────┐
│                                                  │
│          🎉 Website is ready!                    │
│                                                  │
│    Dashboard: /admin/dashboard                   │
│    Storefront: techcreator.creatorspace.app      │
│                                                  │
│    [📋 Copy Links]   [📧 Invite Creator]         │
│    [🚀 Open Dashboard]                           │
└──────────────────────────────────────────────────┘
```

### 3.7 Creator Setup Wizard

**Layout:** Horizontal stepper at top. Content area below. Fixed bottom bar with Back/Next/Skip.

```
┌──────────────────────────────────────────────────┐
│  ① Welcome → ② Branding → ③ Payments →          │
│  ④ Social → ⑤ Domain → ⑥ Email → ⑦ Publish      │
├──────────────────────────────────────────────────┤
│                                                  │
│              Step Content Area                   │
│              (changes per step)                  │
│                                                  │
├──────────────────────────────────────────────────┤
│          [← Back]   Progress: 3/7   [Next →]    │
└──────────────────────────────────────────────────┘
```

**Components:** Stepper (horizontal, numbered), WizardStep (content card per step), Button, Input, Avatar, MediaUpload, Progress
**Step Content:**
1. **Welcome:** Illustration, creator name, "Your website has been generated. Let's customize it in 5 minutes."
2. **Branding:** Name input, tagline, bio textarea, avatar upload, banner upload. Pre-filled from AI.
3. **Payments:** Connect Razorpay, currency (INR), UPI ID, tax info.
4. **Social:** YouTube URL (pre-filled), Instagram, Twitter, Twitch, Discord, custom links.
5. **Domain:** Current subdomain shown. Add custom domain form with DNS instructions.
6. **Email:** Welcome email preview, sender name, reply-to email.
7. **Publish:** Celebration animation. Copy storefront link. "Go to Dashboard" CTA.

**Responsive:** Stepper becomes compact dot indicators on mobile. Form fields full-width. Bottom bar fixed.

---

## 4. Creator Dashboard Screens

### 4.1 Dashboard Home `/admin/dashboard`

**Layout:** Job-grouped sidebar left. Content area with metric cards + recent activity + quick actions.

```
┌──────┬────────────────────────────────────────────┐
│      │  Dashboard                                  │
│ 📊   │                                            │
│      │  ┌────────┬────────┬────────┬────────┐    │
│ 🌐   │  │Products│Orders  │Revenue │Visitors│    │
│      │  │  8     │ 23/mo  │₹12,450 │ 1,240  │    │
│ 📸   │  └────────┴────────┴────────┴────────┘    │
│      │                                            │
│ 💰   │  ┌────────────────────┐  ┌─────────────┐  │
│      │  │ Revenue (30-day)   │  │ Quick Actions│  │
│ 📈   │  │ ██░██░░░████░░░░   │  │ + Add Product│  │
│      │  └────────────────────┘  │ + Add Media  │  │
│ ⚙️    │                          │ + Edit Site  │  │
│      │  ┌────────────────────┐  └─────────────┘  │
│      │  │ Recent Orders       │                   │
│      │  │ #1042  ₹499 Pending │  ┌────────────┐  │
│      │  │ #1041  ₹299 Done    │  │ AI Assistant│  │
│      │  │ #1040  ₹999 Done    │  │ "How can I  │  │
│      │  │ [View All]          │  │  help?"     │  │
│      │  └────────────────────┘  └────────────┘  │
└──────┴────────────────────────────────────────────┘
```

**Components:** MetricCard (4-column grid), Chart (Revenue line chart), QuickActionGrid, Table (Recent Orders), AIChatBubble (minimized)
**Responsive:** Metric cards 4 col (xl) → 2 col (md) → 1 col (sm). Chart full-width below cards. Quick actions become horizontal scroll on mobile.

### 4.2 Orders `/admin/orders`

**Layout:** Page header with filters. Table below. Order detail in slide-over drawer.
**Components:** PageHeader, FilterBar (status, date range, search), DataTable (sortable columns: order ID, customer, product, amount, status, date), Badge (status), Drawer (order detail), Button
**States:** Loading skeleton table, empty ("No orders yet"), error, filtered-no-results
**Row click:** Opens drawer with order details + fulfillment actions

### 4.3 Customers `/admin/customers`

**Layout:** Search + table. Customer cards view toggle. Detail drawer.
**Components:** Search (input with icon), ToggleGroup (table/cards view), DataTable or CardGrid (customer cards: name, email, total orders, total spent), Drawer (customer detail: orders list, contact info, notes)
**Responsive:** Cards view default on mobile. Table default on desktop.

### 4.4 Products `/admin/products` [EXISTING — KEEP]

Preserve existing implementation. Add only: bulk actions toolbar, filter by status, search.

### 4.5 Content Pages (Gallery, Timeline, Links, Games, Content Feed) [EXISTING — KEEP]

All preserved. Add consistent page headers and filter bars where absent.

### 4.6 Analytics `/admin/analytics`

**Layout:** Date range selector top. KPI row. Charts grid. Top content table.

```
┌──────────────────────────────────────────────────┐
│  Analytics          [Last 30 Days ▼]             │
├──────────────────────────────────────────────────┤
│  ┌────────┬────────┬────────┬────────┐          │
│  │Visitors│Orders  │Revenue │Conv %  │          │
│  │ 12.4K  │  234   │₹85,200 │  3.2%  │          │
│  │ ↑ 12%  │ ↑ 8%   │ ↑ 15%  │ ↑ 0.5% │          │
│  └────────┴────────┴────────┴────────┘          │
│                                                  │
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │ Visitors Over Time  │  │ Revenue Breakdown  │  │
│  │ ██░████░░░███░░░   │  │ ████ Products     │  │
│  │ [Line Chart]        │  │ ██ Courses        │  │
│  └────────────────────┘  │ █ Donations       │  │
│                          └────────────────────┘  │
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │ Top Products        │  │ Traffic Sources    │  │
│  │ 1. Gaming Chair     │  │ YouTube     45%   │  │
│  │ 2. Merch Tee        │  │ Instagram   30%   │  │
│  │ 3. Digital Course   │  │ Direct      15%   │  │
│  └────────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Components:** DateRangePicker, MetricCard (with trend indicator), Chart (line, bar, donut), DataTable
**Responsive:** KPI row 4 col → 2 col → 1 col. Charts stack vertically on mobile.

### 4.7 AI Assistant `/admin/ai-assistant`

**Layout:** Chat interface. Left sidebar with conversation history. Right: chat messages + input.

```
┌──────┬───────────────────────────────────────────┐
│      │  AI Assistant                              │
│ Conv │                                           │
│  1   │  ┌───────────────────────────────────┐    │
│      │  │ 👤 User                            │    │
│  2   │  │ "Make my site feel more premium"   │    │
│      │  └───────────────────────────────────┘    │
│  3   │                                           │
│      │  ┌───────────────────────────────────┐    │
│      │  │ 🤖 AI                              │    │
│      │  │ I recommend:                       │    │
│      │  │ ✓ Dark luxury theme                │    │
│      │  │ ✓ Larger typography                │    │
│      │  │ ✓ Gold accents                     │    │
│      │  │                                    │    │
│      │  │ [Before/After Preview]             │    │
│      │  │ [Apply] [Theme Only] [Dismiss]     │    │
│      │  └───────────────────────────────────┘    │
│      │                                           │
│      │ ┌───────────────────────────────────┐    │
│      │ │ Type a message...               📎 │    │
│      │ └───────────────────────────────────┘    │
└──────┴───────────────────────────────────────────┘
```

**Components:** Sidebar (conversation list), AIChatBubble (user + AI variants), ActionCard (AI suggestions with preview), Textarea, Button
**Responsive:** Sidebar hidden on mobile, accessible via back button. Chat full-width.
**States:** Loading (AI thinking skeleton), empty (suggested prompts), error (retry)

### 4.8 Builder `/builder` [EXISTING — KEEP]

Preserve existing implementation completely.

### 4.9 Settings, Billing, Appearance, Domain, Messages [EXISTING — KEEP/IMPROVE]

All preserved. Messages added to sidebar. Settings reorganized into tabs.

---

## 5. Super Admin Screens

### 5.1 Platform Dashboard `/super-admin`

Same layout as Creator Dashboard but with platform metrics: MRR, ARR, Tenants, Agencies, AI Queue, System Health. Revenue chart.

### 5.2 Tenant Detail `/super-admin/tenants/[id]`

**Layout:** Header with tenant info. Tabs: Overview, Subscription, Websites, Activity, Settings.
**Components:** PageHeader, Tabs, MetricCard, DataTable (orders, products), ActivityFeed, Button (impersonate, suspend, delete)

### 5.3 Revenue Dashboard `/super-admin/revenue`

**Layout:** MRR chart. Revenue by plan. Revenue by agency. Top earning creators.
**Components:** DateRangePicker, Chart (multi-line, stacked bar), MetricCard, DataTable

### 5.4 AI Generation Queue `/super-admin/generate`

**Layout:** Queue list (pending, running, completed, failed). Each item: creator, template, strategy, status, duration, actions.
**Components:** DataTable (sortable by status, date), Badge (status), Button (view result, retry, cancel), Pagination
**States:** Empty queue, processing (live updates via polling/SSE), completed today count

---

## 6. Agency Screens

### 6.1 Agency Dashboard `/agency/[id]`

**Layout:** Similar to Creator Dashboard but with agency metrics: Clients, Websites, Revenue, Staff. Cross-client revenue chart. Client list table. Quick actions (+ New Client, + AI Generate).

### 6.2 Client Detail `/agency/[id]/clients/[clientId]`

**Layout:** Client header. Tabs: Overview, Website, Analytics, Billing, Settings. Impersonate button.
**Components:** PageHeader, Tabs, MetricCard (client-specific), Chart, DataTable, Button (impersonate, edit website, view storefront)

### 6.3 Agency Templates `/agency/[id]/templates`

**Layout:** Template card grid. Each card: preview thumbnail, name, used count, actions (apply, edit, delete). + New Template button.
**Components:** TemplateCard (preview + metadata), Button, EmptyState, Dialog (create template)

---

## 7. Customer Storefront `/[domain]`

**Layout:** Single-page scrollable storefront. Sections in order: Hero → Profile → Products → Gallery → Timeline → Links → Content Feed → Footer.
**Components:** HeroSection, ProductGrid, GallerySection, TimelineSection, AffiliateGrid, ContentFeed, Footer
**Responsive:** Single column. Sections stack with generous whitespace. Products grid: 3 col desktop → 2 col tablet → 1 col mobile.

---

## 8. Responsive Behavior Reference

| Pattern | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|---------|-----------------|---------------------|-------------------|
| Sidebar | Hamburger overlay | Collapsed icons | Expanded w/ labels |
| Card grid | 1 column | 2 columns | 3-4 columns |
| Tables | Horizontal scroll | Full table | Full table |
| Forms | Stacked fields | Stacked | Side-by-side |
| Modals | Bottom sheet | Centered dialog | Centered dialog |
| Drawers | Full screen | Slide panel | Slide panel |
| Charts | Full width | Half width | Grid layout |
| AI Flow | Single column | Single column | Centered 800px |
| Wizard | Dot stepper | Numbered stepper | Numbered stepper |

---

## 9. Component Mapping Reference

Quick-reference mapping from screen widgets to Design System components:

| Screen Widget | Component(s) |
|---------------|-------------|
| Metric/stat number | MetricCard |
| Revenue chart | Chart (Recharts LineChart) |
| Table with sort/filter | DataTable (TanStack Table) |
| Order/customer list | DataTable + Badge |
| Product/gallery card | ProductCard, GalleryCard |
| AI template grid | TemplateCard |
| AI strategy picker | StrategyCard |
| Website score | ScoreRing + ChecklistGrid |
| Section toggle | SectionToggle |
| Deployment progress | DeploymentCard + Progress |
| Wizard steps | Stepper + WizardStep |
| AI chat | AIChatBubble + ActionCard |
| File upload | MediaUpload / FileDropZone |
| Empty state | EmptyState |
| Loading state | Skeleton |
| Error state | Alert (danger variant) |
| Search | CommandPalette (global), Input+Search (page-level) |
| Notification | Toast + NotificationCenter |
| Page title + actions | PageHeader |
| Step-by-step form | Stepper + Tabs |

---

## 10. Accessibility Checklist Per Screen

Every screen must pass:
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skips)
- [ ] All images have alt text (or `role="presentation"`)
- [ ] Form inputs have associated labels
- [ ] Error messages are linked to inputs via `aria-describedby`
- [ ] Tab order follows visual layout
- [ ] Focus is trapped in modals/drawers
- [ ] Escape closes modals/drawers/dropdowns
- [ ] Color is not the only indicator (icons + text for status)
- [ ] Touch targets are ≥ 44×44px on mobile
- [ ] Content is readable at 200% zoom
- [ ] `prefers-reduced-motion` is respected

---

*CreatorStore UI Specification v1.0 — July 2026*
*Every screen designed. Every interaction specified. Every component mapped.*
