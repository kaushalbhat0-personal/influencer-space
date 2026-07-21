# ADR-008: Billing v2 Architecture

**Date:** 2026-07
**Status:** Accepted — Phase 1 Foundation Complete

## Context

CreatorStore's billing system was split across two disconnected tables (`Subscription` for creators, `AgencySubscription` for agencies) with duplicated logic, no shared feature gate, and hardcoded plan checks throughout the codebase. The pricing audit revealed 7 critical inconsistencies between marketing and backend.

## Decision

### 1. Account Aggregate (not polymorphic Subscription)

Each billable entity (creator tenant or agency) gets a `BillingAccount` record. All subscriptions, payments, and invoices belong to a `BillingAccount` — never directly to a `Tenant` or `WebsiteAgency`.

```
BillingAccount (account_type: "tenant" | "agency", account_id)
    └── BillingSubscription (plan_id, status, renews_at)
```

This eliminates conditional logic ("if tenant, query this table; if agency, query that table") from the billing layer.

### 2. Immutable Plan Catalog

Plans are defined as a catalog with versioning. Once a customer subscribes to a plan, that plan is never edited. If pricing changes, a new plan version is created. Existing customers are grandfathered. Migrations from old plans are explicit.

### 3. Typed Feature Values (not JSON)

Feature values (`max_products`, `custom_domain`, etc.) are stored in typed columns (`intValue`, `boolValue`, `strValue`). Strongly typed methods (`maxProducts()`, `canUseCustomDomain()`) are exposed by the FeatureGateService. JSON is reserved for future complex configurations only.

### 4. Payment ↔ Subscription ↔ Feature Separation

```
Payment (Razorpay/Stripe)
    ↓
Billing Event (webhook)
    ↓
Subscription State (BillingSubscription.status)
    ↓
Feature Gate (FeatureGateService)
```

Payment success does not directly unlock features. Subscription state does. This makes retries, refunds, and failed renewals cleanly separable.

### 5. FeatureGateService as Single Entitlement API

All feature checks go through `FeatureGateService`. No `if (plan === "PRO")` anywhere in application code. The service reads from the plan catalog (Phase 1: in-memory, Phase 2: database).

### 6. BillingProvider Adapter

Payment gateways implement the `BillingProvider` interface. Application code depends on the interface. Razorpay is one adapter. Stripe can be added without changing any consuming code.

## Alternatives Considered

1. **Fix the dual-table system in place** — Perpetuates the architectural debt. Would require duplicating every feature, checkout, and webhook change across two systems. Rejected.
2. **Single Subscription table with account_type column** — Works initially but makes foreign keys, joins, and reporting harder. Account aggregate is cleaner. Rejected.
3. **JSON for all feature values** — Flexible but loses type safety. Typed columns with JSON fallback gives both. Implemented.

## Consequences

- **Positive:** Single source of truth for entitlements. No more "which table has this plan?" confusion.
- **Positive:** Payment gateway changes don't affect feature access. Feature changes don't affect billing.
- **Positive:** Grandfathering and plan migrations are explicit operations, not side-effects of edit.
- **Negative:** Migration of ~1,200 existing Subscription + AgencySubscription records into BillingAccount + BillingSubscription. Scripted migration, reversible.
- **Phase 1:** Schema only + interfaces + catalog. Phase 2: Migrate data + wire checkout. Phase 3: Deprecate legacy tables.

### 7. Invoice as Financial Source of Truth

Invoices sit between Subscription and Payment:

```
Creator upgrades
    ↓
Invoice Created (PENDING)
    ↓
Razorpay/Stripe Checkout
    ↓
Payment Success → BillingEvent (PAYMENT_SUCCEEDED)
    ↓
Invoice Paid → BillingEvent (INVOICE_PAID)
    ↓
Subscription Activated → BillingEvent (SUBSCRIPTION_ACTIVATED)
```

Invoices are immutable after payment. The `planCode` and `planVersion` on the invoice preserve the exact plan at time of purchase (grandfathering).

### 8. BillingEvent as Append-Only Audit Log

All state changes produce an immutable `BillingEvent`. Events are never edited. The `idempotencyKey` prevents duplicate webhook processing. The event log enables: audit trails, revenue recognition, churn analysis, and debugging.

### 9. Subscription Lifecycle State Machine

```
DRAFT ──→ ACTIVE ──→ PAST_DUE ──→ CANCELLED
  │         │           │              │
  │         │           └──→ EXPIRED   │
  │         │                          │
  └──→ TRIALING ──→ ACTIVE            │
            │                          │
            └──→ EXPIRED               │
                                       │
  CANCELLED ──────────────────→ ACTIVE (reactivation)
  EXPIRED   ──────────────────→ ACTIVE (renewal)
  CANCELLED ──────────────────→ DRAFT  (reset)
```

Legal transitions are validated by `validateTransition()`. Illegal transitions throw.

### 10. Reserved Plan Codes

Future plan codes are reserved in the namespace to avoid renames:
`agency_enterprise`, `addon_ai`, `addon_storage`, `addon_team`, `addon_whitelabel`

### Phase 2 Roadmap (Recommended)

- **2A — Billing Domain Completion:** BillingEvent, BillingInvoice, subscription lifecycle, idempotency. No payment gateway.
- **2B — Feature Gate Migration:** Replace all legacy `if(plan==="PRO")` with `FeatureGateService`. Lower risk, verifiable in production.
- **2C — Razorpay Adapter:** BillingProvider → RazorpayProvider → Checkout → Webhook → BillingEvent → Invoice → Subscription.
- **2D — Pricing UI:** Replace marketing pricing. By now backend, billing, subscriptions, and checkout are stable.
