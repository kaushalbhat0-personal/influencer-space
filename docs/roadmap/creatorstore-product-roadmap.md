# CreatorStore Product Roadmap

## Vision

CreatorStore is a **Creator Operating System**.

One account → one creator → one website. Creators run their entire business —
storefront, content, commerce, AI, analytics — from a single operating system.

## Creator Operating System

- **One account** that owns the creator's identity, storefront and data.
- **One creator** per account (a single entity with a single brand).
- **One website** that is live, published and monetized.
- Revenue comes from **capabilities on that website** — subscriptions, premium
  themes, storage, AI credits, API integrations — **not** from additional
  websites.

## Roadmap

| Stage | Status | Scope |
|---|---|---|
| Onboarding Intelligence (27–32) | ✅ | Generation experience, animation, construction, activity feed, unified acquisition, hybrid intelligence |
| Billing v2 Consolidation (33) | ✅ | Single billing source of truth, canonical plans + capability matrix |
| Checkout & Subscription Activation (34) | ✅ | Real Razorpay subscriptions, webhook lifecycle, billing events drive entitlements |
| Billing History & Diagnostics | ✅ | Read-only creator billing dashboard data, dev diagnostics |
| Subscriptions UI (upgrade/downgrade/cancel) | 🚧 In progress | Wire admin/billing actions to `BillingService` |
| AI Credits | 🟦 Planned | Per-creator usage ledger → entitlement grant |
| Premium Commerce | 🟦 Planned | Digital products, theme packs, storage packs |
| Marketplace | 🟦 Planned | Sell to other creators; platform payouts |
| Enterprise | 🟦 Planned | Manual sales, white label, SLA |

## Launch Philosophy

Launch a **minimal, stable core**: one creator, one website, working checkout,
trustworthy billing. Everything beyond that ships as **capabilities unlocked by
entitlements** — never as separate products that fragment the experience.

## Growth Philosophy

Grow by **deepening one website**: themes, storage, AI, integrations. Each is a
grant on the same storefront, derived from the canonical capability matrix
(`src/config/commerce/plans.ts`). No product works in isolation.

## Revenue Philosophy

**Payments never unlock features.** Payments produce **Billing Events** →
**Entitlements** → **Capabilities** → **Feature access**. CapabilityService is
the only authorization layer; billing is a producer of grants, never a direct
feature switch. This keeps features safe, reversible and audit-able.

## Marketplace Roadmap

Creator-to-creator commerce: theme packs, templates, AI presets, and paid
integrations — all delivered as entitlement grants with platform commission via
the existing commission/payout engines.

## Enterprise Roadmap

Manual sales (`creator_enterprise`), dedicated support, white label, SSO/audit
logs, custom integrations. Enterprise never uses public checkout — it is a
configured manual plan (`manual: true`).

## Future Agency Roadmap

Agency plans (Studio/Agency) continue to exist for the future agency operating
model; creator and agency families remain separate capability families with a
shared capability matrix and shared entitlement engine.

## Features intentionally postponed

- Multi-website per account (contradicts the one-website philosophy).
- Creator marketplace payouts (blocked until payout providers are real).
- AI credit purchasing (needs the usage ledger).
- Gift codes / bundles (commerce scaffolding exists but is intentionally unwired).
- Tax engine beyond flat GST (see commerce roadmap).
