# RCCF-73.2 — Partner Commercial Architecture & Billing Boundary Audit

**Status:** COMPLETE — AUDIT / DESIGN-VERIFICATION ONLY. No application code, DB, migration, billing, plan-registry, commission logic, or test modified. No commit.
**Date:** 2026-08-19
**Mode:** Read-only. Evidence from current source (`file:line`), live DB (read-only queries), and prior RCCF-73.1 report. Historical docs treated as evidence, not authority.
**Supersedes/relates to:** `docs/rccf-73.1-agency-partner-exhaustive-audit.md`

---

## 1. Executive Summary

The existing architecture is **structurally capable of representing the new approved Partner commercial model** — the canonical separation between Partner plans (family `partner`) and Creator plans (family `creator`) already exists and is enforced server-side, the `BillingSubscription`/`BillingPlan`/`BillingAccount` v2 core is the correct substrate, `AgencyTenant` is the canonical agency↔client relationship, and the recurring commission runtime (`recordSubscriptionCommission`) already triggers off **active Creator client subscriptions** exactly as the model requires.

However, the architecture currently **diverges from the approved model in five material ways**, and is **blocked from actually monetizing the model** by the single P1 revenue defect (RCCF-73.1-F2):

1. **F2 (blocking) — Agency-provisioned clients are created with NO Creator `BillingSubscription`.** The selected Creator plan (`creator_grow` minimum) is never persisted. Client resolves to phantom Creator Launch, publish quota becomes unlimited (`resolvePublishPolicy(null)` → unlimited), the client generates no subscription revenue, and the commission runtime is never triggered. Verified independently from source and DB (0 commission entries despite 2 active AgencyTenant links).

2. **Client capacity numbers are wrong for the approved model.** Registry + runtime: Free=1 (trial), Solo=5, Growth=0 (bug), Scale=15. Approved model: Free=3, Solo=8, Agency=15, plus ₹2,000/client overage. The `partner_growth` tier (max_clients=0, F3) is the legacy tier that must become `partner_agency` with 15.

3. **`partner_agency` does not exist.** The approved third tier is named `partner_agency` (15 clients, ₹14,999). The codebase has `partner_growth` (legacy, hidden, ₹4,999, max_clients=0) and `partner_scale` (₹7,999, 15 clients). Mapping decisions are required (see §14).

4. **Pricing authority is divergent.** The DB runtime price for `partner_solo` is ₹2,999 (registry + marketing = ₹4,999); `partner_enterprise` DB=₹0 vs registry ₹14,999. The approved ₹7,999/₹14,999/₹2,000 are not represented anywhere. `AgencyCapacityAddon.unitPriceInr` is hardcoded to ₹1,499 (`agency-addons.ts:8`), not ₹2,000.

5. **Capacity overage is not payment-gated.** `addAgencyCapacityAction` (₹1,499/qty) creates an ACTIVE `AgencyCapacityAddon` via a plain upsert with **no payment, no checkout, no webhook, no invoice**. This violates the approved invariant that capacity is only granted after a confirmed ₹2,000 payment (INV-12, INV-09, INV-10).

**Who pays for the Creator client subscription** is **established by the existing architecture** (client pays after invitation claim, through their own Creator billing surface) — see §4/Phase 4. This is the model the architecture is built for; the defect is that provisioning never creates the subscription that the client would then pay to keep.

**VERDICT: B — ARCHITECTURE FIT WITH IMPLEMENTATION GAPS** (with a blocking P1 revenue defect that must be resolved by a scoped implementation ticket before the model can be monetized). Not D, because the "who pays" question IS established by existing policy; not C, because nothing in the approved model requires a new architectural concept — every element maps onto an existing entity.

---

## 2. Approved Commercial Model (restated for the report)

| Tier | Code | Price | Included active clients | Client subscriptions | Commission |
|---|---|---|---|---|---|
| Partner Free | `partner_free` | ₹0 | 3 | YES | NO (0%) |
| Partner Solo | `partner_solo` | ₹7,999/mo | 8 | YES | YES (canonical rate) |
| Partner Agency | `partner_agency` | ₹14,999/mo | 15 | YES | YES (canonical rate) |
| Overage | — | ₹2,000/client | purchased, additive | — | — |

- Capacity invariant: only **ACTIVE** client relationships consume capacity; REVOKED/offboarded do not.
- Overage is **not automatic** and **not silent** — payment-confirmed before effective capacity increases.
- **CRITICAL COMMERCIAL INVARIANT:** Partner plan ≠ Creator client plan. Partner billing controls capacity/features/commission; Creator billing controls site capabilities/publish quota/limits. The two must not collapse.

---

## 3. Existing Billing Architecture (entity map)

### BillingAccount (`schema.prisma:939`)
- **Owner:** platform (v2 billing core). **Purpose:** single billable entity (polymorphic `accountType` = "tenant" | "agency"). **Lifecycle:** created at signup (agency) or checkout (creator). **Source of truth:** BillingAccount table. **Tenant/workspace/agency/client relation:** `accountId` holds `WebsiteAgency.id` (agency) or `User.id` (creator). **Money:** none itself (holds subscriptions).
- **Classification: CANONICAL.**

### BillingPlan (`schema.prisma:953`)
- **Owner:** platform catalog. **Purpose:** immutable versioned plan catalog (code, family creator/partner, price, runtimeConfig, marketing). **Lifecycle:** seeded from `src/config/commerce/plans.ts` via `catalog-seed.ts`, edited by Super Admin (Pricing Center) via `runtimeConfig`. **Source of truth:** DB `BillingPlan` (runtime) over static registry (defaults). **Relation:** plan → subscriptions. **Money:** `price` (commercial authority).
- **Classification: CANONICAL.**

### BillingSubscription (`schema.prisma:1058`)
- **Owner:** platform. **Purpose:** unified per-workspace subscription (state machine DRAFT/TRIALING/ACTIVE/PAST_DUE/CANCELLED/EXPIRED). **Lifecycle:** created at signup (TRIALING), activated by Razorpay webhook, changed by checkout/webhook. **Source of truth:** BillingSubscription table; read via `resolveActivePlan`. **Tenant/workspace relation:** `workspaceId` (unique) → Workspace → tenant OR agency. **Money:** yes (the billing subscription; drives invoices + commission).
- **Classification: CANONICAL** (this is the entity F2 fails to create for provisioned clients).

### Subscription (legacy, `schema.prisma:184`)
- **Owner:** legacy. **Purpose:** pre-v2 per-tenant subscription. **Lifecycle:** frozen. **Source of truth:** legacy table (3 rows, creator-only). **Money:** historical. **Classification: LEGACY** (creator-only fallback; never written; untouched by agency billing).

### PlanUsage / BillingInvoice / BillingEvent
- `BillingInvoice` (schema:1149) — PAID invoices, commission source. **CANONICAL.**
- `BillingEvent` (schema:1082) — append-only idempotency log (unique `idempotencyKey`). **CANONICAL.**
- `PlanUsage` (referenced in RCCF-73.1) — usage metering. **CANONICAL.**

### AgencyTenant (`schema.prisma:217`)
- **Owner:** platform. **Purpose:** canonical agency↔creator link (WebsiteAgency ↔ Tenant ↔ Workspace), rev-share percents, status ACTIVE/REVOKED. **Lifecycle:** created by `linkCreator`, offboarded via `offboard`. **Source of truth:** AgencyTenant table (writer = `partner-relationship.ts`). **Relation:** agency, tenant, workspace. **Money:** carries `revSharePercent` (20/10 defaults) used in commission fallback.
- **Classification: CANONICAL** — the agency↔client relationship and the basis for capacity + commission attribution.

### AgencyCapacityAddon (`schema.prisma:352`)
- **Owner:** platform. **Purpose:** additional managed-client capacity (quantity × ₹1,499). **Lifecycle:** created by `addAgencyCapacityAction` (upsert, idempotent by `(agencyId, idempotencyKey)`), cancelled non-destructively (ACTIVE→CANCELLED). **Source of truth:** AgencyCapacityAddon table. **Money:** `unitPriceInr` (currently ₹1,499, **not** ₹2,000). **Relation:** agencyId.
- **Classification: CANONICAL for capacity-addon shape, but DIVERGENT on price and payment gating** (no checkout/payment — see §11, §12).

### Partner / PartnerMember / PartnerWorkspaceAssignment / PartnerInvite (`schema.prisma:1693,1716,1729,1748`)
- **Owner:** legacy scaffolding. **Purpose:** parallel pre-v2 partner model (in-memory `partnerEngine` reading these tables). **Lifecycle:** dormant (0 relevant rows; used only for stats/cleanup/health). **Source of truth:** these tables, but **not used for any billing/capacity/commission decision**. **Money:** none. **Classification: LEGACY / DUPLICATE** (inert; the canonical partner relationship is `AgencyTenant`).

### Commission runtime / ledger / rules / loyalty
- `CommissionEntry` / `PartnerLedger` / `CommissionRule` / `LoyaltyTier` / `CommissionPolicy` — see §8. **CANONICAL** for recurring commission; the runtime is DB-backed and live.

---

## 4. Partner Subscription Architecture (Phase 2 trace)

Current trace (verified from source):

```
Partner signup (persona=agency)  →  api/auth/register/route.ts:46-104
  → WebsiteAgency(status ACTIVE)
  → BillingAccount(accountType=agency, accountId=agency.id)
  → BillingSubscription(plan=partner_free, TRIALING, 15d trialEndsAt)   [route.ts:90-97]
  → (workspace created lazily on login via resolveWorkspace + RCCF-40 subscription link)
Agency Workspace (type=AGENCY, agencyId)
  → resolveActivePlan(workspace.id)  →  plan-source.ts:71-116   (v2-first, no legacy fallback for agency)
  → planCode (must start with "partner" else PARTNER_FALLBACK_PLAN="partner_free")  [partner-relationship.ts:69]
  → capabilities  →  capabilityService.can/limit(planCode, featureKey)
  → client capacity  →  resolvePartnerEffectiveCapacity (partner-relationship.ts:61-88):
        partner_free → trial ? 1 : 0
        paid → included max_clients + ACTIVE addons
  → commission eligibility  →  NOT a partner-plan property; driven by creator subscription (see §8)
```

**Fit vs approved model:** The Partner subscription architecture is conceptually correct — Partner entitlement is resolved from the Partner's own `BillingSubscription`, never the client's. This satisfies INV-14. The `partner_free` trial-only clamp (`access-lock.ts`, `partner-relationship.ts:75-78`) means Free is currently 1 client during trial and **0 after**; the approved model wants Free = 3 active clients indefinitely. This is a policy/capacity divergence, not an architectural blocker.

**Gaps:** (a) `partner_free` trial-only clamp conflicts with approved "Free = 3 ACTIVE clients"; (b) capacity numbers differ; (c) `partner_agency` missing.

---

## 5. Creator Client Subscription Architecture (Phase 3 trace)

```
Agency creates client → importCreatorViaAgency (partner.actions.ts:17-100)
  → capacity pre-check getAgencyClientCapacity (fail-fast)         [line 45-52]
  → confirmProvision (super-admin-provision.actions.ts:113)  planCode = input.planCode (creator_*)
      → provisioningService.provision (provisioning-service.ts:143)
          → Tenant, Website, Brand, PublishStatus, Settings, User(ADMIN, provisional)
          → Workspace(TENANT), WorkspaceMember(OWNER)
          → billingRepository.linkSubscriptionToWorkspace(accountType=creator, accountId=user.id)  [line 284]
              → NO-OP: the freshly created user has no BillingAccount/subscription to link  (repository.ts:32-51)
      → AgencyTenant.linkCreator (agency-admin branch)  [super-admin-provision.actions.ts:208-220]
  → passwordless invitation (creatorInvitationService.createInvitation)  [partner.actions.ts:82-89]
  → claim (claimCreatorInvitation → claimInvitation) → creator becomes OWNER (tenantId set on user)
Creator plan:  NONE PERSISTED (the selected creator plan is lost)
BillingSubscription:  NONE CREATED for the client workspace
effective Creator plan:  resolveActivePlan(workspace.id) → null → fallback origin "none"  → phantom Launch
Creator capabilities:  launch-level (free-tier)
publish quota:  resolvePublishPolicy(null) → DEFAULT { mode: "unlimited", limit: null }  (publish-policy.ts:56-58)
commission eligibility:  recordSubscriptionCommission → resolvePartnerForWorkspace → no subscription → never called
```

**Exact break point (RCCF-73.1-F2 root cause):** `provisioning-service.ts:284` calls `billingRepository.linkSubscriptionToWorkspace` with `accountType: "creator", accountId: user.id`. That function only links a subscription that **already exists** (created earlier with only `accountId`). During agency provisioning the user is created fresh and **no BillingAccount/BillingSubscription is ever created for the client**, so `linkSubscriptionToWorkspace` returns `null` (no-op) and the client workspace is left with no `BillingSubscription`. The selected `planCode` is only stored in a `Setting` (`onboarding_source`), which is **not** read by `resolveActivePlan`.

Consequences (each verified):
- selected Creator plan not persisted → client resolves to phantom Launch.
- `resolvePublishPolicy(null)` → **unlimited** publish (INV-15 violated today).
- client subscription revenue does not exist (INV-04 violated today).
- Partner commission never triggers (0 commission entries in DB despite 2 active AgencyTenant links).
- The `isTenantAgencyManaged` Launch→Grow clamp (`plan-restriction.ts`) never engages because there is no subscription to clamp.

---

## 6. AgencyTenant Relationship

- Canonical writer: `partner-relationship.ts` (`linkCreator`, `offboard`). `AgencyTenant` is the **single source of truth** for agency↔client; not duplicated in membership/settings/subscription.
- `linkCreator` enforces capacity atomically via `SELECT … FOR UPDATE` on the agency row + counting ACTIVE links (`partner-relationship.ts:146-173`). Idempotent upsert by unique `tenantId`.
- `offboard` → status REVOKED (reclaims capacity, preserves creator data/billing/commissions).
- **Fit:** this is exactly the relationship the approved model uses for both capacity and commission attribution. **No architectural change needed.** Gap: capacity limit source and counts (see §10).

---

## 7. Client Provisioning Flow (full)

1. `importCreatorViaAgency` (admin-only; rejects staff, `partner.actions.ts:30-32`).
2. Reject Launch for agency clients (`isAgencyRestrictedPlan`, line 38-40) — enforces Grow minimum.
3. Fail-fast capacity check (line 45-52) — server-side read; authoritative atomic gate is `linkCreator`.
4. `confirmProvision` → provisioning pipeline → tenant/workspace/membership created; **no subscription created** (F2).
5. `linkCreator` (atomic capacity gate + rev-share defaults).
6. Passwordless invitation → claim → creator OWNER.
7. Publishing happens immediately via `publishingService.publish` (super-admin-provision.actions.ts:183) — **before any payment or subscription**.

**Gaps vs approved model:** (a) no BillingSubscription created (F2); (b) publishing occurs before payment/subscription (violates the spirit of INV-04/INV-12); (c) capacity limit source wrong; (d) overage not payment-gated.

---

## 8. Commission Architecture (Phase 5)

### Current trace
- **Source transaction:** PAID `BillingInvoice` created in `billingService.handleSubscriptionWebhook` (activate/renew) for a **Creator workspace** (`service.ts:171-241`).
- **Attribution:** `recordSubscriptionCommission(workspaceId, …)` → `resolvePartnerForWorkspace` (workspace → tenant → AgencyTenant → agency) (`runtime.ts:43-54`).
- **Eligibility:** requires a real `BillingSubscription` on the creator workspace (webhook only fires when a subscription exists) + an AgencyTenant link. **There is no partner-plan-level commission flag** — commission is driven entirely by the creator subscription existing.
- **Rate:** `resolveSplitSource` hierarchy: partner rule → plan rule → default rule → loyalty tier → `AgencyTenant.revSharePercent` → `CommissionPolicy.agencyDefaultShare` (currently 30) → 80/20. `commissionRule` table empty; `LoyaltyTier` empty; so default = relationship revShare (20) → policy 30 → default 20.
- **Ledger:** `PartnerLedger` append-only balance chain (`runtime.ts:196-214`).
- **Status/settlement:** `CommissionEntry.status` pending → settled; `resolveNetPendingEntries` nets reversals (`runtime.ts:267-298`); settlement/payout models.
- **Reversal/cancellation:** `billingService.handleRefund` (refund.processed) writes `refund_reversal` entries + clawback handling; idempotent by refund id (`service.ts:305-451`).
- **Idempotency:** per-invoice check (`runtime.ts:164-168`) + webhook `BillingEvent.idempotencyKey` (keyed on payment id to collapse `subscription.activated/charged/payment.captured`) (`webhook.ts:64-71`, route.ts:79).
- **Activation timing:** on PAID activate/renew webhook, committed in the same transaction as the invoice (`service.ts:188-212`).

### Fit vs approved model
The commission runtime is **already driven by ACTIVE creator client subscriptions** — exactly the desired invariant (`client subscription ACTIVE` + `AgencyTenant ACTIVE` + `Partner commission enabled` = eligible). This matches INV-06/INV-07/INV-16 structurally.

- **Partner Free (0% commission):** today the runtime would pay whatever the split resolves to (20/30) if a Free agency had a client subscription. The approved model requires Free = **0%**. This is a **policy gap**: there is no per-partner-plan "commission enabled = false" gate for `partner_free`. It would need either a plan-rule (`CommissionRule` with metadata planCode=partner_free, partnerSharePercent=0) or a code-level check. **Documented; not implemented.**
- **Partner Solo / Agency (commission = existing rate):** fully supported by the current runtime with **zero percentage changes** — the existing configured rate (relationship/policy/default) applies. **Fit.**
- **Gap:** commission cannot trigger at all today for provisioned clients because they have no subscription (F2).

---

## 9. Active Client Definition (Phase 6)

Two different "active client" notions exist today:

1. **Capacity count** (`partner-relationship.ts:99`, `linkCreator`): counts `AgencyTenant` rows where `status === "ACTIVE"`. This is the **capacity** consumer. REVOKED links are excluded → offboarding reclaims capacity. **Matches the approved invariant INV-08.**
2. **Loyalty/active-client count** (`loyalty.ts:26-33`): counts `AgencyTenant` links whose workspace has a `BillingSubscription` in ACTIVE/TRIALING. This is the **commission/loyalty** notion (a client with a live subscription).

**Fit vs approved model:** The approved "active client that consumes capacity" = **AgencyTenant.status === ACTIVE** (current capacity semantics). INV-08 (inactive/revoked don't consume capacity) is already satisfied because REVOKED is excluded from capacity count. The approved "active client subscription that earns commission" = a live BillingSubscription on an ACTIVE AgencyTenant — which the loyalty definition already models. **No change needed to the state model.** Gap: `getPartnerRevenueSummary` (`runtime.ts:343-345`) uses a relation filter that crashes on Postgres (RCCF-73.1-F1) — the revenue section 500s; unrelated to capacity but blocks revenue visibility.

---

## 10. Capacity Architecture (Phase 7)

### Current
- `max_clients` comes from the **capability registry** (`plans.ts` featureOverrides) → `capabilityService.limit(planCode, "max_clients")`:
  - `partner_free`: 1 (registry) but `partner-relationship.ts` overrides to **trial ? 1 : 0** (trial-only).
  - `partner_solo`: 5
  - `partner_growth`: **0** (no override → `BASE_FEATURES.max_clients = DISABLED` = 0) — RCCF-73.1-F3.
  - `partner_scale`: 15
  - `partner_enterprise`: -1 (unlimited)
- `AgencyCapacityAddon` ACTIVE rows summed (`partner-relationship.ts:81-87`) → `effectiveLimit = included + addons` (or -1 unlimited). **The additive model matches the approved `effective_capacity = included + purchased` exactly.**
- Atomic enforcement: `linkCreator` `SELECT FOR UPDATE` + count ACTIVE (`partner-relationship.ts:146-173`). Verified atomic.

### Fit vs approved
| Tier | Approved | Current | Gap |
|---|---|---|---|
| Free | 3 | 1 (trial) / 0 (after) | +3, and remove trial-only clamp |
| Solo | 8 | 5 | +8 |
| Agency | 15 | growth=0 / scale=15 | need `partner_agency`=15 |
| Overage | ₹2,000/client | ₹1,499/client (`agency-addons.ts:8`) | ₹2,000 + payment gate |

- The **additive capacity model is already exactly right** (`included + ACTIVE addon quantity`). The add-on shape (quantity, unitPrice, idempotency key, non-destructive cancel) is reusable.
- **Where ₹1,499 is defined:** `src/config/commerce/agency-addons.ts:8` (`PARTNER_ADDON_UNIT_PRICE_INR = 1499`), consumed by `addAgencyCapacityAction` (`partner.actions.ts:256,266`) and the billing UI (`agency/billing/page.tsx:10,89`). Changing to ₹2,000 is a one-line constant change + any persisted `AgencyCapacityAddon.unitPriceInr` rows (currently none active) — **not modified here.**

---

## 11. Capacity Add-on Architecture (Phase 8)

**Conceptual fit:** The approved model ("Partner Subscription + Capacity Add-on Quantity = Effective Client Capacity", **not** "upgrade to another plan") is **exactly** how `AgencyCapacityAddon` already works. `resolvePartnerEffectiveCapacity` sums addons over the included limit — it does **not** switch plans. This is a strong architectural fit for the overage model.

**Critical divergence — no payment:** `addAgencyCapacityAction` (`partner.actions.ts:244-278`) creates an ACTIVE `AgencyCapacityAddon` with a plain `upsert` keyed on `(agencyId, idempotencyKey)`. There is **no Razorpay checkout, no webhook, no invoice, no payment-confirmation gate**. This violates the approved flow:
```
included exhausted → create client denied → buy capacity → ₹2,000 payment → confirmed → capacity granted
```
Currently the capacity is granted **before/without** payment, and `linkCreator` will honor the inflated effective limit immediately. **This is the biggest billing-boundary gap** (INV-09, INV-10, INV-12, INV-18 all affected). It must be re-wired to go through `createCheckout → Razorpay → webhook → invoice → then mark the addon ACTIVE` (a paid-capacity entitlement), analogous to how a subscription is activated.

**Idempotency:** `(agencyId, idempotencyKey)` unique is good (prevents duplicate addons). **Cancel:** non-destructive ACTIVE→CANCELLED (historical preserved) — good. **Refund:** none wired for addons (would need to follow the `handleRefund` pattern). **Persistence:** row exists; no checkout/invoice linkage.

---

## 12. Checkout / Razorpay (Phase 8 continued)

- `billingService.createCheckout` → `RazorpayProvider.createCheckout` (razorpay.ts) → Razorpay subscription (if `razorpayPlanId`) or one-time order. `razorpayPlanId` resolved DB-authoritative → registry fallback.
- Partner plan change: `changeAgencyPlanAction` → `billingService.changePlan` (partner.actions.ts:212-236). This path creates a **real** Razorpay subscription for the **Partner**.
- Creator plan change (client): `changePlanAction` (billing.actions.ts:79) → `billingService.changePlan` — available to a client after they claim and own their workspace. **This is the existing "client pays" mechanism.**
- **Overage checkout:** there is **no** checkout path for `AgencyCapacityAddon` today. The add-on is created directly. A ₹2,000 "buy 1 capacity" checkout would need a new checkout flow (either a Razorpay one-time order or a subscription add-on line), wired to the existing webhook → invoice → capacity-grant path. **Not implemented.**

---

## 13. Webhooks

- Route: `api/webhooks/razorpay/route.ts`. Signature-verified (HMAC-SHA256 + timingSafeEqual), rate-limited.
- **Idempotency:** `buildRazorpayIdempotencyKey` collapses multi-event payments on the payment id; `BillingEvent.idempotencyKey` unique; route dedups (`route.ts:81-82`). Prevents double invoice/commission (INV-19 partially — for subscriptions). **Replay-safe for subscriptions.**
- **Refund:** `refund.processed` → `handleRefund` (idempotent, overflow-protected). Good.
- **Capacity add-on webhook:** **none exists.** A paid capacity purchase would need webhook handling to flip the addon ACTIVE after payment (INV-19 gap for capacity).
- **Partial-failure reconciliation:** `reconcileFailedPayment` repairs a captured-but-uncommitted invoice+commission (RECONCILIATION_REQUIRED). Reusable pattern for capacity reconciliation.

---

## 14. Plan Registry (Phase 9)

Canonical registry: `src/config/commerce/plans.ts` (`COMMERCE_PLANS`) → `lib/capabilities` derived map (`plans.ts`), seeded to DB `BillingPlan` via `catalog-seed.ts`.

Current partner codes: `partner_free` (₹0, trial), `partner_solo` (₹4,999 reg / ₹2,999 DB), `partner_growth` (₹4,999, **hidden**), `partner_scale` (₹7,999), `partner_enterprise` (manual). Legacy aliases (`LEGACY_TO_CANONICAL`): `agency_free→partner_free`, `agency_studio→partner_solo`, `agency_agency→partner_growth`, `agency_growth→partner_scale`, `agency_starter→partner_solo`.

**The approved model needs exactly three public tiers: `partner_free`, `partner_solo`, `partner_agency`.** Recommendation options:

- **Option A — rename `partner_growth` → `partner_agency`** and set price ₹14,999, max_clients=15. `partner_growth` is hidden, legacy, and has **1 existing DB subscription** (verified). Renaming would orphan that subscription's `planId` resolution (its `BillingPlan.code` would change), break `agency_agency→partner_growth` alias, and any historical marketing/tests. **Risky for the one existing subscriber and for backward-compat.**
- **Option B (recommended) — add a NEW canonical `partner_agency` code** (₹14,999, max_clients=15, family partner) and **deprecate/grandfather `partner_growth`** (keep the code row for the existing subscriber, mark DEPRECATED, leave `max_clients` broken-but-hidden or fix it). Keep `partner_scale` as-is or map it (scale is ₹7,999/15 clients — closest to Solo-with-more). This is the smallest safe change: existing subscriptions keep resolving, no legacy alias break, no historical data migration.

**Evidence for B:** `partner_growth` has a live DB subscription (1), is hidden, and its `max_clients=0` is a known defect (F3). A rename is a data migration on a billing table — against the "no data loss / no migration" discipline. A new code + grandfathered legacy is additive and safe. **Do NOT change the registry in this ticket** — this is a recommendation with evidence.

Also note: the approved "Agency" tier at ₹14,999 happens to equal the current **enterprise** price in the registry (₹14,999) — but enterprise is manual/hidden; `partner_agency` should be a self-serve checkout tier distinct from `partner_enterprise`.

---

## 15. Pricing Authorities (Phase 10)

Every price authority found, with divergences:

| Price | Registry (`plans.ts`) | DB `BillingPlan` (runtime) | Marketing/tests | Approved | Divergence |
|---|---|---|---|---|---|
| partner_free | 0 | 0 (ACTIVE) | 0 | ₹0 | ✓ none |
| partner_solo | ₹4,999 | **₹2,999** | ₹4,999 (RCCF-60 test, /pricing meta) | ₹7,999 | **F4 + model gap** |
| partner_growth | ₹4,999 (hidden) | ₹4,999 | — | (→ agency ₹14,999) | legacy |
| partner_scale | ₹7,999 | ₹7,999 | ₹7,999 | — | not in approved set |
| partner_enterprise | ₹14,999 | **₹0** | manual | OUT OF SCOPE | F13 |
| overage | ₹1,499 (`agency-addons.ts:8`) | — | ₹1,499 UI | ₹2,000 | **model gap** |

- The **DB `BillingPlan.price` is the runtime authority** (`service.ts:26-27`, `pricing/runtime.ts`), so checkout currently charges ₹2,999 for solo while marketing shows ₹4,999. The approved ₹7,999 is not represented anywhere.
- No `partner_agency` price exists. No ₹2,000 overage price exists (the addon constant is ₹1,499).
- `rccf60-partner-pricing-truth.test.ts` hardcodes ₹4,999/₹7,999/₹14,999 and client limits 1/5/15 — all of which **contradict the approved model** (₹7,999 solo, 3/8/15). These tests would need updating as part of an implementation ticket (per this ticket's mode, NOT modified here).

---

## 16. Security / Billing Boundaries (Phase 11)

Verified server-side boundaries:
- **Client provisioning** is AGENCY_ADMIN-only (`partner.actions.ts:30-32`); staff rejected with zero side effects.
- **Capacity enforcement** is server + DB-atomic (`linkCreator` SELECT FOR UPDATE) — a client cannot exceed `effectiveLimit` even by direct call. No over-capacity provisioning possible at the current limit values.
- **Cross-agency isolation:** `assertAgencyOwnsTenant`, membership checks; agencyId always session-derived. No cross-agency capacity/commission leakage.
- **Commission attribution:** server-derived from `AgencyTenant` via workspace→tenant→agency; never client-supplied.
- **IDOR:** client reads blocked (RCCF-73.1 §15 verified).

**Gaps / risks to close during implementation:**
- **Unpaid capacity:** `addAgencyCapacityAction` grants ACTIVE addon with no payment → an agency could inflate `effectiveLimit` and provision clients without paying ₹2,000. **This is the primary billing-boundary risk.** Must be re-wired to payment-confirmed-grant.
- **Unpaid client subscriptions:** provisioned clients currently get no subscription at all; the inverse risk is that an implementation naively creates an ACTIVE free subscription → unlimited publish / free client (INV-15). Any fix must create a real paid/trial Creator subscription, never an implicit unlimited one.
- **Commission on Free:** no per-plan commission gate today → a Free agency with a client subscription would earn the default rate. Must add the Free=0% gate.
- **No cross-agency leakage found.** Good.

---

## 17. Idempotency / Failure Analysis (Phase 12)

| Step | Retry | Duplicate request | Webhook replay | Partial failure | Timeout | Rollback | Orphan |
|---|---|---|---|---|---|---|---|
| Provision client | re-run idempotent? `linkCreator` upsert by tenantId; but each run creates a NEW tenant (no idempotency key on provisioning) → **duplicate tenants on retry** | no idempotency key → **duplicate tenant/workspace risk** | n/a | if linkCreator fails after tenant created → **orphan tenant** (RCCF-73.1 noted capacity denial prevents orphan, but a mid-flow failure after tenant create but before link can orphan) | possible | provisioning transaction covers tenant/workspace/membership; post-tx publish/link are separate | orphan tenant possible |
| Payment (subscription) | webhook idempotent by payment id | deduped | **safe** (INV-19 for subs) | invoice+commission in ONE tx, reconciliation repair | RECONCILIATION_REQUIRED path | rollback | — |
| Capacity add-on | idempotent by (agencyId, key) | deduped by unique | **no webhook exists** | N/A (no payment) | — | — | — |
| Commission | per-invoice check + webhook key | deduped | **safe** | tx with invoice | — | rollback | — |

**Gaps:**
- Provisioning is **not idempotent** (no idempotency key) → duplicate tenant on retry; partial failure can orphan a tenant before `linkCreator`. Existing `CreatorProvisionRun`/state machine helps observability but doesn't dedupe.
- Capacity add-on has **no payment** and therefore **no webhook/replay story** — must be added.
- Subscription + commission + capacity: subscription replay safe; capacity replay must be added.

---

## 18. RCCF-73.1-F2 Root Cause (confirmed)

**Root cause:** `provisioning-service.ts:284` calls `billingRepository.linkSubscriptionToWorkspace` which only backfills a workspace onto a **pre-existing** unlinked subscription. Agency provisioning never creates a BillingAccount/BillingSubscription for the client, so the call is a silent no-op and the client workspace ends with no `BillingSubscription`. The selected Creator plan lives only in a `Setting` (`onboarding_source`), which `resolveActivePlan` never reads.

This causes all downstream symptoms (phantom Launch, unlimited publish, no client revenue, no commission). **Verified independently of RCCF-73.1** via source trace and live-DB state (2 active AgencyTenant links, 0 commission entries).

---

## 19. Architecture Fit / Mismatch

| Approved element | Fit | Detail |
|---|---|---|
| Partner plan ≠ Creator plan | ✅ FIT | `BillingPlan.family` creator/partner + separate subscriptions; INV-13/INV-14 satisfied |
| Creator subscription per client | ❌ BLOCKED | F2 — no subscription created |
| Commission off active client subscription | ✅ FIT | runtime already subscription-driven (INV-16) |
| Active-client capacity (REVOKED excluded) | ✅ FIT | capacity counts ACTIVE links only (INV-08) |
| Additive capacity (included + purchased) | ✅ FIT | `effectiveLimit = included + addons` |
| Overage payment-gated ₹2,000 | ❌ MISMATCH | addon is ₹1,499, no payment gate |
| Free=3 / Solo=8 / Agency=15 | ❌ MISMATCH | 1(trial)/5/0/15 |
| `partner_agency` tier | ❌ MISSING | only `partner_growth`/`partner_scale` |
| Free = 0% commission | ❌ POLICY GAP | no plan-level commission gate |
| Enterprise out of scope | ✅ | separate, manual |

---

## 20. Required Implementation Changes (recommended, NOT executed)

Smallest safe sequence (as separate RCCF tickets, all respecting the "no silent/unpaid entitlement" discipline):

1. **RCCF-73.x — Fix F2 (create a real Creator `BillingSubscription` during provisioning).** Persist the selected Creator plan (≥ Grow) as a `BillingSubscription` on the client workspace with a **truthful status** (e.g. TRIALING with trialEndsAt, or a pre-payment DRAFT state), so entitlements + publish quota resolve correctly and the client has a real subscription to pay/keep. Must NOT create an implicit ACTIVE/free unlimited subscription (INV-04, INV-13, INV-15).
2. **RCCF-73.x — Resolve `partner_growth` → `partner_agency` and set capacities 3/8/15** (registry + runtime override + remove Free trial-only clamp to "3 ACTIVE"). Handle the existing `partner_growth` subscriber via grandfathering (new `partner_agency` code, deprecate growth).
3. **RCCF-73.x — Re-wire capacity overage to a payment-confirmed ₹2,000 purchase** (checkout → Razorpay → webhook → invoice → then ACTIVE addon). Update `PARTNER_ADDON_UNIT_PRICE_INR` → 2000.
4. **RCCF-73.x — Add a plan-level commission gate** so `partner_free` = 0% and Solo/Agency = existing rate (via a `CommissionRule` or code check). Do not change percentages.
5. **RCCF-73.x — Fix `getPartnerRevenueSummary` relation query (F1)** to restore the revenue dashboard.
6. **RCCF-73.x — Reconcile pricing authorities** (DB solo price ₹2,999 → approved ₹7,999; add agency ₹14,999; add ₹2,000 overage; fix enterprise ₹0) + update pricing-truth tests.
7. **RCCF-73.x — Add provisioning idempotency** (idempotency key) to prevent duplicate tenants/orphans.

---

## 21. Product Decisions Required

**A. Already established by current architecture:**
- Who pays for the Creator client subscription → **the client pays, after claiming the invitation, through their own Creator billing surface** (`changePlanAction`/`getBillingDashboard`, billing.actions.ts). Established by `implementation-42-report.md` / `implementation-43-report.md` ("creators pay CreatorStore directly") and the Creator billing dashboard existing for tenant users. **NOT a new decision.**
- Partner plan ≠ Creator plan (INV-13/14). Established.
- Active-client capacity = ACTIVE AgencyTenant (INV-08). Established.
- Commission = existing configured rate, off active creator subscriptions (INV-06/07/16). Established.

**B. Established by this new Partner commercial policy:**
- Free = 3 active clients; Solo = 8; Agency = 15; ₹2,000/client overage; Free = 0% commission. These are the policy inputs for implementation.

**C. Requires implementation (see §20).**

**D. Requires product decision (NOT silently resolved):**
- **D1 — Trial semantics for a provisioned client.** When a client is provisioned with a real Creator subscription, is it TRIALING (15-day) with the client expected to pay after, or ACTIVE-requires-immediate-payment, or a pre-payment DRAFT that blocks publishing until paid? (RCCF-73.1 §29 flagged "requires product policy on who pays/trials".) The who-pays is settled; **the trial/when-does-publishing-unlock question is NOT**.
- **D2 — What happens to the existing `partner_growth` subscriber** on migration to `partner_agency` (grandfather at old price/limits vs migrate). Option B (new code) minimizes this but still needs a stated policy.
- **D3 — Post-trial `partner_free`:** the approved model says Free = 3 ACTIVE clients (no trial-lock), but current code locks Free to platform-locked after trial (`access-lock.ts`). Decide whether Free is a permanent ₹0 3-client tier or a trial that must convert. **The approved model implies permanent Free = 3 — this changes current behavior.**
- **D4 — Overage billing form:** per-client one-time purchase vs recurring ₹2,000/mo per additional client. The approved text "costs ₹2,000 per client" and "purchased capacity" + "payment confirmed" is ambiguous between one-time and recurring. Current `AgencyCapacityAddon` is **recurring** (₹/month). **Decision needed.**

---

## 22. Recommended Ticket Sequence

1. **RCCF-73.3** — Fix F2: persist a real Creator `BillingSubscription` during provisioning (client pays after claim; resolve D1 trial semantics). [P1, REVENUE, blocks everything]
2. **RCCF-73.x** — Plan registry: add `partner_agency` (₹14,999/15), set Free=3/Solo=8, grandfather `partner_growth`, remove Free trial-only clamp (resolve D3). [P1, REVENUE]
3. **RCCF-73.x** — Payment-gated ₹2,000 capacity overage via checkout/webhook (resolve D4), change addon price. [P1, BILLING BOUNDARY]
4. **RCCF-73.x** — Plan-level commission gate: Free=0%, Solo/Agency=existing rate. [P1, REVENUE]
5. **RCCF-73.2-p1?** — Fix `getPartnerRevenueSummary` (F1) to unblock revenue visibility. [P1, REVENUE]
6. **RCCF-73.x** — Reconcile all pricing authorities (solo ₹7,999, agency ₹14,999, overage ₹2,000, enterprise) + update pricing-truth tests. [P2, REVENUE]
7. **RCCF-73.x** — Provisioning idempotency + orphan prevention. [P2, RELIABILITY]

---

## 23. Acceptance Invariants

Written explicitly (to be enforced by implementation tickets; NOT enforced in this audit):

- **INV-01** Partner Free allows 3 ACTIVE clients.
- **INV-02** Partner Solo allows 8 ACTIVE clients.
- **INV-03** Partner Agency allows 15 ACTIVE clients.
- **INV-04** Every provisioned Creator client has a real Creator `BillingSubscription`.
- **INV-05** Partner Free clients generate platform revenue but 0 Partner commission.
- **INV-06** Partner Solo active client subscriptions are commission eligible.
- **INV-07** Partner Agency active client subscriptions are commission eligible.
- **INV-08** Inactive/revoked clients do not consume active-client capacity. (Already satisfied by current capacity semantics.)
- **INV-09** Exceeding included capacity does not automatically provision a client.
- **INV-10** Additional client capacity costs ₹2,000 per client.
- **INV-11** Purchased capacity is additive to included capacity. (Current model already additive.)
- **INV-12** Capacity purchase must be payment-confirmed before increasing effective capacity. (Currently violated.)
- **INV-13** Creator client entitlement is resolved from the Creator subscription, not the Partner subscription. (Structurally satisfied; blocked by F2.)
- **INV-14** Partner entitlement is resolved from the Partner subscription. (Satisfied.)
- **INV-15** No client can receive unlimited publishing because a `BillingSubscription` is missing. (Currently violated by F2 → `resolvePublishPolicy(null)` unlimited.)
- **INV-16** Commission requires a real eligible active Creator subscription and an active AgencyTenant relationship. (Runtime satisfies; blocked by F2.)
- **INV-17** Commission must be idempotent. (Satisfied by per-invoice check + webhook key.)
- **INV-18** Capacity purchase must be idempotent. (Addon upsert idempotent; payment path must be added.)
- **INV-19** Webhook replay must not duplicate subscription or capacity entitlements. (Subscription: satisfied; capacity: no webhook yet.)
- **INV-20** No cross-agency client, subscription, capacity, or commission leakage. (Satisfied, verified server-side.)

---

## 24. Final Verdict

**B — ARCHITECTURE FIT WITH IMPLEMENTATION GAPS**

The architecture already implements the correct conceptual separation (Partner plan vs Creator plan), the additive capacity model, the active-client capacity semantics, and a subscription-driven recurring-commission runtime that matches the approved model without any percentage changes. The approved commercial model is fully representable within the existing entity graph.

It is **blocked from monetizing the model** by RCCF-73.1-F2 (provisioned clients get no Creator `BillingSubscription`), and it **diverges** on three policy surfaces that require scoped implementation: (1) the missing/legacy `partner_agency` tier and wrong capacities (3/8/15), (2) the un-gated ₹1,499 capacity add-on (must be a payment-confirmed ₹2,000 purchase), and (3) the absent Free=0% commission gate. Four product decisions (trial semantics for provisioned clients, `partner_growth` subscriber handling, permanent-Free vs trial, overage billing form) must be resolved before implementation — none of them block the architectural fit.

**AUDIT ONLY — no code, DB, migration, billing, plan-registry, or commission logic modified; no tests changed; no commit.**
