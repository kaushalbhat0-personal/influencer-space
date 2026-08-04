# SUPER ADMIN PLATFORM AUDIT-01 — Legacy Consolidation & Platform Operations

Status: **Read-only audit** — no code modified. Every finding verified by file/line
inspection + production probes (build, route reachability, DOM).

---

## 0. Architecture Health Score

| Dimension | Score /10 | Notes |
|---|---|---|
| Navigation integrity | 9 | 32/32 sidebar routes resolve; 2 placeholders flagged |
| Page real-ness | 7 | many real pages; 6 placeholders + several misaligned tables |
| Billing v2 consolidation | 7 | v2 canonical but legacy reads/writes remain + wrong-table invoices |
| Monitoring | 4 | health endpoint + 2 crons real; no persisted alerts, no queue, no error sink |
| Analytics authenticity | 5 | MRR real in v2 dashboards but fabricated on revenue page + AI-cost all mocks |
| Permissions | 5 | SUPER_ADMIN guard solid; no SUPPORT/read-only role; 2 dead auth systems |
| Database hygiene | 5 | schema/DB drift (4 tables via runtime SQL), orphan AgencySubscription, dormant fields |
| Frontend hygiene | 6 | dead feature folders/hooks/components; 3 parallel nav configs |
| Backend hygiene | 5 | billing v1/v2, 2 AI stacks, 3 prompt systems, 5 checkout paths, 5+ dead endpoints |
| **Overall** | **5.8 / 10** | Stable foundation; platform-operations hardening required before launch |

---

## 1. Navigation Matrix

Active registry: `src/config/admin-registry.ts` (32 modules, all `super_admin`).
Sidebar: `src/components/admin/SuperAdminSidebar.tsx` (platform/creators/
marketplace/operations/billing default-open; audit/system collapsed).

| Module | Route | Status |
|---|---|---|
| Dashboard / Operations / Health / Activity / Insights / Alerts / Runbooks | `/super-admin`, `/operations`, `/health`, `/activity`, `/insights`, `/alerts`, `/runbooks` | ✅ real |
| Creators / Users / Agencies / Support / Websites | `/tenants`, `/users`, `/agencies`, `/support`, `/websites` | ✅ real |
| Themes / Templates | `/themes`, `/templates` | ✅ static registry |
| Creator Import / Demo Studio / Demo Publishing / Demo Library / Beta | `/generate`, `/demo-studio`, `/demo-publishing`, `/demo-library`, `/beta` | ✅ real (demo-publishing in-memory) |
| Revenue / Revenue Management / Subscriptions / Invoices / Payments | `/revenue`, `/revenue-management`, `/subscriptions`, `/invoices`, `/payments` | ✅ (revenue MRR hardcoded; invoices wrong table) |
| Audit / Events / Webhooks / Features / Transactions / Registry Sync | `/audit`, `/events`, `/webhooks`, `/features`, `/transactions`, `/platform/sync` | ✅ (events in-memory; webhooks audit-echo) |
| Analytics | `/super-admin/analytics` | 🔴 **placeholder** (`SUPERADMIN-01`) |
| Settings | `/super-admin/settings` | 🔴 **placeholder** ("Coming in v1.1", flagged `soon`) |

**Orphan routes (on disk, not in sidebar):** `youtube-api` ✅, `themes-studio` ✅,
`imports` ✅, `tenants/[id]` ✅, `agencies/[id]` ✅, `runbooks/[id]` ✅,
`revenue-management/{commissions,settings}` ✅ — plus 🔴 placeholders `api-keys`,
`jobs`, `feedback`, `domains`.
**Legacy parallel nav:** `src/lib/navigation/config.ts` `SUPER_ADMIN_NAV` (via unused
`DashboardShell`). **Creator-side:** `src/config/admin-nav.ts`.

## 2. Page Matrix (every `/super-admin` page)

| Page | Data source | Status |
|---|---|---|
| Dashboard | `super-admin.service` real counts + `dashboardMetricsService` + alert eval | 🟢 (static status badges) |
| Operations | real dashboard + jobs (Run Now button is a dead stub form) | 🟢 |
| Health | `healthService.checkAll` (DB/storage real; engines = in-memory cache sizes) | 🟢 |
| Activity / Insights / Users / Agencies / Websites / Themes / Templates / Features / Registry Sync | real DB or code registry | 🟢 |
| Tenants + Tenants/[id] | real DB + **LEGACY `Subscription`** reads | 🟡 legacy read |
| Support | real search; impersonate/reset/suspend buttons **disabled** | 🟡 partial |
| Generate / Demo Studio | real provisioning pipeline | 🟢 |
| Demo Publishing | **in-memory Map** — resets on restart | 🔴 not persisted |
| Demo Library | static catalog only, no CRUD | 🟡 |
| Beta | real sessions; **production score 85/80 hardcoded** | 🟡 |
| Revenue | v2+legacy union subs; **MRR = `proCount * 999`**; Avg Products = "—" | 🟡 fabricated MRR |
| Revenue Management (+settings/commissions) | real v2 (read-only; mutations exist but no UI) | 🟢 |
| Subscriptions | v2-first + legacy fallback | 🟢 |
| Invoices | **reads `ProductOrder`** (fan orders), NOT `BillingInvoice` | 🟡 wrong table |
| Payments / Transactions | `ProductOrder` (real order ledger; not a "unified" timeline) | 🟡 |
| Audit | real paginated audit log | 🟢 |
| Events | in-memory bus history (500 cap) | 🟡 |
| Webhooks | auditLog `webhook:%` echo — no delivery log | 🟡 |
| Analytics / Settings | **placeholders** | 🔴 |
| API Keys / Jobs / Feedback / Domains | **placeholders** | 🔴 |

## 3. Legacy Matrix

| System | Status | Remaining consumers |
|---|---|---|
| `Subscription` table (`@deprecated`) | legacy | tenants + tenants/[id] + getAllTenants reads; `updateSubscriptionPlan` writes; plan-source legacy fallback; countProSubscriptionsLegacy |
| `lib/billing/*` (v1) | legacy | only dead `features/billing` + v1 formatting helpers in billing UI |
| `lib/ai/*` (v1 OpenAI stack) | legacy/parallel | `LlmIntelligenceEngine` (no keys → heuristic); content generators unwired |
| `lib/navigation/config.ts` SUPER_ADMIN_NAV | legacy | unused `DashboardShell` |
| `hooks/dashboard/*`, `usePullToRefresh` | dead | none |
| `features/billing`, `features/analytics` | dead | none (own tests only) |
| `generation/operations/*` (cost/reporting/analytics/dashboard…) | dead mocks | re-exported only |
| `lib/identity/*`, `modules/workspace/domain/authorization.ts` | dead parallel auth | none enforced |
| `AgencySubscription` | orphan table | only old migrations/SQL |
| `Subscription.razorpaySubscriptionId`, `Tenant/WebsiteAgency.razorpayAccountId/SetupComplete` | dormant fields | none |

## 4. Duplicate Matrix

| Concern | Duplicates |
|---|---|
| Billing service | v1 `lib/billing/service` vs v2 `modules/billing/application/service` |
| Billing providers | v1 4-provider set vs v2 `razorpayProvider` |
| Checkout | 5 paths (v1, v2, `checkout.actions` product, `lib/commerce/purchases`, `/api/checkout`) |
| AI provider stacks | `generation/providers` (6) vs `ai/providers` vs `providers/youtube` |
| Prompt systems | 3 (`ai/prompts`, `generation/prompts`, `infrastructure/prompt-registry`) |
| Navigation configs | 4 (`navigation/config`, `admin-nav`, `admin-registry`, `lifecycle/navigation`) |
| Sidebars / layouts | 3 sidebars, 3+ layouts; no `/agency` top-level layout |
| Order analytics | `order.actions.fetchAnalytics` duplicates `analytics.actions` |
| Invoices view | `Invoices` page reads ProductOrder; v2 `BillingInvoice` exists but unused here |

## 5. Canonical Systems (official runtimes)

| Domain | Canonical |
|---|---|
| Builder | `lib/builder/**` (Page→Section→Block) + `builder.actions` |
| Publishing | `lib/publishing/service` + `publishSnapshot` |
| Billing / Commerce | `modules/billing/**` (v2) + `config/commerce/plans.ts` |
| Themes | `lib/theme/**` (registry + resolver + access) |
| Media | `lib/media/**` + `resolveHeroMedia` |
| Creator Intelligence | `intelligence/{evidence,enrichment,blueprint,composition}` (36–38) |
| Marketplace | `lib/theme` marketplace + `lib/blueprint` registry |
| Analytics | `lib/analytics/**` (tenant) + `revenue-service.getDashboard` (platform) |
| Permissions | Role enum + `requireTenant` + SUPER_ADMIN guards + middleware |
| Operations | `modules/provisioning/**` (provision pipeline) + cron routes |

## 6. Missing Features (genuinely absent)

- **Support role / read-only admin role** (no `SUPPORT`/`VIEWER` enforced).
- **Refunds** (no action/UI; `Purchase.refund` + refund events exist, unwired).
- **Coupon management** (coupons are in-memory; no DB model/UI).
- **Persisted alerting + notification sink** (alerts evaluated on page render only; notifications in-memory).
- **Durable job queue/worker + jobs UI** (in-process `setInterval`, 2 jobs; jobs page placeholder).
- **External error/log dashboard** (no Sentry/DataDog sink).
- **Real AI-cost metrics** (only hardcoded mocks).
- **Marketplace metrics / approvals / template marketplace** (marketplace = theme/blueprint catalogs only).
- **Real publishing queue/history/rollback UI** (publishing service exists; no admin queue UI).
- **Demo publishing persistence** (in-memory workflow).
- **Platform-wide API-usage dashboard** (only YouTube quota).
- **Agency workspace routes** (the entire `/workspace` area does not exist).

## 7. Future Implementations (roadmap)

### Implementation-39 — Billing & Revenue Consolidation (finish v2)
- Objective: make Billing v2 + `BillingInvoice` the only ledger.
- Scope: migrate `Tenants/[id]`, `getAllTenants`, `updateSubscriptionPlan` off the legacy `Subscription`; fix `Invoices` page to read `BillingInvoice`; `Transactions` → unified billing events; replace `proCount*999` MRR with the real aggregate.
- Dependencies: IMPLEMENTATION-33/34. Priority: **Critical**. Complexity: Medium.

### Implementation-40 — Platform Observability & Operations
- Objective: real monitoring/alerting/queues.
- Scope: persisted alert state + notification sink (email/webhook); durable job queue + jobs UI (wire `runJob`); error/log export; publishing queue/history/rollback UI; real AI-cost + marketplace + API-usage metrics replacing mocks.
- Dependencies: 39 (real billing metrics). Priority: **High**. Complexity: High.

### Implementation-41 — Permissions & Agency Platform
- Objective: SUPPORT/read-only roles + working agency workspace.
- Scope: add `SUPPORT` role + read-only guard; fix `/agency/* → /workspace` middleware (restore agency routes or add `/workspace`); agency layout; remove dead auth systems (`lib/identity`, `workspace authorization`) or wire one canonical one.
- Dependencies: none. Priority: **High**. Complexity: Medium.

### Implementation-42 — Demo Studio, Beta & Marketplace Activation
- Objective: production-grade demo/beta/marketplace operations.
- Scope: persist demo publishing workflow; activate the beta scenario runner; template marketplace (approvals/publishing); marketplace revenue + catalog metrics; remove demo/beta hardcoded scores.
- Dependencies: 40 (metrics), 39 (revenue). Priority: **Medium**. Complexity: Medium.

### Implementation-43 — Platform Cleanup & Security Hardening
- Objective: remove dead/legacy code + close security gaps.
- Scope: delete dead actions/components/hooks/endpoints (SuperAdminForm, features/billing+analytics, hooks/dashboard, InstagramFeed, /api/checkout, /api/live-status, /api/auth/auto-login, generation/operations mocks); auth `/api/test-storage` or remove; guard `/api/dev/seed`; consolidate 3 prompt systems + v1 billing/AI; prune orphan tables + migrate the 4 runtime-SQL tables under Prisma Migrate.
- Dependencies: after 39–42 so removals are safe. Priority: **High**. Complexity: High.

## 8. Cleanup Candidates

**Safe removals:** dead actions (`provisionNewCreator`, `magicProvisionFromYoutube`,
`purgeOldAuditLogsAction`, `analyzeUrl`, `confirmProvision`, `runJob`), `SuperAdminForm`,
`features/billing`, `features/analytics`, `hooks/dashboard/*`, `usePullToRefresh`,
`InstagramFeed` + `/api/instagram`, `/api/checkout`, `/api/live-status`,
`/api/auth/auto-login`, `generation/operations` mock classes, `DashboardShell`.
**Merge candidates:** v1 `lib/billing` + `lib/ai` into their v2/canonical
counterparts; 4 nav configs → 1; 3 prompt systems → 1.
**Migration candidates:** 4 revenue tables → Prisma migration; legacy `Subscription`
→ BillingSubscription; `AgencySubscription` + dormant razorpay fields removal.
**Docs:** settings/domains placeholders should link to roadmap; health score should be
recomputed.

## 9. Risks

**Architecture:** schema/DB drift (4 tables not under Migrate; `prisma migrate
deploy` not in CI); legacy `Subscription` dual-write; 3 parallel auth systems.
**Operational:** demo publishing in-memory; alerts never persisted; MRR disagreement
(revenue page vs revenue-management) misleads decisions; beta runner dormant.
**Scaling:** in-process job scheduler + in-memory event bus/rate-limiters won't scale
across instances; no durable queue.
**Security:** **`/api/test-storage` unauthenticated on production (200)** leaking
infra keys/buckets; `/api/dev/seed` unguarded outside production; `/api/checkout`
guest email checkout; 5-min impersonation JWT not tied to requester role.
**Launch blockers:** agency routes 404 (308 → nonexistent `/workspace`); analytics
placeholder; missing support/refund/coupon tooling; fabricated platform metrics.

## 10. Production Verification

- **Build:** `npx tsc --noEmit` ✅ (build green).
- **Browser/DOM (production):** `/super-admin*` → 307 (guard works); `/api/test-storage`
  → **200 unauthenticated**; `/agency/dashboard` → 308 → `/workspace/dashboard` → **404**
  (confirmed). Legacy-table reads (`tenants/[id]`), v2 MRR aggregate, and the
  `proCount*999` hardcode all confirmed in source + prod.
- Super-admin pages verified via file/line + route probes; full interactive flows
  require SUPER_ADMIN credentials (guarded, not exercised here).

---

**Bottom line:** CreatorStore's core (Builder, Publishing, Billing v2, Themes, Media,
Creator Intelligence, Storefront Composition) is canonical and production-grade. The
Super Admin Platform is stable at the navigation level but carries legacy-table reads,
fabricated/placeholder metrics, dead parallel systems, a broken agency route, an
unauthenticated diagnostic endpoint, and no durable ops tooling — all mapped above and
roadmapped into IMPLEMENTATION-39 → 43 for the Platform Operations Initiative.
