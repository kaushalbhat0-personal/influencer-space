# Creatos Product Roadmap

> **Part of:** [Platform Documentation](README.md)
>
> **Relationship to Architecture:** The [Architecture Constitution](platform-architecture-v1.md) defines HOW the platform works. This roadmap defines WHERE the platform goes. Architecture changes require ADRs. Roadmap changes do not.

---

## 1. Vision

Creatos is a **Website Operating System** — not a page builder.

Creators launch a professional website in minutes. They choose a template, pick a theme, preview it live, and generate a complete website. The Builder is optional. Content is managed in dedicated admin pages. The storefront renders from immutable snapshots.

### Long-Term Direction

| Era | Focus |
|-----|-------|
| **v1.0** | **Platform Foundation** — Theme Platform, Templates, Marketplace, Builder, Publishing, Storefront, Media, Capabilities, Provisioning, Creator Dashboard, Website Health, Documentation |
| **v1.1** | **Super Admin** — Creator management, Platform analytics, Provision studio, Support tools, Marketplace moderation, Audit logs |
| **v1.2** | **Agency Platform** — Client management, White-label, Multi-brand, Bulk publish, Agency billing, Teams |
| **v1.3** | **Marketplace Website** — Theme/template/component marketplace, Creator profiles, Reviews, Revenue sharing |
| **v1.4** | **AI Platform** — AI website generation, Theme/template recommendations, Content generation, SEO, Images |
| **v1.5** | **Enterprise** — SSO, Audit, Compliance, Custom branding, Advanced analytics |
| **v2.0** | **Platform APIs** — SDK, Plugin platform, Mobile apps, Headless mode, Public APIs |

### Principles

- **Creator First** — Every decision serves the creator experience
- **Platform First** — One platform, many experiences (Creator, Agency, Enterprise)
- **Registry Driven** — Everything discoverable, nothing hardcoded
- **AI Ready** — Architecture supports AI without pipeline changes
- **Marketplace Driven** — Ecosystem of themes, templates, and components
- **Agency Ready** — Multi-tenant from day one
- **Enterprise Ready** — Security, audit, compliance built in

---

## 2. Current Version

| Property | Value |
|----------|-------|
| **Version** | v1.1 — Platform Operations |
| **Status** | ✅ Released — Platform Operations Complete |
| **Production Readiness** | 87/100 |
| **Next Milestone** | SUPERADMIN-04 — Agency Platform (v1.2) |

---

## 3. Guiding Principles

1. **Creator Experience First** — A working website in minutes, not hours
2. **One Platform** — Single architecture serves all personas
3. **One Pipeline** — Every operation has exactly one canonical pipeline
4. **One Registry** — Every entity type has exactly one registry
5. **No Duplicate Ownership** — Every domain has exactly one owner
6. **Builder is Optional** — Creators publish without ever opening the Builder
7. **Storefront is Snapshot Driven** — Zero DB reads at render time
8. **Configuration over Duplication** — Registries replace duplicated logic
9. **Progressive Complexity** — Simple by default, powerful when needed
10. **Capability Driven** — Feature gating through one service, never hardcoded plan checks

---

## 4. Product Evolution Timeline

```
v1.0 ─── Platform Foundation ─────────────────────────────── [CURRENT]
  Theme Platform, Website Templates, Marketplace, Builder,
  Publishing, Storefront, Media, Capabilities, Provisioning,
  Creator Dashboard, Website Health, Architecture Docs

v1.1 ─── Super Admin ─────────────────────────────────────── [RELEASED]
  Creator Management, Platform Analytics, Provision Studio,
  Support Tools, Marketplace Moderation, Audit Logs,
  Demo Library, Operations Dashboard, Platform Activity,
  Platform Insights, Website Operations, Security Hardening

v1.2 ─── Agency Platform ─────────────────────────────────── [PLANNED]
  Client Management, White Label, Multi-Brand, Bulk Publish,
  Agency Billing, Team Management, Role-Based Access

v1.3 ─── Marketplace Website ─────────────────────────────── [PLANNED]
  Theme Marketplace, Template Marketplace, Component Marketplace,
  Agency Marketplace, Creator Profiles, Reviews & Ratings,
  Revenue Sharing, Payout System

v1.4 ─── AI Platform ─────────────────────────────────────── [PLANNED]
  AI Website Generation, AI Theme Recommendation,
  AI Content Generation, AI SEO Optimization,
  AI Image Generation, AI Assistant Chat

v1.5 ─── Enterprise ──────────────────────────────────────── [PLANNED]
  Single Sign-On (SSO), Audit Trails, Compliance Reports,
  Custom Branding (Full), Role-Based Access Control,
  Advanced Analytics & Reporting, SLA Support

v2.0 ─── Platform APIs & Ecosystem ───────────────────────── [FUTURE]
  Public REST API, SDK & Client Libraries, Plugin Platform,
  Mobile Applications, Headless CMS Mode, Webhook Platform,
  Partner Integrations, Community Themes & Templates
```

---

## 5. Milestone Details

### v1.0 — Platform Foundation

**Purpose:** Establish the canonical platform architecture with all core domains.

**Status:** ✅ Complete

**Major Features:**
- Theme Platform (30 themes, 8 categories, registry-driven)
- Website Templates (11 templates, blueprint inheritance)
- Marketplace (discovery, search, categories, recommendations)
- Builder (layout composition, theme preview, section management)
- Publishing (immutable snapshots, preview/live/rollback)
- Storefront (snapshot-driven, zero DB reads at render time)
- Media Platform (upload, storage, URL resolution)
- Capability Platform (feature gating, limits, entitlements)
- Provisioning Platform (single tenant/website creation pipeline)
- Creator Dashboard (metrics, health, quick actions, onboarding)
- Website Health (15 checks, weighted scoring, recommendations)
- Creator Journey (template → preview → generate → ready → publish)
- Architecture Documentation (constitution, domains, ADRs, glossary)

**Success Criteria:**
- Creator can sign up and publish a website within 5 minutes
- Storefront renders only from PublishedSnapshots
- All feature gates resolve through CapabilityService
- All creation paths converge on ProvisioningService

**Dependencies:** None (foundational release)

---

### v1.1 — Super Admin

**Purpose:** Provide platform-wide operations for internal teams.

**Status:** ✅ Released (v1.1.0)

**Major Features:**
- **Platform Operations Center** — Dashboard with 10 real metric cards, Platform Summary, tenant ledger
- **Creator Operations** — Full operational profiles with activity timeline, subscription, health, publishing
- **Website Operations** — Dedicated websites page with search, status filters, pagination
- **Marketplace Operations** — Registry-backed themes (30) and templates (11) pages replacing placeholders
- **Platform Activity** — Real-time timeline with Today/Yesterday/Last 7 Days/Earlier grouping
- **Platform Insights** — 7 actionable insight cards driven by canonical data
- **Security Hardening** — Auto-login and dev/seed endpoints now require SUPER_ADMIN in production
- **Publishing Pipeline Fix** — Builder no longer bypasses PublishingService
- **Dead Code Removal** — theme-studio registry deleted, unused imports cleaned up
- **Navigation Redesign** — 7-group IA (Platform, Creators, Marketplace, Operations, Billing, Audit, System)

**Success Criteria:**
- **Creator Management** — Search, filter, view, impersonate, suspend/restore creators
- **Platform Analytics** — Total creators, revenue, growth trends, active vs inactive
- **Provision Studio** — Analyze URL → Generate → Provision → Publish flow for any creator
- **Support Tools** — Quick website stats, manual publish/rollback, login-as
- **Marketplace Moderation** — Approve/reject themes and templates, set featured/premium
- **Audit Logs** — Full platform operation history with filtering and export
- **Demo Library** — Seed data for demo websites, one-click demo provisioning
- **Operations Dashboard** — System health, storage, bandwidth, error rates

**Success Criteria:**
- Super Admin can manage any creator without touching the database
- All operations use existing canonical services
- Every action is audited

**Dependencies:** v1.0 (all platforms)

---

### v1.2 — Agency Platform

**Purpose:** Enable agencies to manage multiple creator websites.

**Status:** 🔜 Next

**Major Features:**
- **Client Management** — Create, manage, and serve multiple clients
- **White Label** — Remove Creatos branding from client websites
- **Multi-Brand** — Manage multiple storefronts under one agency account
- **Bulk Publish** — Publish multiple websites simultaneously
- **Agency Billing** — Consolidated billing across clients
- **Team Management** — Invite team members with role-based access
- **Client Portal** — Clients can view their website stats

**Success Criteria:**
- Agency can create and manage 50+ client websites
- White-label works across all storefront surfaces
- Bulk operations use existing publishing pipeline

**Dependencies:** v1.1, Capability Platform (agency tiers)

---

### v1.3 — Marketplace Website

**Purpose:** Enable third-party theme, template, and component distribution.

**Status:** 📋 Planned

**Major Features:**
- **Theme Marketplace** — Third-party theme submissions and distribution
- **Template Marketplace** — Third-party website template submissions
- **Component Marketplace** — Reusable section components
- **Agency Marketplace** — Agency service listings
- **Creator Profiles** — Public creator portfolio pages
- **Reviews & Ratings** — Community feedback on marketplace items
- **Revenue Sharing** — Payout system for marketplace creators
- **Approval Workflow** — Review and moderation pipeline

**Success Criteria:**
- Creators can install marketplace themes without leaving the platform
- Marketplace items integrate through existing registries
- Revenue sharing handles payouts correctly

**Dependencies:** v1.1 (moderation), v1.2 (agency marketplace)

---

### v1.4 — AI Platform

**Purpose:** Enhance creation with AI-powered recommendations and generation.

**Status:** 📋 Planned

**Major Features:**
- **AI Website Generation** — Generate complete websites from a URL or description
- **AI Theme Recommendation** — Suggest themes based on industry and content
- **AI Content Generation** — Generate hero text, product descriptions, bios
- **AI SEO Optimization** — Auto-generate meta titles, descriptions, keywords
- **AI Image Generation** — Generate hero images and thumbnails
- **AI Assistant** — Chat-based help for website creation

**Success Criteria:**
- AI content is optional — creators can always use manual mode
- AI uses existing generation pipeline (no new pipelines)
- AI recommendations improve without architecture changes

**Dependencies:** v1.0 (Generation pipeline), External AI providers

---

### v1.5 — Enterprise

**Purpose:** Meet enterprise security, compliance, and scalability requirements.

**Status:** 📋 Planned

**Major Features:**
- **Single Sign-On (SSO)** — SAML, OIDC, Google Workspace, Microsoft Entra
- **Audit Trails** — Comprehensive compliance-ready audit logs
- **Compliance Reports** — SOC2, GDPR, HIPAA reporting
- **Custom Branding** — Full white-label across admin and storefront
- **Role-Based Access Control** — Granular permissions per team member
- **Advanced Analytics** — Custom dashboards, exports, data pipeline
- **SLA Support** — Guaranteed uptime and response times

**Success Criteria:**
- Enterprise customers can deploy Creatos within their security requirements
- All enterprise features use existing capability gating

**Dependencies:** v1.1 (audit), v1.2 (teams), v1.4 (AI is optional for enterprise)

---

### v2.0 — Platform APIs & Ecosystem

**Purpose:** Open the platform for external developers and mobile experiences.

**Status:** 🔮 Future

**Major Features:**
- **Public REST API** — Full platform API for external integrations
- **SDK & Client Libraries** — TypeScript, Python, mobile SDKs
- **Plugin Platform** — Extend admin, builder, and storefront with plugins
- **Mobile Applications** — Native iOS/Android for creator management
- **Headless CMS Mode** — Use Creatos as a headless CMS with custom frontends
- **Webhook Platform** — Event-driven integrations
- **Community Marketplace** — User-submitted themes, templates, components

**Success Criteria:**
- External developers can build on Creatos without modifying core code
- Mobile apps use same snapshot pipeline as web storefront
- Plugin system doesn't compromise platform stability

**Dependencies:** v1.0–v1.5

---

## 6. Product Domains Maturity

| Domain | Status | Version | Readiness |
|--------|--------|---------|-----------|
| Theme Platform | **Stable** | v1.0 | 95% |
| Website Templates | **Stable** | v1.0 | 90% |
| Marketplace | **Stable** | v1.0 | 95% |
| Builder | **Stable** | v1.0 | 90% |
| Storefront | **Stable** | v1.0 | 95% |
| Publishing | **Stable** | v1.0 | 95% |
| Media | **Stable** | v1.0 | 90% |
| Capabilities | **Stable** | v1.0 | 90% |
| Provisioning | **Stable** | v1.0 | 95% |
| Creator Dashboard | **Stable** | v1.0 | 85% |
| Website Health | **Stable** | v1.0 | 90% |
| Documentation | **Stable** | v1.0 | 95% |
| Super Admin | **Planned** | v1.1 | — |
| Agency | **Planned** | v1.2 | — |
| Marketplace Website | **Planned** | v1.3 | — |
| AI Platform | **Planned** | v1.4 | — |
| Enterprise | **Planned** | v1.5 | — |
| APIs & Ecosystem | **Future** | v2.0 | — |

---

## 7. Product Maturity

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Architecture Maturity** | Stable | All core domains frozen, one canonical pipeline per operation |
| **Platform Maturity** | Production | Running in production, 94/100 readiness score |
| **Creator Maturity** | Growing | Core creator journey complete, analytics and agency coming |
| **Enterprise Maturity** | Early | SSO, audit, compliance planned for v1.5 |
| **Marketplace Maturity** | Foundation | Internal marketplace complete, external marketplace planned for v1.3 |
| **API Maturity** | None | Public APIs planned for v2.0 |

---

## 8. Release Strategy

| Type | Frequency | Description |
|------|-----------|-------------|
| **Major (v1.x)** | Quarterly | New domain releases (Super Admin, Agency, AI, etc.) |
| **Minor (v1.x.y)** | Monthly | Feature additions within existing domains |
| **Patch (v1.x.z)** | As needed | Bug fixes, performance, security |

### Rules

- **Major releases** may add new domains but must not violate architectural invariants
- **Architecture changes** require an ADR — even in major releases
- **Backward compatibility** — PublishedSnapshots at schema v1 must always render. Old snapshot formats may be migrated forward but never broken.
- **Deprecation policy** — Deprecated features are marked for one minor release before removal
- **Migration path** — Breaking changes include automated migration or clear upgrade guide

---

## 9. Success Metrics

| Metric | Target | Measures |
|--------|--------|----------|
| Time to first publish | < 5 minutes | Core creator journey efficiency |
| Publish success rate | > 99% | Publishing pipeline reliability |
| Storefront availability | > 99.9% | Storefront uptime |
| Website health score | > 80% average | Platform encourages best practices |
| Builder usage rate | < 50% of creators | Builder is optional by design |
| Template selection rate | > 80% | Templates are the primary starting point |
| Theme engagement | > 60% theme change rate | Creators personalize their site |
| Marketplace installs | Growing quarter over quarter | Marketplace ecosystem health |
| Agency workspaces | Growing | Agency platform adoption |
| NPS (creator survey) | > 40 | Overall creator satisfaction |

---

## 10. Future Ideas

These are high-level concepts for consideration. No implementation commitment.

- **AI Assistant** — Conversational interface for website creation and management
- **Plugin Ecosystem** — Third-party plugins for Builder, admin, and storefront
- **Mobile Apps** — Native iOS/Android for creator management on the go
- **Headless CMS** — Use Creatos as a content backend with custom frontends
- **Public REST API** — Full platform API for external developers
- **Global Marketplace** — Multi-language, multi-currency marketplace
- **Community Themes** — User-submitted themes with review process
- **Community Templates** — User-submitted website templates
- **A/B Testing** — Test different themes, layouts, or content variations
- **Analytics Dashboard** — Advanced traffic, conversion, and revenue analytics
- **Email Marketing** — Built-in email campaigns for creators
- **Social Media Management** — Schedule and publish social content

---

## 11. Out of Scope

The following will NOT be built:

- **Website builder like Wix** — Creatos is not a drag-and-drop page builder. The Builder handles layout composition only.
- **Page-level drag editing** — Content is edited in admin pages, not by dragging on the storefront.
- **Multiple competing pipelines** — Every operation has exactly one canonical pipeline.
- **Theme database** — Themes are code (TypeScript), not database records.
- **Template database** — Templates are code, not database records.
- **Duplicate registries** — Every entity type has exactly one registry.
- **Storefront business logic** — Storefront is a pure renderer. No business logic at render time.
- **Direct database writes outside provisioning** — Only `ProvisioningService` creates tenants and websites.
- **Plan-level feature checks** — All gating goes through `CapabilityService`, never direct plan comparison.

---

## 12. Relationship to Architecture

```
┌─────────────────────────────────────┐
│  Architecture Constitution          │
│  docs/platform-architecture-v1.md   │
│                                     │
│  Answers: HOW does the platform     │
│  work?                              │
│                                     │
│  Contains: domain boundaries,       │
│  invariants, data flow, registries, │
│  ownership rules, ADRs              │
│                                     │
│  Changes require an ADR             │
└─────────────────────────────────────┘
              ↕ complementary
┌─────────────────────────────────────┐
│  Product Roadmap                    │
│  docs/product-roadmap.md            │
│                                     │
│  Answers: WHERE is the platform     │
│  going?                             │
│                                     │
│  Contains: version timeline,        │
│  milestones, maturity, strategy,    │
│  future ideas                       │
│                                     │
│  Changes do not require ADRs        │
└─────────────────────────────────────┘
```

The Architecture Constitution and Product Roadmap are complementary. The constitution defines the architectural contract that all implementation must follow. The roadmap defines the product direction that determines what gets built next. They are maintained independently but must remain consistent — new roadmap features must conform to existing architectural invariants.
