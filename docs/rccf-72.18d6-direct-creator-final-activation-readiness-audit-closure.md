# RCCF-72.18D.6 — DIRECT_CREATOR Final Production-Readiness Audit — Closure

## 1. Verdict

# **C — NOT READY FOR ACTIVATION**

Zero P0 findings — the architecture's money correctness, tenant isolation,
credential safety, historical PaymentAccount binding, refund ledger, and
webhook integrity are all **proven** from source and 376 passing focused tests.
Two P1 gaps remain that make real-money activation unsafe today:

- **P1-1**: No completion path exists for a DIRECT_CREATOR (Payment Link) payment
  after the customer actually pays.
- **P1-2**: "Configured" credentials are format-validated only; no provider API
  verification exists, and the activation decision on that risk is undocumented.

Per rule §33: any remaining P1 ⇒ **C — NOT READY**. `DIRECT_CREATOR` stays
`status: "future"`.

This was a READ-ONLY audit: no source, schema, data, config, or registry file
was modified. The only artifact created is this document.

---

## 2. Executive Summary

DIRECT_CREATOR has been built to near-production quality across D.1–D.5.5:
server-authoritative checkout with double-gated strategy branching, encrypted
credential storage with honest verification semantics, binding-at-creation of
the historical PaymentAccount, an atomic ceiling-guarded refund ledger with
signed/idempotent webhooks, and canonical fulfillment state enforcement.
Every P0-class property the ticket lists was verified present.

What separates the platform from activation is narrow and well-defined:
payments taken through the creator's own Razorpay **Payment Links are never
reconciled into completed orders**, and credential readiness stops at format
validation without a documented provider-verification decision. Both are P1;
both have clear remediation paths (§27).

---

## 3. Current Architecture

```
COMMERCE_STRATEGY_REGISTRY (src/modules/commerce-strategy/application/registry.ts)
  PLATFORM_COLLECT  status:"active"   merchantOfRecord:platform   ← today's only live path
  DIRECT_CREATOR    status:"future"   merchantOfRecord:creator     ← audited here; UNCHANGED
  MARKETPLACE/HYBRID status:"reserved" (architecture-only)

resolveCommerceStrategy(tenantId): tenant Setting → workspace metadata →
platform default → PLATFORM_COLLECT. Request-cached; unknown ids rejected.
```

Registry inspected at source: `DIRECT_CREATOR.status === "future"`
(registry.ts:40). No writer anywhere mutates registry entries at runtime.

---

## 4. Full Payment Flow (audited boundary-by-boundary)

| Boundary | Source of truth | Authorization / tenant | Write | Idempotency | Failure behavior |
|---|---|---|---|---|---|
| Storefront CTA (`renderers.tsx`) | Product.commerceMode | n/a (public) | none | — | ONLINE→Buy Now; WHATSAPP→wa.me only; BOTH→both (tests pin all three) |
| Checkout entry (`createCheckout`) | server | rate-limit per IP; email validated | none yet | — | safe error returns |
| Tenant resolution | host/x-tenant-host → session (`resolveCheckoutTenantId`) | client can never supply tenant | none | request-cached | null tenant ⇒ "Product not found" |
| Product lookup | Prisma `findFirst({tenantId, isActive, PUBLISHED})` | product.tenantId === checkoutTenantId | none | — | zero side effects on miss |
| Strategy resolution | canonical runtime | n/a | none | react cache | future/reserved ⇒ branch refused (checkout.actions.ts:125, payment-account.actions.ts:91) |
| Readiness gate | `computePaymentReadiness` | server-side | none | cached | not-"ready" ⇒ checkout blocked |
| Amount | product.price → coupon/tax computed server-side | client supplies only productId/email/couponCode | — | — | free path (≤₹0) completes via canonical boundary |
| Razorpay order creation | platform keys (PLATFORM_COLLECT) or creator keys via adapter (DIRECT) | notes carry tenant/order/strategy ids | ProductOrder PENDING (+razorpayOrderId backfill) | receipt=dbOrder.id | provider errors → safe failure, orphaned PENDING order only |
| DIRECT_CREATOR order creation | creator account adapter | product-tenant-scoped | ProductOrder with `commerceStrategy`, `paymentAccountId=account.id`, `providerReference`, metadata | plink ref stored | **P1-1: no completion reconciliation exists** |

## 5. Full Refund Flow

`requestProductOrderRefund` (D.3): role matrix enforced (creator ADMIN/SUPER_ADMIN
only), tenant-scoped order lookup (foreign = indistinguishable NOT_FOUND/FORBIDDEN),
requires DIRECT_CREATOR + historical binding + captured payment + COMPLETED +
integer-paise amount ≤ remaining headroom; reservation is EXCLUSIVELY the atomic
conditional update `NONE/PARTIAL/FAILED → PENDING`; `refundAmount` never written
at initiation (D.5.1).

`executeProductOrderRefund` (D.4): re-validates fresh state inside the action;
resolves the HISTORICAL `order.paymentAccountId` row (never current-account
resolution); decrypts in memory; adapter refund; success → single ledger add
(PARTIAL/REFUNDED) inside a transaction with idempotency marker; failure →
status FAILED only, headroom released by construction.

## 6. Full Webhook Flow

HMAC-SHA256 over raw body + timingSafeEqual + length guard (401s); guarded JSON
parse (400); global event-family dedupe; subscription branch unchanged;
payment.captured completes product orders ONLY on exact paise match via the
canonical quota-metering boundary; refund.processed applies through the D.5.5
atomic cycle (in-tx re-read → clamp to fresh headroom → conditional increment on
exact base → status derived from applied totals → dedupe BillingEvent created
last so uniqueness failure rolls money back); refund.failed writes status only
and cannot downgrade settled states; sanitized X-Razorpay-Failure-Reason persists
to PENDING orders' providerMetadata only.

## 7. PaymentAccount Lifecycle & Onboarding

- Connect/save (`saveMyPaymentAccount` → `savePaymentAccount`): one row per
  tenant (`PaymentAccount.tenantId @unique`); `providerKeyId/providerKeySecret/
  bankAccountNumber` encrypted at rest; key input flips status→active,
  verification→pending; audited + event-emitted.
- View: serialization exposes booleans only (`hasProviderKeys`,
  `hasBankAccountNumber`) — plaintext credentials are never returned, listed in
  UI, or logged. Creator cannot view secrets after saving (by construction).
- Verify (`verifyPaymentAccount`): adapter format check → writes `configured`,
  explicitly NEVER `verified`; returns honest copy: "Credentials format
  validated. Provider-side verification is not available for Direct Creator
  mode yet." (**P1-2 evidence**).
- Disconnect: status flipped, row retained (historical bindings stay resolvable).
- Replace: overwrites credentials IN PLACE on the same row. Historical orders
  bind to the row id, so post-switch refunds use NEW credentials against OLD
  payments → they FAIL SAFELY at the provider (wrong-merchant movement
  impossible; no ledger corruption). Classified P2 (operational constraint),
  see §22.

## 8. Historical Binding Proof

1. Creation: `createDirectCheckout` writes `paymentAccountId: account!.id` in the
   same create as the order (payment-account.actions.ts:126); PLATFORM_COLLECT
   intentionally binds nothing (platform refunds don't need it).
2. Refund initiation reads nothing but `order.paymentAccountId`.
3. Refund execution resolves THAT row and no other (D.5.1 Scenario 20 test pins
   that a newer same-tenant account is ignored and decrypted bound-row keys are
   used).
4. Webhook reconciliation needs no account at all (payment-id identity only).
Conclusion: the §6 scenario (pay on A, switch, refund) resolves to "refund uses
A's binding; if A's credentials were replaced it fails safely rather than paying
B" — **proven**, with the operational caveat classified P2.

## 9. Tenant Isolation Proof

Checkout tenant derived from host/session only; foreign-product checkout yields
zero side effects; order detail/refund/fulfillment actions scope every lookup by
session tenant (foreign ids indistinguishable from missing — pinned across
D.5.2-A/C/D suites); webhook trusts no wire-supplied identity; SUPER_ADMIN
cross-tenant is explicit and intentional. 376/376 focused tests green include
every foreign-tenant denial case.

## 10. Authorization Matrix (derived from role-guards.ts + tests)

| Actor | Own order read | Foreign order read | Refund initiate/execute | Fulfillment mutate | PaymentAccount manage |
|---|---|---|---|---|---|
| Anonymous | DENY | DENY | DENY | DENY | DENY |
| ADMIN | ALLOW | DENY (NOT_FOUND) | ALLOW (own tenant) | ALLOW (own tenant) | ALLOW (own tenant) |
| SUPER_ADMIN | ALLOW | ALLOW (intentional) | ALLOW | ALLOW | own tenant only (no tenant ⇒ denied) |
| AGENCY_ADMIN | DENY | DENY | DENY | DENY | DENY |
| AGENCY_STAFF | DENY | DENY | DENY | DENY | DENY |
| SUPPORT | DENY | DENY | DENY | DENY | DENY |
| READ_ONLY | DENY | DENY | DENY | DENY | DENY |

No mismatch found between code and tests.

## 11–13. Fulfillment / Digital / Physical / WhatsApp Audit

- **Fulfillment machine** (strategies.ts): pending→preparing/packed/shipped;
  shipped→delivered/returned; delivered→returned/completed; terminal states
  closed. Server-enforced via `canTransition` + conditional-write concurrency
  guard with post-write refetch (D.5.2-C); UI renders candidates only.
- **Physical**: address captured customer-side (ownership-proofed write),
  physical-only projection, tracking optional (documented semantics), timeline
  server-derived. Inventory: `requiresInventory` declared in the type registry
  but NO quantity field, decrement, or oversell guard exists anywhere — **S-6
  open, P2**.
- **Digital**: signed expiring token downloads with count limits work; the
  download path has ZERO refund-awareness (`rg` of the runtime shows no
  refundStatus/refundAmount reference) — **S-3 open, P2** (policy decision
  required; bounded by expiry/count; not money corruption).
- **WhatsApp**: commerceMode CTA only; renderer tests pin wa.me-only behavior
  with no BuyNowButton → no checkout → no ProductOrder; preview inert; BOTH
  mode intentional dual exposure. No bypass, no false accounting. CLEAN.

## 14–16. Revenue/Analytics · Pagination · Agency Boundary

- All remaining `"PAID"` literals belong to Invoice/Settlement/Payout domains
  (legitimate). Five ProductOrder consumers still query
  `status: {in:["PAID","COMPLETED"]}` (analytics/constants, dashboard/service,
  creator-success, goals-runtime, platform health engine) — dead predicate half:
  PAID is unwritable, so counts equal COMPLETED exactly. **P3 cosmetic.**
- Refunds net correctly (actual-paise ledger); ₹0 orders complete without
  Razorpay and consume quota (intended, guarded); PLATFORM vs DIRECT revenue
  separation holds (strategy-gated flows; commission path untouched).
- S-7 (search-inside-WHERE pagination) and S-8/O-6 (groupBy analytics) fixed and
  pinned in the D.5.2-A suite.
- Agency: agency roles are hard-denied at every creator-commerce mutation
  boundary; ProductOrder.agencyId exists for PLATFORM attribution only;
  DIRECT_CREATOR routing keys off the product's OWN tenant — an agency-managed
  creator's store resolves that creator's tenant/account, never an agency or
  platform account. No leakage path found.

## 17. Database / Transaction Safety

Unique constraints carry the concurrency load: OrderFulfillment.orderId,
ShippingAddress.orderId, ProductOrder.razorpayOrderId, BillingEvent.idempotencyKey,
PaymentAccount.tenantId. Money paths use conditional updates/increments inside
transactions (quota reservation, refund apply-cycle, D.3 status reservation);
no stale-read absolute financial write remains (D.5.5 closed the last one).
Fulfillment mutations predicate-guarded. Cascades correct
(ProductOrder→Fulfillment/ShippingAddress).

## 18. Production Environment & Webhook Ops

Required names (values never inspected): DATABASE_URL/DIRECT_URL, NEXTAUTH_*,
TOKEN_ENCRYPTION_KEY (credential encryption dependency), RAZORPAY_KEY_ID/
RAZORPAY_KEY_SECRET (platform), NEXT_PUBLIC_RAZORPAY_KEY_ID (browser widget),
RAZORPAY_WEBHOOK_SECRET (webhook route fails closed 500 without it).
**Gap: `.env.example` does not list RAZORPAY_WEBHOOK_SECRET or
NEXT_PUBLIC_RAZORPAY_KEY_ID** (P2). Pre-activation operator checklist: configure
webhook endpoint (raw-body preserving) subscribed to payment.captured,
payment.failed, refund.processed, refund.failed, order.paid; set secret; rely on
provider retries + route idempotency for duplicate/out-of-order deliveries
(verified); malformed-but-signed payloads answer 400 without mutation.

## 19. Failure Matrix

| Failure | Expected | Actual | Severity |
|---|---|---|---|
| Invalid creator credentials | checkout blocked | blocked (readiness gate + adapter) | OK |
| Provider unavailable at checkout | safe failure | safe error; orphan PENDING only | OK (P3 note: orphan cleanup absent) |
| Captured but webhook delayed | reconciles eventually | verifyPayment client path + webhook both complete w/ amount check | OK |
| Duplicate payment webhook | idempotent | event-family dedupe + COMPLETED short-circuit | OK |
| Refund provider failure | FAILED + retryable | FAILED only; headroom intact | OK |
| Duplicate refund webhook | no double refund | unique-key gate + in-tx rollback | OK |
| Concurrent refunds | no lost update | atomic cycle (D.5.5 tests) | OK |
| Account switched post-payment | historical stays bound | binds row; replaced creds fail safely | OK (P2 constraint) |
| Cross-tenant order/account | denied | pinned by tests | OK |
| Agency access | denied | hard-denied | OK |
| Fulfillment race | one transition | conditional write + refetch | OK |
| Malformed signed webhook | 400 no mutation | implemented (D.5.5) | OK |
| Invalid signature | 401 no mutation | implemented | OK |
| **DIRECT_CREATOR customer pays** | **order completes** | **NO PATH — stays PENDING forever (P1-1)** | **P1** |
| **Unverified-but-formatted keys activated** | provider acceptance known | unknown until first real payment (P1-2) | **P1** |

## 20. Test Evidence (run this audit, read-only)

tsc PASS · lint PASS (touched-file scan) · prisma validate PASS · git diff --check PASS ·
build PASS (160/160 routes incl. sitemap) ·
**12 money-chain suites: 376/376 green**
(D.3 initiation, D.4 execution, D.5.1 ledger+signed webhooks, D.5.5 hardening,
D.5.2-A truth layer, B drawer, C controls ×2, D projection+UI ×2, commerce-strategy,
fulfillment strategies). RCCF-71.4.5 zero-amount/webhook-guard coverage present
as protected in-flight suite. No test exposed a new bug requiring the hard stop.

## 21–25. Findings Register

### P0 — none found.

Credential safety, tenant isolation, historical binding, ledger arithmetic,
amount authority, webhook authenticity, and authorization were each proven from
source plus tests. Nothing moved money twice, cross tenants, exposed secrets, or
exceeded ceilings in any traced scenario.

### P1 (must fix before activation)

| ID | Finding | Evidence | Recommended RCCF |
|---|---|---|---|
| P1-1 | DIRECT_CREATOR Payment Link payments never reconcile: orders created with `razorpayOrderId = plink reference` and the payment.captured handler requires `notes.orderId/productId`, which Payment Links do not carry — a successful customer payment leaves the order PENDING permanently. Known since RCCF-69.2 comment. | checkout.actions.ts:118-132; payment-account.actions.ts:113-128; route.ts payment.captured block | **D.6.1** Payment Link lifecycle reconciliation + signed E2E |
| P1-2 | Activation would go live on format-validated-only credentials; no provider API verification exists and no documented accepted-risk decision. | verifyPaymentAccount ("configured", never "verified"); computePaymentReadiness comment | **D.6.2** Verification implementation OR explicit super-admin accepted-risk gate with audit trail |

### P2 (should fix soon)

| ID | Finding |
|---|---|
| P2-1 | One-row-per-tenant account model: replacing credentials re-points historical-order refunds to new keys; old-payment refunds fail safely but recovery is manual. Document constraint (or snapshot credentials per order) before scale. |
| P2-2 | S-3 digital downloads survive refunds (no revocation/policy). |
| P2-3 | S-6 inventory enforcement entirely absent (overselling possible). |
| P2-4 | `.env.example` missing RAZORPAY_WEBHOOK_SECRET + NEXT_PUBLIC_RAZORPAY_KEY_ID (ops misconfiguration risk; webhook fails closed). |
| P2-5 | Refund↔fulfillment policy formally undefined (deliberately deferred by C/D). |

### P3 (future)

verifyPayment non-timing-safe signature compare (client callback path; webhook
path IS timing-safe) · dead `["PAID","COMPLETED"]` predicate halves in five
read queries · failure-reason surfacing in creator UI · orphaned PENDING order
cleanup after failed checkouts.

---

## 26. Activation Decision

**DIRECT_CREATOR: CURRENT = future. RECOMMENDED = future (NOT READY — verdict C).**

Activation MUST NOT proceed until P1-1 and P1-2 close. Recommended sequence:

1. **RCCF-72.18D.6.1** — Payment Link reconciliation: map provider capture events
   (plink/reference identity) to ProductOrder completion through the existing
   canonical boundary; signed E2E coverage; duplicate/delayed delivery tests.
2. **RCCF-72.18D.6.2** — Credential verification decision: implement real
   provider API verification (e.g. orders.create / balance probe via stored
   keys) or an explicit, audited accepted-risk activation gate.
3. **RCCF-72.18D.6.3** — Config & hardening: document required env vars,
   timing-safe `verifyPayment` compare, ops runbook for webhook setup/retry.
4. **RCCF-72.18D.6.4** — S-3 / S-2 policy RCCFs (download revocation, inventory)
   — may run parallel to 1–3; blocking only for business sign-off.
5. **RCCF-72.18D.6.5** — Surgical activation RCCF: flip registry status with
   readiness metadata + guardrail updates, nothing else.

## 27. Protected Work Verification

Baseline (start): 402 working-tree entries; 70 modified files (1373+/607−);
index 32 files (7765+/86−). End state re-measured identical except ONE new
untracked artifact: this closure document. No source/schema/config/test file
modified; no git state-changing command issued (no add/reset/checkout/stash/
clean/commit/amend/push); fixtures, RCCF-70/71 work, dashboard/builder/theme/
publishing, and D.4–D.5.5 chain untouched.

## 28. Git

- Commit: NOT CREATED
- Push: NOT PERFORMED
- Staging: NOT TOUCHED (audit-only ticket; staging deliberately left exactly as inherited)
- `COMMERCE_STRATEGY_REGISTRY.DIRECT_CREATOR.status = "future"` (verified, unchanged)
