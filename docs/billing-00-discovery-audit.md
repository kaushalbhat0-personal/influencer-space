# BILLING-00 — Billing & Monetization Discovery Audit

> **Date:** 2026-07-29
> **Type:** Pre-architecture audit — no implementation
> **Status:** Complete

---

## Executive Summary

The billing system has **three parallel implementations** with varying degrees of adoption. The Billing v2 module (src/modules/billing/) is the canonical forward direction but is not yet fully adopted. Two legacy systems (src/lib/billing/ and inline Prisma queries) remain active. The capability system is the single source of truth for feature gating and is production-ready. Payment provider integration exists only for Razorpay with adapter architecture for future providers. Commission/payout infrastructure is complete for agency revenue sharing. **Overall billing architecture readiness: YELLOW — Ready With Consolidation.**

---

## Final Decision

`
🟡 READY WITH CONSOLIDATION

Supporting evidence:
- Billing v2 module is the canonical forward direction
- Two legacy billing systems remain active
- Capability system is production-ready and canonical
- Payment providers are Razorpay-only with adapter interface
- Commission/payout infrastructure is complete
- Duplicate: 3 subscription models, 2 billing services, 2 invoice systems
- Migration path exists but is not yet executed
`

---

## Billing Ownership Matrix

| Concept | Canonical Owner | Status | Consumers |
|---------|----------------|--------|-----------|
| **Subscriptions** | BillingSubscription (v2) | ✅ Canonical | Billing service, admin pages |
| Legacy subscription | Subscription (prisma) | ⚠️ Deprecated | Minimal — being replaced |
| Legacy agency sub | AgencySubscription | ❌ Dead | Zero references |
| **Plans** | BillingPlan (v2) | ✅ Canonical | Billing service, catalog seed |
| Legacy plans | src/lib/capabilities/plans.ts | ✅ Canonical | CapabilityService, billing mapper |
| **Invoices** | BillingInvoice (v2) | ✅ Canonical | Billing service, operations |
| **Payments** | Razorpay webhook + BillingEvent | ✅ Active | Webhook route, billing service |
| **Capabilities** | src/lib/capabilities/ | ✅ Canonical | Every domain |
| **Commission** | CommissionRule + CommissionEntry | ✅ Canonical | Commission service |
| **Payouts** | PayoutBatch + PayoutReservation | ✅ Canonical | Payout service |
| **Tax** | Not implemented | ❌ Missing | None |
| **Coupons/Discounts** | Not implemented | ❌ Missing | None |
| **Credits/Wallet** | Not implemented | ❌ Missing | None |

---

## Database Audit

### Subscription Models (3 — DUPLICATE)

| Model | Lines | Status | Notes |
|-------|-------|--------|-------|
| BillingSubscription | 778-798 | **Canonical** | FK to Workspace, BillingPlan, BillingAccount |
| Subscription | 178-191 | **Deprecated** | FK to Tenant — legacy per-creator sub |
| AgencySubscription | 235-247 | **Dead** | FK to WebsiteAgency — zero code references |

**Decision:** Delete AgencySubscription. Migrate Subscription → BillingSubscription.

### Billing Models (Active)

| Model | Purpose | Status |
|-------|---------|--------|
| BillingAccount | Polymorphic account (tenant/agency) | **Transitional** — being replaced by direct Workspace FK |
| BillingPlan | Immutable plan catalog | **Canonical** |
| BillingFeature | Feature definitions | **Canonical** |
| BillingPlanFeature | Plan-to-feature mapping | **Canonical** |
| BillingInvoice | Financial source of truth | **Canonical** |
| BillingEvent | Append-only event log | **Canonical** |

### Commission/Payout Models (Active)

| Model | Purpose | Status |
|-------|---------|--------|
| Partner | Generic partner entity | **Canonical** |
| PartnerMember | Partner team members | **Active** |
| PartnerInvite | Partner invitations | **Active** |
| PartnerWorkspaceAssignment | Partner-to-workspace link | **Active** |
| CommissionRule | Revenue sharing rules | **Canonical** |
| CommissionEntry | Commission ledger entries | **Canonical** |
| PayoutBatch | Payout processing batches | **Canonical** |
| PayoutReservation | Reserved payout amounts | **Canonical** |

---

## Service Audit

### Billing Services (2 — DUPLICATE)

| Service | Location | Status | Consumers |
|---------|----------|--------|-----------|
| BillingService (v2) | src/modules/billing/application/service.ts | **Canonical** | Razorpay webhook, domain actions |
| illingService (legacy) | src/lib/billing/service.ts | **Active** | Creator billing page |

### Key Gap: Two billing services exist
- v2 service handles: checkout creation, payment capture, subscription lifecycle, commission processing
- Legacy service handles: plan listing, billing info display for creator dashboard
- These need to be consolidated into the v2 service

### Supporting Services (All Canonical)

| Service | Location | Status |
|---------|----------|--------|
| CapabilityService | src/lib/capabilities/service.ts | **Canonical** |
| CommissionService | Commission module | **Canonical** |
| PayoutService | Payout module | **Canonical** |
| PartnerService | Partner module | **Canonical** |
| EntitlementService (v2) | src/modules/billing/application/entitlements.ts | **Canonical** |
| BillingRepository | Billing v2 repository | **Canonical** |

---

## Capability Audit

| Feature | Location | Plans | Status |
|---------|----------|-------|--------|
| Custom domain | custom_domain | creator_pro+, all agency | ✅ |
| Premium themes | premium_themes | creator_pro+, agency_studio+ | ✅ |
| White label | white_label | agency_agency only | ✅ |
| Agency clients | gency_clients | All agency plans | ✅ |
| Multiple brands | multiple_brands | agency_studio+ | ✅ |
| Bulk publish | ulk_publish | agency_agency only | ✅ |
| Advanced builder | dvanced_builder | creator_elite, agency_agency | ✅ |
| Storage limit | storage_gb | Varies by plan | ✅ |
| Max products | max_products | Varies by plan | ✅ |
| Max team members | max_team_members | Varies by plan | ✅ |
| Max clients | max_clients | Agency plans only | ✅ |
| AI tools | i_automation | creator_pro+, agency_agency | ✅ |
| API access | pi_access | creator_elite, agency_agency | ✅ |

Capability system is **canonical and production-ready**. All feature gating should resolve through CapabilityService.can().

---

## Payment Provider Audit

| Provider | Integration | Status |
|----------|-------------|--------|
| **Razorpay** | Full: checkout, webhook, subscription, payment capture | ✅ Production |
| Stripe | Adapter interface defined, not implemented | ❌ Not built |
| PayPal | Not implemented | ❌ Not built |

### Provider Architecture
- BillingProvider registry with priority-based fallback
- ProviderAccount model for merchant accounts
- Webhook route at /api/webhooks/razorpay

---

## Creator Billing

| Feature | Implementation | Status |
|---------|---------------|--------|
| Plan listing | getPlans() (legacy) + getAllPlans() (v2) | ⚠️ Duplicate |
| Subscription | BillingSubscription | ✅ Canonical |
| Upgrade/Downgrade | Via Razorpay + illingService.createCheckout() | ✅ |
| Cancellation | illingService.cancelSubscription() | ✅ |
| Invoices | BillingInvoice | ✅ Canonical |
| Billing page | /admin/billing | ✅ Complete |

---

## Agency Billing

| Feature | Implementation | Status |
|---------|---------------|--------|
| Agency plans | gency_free, gency_studio, gency_agency | ✅ In capabilities |
| Plan families | creator / gency | ✅ |
| Registration | Creates BillingSubscription(agency_free) | ✅ |
| Commission | Auto-processed on payment capture | ✅ |
| Agency billing page | /agency/billing | ✅ Complete |

---

## Marketplace Audit

Marketplace monetization is **not yet implemented**. No purchase flow, no licensing, no revenue sharing for marketplace items. Themes and templates are free and registry-defined. This is a v1.3 roadmap item.

---

## Partner Revenue Audit

| Component | Implementation | Status |
|-----------|---------------|--------|
| Commission rules | CommissionRule model | ✅ Canonical |
| Commission calculation | CommissionService.processCommission() | ✅ Canonical |
| Commission ledger | CommissionEntry model | ✅ Canonical |
| Payout processing | PayoutBatch + PayoutService | ✅ Canonical |
| Partner management | Partner model + PartnerService | ✅ Canonical |

Commission/payout infrastructure is **production-ready** and used by the agency billing flow.

---

## Security Audit

| Area | Status | Notes |
|------|--------|-------|
| Razorpay webhook validation | ✅ | Signature verification |
| Subscription ownership | ✅ | Scoped to workspace |
| Invoice access | ✅ | Scoped to workspace |
| Plan changes | ✅ | Via authenticated server actions |
| Refund permissions | ⚠️ | SUPER_ADMIN only — not exposed in UI |
| Provider credentials | ✅ | Stored as encrypted env vars |

---

## Duplicate Ownership

| Concept | Count | Resolution |
|---------|-------|-----------|
| Subscription model | **3** | Consolidate on BillingSubscription |
| Billing service | **2** | Consolidate on v2 service |
| Invoice system | **1** | ✅ Canonical |
| Payment provider | **1** | ✅ Razorpay (adapter pattern ready) |
| Capability system | **1** | ✅ Canonical |
| Commission system | **1** | ✅ Canonical |
| Payout system | **1** | ✅ Canonical |

---

## Performance Audit

| Concern | Assessment |
|---------|-----------|
| Repeated plan lookups | Low — plans are cached in-memory via registries |
| Repeated subscription queries | Low — per-workspace queries are indexed |
| Webhook processing | Acceptable — single webhook endpoint |
| Invoice aggregation | Acceptable — used only in admin pages |

---

## UI Audit

| Page | Status | Notes |
|------|--------|-------|
| /admin/billing (creator) | ✅ Complete | Plans, subscription, invoices |
| /agency/billing (agency) | ✅ Complete | Revenue, invoices, subscriptions |
| /super-admin/revenue | ✅ Complete | Platform revenue metrics |
| /super-admin/subscriptions | ✅ Complete | All subscriptions table |
| /super-admin/invoices | ✅ Complete | All invoices table |
| /super-admin/payments | ✅ Complete | All payments table |

---

## Technical Debt

| Item | Severity | Category |
|------|----------|----------|
| 3 subscription models coexist | **High** | Duplicate ownership |
| 2 billing services coexist | **High** | Architecture |
| AgencySubscription is dead | **Medium** | Dead code |
| BillingAccount is transitional | **Low** | Migration path exists |
| No coupon/discount system | **Low** | Future feature |
| No marketplace monetization | **Low** | Roadmap v1.3 |

---

## Readiness Scores

| Dimension | Score |
|-----------|-------|
| Architecture | 70/100 |
| Maintainability | 65/100 |
| Security | 85/100 |
| Scalability | 80/100 |
| Monetization (Creator) | 85/100 |
| Monetization (Agency) | 80/100 |
| Marketplace | 10/100 |
| Operations | 75/100 |
| Performance | 85/100 |
| Documentation | 70/100 |
| **Overall** | **71/100** |

---

## Recommended Billing Roadmap

### BILLING-01 — Consolidation
- Delete AgencySubscription model
- Migrate Subscription → BillingSubscription
- Consolidate src/lib/billing/ into src/modules/billing/
- Remove BillingAccount — use direct Workspace FK

### BILLING-02 — Marketplace Payments
- Purchase flow for themes/templates
- License management
- Revenue sharing with creators

### BILLING-03 — Enterprise Billing
- Seat-based billing
- Usage-based billing
- Invoice customization
- Tax handling

### BILLING-04 — Platform Monetization
- Coupons and discounts
- Credits and wallets
- Automated dunning
- Revenue analytics