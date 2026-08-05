# Super Admin Consolidation & Operations Audit — RCCF-AUDIT-19

**Date:** 2026-08-06  
**Status:** COMPLETE — Read-Only Audit

---

## 1. Navigation Map — 28 Routes Mapped

### Current Nav (from admin-registry.ts)

| Group | # | Items |
|-------|---|-------|
| **Platform** | 3 | Dashboard, Operations, Health |
| **Creators** | 5 | Tenants, Agencies, Users, Creator Import, Showcase |
| **Marketplace** | 2 | Themes, Theme Studio |
| **Billing** | 14 | Revenue, Revenue Mgmt, Subscriptions, Invoices, Payments, Finance Dashboard, Settlements, Partner Ledger, Reconciliation, Integrity, +4 more |
| **Audit** | 4 | Audit Log, Events, Feature Flags, Runbooks |
| **System** | 2 | API Keys, System Settings |

### Routes NOT in nav but functional:

| Route | Access | Type |
|-------|--------|------|
| `/super-admin/domains` | Direct URL | Operations |
| `/super-admin/blueprints` | Direct URL | Marketplace |
| `/super-admin/templates` | Direct URL | Marketplace |
| `/super-admin/ai-operations` | Direct URL | Diagnostics |
| `/super-admin/generate` | Direct URL | Operations |
| `/super-admin/demo-studio` | Direct URL | Development |
| `/super-admin/alerts` | Direct URL | Monitoring |
| `/super-admin/platform/sync` | Direct URL | Configuration |
| `/dev/commerce`, `/dev/theme-runtime`, `/dev/billing` | Direct URL | Development |

### Classification: Merge / Remove / Keep

| Page | Action | Reason |
|------|--------|--------|
| **Finance Dashboard** | Keep standalone | Real KPIs, used by finance ops |
| **Settlements** | Keep standalone | Primary finance workflow |
| **Partner Ledger** | Keep standalone | Append-only accounting |
| **Reconciliation** | Keep standalone | Audit checks on finance data |
| **Platform Integrity** | Keep standalone | Orphan detection + cleanup |
| **AI Operations** | Keep standalone | Cost monitoring, cache stats |
| **Blueprints** | **Add to nav** | Super admin needs blueprint catalog |
| **Domains** | Already in nav | Domain operations dashboard |
| **Templates** | Merge into **Blueprints** | Both show blueprint catalog — one is enough |
| **Generate / Demo Studio** | **Hide behind Diagnostics** | Development tools, not production ops |
| **Alerts** | Keep standalone | Monitoring with runbook links |
| **Revenue Reports** vs **Revenue Management** | **Merge** | Reports page shows metrics; Management page shows same metrics + quick links. Merge into single page with tabs. |
| **Invoices** vs **Payments** | Could merge with **Transactions** | Three pages showing payment data in different slices. Consolidate into one Commerce Timeline. |
| **Events** vs **Audit Logs** | Events page is in-memory only | Audit Logs is DB-backed. Events page should be hidden behind Diagnostics. |
| **Platform Health** + **Operations** | Consider merging | Health shows status; Operations shows engine state. Related but distinct purposes. |
| **Tenants** + **Agencies** + **Users** | Keep separate | Distinct entity types, different pages needed |  
| **Runbooks** | Keep standalone | Operations reference |
| **Feature Flags** | Keep standalone | System configuration |

---

## 2. Dashboard Inventory — 10 Dashboards

| Dashboard | Purpose | Data Source | Overlap With | Keep? |
|-----------|---------|-------------|-------------|-------|
| **Platform Dashboard** (`/`) | High-level platform stats | `getPlatformStats()` + `TenantLedger` | None (unique overview) | ✅ |
| **Operations** (`/operations`) | Engine status, jobs, recovery | Prisma counts + in-memory state | Platform Dashboard (both show counts) | ✅ Keep but differentiate |
| **Platform Health** (`/health`) | Uptime, DB status, storage | Prisma queries | Operations | ⚠️ Could merge into Operations tab |
| **Finance Dashboard** (`/finance`) | Liability, KPI, revenue cross-ref | `settlementService` + `partnerLedgerService` + `revenueService` | Revenue Reports | ✅ Keep — different audience |
| **Revenue Reports** (`/revenue`) | MRR, ARR, plan dist, invoices | `RevenueService.getDashboard()` | Finance Dashboard (both show MRR) | ⚠️ Merge with Revenue Mgmt |
| **Revenue Management** (`/revenue-management`) | Config + quick links | Same as Revenue + config | Revenue Reports | ⚠️ Merge with Revenue Reports |
| **Integrity** (`/integrity`) | Orphan scan, cleanup | `detectOrphans()` + `runSafeCleanup()` | Reconciliation | ⚠️ Complementary but different |
| **Reconciliation** (`/reconciliation`) | Financial orphans, ledger check | Prisma queries across 5 models | Integrity | ⚠️ Complementary but different |
| **AI Operations** (`/ai-operations`) | Cost, cache, token usage | In-memory cache/cost monitor | None | ✅ |
| **Domains** (`/domains`) | Domain verification, registrar guides | Prisma + Vercel API | None | ✅ |

---

## 3. Operations Audit — Page Classification

| Page | Type | Frequency | Action |
|------|------|-----------|--------|
| **Settlements** | Management | Weekly (finance ops) | Keep — core workflow |
| **Partner Ledger** | Monitoring | Weekly (finance review) | Keep — append-only accounting |
| **Finance Dashboard** | Monitoring | Daily (finance check) | Keep — real KPIs |
| **Reconciliation** | Diagnostics | Weekly (finance audit) | Keep — pre-payment check |
| **Integrity** | Diagnostics + Management | Weekly (cleanup) | Keep — orphan remediation |
| **AI Operations** | Monitoring | Monthly (cost review) | Keep — cost control |
| **Operations** | Monitoring | Daily (platform health) | Keep |
| **Audit Logs** | Diagnostics | On-demand | Keep |
| **Events** | Development | On-demand | Hide behind Diagnostics |
| **Feature Flags** | Configuration | Rarely | Keep |
| **Runbooks** | Reference | On emergency | Keep |
| **Alerts** | Monitoring | Real-time | Keep |
| **Webhooks** | Monitoring | Rarely | Keep |
| **Generate / Demo Studio** | Development | Testing only | Hide behind Diagnostics |
| **Platform Sync** | Configuration | Rarely (plan changes) | Keep |

---

## 4. Diagnostics Audit — Developer Pages

| Page | Access Level | Purpose | Action |
|------|-------------|---------|--------|
| `/dev/commerce` | SUPER_ADMIN only | Commerce registry inspection | ✅ Production-safe — keep |
| `/dev/theme-runtime` | SUPER_ADMIN only | Theme→Experience resolution | ✅ Production-safe — keep |
| `/dev/billing` | Authenticated user | Billing harness (webhook simulator) | ⚠️ Could expose webhook sim. Consider SUPER_ADMIN guard. |
| `/dev/ai-components` | Unknown | AI component testing | ℹ️ Development-only |
| `/dev/generation-experience` | Unknown | Generation flow testing | ℹ️ Development-only |
| `/dev/billing-consolidation` | Authenticated | Billing diagnostics | ℹ️ Could merge into /dev/commerce |

**Recommendation:** Create `/super-admin/diagnostics` as a unified diagnostics hub linking to all `/dev/*` routes, clearly marked as "Engineering Tools — Not for Operations."

---

## 5. Duplicate Detection

| Duplicate Pattern | Pages Involved | Consolidation |
|------------------|---------------|---------------|
| MRR/ARR + plan distribution displayed | Revenue Reports, Finance Dashboard, Revenue Management | Single source — Revenue Reports page links to Finance |
| Tenant table | Platform Dashboard, Tenants page | Dashboard shows embedded; Tenants page shows searchable/full |
| Theme catalog | Themes, Blueprints, Templates | Merge into one Marketplace section |
| Event timeline | Events, Audit Logs, Finance page | Events (in-memory) → hide behind Diagnostics. Audit (DB) → keep |
| Subscription data | Subscriptions page, Tenant detail page | Different granularity — both valid |

---

## 6. Missing Operations

| Gap | Severity | Notes |
|-----|----------|-------|
| **Failed generation queue** | Medium | Generations counted in Operations but no queue to retry/prioritise |
| **Failed publish queue** | Medium | Publishing counts shown, no retry queue |
| **Failed domain verification queue** | Low | Seen in Domains page but no bulk retry |
| **Failed payment retry queue** | Low | Individual retry exists (`retryPaymentAction`), no bulk |
| **Stale invitation cleanup** | Low | Recovery action exists; no automated job |
| **Content feed orphan cleanup** | Low | Manual purge per tenant; no auto-deletion for deleted tenants |

---

## 7. UI Consistency Issues

| Pattern | Current State | Recommendation |
|---------|--------------|----------------|
| **Tables** | Some use `DataTable`, some use inline `<table>` | Standardize on one pattern |
| **Filters** | Page-specific: some have search, some have dropdowns, some have none | Standard filter pattern |
| **KPI Cards** | Revenue uses `MetricCard`, Finance uses custom divs, Integrity uses custom divs | One KPI card component |
| **Empty States** | 5+ different patterns | Standardize |
| **Pagination** | Some pages have it (Audit), most don't | Add to search results |
| **Bulk Actions** | None | Add to Settlements, Tenants |
| **Export** | None | Priority: CSV export for Settlements, Ledger |

---

## 8. Recommended Navigation Restructure

### Before (28 items across 6 groups)
```
Platform: Dashboard, Operations, Health              (3)
Creators: Tenants, Agencies, Users, Import, Showcase (5)
Marketplace: Themes, Theme Studio                     (2)
Billing: Revenue, Revenue Mgmt, Subs, Invoices, 
         Payments, Finance, Settlements, Ledger, 
         Reconciliation, Integrity, +4 more          (14)
Audit: Audit Log, Events, Flags, Runbooks             (4)
System: API Keys, Settings                            (2)
```

### After (22 items across 6 groups)
```
Overview: Dashboard, Operations & Health              (2)
Creators & Partners: Tenants, Agencies, Users         (3)
Commerce: Revenue & Finance, Subscriptions, 
          Invoices & Payments, Settlements, 
          Partner Ledger, Commission Center,
          Commerce Center                              (7)
Integrity: Reconciliation, Platform Integrity,
           AI Operations, Domain Operations            (4)
Marketplace: Themes, Blueprints, Theme Studio         (3)
System: Audit Logs, Alerts, Runbooks, 
         Feature Flags, Diagnostics                   (5)
```

### Net reduction: 28 → 22 (-6 items)

---

## 9. Implementation Roadmap

| Priority | Action | Effort |
|----------|--------|--------|
| **High** | Merge Revenue Reports + Revenue Management into single page with tabs | 2h |
| **High** | Add Blueprints to nav sidebar | 5 min |
| **High** | Merge Templates into Blueprints page | 30 min |
| **High** | Standardize KPI card component across all dashboards | 1h |
| **Medium** | Hide Events page behind Diagnostics | 10 min |
| **Medium** | Create `/super-admin/diagnostics` hub page | 1h |
| **Medium** | Add SUPER_ADMIN guard to `/dev/billing` | 10 min |
| **Medium** | Merge Invoices + Payments into Commerce Timeline | 2h |
| **Low** | Merge Health into Operations tab | 1h |
| **Low** | Add CSV export to Settlements and Ledger | 2h |
| **Low** | Standardize empty states across all admin pages | 3h |
| **Low** | Hide Generate/Demo Studio behind Diagnostics | 10 min |
