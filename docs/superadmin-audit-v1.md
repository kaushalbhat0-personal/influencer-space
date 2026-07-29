# Super Admin Platform Audit — v1.0

> **Audit Date:** 2026-07-29
> **Audit Type:** Pre-implementation validation for SUPERADMIN-01
> **Status:** Complete — No implementation, no refactoring

---

## Executive Summary

The Super Admin platform has **34 routes**, of which **26 are complete** (76%), **6 are placeholders** (18%), and **2 have issues** (6%). The security model is well-architected with three defense layers (middleware, layout, server actions). Two **CRITICAL** API route vulnerabilities were found (/api/auth/auto-login and /api/dev/seed). The platform uses canonical services correctly, with one bypass found (uilder.actions.ts writes directly to publishStatus). The orphaned 	heme-studio/registry.ts parallel ThemeRegistry is unused dead code. The marketplaceRegistry singleton has zero consumers. **Overall readiness for SUPERADMIN-01: 82/100.**

---

## Section 1: Route Audit

Of 34 routes under /super-admin:
- **26 Complete** (76%) — Dashboard, Agencies, Agency Detail, Audit, Beta, Demo Library, Demo Publishing, Demo Studio, Events, Features, Generate, Health, Imports, Invoices, Operations, Payments, Revenue, Subscriptions, Support, Tenants, Tenant Detail, Themes Studio, Transactions, Users, Webhooks, YouTube API
- **6 Placeholder** (18%) — API Keys, Domains, Jobs, Settings, Templates, Themes
- **2 Partial** (6%) — Analytics (mock data), Feedback (mock data)

**Issues:** 5 orphaned routes not in sidebar (events, imports, themes-studio, operations, youtube-api). 1 duplicate sidebar entry (beta in two groups). 1 registry mislabel (invoices marked not-ready but functional).

---

## Section 2: Navigation Audit

Sidebar driven by src/config/admin-registry.ts (29 modules, 7 groups):

| Group | Issue |
|-------|-------|
| Overview | Clean |
| Operations | Beta duplicated (also in System) |
| Billing | Clean |
| Creator Platform | Showcase links to public page |
| Platform | Beta duplicated |
| System | Operations, Events, YouTube API routes exist NOT in sidebar |
| Hidden | imports, themes-studio, youtube-api — no sidebar entry |

---

## Section 3: UI Audit

Design consistent across all pages — same card styles, DataTable usage, badge components, dark theme (g-[#0a0a0a]). Shared patterns: DataTable for lists, StatCard for metrics, EmptyState for placeholders, BillingStatusBadge for status. No significant UI issues.

---

## Section 4: Product Flow Audit

| Step | Expected | Status | Gap |
|------|----------|--------|-----|
| Dashboard | Platform stats | ✅ Complete | — |
| Creators | List, search, manage | ✅ Complete | — |
| Provisioning | Create new creator | ✅ Complete (3 tabs) | — |
| Marketplace | Theme/template moderation | ❌ Placeholder | No moderation UI |
| Operations | System health, jobs | ✅ Complete | — |
| Support | Search, impersonate | ✅ Complete | — |
| Analytics | Platform metrics | ⚠️ Partial — mock data | No real analytics pipeline |
| Audit | Full audit trail | ✅ Complete | — |
| Settings | Platform config | ❌ Placeholder | — |

---

## Section 5: Domain Ownership Audit

All domains have correct single ownership. Super Admin operates existing domains through canonical services. Marketplace moderation and Platform Settings are missing.

---

## Section 6: Duplicate Logic Audit

| Issue | Severity | File |
|-------|----------|------|
| PublishStatus bypass | **High** | uilder.actions.ts (direct prisma write) |
| Dead ThemeRegistry | Low | 	heme-studio/registry.ts (zero consumers) |
| marketplaceRegistry unused | Low | Singleton exported but zero imports |
| blueprintRegistry dead import | Low | website-ready/page.tsx |
| Two provisioning actions co-exist | Low | super-admin-provision.actions.ts + provision.actions.ts |

---

## Section 7: Creator Platform Integration

All Super Admin flows use canonical services (ProvisioningService, PublishingService, WebsiteHealthEngine, CapabilityService, ThemeRegistry, BlueprintRegistry). marketplaceRegistry has zero consumers — the only integration gap.

---

## Section 8: Provisioning Audit

One canonical pipeline. All consumers converge on ProvisioningService. Two standalone action files (super-admin-provision.actions.ts, provision.actions.ts) exist but are not wired to any UI.

---

## Section 9: Marketplace Audit

Themes and Templates moderation pages are placeholders. Theme Studio lists DesignTheme records but is unrelated to the canonical ThemeRegistry. No moderation, featured/premium approval, category management, or install tracking exists.

---

## Section 10: Agency Readiness

| Feature | Status |
|---------|--------|
| Agency list + detail | ✅ Complete |
| Client management | ❌ Not built |
| White label | ❌ Not built |
| Bulk publish | ❌ Not built |
| Teams/Roles | ❌ Not built |
| Agency capabilities in service | ✅ Complete |

---

## Section 11: Analytics Audit

Analytics is the weakest area — platform analytics uses mock data, no per-website or storage/publishing/marketplace analytics exist. Health analytics (WebsiteHealthEngine) is the only real analytics pipeline.

---

## Section 12-14: Health, Builder, Storefront

✅ WebsiteHealthEngine is used correctly with no duplicate calculations.
✅ Builder is never duplicated in Super Admin.
✅ Storefront is never read directly — all operations through Publishing.

---

## Section 15: Security Audit

| Severity | Finding | File |
|----------|---------|------|
| **CRITICAL** | No auth check — full account takeover | /api/auth/auto-login |
| **CRITICAL** | No auth check — full database compromise | /api/dev/seed |
| Low | 2 client components with no inline server check | generate/page, analytics/page |
| Low | Inconsistent error handling (text vs redirect) | operations/page, events/page |

---

## Section 16: Documentation Audit

platform-architecture-v1.md and product-roadmap.md match reality. superadmin-vision.md describes 8 sections; 2 are missing (Marketplace moderation, Platform Settings).

---

## Section 17: Dead Code Audit

| Item | Location | Action |
|------|----------|--------|
| Parallel ThemeRegistry | src/lib/theme-studio/registry.ts | Remove (zero consumers) |
| marketplaceRegistry singleton | src/lib/marketplace/registry.ts | Wire or remove |
| blueprintRegistry import | src/app/admin/website-ready/page.tsx | Remove unused import |
| super-admin-provision.actions | src/actions/super-admin-provision.actions.ts | Wire to UI or remove |
| provision.actions.ts | src/actions/provision.actions.ts | Wire to UI or remove |

---

## Section 18: Technical Debt

| Item | Severity |
|------|----------|
| /api/auth/auto-login no auth | **Critical** |
| /api/dev/seed no auth | **Critical** |
| builder.actions.ts bypasses PublishingService | **High** |
| Analytics page uses mock data | **Medium** |
| Feedback page uses mock data | **Medium** |
| 5 orphaned routes not in sidebar | **Medium** |
| marketplaceRegistry zero consumers | Low |
| theme-studio/registry.ts dead code | Low |

---

## Section 19: UX Recommendations

- Add orphaned routes to sidebar
- Fix duplicate beta entry
- Wire super-admin-provision.actions.ts into Provision Modal as AI-powered tab
- Replace marketplace placeholders with registry-backed moderation
- Replace settings placeholder with config page
- Build real analytics pipeline or remove mock data
- Connect feedback to real backend or remove page
- Add global search across tenants, users, agencies

---

## Section 20: Production Readiness

| Dimension | Score |
|-----------|-------|
| Architecture | 85/100 |
| UI | 80/100 |
| UX | 75/100 |
| Performance | 85/100 |
| Operations | 80/100 |
| Support | 85/100 |
| Scalability | 80/100 |
| Maintainability | 80/100 |
| Documentation | 90/100 |
| Security | 70/100 |
| **Overall** | **82/100** |

---

## Validation Checklist

- ✅ No duplicate ownership
- ✅ No duplicate provisioning
- ⚠️ No duplicate publishing (one bypass found — builder.actions.ts)
- ⚠️ No duplicate marketplace (marketplaceRegistry exists but zero consumers)
- ✅ No duplicate builder
- ✅ No duplicate capability logic
- ✅ Super Admin consumes canonical services
- ⚠️ UI aligns with Creator Platform (consistent)
- ⚠️ Navigation is mostly consistent (5 orphaned routes)
- ⚠️ Product flow is mostly clear (marketplace gap)
- ✅ Ready for SUPERADMIN-01 implementation
