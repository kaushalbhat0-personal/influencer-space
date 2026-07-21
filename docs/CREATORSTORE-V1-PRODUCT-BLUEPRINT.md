# CreatorStore v1 — Complete Product UX Blueprint

> **Status:** Production Audit Complete | Architecture Frozen | Frontend Preserved
> **Date:** July 2026
> **Scope:** SaaS Product Specification for 4 User Types + AI Generation Flow
> **Principle:** Build on existing work. Never redesign. Extend only.

---

## 1. Executive Summary

CreatorStore is an AI-powered Creator Website Operating System. A creator pastes their YouTube, Instagram, or Google profile URL and receives a production-ready website in minutes.

The platform has a complete backend architecture (Platform Core, Content Platform, AI Generation Engine, Application Services) and a significant frontend implementation across 43 route segments, 40+ components, and 3 user-facing portals.

This document audits every existing page, identifies 32 production SaaS gaps, designs information architecture for all 4 user types, and provides a complete UX blueprint for each screen — including the AI generation flow, provisioning, creator onboarding, agency workflow, and customer journey.

**All existing work is preserved. Nothing is redesigned. Everything is extended.**

---

## 2. Current Product Audit — Complete Feature Inventory

### 2.1 Page & Route Inventory (43 route segments)

#### Marketing (8 routes)
| Route | Status | Purpose |
|-------|--------|---------|
| `/` | KEEP | Landing page — hero, features, pricing, CTAs |
| `/signup` | KEEP | Registration with email+password |
| `/contact` | KEEP | Contact form + support info |
| `/terms` | KEEP | Terms & Conditions |
| `/privacy` | KEEP | Privacy Policy (DPDPA 2023) |
| `/refund` | KEEP | Cancellation & Refund Policy |
| `/blog` | KEEP | Blog index (hardcoded 3 posts) |
| `/blog/[slug]` | KEEP | Individual blog post |
| `/blog/guides` | IMPROVE | Guide cards (dead links) |

#### Public Storefront (1 route)
| Route | Status | Purpose |
|-------|--------|---------|
| `/[domain]` | KEEP | Tenant public storefront — hero, profile, products, gallery, timeline, links, content feed, SEO, JSON-LD |

#### Admin Dashboard (15 routes)
| Route | Status | Purpose |
|-------|--------|---------|
| `/admin/login` | KEEP | Tenant-aware login form |
| `/admin/dashboard` | KEEP | Stats overview with quick actions |
| `/admin/products` | KEEP | Product CRUD manager |
| `/admin/links` | KEEP | Affiliate links CRUD |
| `/admin/gallery` | KEEP | Gallery / Hall of Fame CRUD |
| `/admin/milestones` | KEEP | Timeline milestones CRUD |
| `/admin/games` | KEEP | Games list |
| `/admin/games/new` | KEEP | Add game form |
| `/admin/games/[id]/edit` | KEEP | Edit game form |
| `/admin/settings` | KEEP | Website settings (profile, hero, social, API keys) |
| `/admin/settings/content` | KEEP | Content feed management |
| `/admin/settings/domain` | KEEP | Custom domain (Vercel DNS) |
| `/admin/appearance` | KEEP | Theme editor with live preview |
| `/admin/billing` | KEEP | Subscription management (Razorpay) |
| `/admin/messages` | IMPROVE | Hidden route — exists but not in sidebar |

#### Builder (1 route)
| Route | Status | Purpose |
|-------|--------|---------|
| `/builder` | KEEP | Visual drag-and-drop page builder |

#### Agency Portal (2 routes)
| Route | Status | Purpose |
|-------|--------|---------|
| `/agency` | IMPROVE | Redirect to agency dashboard |
| `/agency/[agencyId]` | IMPROVE | Skeleton dashboard — no sub-pages implemented |

#### Super Admin (4 routes)
| Route | Status | Purpose |
|-------|--------|---------|
| `/super-admin` | KEEP | Platform dashboard with tenant ledger |
| `/super-admin/health` | KEEP | System health metrics |
| `/super-admin/features` | KEEP | Feature flag management |
| `/super-admin/audit` | KEEP | Paginated audit log |

### 2.2 Component Inventory (40+ components)

#### UI Primitives (21)
Buttons, Cards (Animated, Glass, Tilt), ErrorBoundary, GameCarousel, ImageUpload, Input, LiveStatus, LoadingSpinner, NicheBackground, ScrollProgress, SocialIcon, Table, Textarea, VideoUpload

#### Admin Components (6)
EditEntityDrawer, ImageUploader, LoginForm, MobileSidebarToggle, PreviewShell, SuperAdmin* (3)

#### Public Components (11)
AffiliateGrid, ContentFeed, EditableSection, GallerySection, HeroSection, InstagramFeed, LiveMilestones, ProductGrid, TimelineSection, VideoCarousel, VideoHero

#### Shared (1)
HeroMedia

#### Theme (2)
ThemeProvider, client-theme-provider

#### Marketing (4)
CheckoutButton, PricingCTA, SignupForm, SignupModal

### 2.3 Design System Inventory

- **Color:** Custom brand colors (s8ul-cyan, s8ul-pink, s8ul-purple, s8ul-gold), neon palette, CSS variable theming
- **Typography:** Inter (sans), Orbitron (display), gradient text classes
- **Dark Theme:** `bg-[#0a0a0a]` base, glassmorphic surfaces (`zinc-950/90`), neon glow effects
- **Components:** admin-card, admin-btn, admin-badge, admin-input, admin-table classes
- **Animations:** Framer Motion (staggered lists, stat counters, hover effects), pulse-neon, scan-line CSS animations
- **Design Tokens:** Full token system (colors, typography, spacing, radius, elevation, borders, animation, breakpoints)
- **Theme System:** "Neon Dark" default, token compiler/resolver/registry, CSS variable injection

---

## 3. KEEP / IMPROVE / REMOVE / NEW — Complete Classification

### 3.1 Marketing Pages

| Page | Status | Notes |
|------|--------|-------|
| Landing `/` | **KEEP** | Production-ready. Pricing cards need Agency tier updates |
| Signup `/signup` | **KEEP** | Needs role selector (Creator vs Agency) |
| Contact `/contact` | **KEEP** | Production-ready |
| Terms `/terms` | **KEEP** | Production-ready |
| Privacy `/privacy` | **KEEP** | Production-ready |
| Refund `/refund` | **KEEP** | Production-ready |
| Blog `/blog` | **IMPROVE** | Needs CMS, not hardcoded |
| Blog `/blog/[slug]` | **IMPROVE** | Needs dynamic content |
| Blog Guides | **IMPROVE** | Dead links — fix or remove |

### 3.2 Creator Dashboard

| Page | Status | Notes |
|------|--------|-------|
| Dashboard Home | **KEEP** | Working. Needs analytics widgets |
| Storefront / Products | **KEEP** | Working CRUD |
| Links & Affiliates | **KEEP** | Working CRUD |
| Hall of Fame / Gallery | **KEEP** | Working CRUD |
| Milestones | **KEEP** | Working CRUD |
| Games | **KEEP** | Working CRUD |
| Content Feed | **KEEP** | Working |
| Appearance / Theme | **KEEP** | Working with live preview |
| Domain | **KEEP** | Working with Vercel DNS |
| Billing | **KEEP** | Working with Razorpay |
| Settings | **KEEP** | Working |
| Messages | **IMPROVE** | Working but hidden — add to sidebar |
| Analytics | **NEW** | Page views, revenue, audience, content |
| Orders | **NEW** | Purchase history, order status |
| Customers | **NEW** | Fan data, email collection |
| SEO | **NEW** | Meta tags, sitemap, search console |
| AI Assistant | **NEW** | Chat interface to configure website |
| Email Campaigns | **NEW** | Newsletter, promotional emails |
| Courses | **NEW** | Course builder (future) |
| Membership | **NEW** | Gated content tiers |
| Community | **NEW** | Forum/comments |
| Automation | **NEW** | Workflows, triggers, Zapier |

### 3.3 Super Admin

| Page | Status | Notes |
|------|--------|-------|
| Platform Dashboard | **KEEP** | Shows tenants, products, subscriptions |
| Tenant Ledger | **KEEP** | Working tenant table |
| Audit Log | **KEEP** | Paginated, filterable |
| System Health | **KEEP** | Global metrics |
| Feature Flags | **KEEP** | Toggle switches |
| Provision Modal | **KEEP** | Manual provision trigger |
| Revenue Dashboard | **NEW** | MRR, ARR, churn, LTV |
| AI Generation Queue | **NEW** | Bulk generation jobs, status tracking |
| Agencies List | **NEW** | Agency management |
| Subscriptions | **NEW** | Subscription management, invoices |
| Themes Marketplace | **NEW** | Theme approval, publishing |
| Templates | **NEW** | Template library management |
| Domain Management | **NEW** | Domain pool, SSL, DNS |
| API Keys | **NEW** | Public API key management |
| Support Tickets | **NEW** | Admin support view |
| Billing History | **NEW** | Platform revenue, payouts |
| Usage & Storage | **NEW** | Per-tenant usage monitoring |
| Settings | **NEW** | Platform-wide configuration |

### 3.4 Agency Portal (from scratch)

| Page | Status | Notes |
|------|--------|-------|
| Agency Dashboard | **NEW** | Overview of all clients |
| Clients List | **NEW** | Manage client accounts |
| Client Detail | **NEW** | Single client view, impersonation |
| AI Generation | **NEW** | Generate websites for clients |
| Websites | **NEW** | All managed websites |
| Templates | **NEW** | Agency template library |
| Analytics | **NEW** | Cross-client analytics |
| Billing | **NEW** | Agency subscription, client billing |
| Domains | **NEW** | Client domain management |
| Team | **NEW** | Staff accounts, permissions |
| White-label Settings | **NEW** | Custom branding, custom domain |
| Marketplace | **NEW** | Agency marketplace listing |
| Settings | **NEW** | Agency profile, API keys |

### 3.5 Builder / Editor

| Page | Status | Notes |
|------|--------|-------|
| Visual Builder | **KEEP** | Full drag-and-drop, undo/redo, canvas |
| Theme Editor | **KEEP** | Token inspector integrated |
| Mobile Preview | **KEEP** | Device frame selector |

### 3.6 Public Storefront

| Feature | Status | Notes |
|---------|--------|-------|
| Tenant Storefront | **KEEP** | Hero, profile, sections, SEO |
| Product Grid + Checkout | **KEEP** | Working with Razorpay |
| Gallery | **KEEP** | Image/video display |
| Timeline | **KEEP** | Milestones display |
| Affiliate Links | **KEEP** | Click-tracked links |
| Content Feed | **KEEP** | Synced social posts |
| Customer Account | **NEW** | Order history, profile, subscriptions |
| Membership Gating | **NEW** | Member-only content |
| Course Player | **NEW** | Video course delivery |

### 3.7 Navigation & Shell

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Sidebar | **IMPROVE** | Reorganize by jobs (Website → Content → Sell → Grow → Settings). Underlying routes unchanged. |
| Admin Layout | **KEEP** | Glassmorphic, responsive |
| Super Admin Sidebar | **KEEP** | Working |
| Agency Sidebar | **IMPROVE** | Skeleton exists but no sub-pages |
| Mobile Header | **KEEP** | Working hamburger toggle |
| Global Search | **NEW** | Cmd+K search across all entities |
| Notification Bell | **NEW** | Real-time notification dropdown |
| Breadcrumbs | **KEEP** | In builder, extend to admin pages |

---

## 4. Gap Analysis — Production SaaS Readiness

### 4.1 CRITICAL Gaps (must-have for v1 launch)

| # | Gap | Current State | Required |
|---|-----|---------------|----------|
| 1 | **Agency Portal** | Skeleton only (2 dead routes) | Full agency dashboard with client management |
| 2 | **Creator Onboarding** | None | 5-step setup wizard after first login |
| 3 | **AI Generation Flow** | CLI/service only, no UI | AI analysis screen → preview → provision → onboarding |
| 4 | **Orders** | Prisma model exists, no UI | Order list, status, fulfillment |
| 5 | **Customers** | No UI | Fan database, email collection, segmentation |
| 6 | **Analytics** | No charts | Page views, revenue, audience, content performance |
| 7 | **Notifications** | None | In-app, email triggers |
| 8 | **SEO Tools** | JSON-LD only | Meta editor, sitemap, search console, schema |

### 4.2 HIGH Gaps (needed shortly after v1)

| # | Gap | Required |
|---|-----|----------|
| 9 | **AI Assistant** | Chat-based website configuration |
| 10 | **Email Campaigns** | Newsletter builder, audience segmentation |
| 11 | **Global Search** | Cmd+K across products, orders, customers |
| 12 | **API Keys** | Public API for headless/integrations |
| 13 | **Webhooks** | Event-driven integrations |
| 14 | **Revenue Dashboard** | Super admin MRR/ARR/churn |
| 15 | **Templates Library** | Pre-built website templates |
| 16 | **White-label** | Agency custom branding, custom domain, custom emails |

### 4.3 MEDIUM Gaps (roadmap items)

| # | Gap | Required |
|---|-----|----------|
| 17 | **Membership** | Gated content, subscription tiers |
| 18 | **Courses** | Course builder, video player, progress tracking |
| 19 | **Community** | Comments, forums, chat |
| 20 | **Automation** | Workflows, Zapier/Make integration |
| 21 | **Multi-payment** | UPI, cards, wallets beyond Razorpay |
| 22 | **Shipping** | Physical product fulfillment |
| 23 | **Taxes** | GST calculation, tax reports |
| 24 | **Blog CMS** | Dynamic blog editor |
| 25 | **Support Tickets** | Help desk for creators/agencies |
| 26 | **Marketplace** | Theme/plugin marketplace |
| 27 | **Developer Docs** | API documentation, SDK |

### 4.4 FUTURE Gaps (v2+)

| # | Gap | Required |
|---|-----|----------|
| 28 | **AI Content Writer** | Blog posts, product descriptions, SEO copy |
| 29 | **AI Design Assistant** | Layout suggestions, color palette generation |
| 30 | **CRM** | Full contact management, pipeline |
| 31 | **Affiliate Program** | Referral system for creators |
| 32 | **Mobile App** | Creator dashboard on mobile |

---

## 5. Complete Information Architecture

### 5.1 Super Admin Navigation

```
Super Admin
├── 📊 Overview
│   ├── Platform Dashboard          [KEEP]
│   └── Revenue Dashboard           [NEW]
├── 🏢 Tenants
│   ├── All Tenants                 [KEEP — Tenant Ledger]
│   └── Tenant Detail               [NEW]
├── 🏢 Agencies
│   ├── All Agencies                [NEW]
│   └── Agency Detail               [NEW]
├── 🤖 AI Generation
│   ├── Generation Queue            [NEW]
│   └── Generation History          [NEW]
├── 💰 Billing
│   ├── Subscriptions               [NEW]
│   ├── Invoices                    [NEW]
│   └── Payouts                     [NEW]
├── 🎨 Themes
│   ├── Theme Library               [NEW]
│   ├── Templates                   [NEW]
│   └── Marketplace                 [NEW]
├── 🔧 Platform
│   ├── Feature Flags               [KEEP]
│   ├── System Health               [KEEP]
│   ├── Audit Log                   [KEEP]
│   └── API Keys                    [NEW]
├── 📈 Analytics                    [NEW]
├── 🎫 Support                      [NEW]
└── ⚙️ Settings                     [NEW]
```

### 5.2 Creator Navigation — Organized by Jobs

> **Design principle:** Navigation is organized by *what the creator wants to accomplish*, not by *what pages exist*. Underlying routes remain unchanged — only the mental model presented in the sidebar changes.

```
Creator Dashboard — Jobs
│
├── 📊 Dashboard                    [KEEP — enhance with analytics widgets]
│
├── 🌐 Website                      "Build my site"
│   ├── Builder (Visual Editor)     [KEEP]
│   ├── Appearance / Theme          [KEEP]
│   ├── Pages & Layout              [NEW — page structure manager]
│   ├── SEO                         [NEW]
│   └── Domain                      [KEEP]
│
├── 📸 Content                      "Fill my site"
│   ├── Products                    [KEEP]
│   ├── Gallery                     [KEEP]
│   ├── Timeline / Milestones       [KEEP]
│   ├── Links & Affiliates          [KEEP]
│   ├── Blog                        [NEW]
│   └── Content Feed                [KEEP]
│
├── 💰 Sell                         "Make money"
│   ├── Orders                      [NEW]
│   ├── Customers                   [NEW]
│   └── Payments                    [NEW]
│
├── 📈 Grow                         "Get bigger"
│   ├── Analytics                   [NEW]
│   ├── Email                       [NEW]
│   └── AI Assistant                [NEW]
│
└── ⚙️ Settings                     "Manage everything else"
    ├── Profile & Branding          [IMPROVE — split from current mega-settings]
    ├── Messages                    [IMPROVE — move from hidden to sidebar]
    ├── Billing                     [KEEP]
    └── Integrations                [NEW — API keys, webhooks, social connections]
```

### 5.3 Agency Navigation

```
Agency Portal
├── 📊 Dashboard                    [NEW]
├── 👥 Clients
│   ├── All Clients                 [NEW]
│   └── Client Detail               [NEW]
├── 🌐 Websites                     [NEW]
├── 🤖 AI Generation                [NEW]
├── 🎨 Templates                    [NEW]
├── 📈 Analytics                    [NEW]
├── 🌍 Domains                      [NEW]
├── 👤 Team                         [NEW]
├── 💳 Billing                      [NEW]
├── 🏪 Marketplace                  [NEW]
└── ⚙️ Settings                     [NEW]
```

### 5.4 Customer (End-User) Navigation

```
Creator Storefront
├── 🏠 Home                         [KEEP — tenant storefront]
├── 🛍️ Products                     [KEEP — product grid]
├── 📸 Gallery                      [KEEP — media showcase]
├── 🕐 Timeline                     [KEEP — milestones]
├── 📝 Blog                         [NEW — creator blog]
├── 👤 My Account                   [NEW]
│   ├── Order History               [NEW]
│   ├── Downloads                   [NEW]
│   ├── Memberships                 [NEW]
│   └── Profile                     [NEW]
└── 🛒 Cart                         [NEW]
```

---

## 6. AI Generation Flow — Complete UX Blueprint

### 6.1 Flow Overview

```
Select Template
    │  "What kind of website?"
    │
    ├── Creator Portfolio
    ├── Creator Store
    ├── Coach / Mentor
    ├── Gaming Creator
    ├── Music Artist
    ├── Fitness Coach
    ├── Digital Products
    ├── Agency
    └── Personal Brand
    │
    ▼
Select AI Strategy
    │  "How should AI build this?"
    │
    ├── ○ Fast      (30 sec)  – detected data only
    ├── ○ Balanced  (1 min)   – AI copywriting + SEO + hero ★
    └── ○ Premium   (2-3 min) – full rewrite, brand voice, product copy
    │
    ▼
Paste URL
    │
    ▼
┌─────────────────────────────┐
│  AI Analysis Screen          │  ← NEW SCREEN
│  - Platform detection        │
│  - Creator profile preview   │
│  - Content analysis          │
│  - Theme recommendation      │
│  - Section recommendations   │
│  - SEO score                 │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  AI Website Report           │  ← NEW SCREEN ★
│  - Website Score (0-100)     │
│  - Detected items checklist  │
│  - Missing items warnings    │
│  - Recommendations           │
│  - Estimated setup time      │
│  - Approve / Edit buttons    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Website Preview             │  ← NEW SCREEN
│  - Desktop / Tablet / Mobile │
│  - Theme preview             │
│  - Content sections          │
│  - Approve / Regenerate      │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Provision Screen            │  ← NEW SCREEN
│  - Deployment progress       │
│  - Creating tenant           │
│  - Generating theme          │
│  - Generating pages          │
│  - Creating dashboard        │
│  - Finalizing                │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Creator Invitation          │  ← NEW SCREEN
│  - Invite email              │
│  - Copy dashboard link       │
│  - Open dashboard            │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Creator Setup Wizard         │  ← NEW SCREEN
│  - Welcome                   │
│  - Branding                  │
│  - Payments                  │
│  - Social Links              │
│  - Domain                    │
│  - Email                     │
│  - Publish                   │
└─────────────┬───────────────┘
              │
              ▼
        Creator Dashboard
```

### 6.2 Screen: Generation Template Selector

**Route:** `/super-admin/generate` or `/agency/[id]/generate` (first step)

**Purpose:** Select the type of website before generation. The same AI pipeline produces different website structures depending on the creator's intent.

**User:** Super Admin, Agency

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Generate Website                                       │
│  Step 1 of 2: What kind of website?                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 🎨       │ │ 🛒       │ │ 🎓       │ │ 🎮       │   │
│  │ Creator  │ │ Creator  │ │ Coach /  │ │ Gaming   │   │
│  │ Portfolio│ │ Store    │ │ Mentor   │ │ Creator  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 🎵       │ │ 💪       │ │ 📦       │ │ 🏢       │   │
│  │ Music    │ │ Fitness  │ │ Digital  │ │ Agency   │   │
│  │ Artist   │ │ Coach    │ │ Products │ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  ┌──────────┐                                           │
│  │ 👤       │                                           │
│  │ Personal │                                           │
│  │ Brand    │                                           │
│  └──────────┘                                           │
│                                                         │
│  Each template generates a different section mix:        │
│                                                         │
│  Creator Store → Products + Orders + Payments           │
│  Coach/Mentor → Courses + Memberships + Booking         │
│  Gaming       → Games + Gallery + Links                 │
│  Music        → Gallery + Products + Links              │
│  Fitness      → Products + Courses + Timeline           │
│  Digital      → Downloads + Products + Memberships      │
│  Agency       → Portfolio + Clients + Testimonials      │
│  Personal     → Timeline + Blog + Links                 │
│  Portfolio    → Gallery + Timeline + Blog               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Screen: AI Strategy Selector

**Route:** Step after template selection

**Purpose:** Choose speed vs quality. The AI pipeline adapts depth — from fast surface-level detection to premium full-rewrite with brand voice.

**User:** Super Admin, Agency

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Generate Website                                       │
│  Template: Gaming Creator    Step 2 of 3: AI Strategy   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│       How should AI build this website?                 │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ○ Fast                                   30 sec │    │
│  │                                                 │    │
│  │  Uses detected data only. No AI copywriting.     │    │
│  │  Fills in what's found. Skips what's missing.    │    │
│  │                                                 │    │
│  │  Best for: Quick preview, existing content       │    │
│  │  Includes: Profile, Theme, Sections, Links       │    │
│  │  Skips: Hero copy, about text, SEO, CTA          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ● Balanced ★                             ~1 min │    │
│  │                                                 │    │
│  │  AI copywriting. Improves SEO. Creates hero.     │    │
│  │  Generates professional copy for key sections.   │    │
│  │                                                 │    │
│  │  Best for: Most creators, production websites    │    │
│  │  Adds: Hero title, subtitle, CTA, about, SEO     │    │
│  │  Improves: Meta tags, keywords, tagline          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ○ Premium                               2-3 min │    │
│  │                                                 │    │
│  │  AI rewrites everything. SEO optimized.          │    │
│  │  Product copy. Meta tags. Brand voice.           │    │
│  │  Suggested products. Suggested CTAs.             │    │
│  │                                                 │    │
│  │  Best for: New creators, premium launches        │    │
│  │  Adds: Product descriptions, brand voice, FAQ    │    │
│  │  Rewrites: All copy in consistent tone           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [← Back to Templates]              [Continue →]       │
└─────────────────────────────────────────────────────────┘
```

**How It Affects the Pipeline:**

| Stage | Fast | Balanced | Premium |
|-------|------|----------|---------|
| Source Resolution | ✓ Full | ✓ Full | ✓ Full |
| Profile Extraction | ✓ | ✓ | ✓ |
| Content Extraction | ✓ | ✓ | ✓ |
| AI Content Gen | ✗ Skipped | ✦ Hero + About + SEO | ✦ Full rewrite |
| Theme Selection | ✓ | ✓ | ✓ |
| Website Composition | ✦ Skeleton | ✦ Populated | ✦ Fully populated + suggestions |
| Tenant Provisioning | ✓ | ✓ | ✓ |

**Default:** Balanced (selected by default for best experience)

**Primary Action:** Continue → proceeds to URL input + AI Analysis (section 6.4)

### 6.4 Screen: AI Analysis

**Route:** `/super-admin/generate` or `/agency/[id]/generate` (step 2)

**Purpose:** Display everything the AI detected before the user commits to generation.

**User:** Super Admin, Agency

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Templates                         Generate → │
│  Template: Gaming Creator         URL: @techcreator     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌───────────────────────────┐ │
│  │ Detected Platform    │  │ Creator Profile           │ │
│  │ ┌─────────────────┐ │  │ ┌───────────────────────┐ │ │
│  │ │ YouTube ◉ 95%   │ │  │ │ 🟢 Avatar   Name      │ │ │
│  │ │ youtube.com/    │ │  │ │                       │ │ │
│  │ │   @techcreator  │ │  │ │ 📊 50K subscribers    │ │ │
│  │ └─────────────────┘ │  │ │ 📝 Bio preview...     │ │ │
│  └─────────────────────┘  │ │ 🔗 social links        │ │ │
│                           │ └───────────────────────┘ │ │
│  ┌─────────────────────┐  │                           │ │
│  │ Theme Recommendation │  │ ┌───────────────────────┐ │ │
│  │ ┌─────────────────┐ │  │ │ 📹 Content Analysis    │ │ │
│  │ │ Gaming Dark      │ │  │ │  4 recent videos      │ │ │
│  │ │ #7C3AED #10B981 │ │  │ │  750 avg engagement    │ │ │
│  │ │ Inter · 12px    │ │  │ │  themes: tech, reviews │ │ │
│  │ └─────────────────┘ │  │ └───────────────────────┘ │ │
│  └─────────────────────┘  │                           │ │
│                           │ ┌───────────────────────┐ │ │
│  ┌─────────────────────┐  │ │ 📋 Suggested Sections  │ │ │
│  │ SEO Score            │  │ │ ☑ Products (gear)     │ │ │
│  │ ████████░░ 78/100   │  │ │ ☑ Gallery (highlights) │ │ │
│  │ • Title ✓            │  │ │ ☑ Links (social)      │ │ │
│  │ • Description ✓      │  │ │ ☑ Games (featured)    │ │ │
│  │ • Keywords: 6        │  │ │ ☐ Blog (future)       │ │ │
│  │ • OG Image: missing  │  │ └───────────────────────┘ │ │
│  └─────────────────────┘  └───────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  ⚠️ Warnings: Banner image not detected. Alt text may be │
│     needed for accessibility.                            │
└─────────────────────────────────────────────────────────┘
```

**Primary Actions:**
- **Generate Website** (primary, prominent)
- **Edit Analysis** (secondary — lets admin tweak profile data before generation)
- **← Back to Templates** (tertiary — change template selection)

**States:**
- Loading: Skeleton cards with shimmer animation
- Error: Platform detection failed, URL invalid, rate limited
- Empty: No content detected (manual profile fallback)

**Permissions:** SUPER_ADMIN, AGENCY_ADMIN only

### 6.5 Screen: AI Website Report ★ (Signature Experience)

**Route:** Shown after generation, before preview

**Purpose:** A concise scorecard that builds trust in the AI before the user approves. Shows exactly what was detected, what's missing, and what's recommended — with a single overall score.

**User:** Super Admin, Agency

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              AI Website Report                          │
│                                                         │
│         ┌───────────────────────┐                       │
│         │                       │                       │
│         │     Website Score     │                       │
│         │                       │                       │
│         │        92%            │                       │
│         │                       │                       │
│         │  ██████████████████░  │                       │
│         │                       │                       │
│         └───────────────────────┘                       │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐     │
│  │ Detected       ✓     │  │ Missing             │     │
│  │                       │  │                      │     │
│  │ ✓ Brand Name          │  │ ⚠ Contact Email     │     │
│  │ ✓ Brand Colors        │  │ ⚠ Custom Domain     │     │
│  │ ✓ Logo / Avatar       │  │ ⚠ Payment Gateway   │     │
│  │ ✓ Hero Section        │  │ ⚠ Shipping Info     │     │
│  │ ✓ Gallery (3 items)   │  │ ⚠ Privacy Policy    │     │
│  │ ✓ Products (1 draft)  │  │ ⚠ Tax Information   │     │
│  │ ✓ Social Links (2)    │  │ ⚠ OG Image          │     │
│  │ ✓ SEO Metadata        │  │                      │     │
│  │ ✓ Theme (Gaming Dark) │  │                      │     │
│  │ ✓ Mobile Responsive   │  │                      │     │
│  └──────────────────────┘  └──────────────────────┘     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 💡 Recommendation                                │   │
│  │                                                  │   │
│  │ "Connect Razorpay before publishing to start      │   │
│  │  accepting payments. Add your contact email so    │   │
│  │  customers can reach you. Estimated setup time:   │   │
│  │  3 minutes."                                      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│         Estimated Setup Time: ~3 minutes                │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 📋 Sections to include                           │   │
│  │                                                  │   │
│  │ ☑ Hero               ☑ Products                 │   │
│  │ ☑ About              ☑ Gallery                  │   │
│  │ ☑ Timeline           ☑ Links                    │   │
│  │ ☐ FAQ                ☑ Contact                  │   │
│  │ ☐ Blog               ☐ Newsletter               │   │
│  │ ☐ Testimonials       ☐ Courses                  │   │
│  │                                                  │   │
│  │ Uncheck any section you don't want generated.    │   │
│  │ Your choice is remembered for future regenerations.│  │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  [← Back to Analysis]  [✏️ Edit]  [✅ Approve & Preview]│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Primary Actions:**
- **Approve & Preview** (primary — moves to Website Preview screen)
- **Edit** (secondary — returns to AI Analysis for adjustments)
- **Back to Analysis** (tertiary)

**Scoring Algorithm (backend):**
```
Base score starts at 100.
Deductions:
  -10  Missing payment gateway
  -8   Missing custom domain
  -5   Missing contact email
  -5   Missing OG image
  -3   Missing privacy policy
  -3   Missing shipping info
  -3   Missing tax info
  +2   Has social links
  +2   Has verified platform badge
  +1   Has subscriber count
```

**States:**
- Loading: Animated score counter building up to final number
- Perfect score (100): "Your website is ready to publish!"
- Low score (<60): "Your website needs attention before publishing."
- Error: Generation failed during scoring — retry option

**Permissions:** SUPER_ADMIN, AGENCY_ADMIN only

### 6.6 Screen: Website Preview

**Route:** Redirect after report approval, or `/preview/[tenantId]`

**Purpose:** Preview the generated website before provisioning the tenant.

**User:** Super Admin, Agency, Creator

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Website Preview           [Desktop|Tablet|📱Mobile]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌─────────────────────────┐                │
│              │                         │                │
│              │    Device Frame          │                │
│              │    Showing generated     │                │
│              │    website with:         │                │
│              │                         │                │
│              │    • Hero section        │                │
│              │    • Products            │                │
│              │    • Gallery             │                │
│              │    • Links               │                │
│              │    • Timeline            │                │
│              │                         │                │
│              │    Scrollable preview    │                │
│              │                         │                │
│              └─────────────────────────┘                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ✓ Approved  |  🔄 Regenerate  |  🎨 Customize          │
└─────────────────────────────────────────────────────────┘
```

**Primary Actions:**
- **Approve & Provision** → moves to provision screen
- **Regenerate** → returns to AI Analysis with same URL
- **Customize** → opens Builder with pre-populated content

**States:**
- Loading: Preview skeleton
- Error: Generation failed, try again

### 6.7 Screen: Provision

**Route:** Modal or full screen during deployment

**Purpose:** Show real-time deployment progress.

**User:** Super Admin, Agency

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🚀 Deploying Creator Website               │
│                                                         │
│    techcreator.creatorspace.app                         │
│                                                         │
│    ✅ Creating Tenant            (1.2s)                  │
│    ✅ Creating Database          (0.8s)                  │
│    ✅ Generating Theme           (1.5s)                  │
│    ✅ Generating Pages            (2.1s)                  │
│    ✅ Generating Content         (1.8s)                  │
│    ▶️ Creating Dashboard          (running...)            │
│    ⏳ Creating Domain                                    │
│    ⏳ Finalizing                                        │
│                                                         │
│    ████████████░░░░░░  6/8 stages                       │
│                                                         │
│    Elapsed: 7.4s                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**When complete:**
```
    ✅ All stages complete! (9.2s)

    ┌─────────────────────────────────────────┐
    │  🎉 Website is ready!                   │
    │                                         │
    │  Dashboard: /admin/dashboard            │
    │  Storefront: techcreator.creator...      │
    │                                         │
    │  [📋 Copy Links]  [📧 Invite Creator]   │
    │  [🚀 Open Dashboard]                    │
    └─────────────────────────────────────────┘
```

### 6.8 Screen: Creator Setup Wizard

**Route:** `/admin/onboarding` or shown automatically on first admin login

**Purpose:** Guided 5-step setup after generation.

**User:** Creator (first-time admin login)

**Steps:**

```
Step 1: Welcome                     [━━━━━━━━━━━━━━━━] 1/7
┌─────────────────────────────────────────────────────┐
│                                                     │
│         👋 Welcome, [Creator Name]!                  │
│                                                     │
│    Your website has been generated. Let's            │
│    customize it in 5 minutes.                       │
│                                                     │
│    We'll set up:                                    │
│    • Your branding                                  │
│    • Payment method                                 │
│    • Social links                                   │
│    • Custom domain                                  │
│    • Email settings                                 │
│                                                     │
│              [Let's Go →]                           │
└─────────────────────────────────────────────────────┘

Step 2: Branding                   [████████░░░░░░░░] 2/7
    • Name, tagline, bio (pre-filled from AI)
    • Profile avatar upload
    • Banner image upload
    • Color preference (confirm or change AI pick)

Step 3: Payments                   [████████████████░░] 3/7
    • Connect Razorpay account
    • Set currency (INR default)
    • Add UPI ID
    • Tax information

Step 4: Social Links               [██████████████████] 4/7
    • YouTube URL (pre-filled)
    • Instagram URL
    • Twitter/X URL
    • Twitch URL
    • Discord URL
    • Custom links

Step 5: Domain                     [████████████████████] 5/7
    • Current subdomain shown
    • Option to add custom domain
    • DNS instructions

Step 6: Email                      [████████████████████] 6/7
    • Welcome email template preview
    • Sender name
    • Reply-to email

Step 7: Publish                    [████████████████████] 7/7
    ┌─────────────────────────────────────────────────────┐
    │                                                     │
    │         🎉 Your Creator Website is ready!            │
    │                                                     │
    │    techcreator.creatorspace.app → your storefront   │
    │                                                     │
    │    What's next:                                     │
    │    • Add your first product                         │
    │    • Customize your theme                           │
    │    • Share your link                                │
    │    • Check your analytics                           │
    │                                                     │
    │    [📋 Copy Link]  [🚀 Go to Dashboard]             │
    └─────────────────────────────────────────────────────┘
```

---

## 7. Screen-by-Screen UX Blueprints

### 7.1 Super Admin — Dashboard

**Purpose:** Platform owner's command center. Monitor revenue, active tenants, AI generation queue, system health at a glance.

**Primary User:** Super Admin (me)

**Goals:** See platform health in 5 seconds, identify issues, trigger AI generations

**Widgets:**
```
┌──────────┬──────────┬──────────┬──────────┐
│ MRR       │ ARR      │ Tenants  │ Agencies │
│ ₹2,45,000 │ ₹29.4L   │ 142      │ 18       │
│ ↑12%      │          │ 8 this   │ 2 this   │
│           │          │ week     │ week     │
├──────────┴──────────┴──────────┴──────────┤
│ Revenue Chart (30-day MRR)                 │
│ ████████████████████░░░░░░░░              │
├────────────────────────────────────────────┤
│ AI Generation Queue       │ Recent Tenants │
│ 3 pending                 │ creator1  2m   │
│ 12 completed today        │ studio_x  5m   │
│ 0 failed                  │ fitguru   12m  │
│ [New Generation]          │ [View All]     │
├────────────────────────────────────────────┤
│ System Health             │ Quick Actions  │
│ 🟢 Builder API  234ms     │ + New Tenant   │
│ 🟢 DB Pool       8/20     │ + New Agency   │
│ 🟡 Storage       72%      │ + AI Generate  │
│ 🔴 Cron (stale)  0/3      │ + Feature Flag │
└────────────────────────────────────────────┘
```

**Primary Actions:** New Generation, New Tenant, View All Tenants
**Secondary Actions:** Revenue details, AI queue management, System health details

### 7.2 Creator Dashboard — Home

**Purpose:** Creator's daily overview. See store performance, recent orders, content engagement.

**Primary User:** Creator

**Widgets:**
```
┌──────────┬──────────┬──────────┬──────────┐
│ Revenue   │ Orders   │ Products │ Visitors │
│ ₹12,450   │ 23 this  │ 8 active │ 1,240    │
│ this month│ month    │          │ this week│
├──────────┴──────────┴──────────┴──────────┤
│ Revenue Chart (30-day)                     │
│ ██░██░░███░░░████░░░░░░                   │
├────────────────────────────────────────────┤
│ Recent Orders              │ Quick Actions │
│ Order #1042  ₹499  Pending │ + Add Product │
│ Order #1041  ₹299  Done    │ + Add Media   │
│ Order #1040  ₹999  Done    │ + Add Link    │
│ [View All Orders]          │ + Edit Site   │
├────────────────────────────────────────────┤
│ Top Products               │ AI Assistant  │
│ 1. Gaming Chair   ₹4,999   │ 💬 "How can   │
│ 2. Merch Tee      ₹599    │  I help with  │
│ 3. Digital Course ₹999    │  your store?" │
└────────────────────────────────────────────┘
```

### 7.3 Agency — Dashboard

**Purpose:** Agency command center. Monitor all clients, revenue splits, active websites.

**Primary User:** Agency Admin

**Widgets:**
```
┌──────────┬──────────┬──────────┬──────────┐
│ Clients  │ Websites │ Revenue  │ Staff    │
│ 12       │ 12 live  │ ₹85,000  │ 3 active │
│ 2 pending│          │ this mo. │          │
├──────────┴──────────┴──────────┴──────────┤
│ Cross-Client Revenue Chart                 │
│ Client A: ████████████                    │
│ Client B: ████████                        │
│ Client C: ██████                          │
├────────────────────────────────────────────┤
│ Recent Activity            │ Quick Actions │
│ Client A published site    │ + New Client  │
│ Client C: 3 new orders     │ + AI Generate │
│ Client B: domain verified  │ + Add Staff   │
├────────────────────────────────────────────┤
│ Client List                                │
│ Creator A    Pro Plan    12 products       │
│ Creator B    Starter      3 products       │
│ Creator C    Pro Plan    24 products       │
│ [+ Invite New Client]                      │
└────────────────────────────────────────────┘
```

---

## 8. Permissions Matrix

| Feature | SUPER_ADMIN | AGENCY_ADMIN | AGENCY_STAFF | ADMIN (Creator) |
|---------|-------------|--------------|--------------|-----------------|
| AI Generate Website | ✓ | ✓ | ✓ | ✗ |
| Manage Tenants | ✓ | ✗ | ✗ | ✗ |
| Manage Agencies | ✓ | ✗ | ✗ | ✗ |
| View All Revenue | ✓ | ✗ | ✗ | ✗ |
| Feature Flags | ✓ | ✗ | ✗ | ✗ |
| System Health | ✓ | ✗ | ✗ | ✗ |
| Audit Log | ✓ | ✗ | ✗ | ✗ |
| Manage Clients | ✗ | ✓ | ✓ | ✗ |
| Agency Analytics | ✗ | ✓ | ✓ | ✗ |
| Agency Billing | ✗ | ✓ | ✗ | ✗ |
| Team Management | ✗ | ✓ | ✗ | ✗ |
| White-label Settings | ✗ | ✓ | ✗ | ✗ |
| Edit Client Website | ✗ | ✓ | ✓ | ✗ |
| Products CRUD | ✓ | ✓ | ✓ | ✓ |
| Gallery CRUD | ✓ | ✓ | ✓ | ✓ |
| Links CRUD | ✓ | ✓ | ✓ | ✓ |
| Milestones CRUD | ✓ | ✓ | ✓ | ✓ |
| Games CRUD | ✓ | ✓ | ✓ | ✓ |
| Content Feed | ✓ | ✓ | ✓ | ✓ |
| Theme / Appearance | ✓ | ✓ (if canEditTheme) | ✓ (if canEditTheme) | ✓ |
| Domain Settings | ✓ | ✓ | ✗ | ✓ |
| Billing (own) | ✓ | ✓ | ✗ | ✓ |
| Orders | ✓ | ✓ | ✓ | ✓ |
| Customers | ✓ | ✓ | ✓ | ✓ |
| Analytics (own) | ✓ | ✓ | ✗ | ✓ |
| Messages | ✓ | ✓ | ✓ | ✓ |

---

## 9. Feature Matrix — Implementation Priority

### PHASE 1: Launch Essentials (Weeks 1-4)

| # | Feature | Type | Effort |
|---|---------|------|--------|
| 1 | Generation Template Selector | NEW | Small |
| 2 | AI Strategy Selector (Fast/Balanced/Premium) | NEW | Small |
| 3 | AI Analysis Screen | NEW | Medium |
| 4 | AI Website Report + Section Toggle (scorecard) | NEW | Small |
| 5 | Website Preview Screen | NEW | Medium |
| 6 | Provision Progress Screen | NEW | Small |
| 7 | Creator Setup Wizard (7 steps) | NEW | Large |
| 8 | Agency Portal — Dashboard + Clients | NEW | Large |
| 9 | Creator Dashboard — Job-based sidebar | IMPROVE | Small |
| 10 | Creator Dashboard — Analytics widgets | NEW | Medium |
| 11 | Creator Dashboard — Orders page | NEW | Medium |
| 12 | Creator Dashboard — Customers page | NEW | Small |
| 13 | Messages → add to sidebar | IMPROVE | Tiny |
| 14 | Notifications system (bell icon + dropdown) | NEW | Medium |

### PHASE 2: Commerce & Growth (Weeks 5-8)

| # | Feature | Type | Effort |
|---|---------|------|--------|
| 11 | Agency — Client Detail + Impersonation | NEW | Medium |
| 12 | Agency — Websites management | NEW | Medium |
| 13 | SEO Tools (meta editor, sitemap) | NEW | Medium |
| 14 | Global Search (Cmd+K) | NEW | Medium |
| 15 | Super Admin — Revenue Dashboard | NEW | Medium |
| 16 | Super Admin — AI Generation Queue | NEW | Small |
| 17 | Email Campaigns (basic) | NEW | Large |
| 18 | API Keys (Super Admin) | NEW | Small |

### PHASE 3: Platform Maturity (Weeks 9-12)

| # | Feature | Type | Effort |
|---|---------|------|--------|
| 19 | Agency — Templates | NEW | Large |
| 20 | Agency — White-label | NEW | Medium |
| 21 | Agency — Team Management | NEW | Medium |
| 22 | Super Admin — Subscriptions Management | NEW | Medium |
| 23 | Super Admin — Themes Marketplace | NEW | Large |
| 24 | Blog CMS (dynamic) | IMPROVE | Medium |
| 25 | AI Assistant (chat-based config) | NEW | Large |
| 26 | Webhooks | NEW | Medium |

### PHASE 4: AI & Magic (Future — v2)

| # | Feature | Type | Effort |
|---|---------|------|--------|
| 27 | AI Regenerate Section | NEW | Medium |
| 28 | AI Agent (conversational editing) | NEW | Large |
| 29 | Membership / Gated Content | NEW | Large |
| 30 | Course Builder | NEW | Large |
| 31 | Community (forums/comments) | NEW | Large |
| 32 | Automation (Zapier/Make) | NEW | Medium |
| 33 | Multi-payment gateways | NEW | Medium |
| 34 | Mobile App | NEW | Extra Large |

### PHASE 5: AI-Native Platform (v3)

| # | Feature | Type | Effort |
|---|---------|------|--------|
| 35 | AI Agent: Full conversational website management | NEW | Extra Large |
| 36 | AI Design Assistant: Layout suggestions, palette generation | NEW | Large |
| 37 | AI Content Writer: Blog, descriptions, landing pages | NEW | Medium |
| 38 | AI SEO: Real-time SEO scoring and improvement | NEW | Medium |
| 39 | AI Personalization: Per-visitor content adaptation | NEW | Extra Large |

---

## 10. Navigation Maps

### 10.1 Top-Level Navigation (Platform)

```
CreatorStore
├── Marketing Site (/)
├── Signup (/signup)
├── Login (/admin/login)
├── Creator Dashboard (/admin/*)     [ADMIN role]
├── Agency Portal (/agency/*)        [AGENCY_ADMIN, AGENCY_STAFF]
├── Super Admin (/super-admin/*)     [SUPER_ADMIN]
├── Builder (/builder)               [ADMIN, AGENCY_*]
├── Public Storefront (/[domain])    [Public]
└── Customer Portal (/account)       [NEW — Customer]
```

### 10.2 Full Sitemap

```
creatorstore.app/
├── /                                    Marketing landing
├── /signup                              Registration
├── /login                               → /admin/login
├── /contact                             Support & contact
├── /terms, /privacy, /refund            Legal pages
├── /blog, /blog/[slug], /blog/guides    Blog
│
├── /[domain]                            Tenant storefront
│   ├── /products                        Product catalog
│   ├── /gallery                         Media showcase
│   ├── /timeline                        Milestones
│   └── /account                         [NEW] Customer portal
│       ├── /orders                      Order history
│       └── /profile                     Customer profile
│
├── /admin                               Creator Dashboard
│   ├── /login                           Login page
│   ├── /dashboard                       Overview
│   ├── /products                        Storefront CRUD
│   ├── /orders                          [NEW] Order management
│   ├── /customers                       [NEW] Customer list
│   ├── /gallery                         Gallery CRUD
│   ├── /links                           Affiliate links CRUD
│   ├── /milestones                      Timeline CRUD
│   ├── /games, /games/new, /games/[id]/edit
│   ├── /settings/content                Content feed
│   ├── /settings/domain                 Domain management
│   ├── /settings                        Website settings
│   ├── /appearance                      Theme editor
│   ├── /billing                         Subscription
│   ├── /messages                        Contact inbox
│   ├── /analytics                       [NEW] Analytics dashboard
│   ├── /seo                             [NEW] SEO tools
│   ├── /ai-assistant                    [NEW] AI chat
│   ├── /email                           [NEW] Email campaigns
│   ├── /onboarding                      [NEW] Setup wizard
│   └── /automation                      [NEW] Workflows
│
├── /agency                              Agency Portal
│   ├── /[agencyId]                      Agency dashboard
│   │   ├── /clients                     Client list
│   │   ├── /clients/[id]                Client detail
│   │   ├── /websites                    Managed websites
│   │   ├── /generate                    AI generation
│   │   ├── /templates                   Templates library
│   │   ├── /analytics                   Agency analytics
│   │   ├── /domains                     Domain management
│   │   ├── /team                        Staff management
│   │   ├── /billing                     Agency billing
│   │   ├── /marketplace                 Agency marketplace
│   │   └── /settings                    Agency settings
│
├── /super-admin                         Super Admin
│   ├── /dashboard                       Platform overview
│   ├── /revenue                         [NEW] Revenue dashboard
│   ├── /tenants                         Tenant management
│   ├── /tenants/[id]                    Tenant detail
│   ├── /agencies                        Agency management
│   ├── /agencies/[id]                   Agency detail
│   ├── /generate                        AI generation queue
│   ├── /subscriptions                   Subscriptions
│   ├── /themes                          Themes & templates
│   ├── /features                        Feature flags
│   ├── /health                          System health
│   ├── /audit                           Audit log
│   ├── /api-keys                        [NEW] API key management
│   ├── /support                         [NEW] Support tickets
│   └── /settings                        [NEW] Platform settings
│
├── /builder                             Visual page builder
│
└── /api/*                               API routes (auth, webhooks, etc.)
```

---

## 11. Customer Journey

### 11.1 End Customer Flow

```
Discover Creator
    │  (YouTube link, Instagram bio, Google search)
    ▼
Visit Storefront (/[domain])
    │
    ├── Browse Products
    │     └── View Product Detail
    │           └── Add to Cart
    │                 └── Checkout
    │                       ├── Enter email
    │                       ├── Pay (Razorpay/UPI)
    │                       └── Order confirmation
    │
    ├── Explore Gallery
    │
    ├── Read Blog
    │
    ├── Contact Creator
    │
    └── Create Account [NEW]
          ├── View order history
          ├── Download digital products
          ├── Manage memberships
          └── Update profile
```

### 11.2 Creator Journey

```
Discover CreatorStore
    │  (Google, YouTube ad, referral, agency invite)
    ▼
Marketing Site (/)
    │
    ▼
Signup (/signup)
    │
    ▼
AI Generation (paste URL)    ← OR Agency provisions for them
    │
    ▼
Setup Wizard (7 steps)
    │
    ▼
Creator Dashboard
    │
    ├── Add Products
    ├── Customize Theme
    ├── Connect Domain
    ├── Set up Payments
    ├── Share Storefront
    ├── View Analytics
    └── Grow (email, SEO, AI)
```

### 11.3 Agency Journey

```
Agency signs up
    │
    ▼
Agency Dashboard
    │
    ├── Add Client
    │     ├── Paste client URL
    │     ├── AI Analysis
    │     ├── Preview
    │     ├── Customize
    │     └── Send to client for approval
    │
    ├── Manage Clients
    │     ├── Edit client websites
    │     ├── View client analytics
    │     └── Manage client billing
    │
    ├── Templates
    │     ├── Create template
    │     └── Apply to new clients
    │
    └── Agency Settings
          ├── White-label
          ├── Team management
          └── Billing
```

### 11.4 Super Admin Journey

```
Monitor Platform
    │
    ├── Revenue overview
    ├── Tenant activity
    ├── AI generation queue
    ├── System health
    │
    ├── Manage Tenants
    │     ├── View tenant
    │     ├── Provision new tenant
    │     └── Manage subscription
    │
    ├── Manage Agencies
    │     ├── View agency
    │     ├── Agency subscriptions
    │     └── Revenue splits
    │
    ├── Platform Operations
    │     ├── Feature flags
    │     ├── Theme marketplace
    │     ├── API keys
    │     └── Audit log
    │
    └── Support
          ├── View tickets
          └── System monitoring
```

---

## 12. Future Roadmap

### v1.0 — Creator Website OS (Q3 2026)
- AI Generation Flow (Analysis → Preview → Provision → Onboarding)
- Agency Portal (Dashboard, Clients, Websites)
- Creator Dashboard (Orders, Customers, Analytics widgets)
- Notifications system
- Global search
- SEO tools

### v1.1 — Commerce & Growth (Q4 2026)
- Email campaigns
- Agency templates
- Multi-payment (UPI)
- White-label
- Revenue dashboard

### v1.2 — AI & Automation (Q1 2027)
- AI Assistant (chat-based config)
- AI Content Writer (blog, product descriptions)
- Automation workflows
- Webhooks
- API keys

### v2.0 — AI & Platform (Q2-Q3 2027)
- Membership & gated content
- Course builder
- Community features
- Theme marketplace
- Mobile app
- Developer SDK

### v3.0 — AI-Native Platform (2028)

**AI Regenerate Section:**
Instead of regenerating the entire website, every section gets its own regenerate button:

```
Hero        🔄
About       🔄
Gallery     🔄
Products    🔄
Timeline    🔄
Links       🔄
SEO         🔄
Testimonials 🔄
Footer      🔄
```

Each section regenerates independently in under 5 seconds. The AI remembers the template and strategy, so regeneration is contextual.

**AI Agent (Conversational Editor):**
Replace menus with natural language. The user types what they want:
```
"I want my website to feel more premium."
```
AI responds:
```
I recommend:
✓ Dark luxury theme   ✓ Larger typography
✓ Fewer products above the fold   ✓ Gold accents

Preview:
[before / after comparison]

Apply? [Apply All] [Apply Theme Only] [Dismiss]
```
The agent has access to all platform modules — theme, content, builder, SEO — and orchestrates changes across them. Every suggestion includes a preview. Every action is undoable. This is where AI website builders are heading.

---

## 13. Design System Extension Notes

**Preserve:**
- Dark theme base (`#0a0a0a`)
- Glassmorphic cards (`zinc-950/90`)
- Neon glow effects (cyan, pink, gold)
- Gradient text classes
- Admin-btn, admin-card, admin-badge, admin-table classes
- Framer Motion animations (stagger, hover, counters)
- Inter + Orbitron font pairing
- CSS variable theming (`--brand-*`, `--accent`)

**Extend with:**
- Progress bar component (for wizard, provision)
- Step indicator component (for wizard navigation)
- Shimmer/skeleton loading states
- Toast notification component
- Empty state illustrations
- Modal system (confirm, alert, form)
- Command palette (Cmd+K search)
- Device frame component (mobile/tablet/desktop preview)
- Data table with sorting, filtering, pagination
- Chart components (line, bar, donut — for analytics)
- Badge variants (more status colors)
- Timeline component (for audit log, activity feed)
- Avatar with status indicator
- File drop zone
- Rich text editor (for blog, email templates)
- **Score ring component** (circular progress — for Website Score %)
- **Checklist grid component** (detected ✓ / missing ⚠ — for AI Report)
- **Strategy card component** (selectable cards — for Fast/Balanced/Premium)
- **Template card component** (icon + label + description — for template selector)
- **Section toggle grid** (checkbox grid — for enabling/disabling sections)

---

## 14. Success Criteria

After reading this document, every team member should know:

- ✅ What 40+ pages already exist and their status (KEEP/IMPROVE/REMOVE/NEW)
- ✅ What 32 gaps exist between current state and production SaaS
- ✅ How all 4 user types navigate the platform (Super Admin, Creator, Agency, Customer)
- ✅ The complete AI generation flow with every screen designed
- ✅ What to build in Phase 1 (10 features), Phase 2 (8), Phase 3 (8), Phase 4 (6)
- ✅ Where every new page fits in the sitemap
- ✅ What permissions each role has
- ✅ How the customer journey works end-to-end
- ✅ What design system components to add without breaking existing UI
- ✅ The full navigation structure for all dashboards

---

*CreatorStore v1 Product Blueprint — July 2026*
*Platform Architecture Frozen. Frontend Preserved. Extended Only.*
