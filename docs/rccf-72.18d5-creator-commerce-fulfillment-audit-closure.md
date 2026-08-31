# RCCF-72.18D.5 — Creator Commerce Fulfillment & Order Management Audit

**Type:** AUDIT ONLY (no implementation)
**Scope:** ProductOrder lifecycle, OrderFulfillment, digital delivery, physical shipping, creator order dashboard, refunds (D.3/D.4 interaction), WhatsApp commerce, agency/SUPER_ADMIN boundaries, webhooks, notifications, performance, tests.
**DIRECT_CREATOR status:** `future` in `COMMERCE_STRATEGY_REGISTRY` (`src/modules/commerce-strategy/application/registry.ts`) — **unchanged, still disabled**.

---

## Verdict

## **B — Ready Except Defined Gaps**

The core loop — checkout → `ProductOrder PENDING` → payment verification → `COMPLETED` → auto-created fulfillment → physical ship/deliver OR digital tokenized download → customer portal — is implemented, tenant-isolated server-side, and idempotent at the order-completion and download boundaries.

It is **not yet a coherent end-to-end production workflow for DIRECT_CREATOR** because of one verified financial-accounting defect cluster in the refund path (P1), missing business rules between refunds and fulfillment/downloads, no refund UI, absent inventory enforcement, and the two explicitly deferred D.4 items still open. All are fixable without architectural change; none blocks the current PLATFORM_COLLECT storefront behavior.

DIRECT_CREATOR **must remain disabled** until the P1 cluster and activation-gate items below are resolved.

---

## Executive Summary

### What exists (verified)

| Area | Evidence |
|---|---|
| Order model with refund state machine + historical payment binding | `prisma/schema.prisma:506-545` — `ProductOrder.status`, `commerceStrategy`, `providerReference`, `paymentAccountId`, `refundStatus` (enum `NONE/PENDING/PARTIAL/REFUNDED/FAILED`, lines 46-52), `refundId`, `refundAmount` (paise), `refundedAt` |
| Post-payment fulfillment record | `prisma/schema.prisma:548-576` — `OrderFulfillment` with type/status/tracking/courier/shippedAt/deliveredAt/downloadToken/downloadExpiresAt/downloadLimit/downloadCount/timeline |
| Shipping address | `prisma/schema.prisma:579-599` — `ShippingAddress` 1:1 per order, tenant-scoped column |
| Strategy-driven fulfillment | `src/modules/fulfillment/application/strategies.ts` — explicit transition table; derived from canonical `PRODUCT_TYPE_REGISTRY` (`src/modules/product-types/index.ts`) |
| Idempotent order completion boundary | `src/modules/billing/application/order-completion.ts` — `completeProductOrder` used by client verify, webhook, and free-order paths; atomically reserves monthly order quota |
| Server-authoritative checkout | `src/actions/checkout.actions.ts:14-39` — tenant from host header/session, never client; product scoped to tenant+ACTIVE+PUBLISHED; rate-limited |
| Webhook completion with amount verification | `src/app/api/webhooks/razorpay/route.ts:145-187` — timing-safe HMAC, amount match required, idempotency guards |
| Refund initiation (D.3) | `src/actions/payment-account.actions.ts:150-265` — authz, tenant isolation, DIRECT_CREATOR-only, historical binding validation, cumulative ceiling, optimistic concurrency |
| Refund execution (D.4) | `src/actions/payment-account.actions.ts:292-479` — historical account, in-memory decrypt, provider call, PARTIAL/REFUNDED/FAILED transitions, BillingEvent idempotency |
| Secure digital delivery | `src/modules/fulfillment/application/runtime.ts:126-164` — 32-byte token, 7-day TTL, 5-download limit, count enforced on resolution; route `src/app/api/fulfillment/download/[token]/route.ts` |
| Creator fulfillment dashboard | `src/app/admin/orders/_components/fulfillment-section.tsx` — queue with filters, tracking+courier inputs, shipped/delivered/preparing/packed buttons, digital "Generate link", service accept/complete |
| Customer order portal | `src/app/purchase/[orderId]/page.tsx` + `shipping-form.tsx` + `download-card.tsx` — guest lookup by orderId + email proof |
| WhatsApp CTA layer | `src/lib/commerce/whatsapp.ts` — validated wa.me links, display-only price, no payment/order side effects; per-product `commerceMode ONLINE/WHATSAPP/BOTH` (`src/config/commerce/commerce-mode.ts`) |
| Fulfillment notifications | `src/modules/communication/application/event-wiring.ts:21-24` — fulfillment.created→order.confirmed, shipment.created/delivered→shipment.update, download.generated→download.ready (creator audience) |

### What works

- Tenant isolation is enforced server-side on every creator-facing action inspected (`requireTenant()`, `findFirst({ where: { id, tenantId } })`); the client-supplied tenant argument in `order.actions.ts` is deliberately ignored (`VALIDATION-01 V-036`).
- Physical fulfillment state transitions are guarded by an explicit transition table; illegal transitions are rejected.
- Digital delivery is tokenized, expiring, rate-limited by download count, and never exposes the file URL except through resolution.
- The customer portal requires ownership proof or exact buyer-email match before any read or mutation (RCCF-67.2 boundary).
- Agency roles are explicitly denied at the payment/refund boundary.

### What is missing / broken (headline)

1. **P1 — refund accounting has no release-on-failure semantics**, and webhook reconciliation double-counts reserved amounts (detailed below). Verified against code; no live exposure while DIRECT_CREATOR is disabled.
2. **No refund UI** — `requestProductOrderRefund` / `executeProductOrderRefund` have zero `.tsx` consumers; creators cannot operate refunds from the dashboard even though the backend exists.
3. **BUSINESS-RULE GAP** — no rules linking refunds to fulfillment states (shipped/delivered orders remain fulfillable; nothing cancels fulfillment on refund).
4. **POLICY GAP** — digital downloads are not revoked after a refund; `resolveDownloadToken` never checks refund state.
5. **Inventory absent** — `physical` declares `requiresInventory: true` but no quantity capture, no stock decrement; overselling is possible; fulfillment has no quantity field.
6. **Deferred D.4 items still open** — webhook-signature E2E suite; `X-Razorpay-Failure-Reason` parsing.
7. Notification coverage stops at fulfillment lifecycle — no events/rules for refund requested/completed/failed.

### Can a creator safely operate their own product orders today?

**For PLATFORM_COLLECT (the only active strategy): mostly yes** — see orders, filter fulfillment queue, mark preparing/packed/shipped/delivered with tracking, generate digital download links, customers self-serve address + downloads. Safe within audited paths.

**For DIRECT_CREATOR (when activated): not yet** — the refund ledger defects (P1) would misstate refund state under realistic failure sequences, and there is no dashboard surface to operate refunds at all.

---

## Architecture Map (actual repository components)

```
Customer
   │
   ▼
Storefront (LayoutEngine / renderers)
   │  commerceMode: ONLINE → BuyNowButton → createCheckout
   │  commerceMode: WHATSAPP → buildWaMeLink (CTA only, no order)
   │  commerceMode: BOTH     → both CTAs
   ▼
createCheckout                      src/actions/checkout.actions.ts
   │  resolveCheckoutTenantId()      host header / session — never client
   │  product scoped: tenantId+isActive+PUBLISHED+!archived
   │  resolveCommerceStrategy()      PLATFORM_COLLECT active | DIRECT_CREATOR future (dead branch)
   ▼
ProductOrder (PENDING)              prisma/schema.prisma:506
   │  razorpayOrderId ← platform Razorpay orders.create (notes carry tenantId/productId/orderId/fanEmail)
   ▼
Payment
   ├─ verifyPayment (client path)   HMAC + best-effort amount fetch
   └─ webhook payment.captured      timing-safe HMAC + exact amount match + idempotent
        │
        ▼
completeProductOrder                src/modules/billing/application/order-completion.ts
   │  PENDING → COMPLETED (atomic, quota-metered, razorpayPaymentId persisted)
   ▼
ensureFulfillment                   src/modules/fulfillment/application/runtime.ts:41
   │  COMPLETED-only, idempotent (orderId unique)
   │  strategy from PRODUCT_TYPE_REGISTRY:
   │    physical → pending (ship flow)
   │    digital/course → pending → ready (token flow)
   │    service/booking → pending (accept/confirm flow)
   ▼
Creator Dashboard                    src/app/admin/orders/page.tsx + fulfillment-section.tsx
   │  fetchOrders (tenant-forced) · getFulfillmentQueue · updateFulfillmentStatus
   │  generateDownloadLink · getOrderShippingAddress (order-tenant checked)
   ▼
Customer Portal                      src/app/purchase/[orderId]
   │  getCustomerOrder (owner-or-email proof) · submitShippingAddress · getOrderDownload
   ▼
Delivery
   ├─ Physical: pending → preparing → packed → shipped(tracking) → delivered
   └─ Digital:  generateDownload → /api/fulfillment/download/[token] → resolveDownloadToken

Refunds (DIRECT_CREATOR only, backend-only today)
   requestProductOrderRefund (D.3)  → PENDING, amount reserved
   executeProductOrderRefund (D.4)  → PARTIAL/REFUNDED/FAILED via historical PaymentAccount
   webhook refund.processed/.failed → reconciliation keyed on razorpayPaymentId  ⚠ P1 defects here
```

---

## Capability Matrix

| Capability | Status | Evidence | Risk |
|---|---|---|---|
| ProductOrder create (checkout) | IMPLEMENTED | checkout.actions.ts:70-243 | Low — tenant forced server-side |
| ProductOrder completion (idempotent, metered) | IMPLEMENTED | order-completion.ts:46-99 | Low |
| ProductOrder cancellation | MISSING | No code path writes a cancelled order status anywhere | Medium — stuck PENDING rows accumulate; no customer/creator cancel |
| Payment status visibility (creator list) | PARTIAL | fetchOrders returns raw `status`; UI shows it; but no distinction of paid vs fulfilled beyond COMPLETED | Low |
| Fulfillment auto-create post-payment | IMPLEMENTED | runtime.ts:41-66 wired from order-completion.ts | Low |
| Physical fulfillment states | IMPLEMENTED | strategies.ts STATUS map; updateFulfillment guards transitions | Low |
| Tracking number / courier entry | IMPLEMENTED | fulfillment-section.tsx:124-125 inputs → updateFulfillmentStatus | Low |
| Shipping date / delivery date | IMPLEMENTED | runtime.ts:90-91 sets shippedAt/deliveredAt automatically | Low |
| Shipping address capture (customer) | IMPLEMENTED | purchase/shipping-form.tsx → submitShippingAddress with access proof | Low |
| Shipping address view (creator) | PARTIAL | Action `getOrderShippingAddress` exists and is IDOR-safe (fulfillment.actions.ts:33-39) — but no consumer in fulfillment-section.tsx; creator cannot see the address in UI | **Medium — physical workflow incomplete without it** |
| Digital delivery (signed token) | IMPLEMENTED | runtime.ts:126-164; TTL 7d; limit 5 | Low |
| Download revocation after refund | MISSING | resolveDownloadToken checks expiry/count only — never refund state | **High policy risk at activation** |
| Refund initiation (backend) | IMPLEMENTED | payment-account.actions.ts:150-265 | Low (code) |
| Refund execution (backend) | IMPLEMENTED | payment-account.actions.ts:292-479 | Low (code) |
| Refund webhook reconciliation | UNSAFE (latent) | route.ts:227-277 — double-count + FAILED→PARTIAL miscalculation (see S-1) | **P1 at activation** |
| Refund dashboard UI | MISSING | Zero .tsx references to either refund action | High operational gap |
| Refund ↔ fulfillment interaction rules | MISSING (BUSINESS-RULE GAP) | Nothing couples refundStatus to fulfillment status; shipped/delivered orders remain fully refundable with no fulfillment consequence | Medium |
| Creator order detail view | PARTIAL | Orders page lists rows (product, amount, status, fanEmail, razorpayOrderId, date); no per-order drill-down combining order+fulfillment+address | Medium |
| Customer order visibility | IMPLEMENTED | /purchase/[orderId] with owner-or-email proof | Low |
| WhatsApp product CTA | IMPLEMENTED | whatsapp.ts; mode-validated in products/validators.ts:19-21 | Low |
| WhatsApp bypassing payments? | NOT PRESENT | WhatsApp path creates no order and processes no payment (whatsapp.ts header contract) | None found |
| Notifications: order placed | MISSING | No rule maps any pre-fulfillment order event to communication | Low (not contractual) |
| Notifications: shipped/delivered/download ready | IMPLEMENTED | event-wiring.ts:21-24 | Low |
| Notifications: refunds (requested/completed/failed) | MISSING | No refund.* rules in event-wiring.ts | Medium |
| Webhook signature verification | IMPLEMENTED | route.ts:61-68 timing-safe compare | Low |
| Webhook E2E test (deferred from D.4) | STILL OPEN | No e2e spec exercises signed webhook delivery for product orders | Medium |
| X-Razorpay-Failure-Reason parsing (deferred from D.4) | STILL OPEN | route.ts refund.failed branch ignores failure reason entirely | Low-Medium |
| Inventory / quantity | MISSING | No quantity field on ProductOrder/OrderFulfillment; `requiresInventory:true` flag unconsumed | Medium (oversell) |
| Agency access to creator orders/refunds | DENIED (verified) | requireCreatorOrSuperAdmin denies AGENCY_* (payment-account.actions.ts:24-27); requireTenant fails for agency-only sessions | Low |
| SUPER_ADMIN cross-tenant ops | INTENTIONAL BYPASS | isSuper skips tenant match in refund paths; getFulfillmentOpsData/getFulfillmentHealth super-admin only | Documented, acceptable |

### Creator capability checklist (from ticket §3)

| Can the creator… | Classification |
|---|---|
| See orders | IMPLEMENTED (list, take 200, tenant-forced) |
| See order details | PARTIAL (flat row; no drill-down page) |
| See customer details | IMPLEMENTED (fanEmail in row) |
| See purchased product / quantity / amount | PRODUCT yes · AMOUNT yes · QUANTITY N/A (not captured) |
| See payment status | IMPLEMENTED (raw order status) |
| See fulfillment status | IMPLEMENTED (queue with status labels) |
| See shipping address | PARTIAL — safe action exists, no UI surface |
| Enter tracking number / courier | IMPLEMENTED |
| Mark shipped / delivered | IMPLEMENTED (transition-guarded) |
| Initiate refund | MISSING (UI) — backend implemented |
| See refund status | MISSING (not surfaced in orders list payload) |
| Contact customer | PARTIAL — fanEmail visible; WhatsApp destination exists for storefront, not for order follow-up |
| Use WhatsApp | IMPLEMENTED as storefront sales CTA; N/A for order ops |

---

## Security Findings

Priorities: P0 blocker · P1 must fix before DIRECT_CREATOR activation · P2 should fix · P3 hygiene.

### S-1 — Refund webhook reconciliation double-counts reserved amounts and can mark FAILED refunds as PARTIAL

- **Severity:** P1 (financial-ledger correctness; latent while DIRECT_CREATOR disabled — no live orders can currently carry `commerceStrategy === "DIRECT_CREATOR"`)
- **Confidence:** HIGH (pure code-path reasoning; each step quoted)
- **Evidence chain:**
  1. D.3 reserves then persists: `refundAmount = cumulative + requested` with status `PENDING` — payment-account.actions.ts:236-238.
  2. D.4 provider rejection keeps the reservation: `data: { refundStatus: "FAILED", refundAmount: order.refundAmount }` — payment-account.actions.ts:425-428 (same at 411-414 for thrown errors). `refundId` remains null.
  3. Webhook adds provider amount on top of the stored reservation: `const newRefundAmount = (productOrder.refundAmount ?? 0) + refundAmountPaise;` — route.ts:241. Gate is only `!productOrder.refundId` (route.ts:229), which is true after every FAILED execution.
  4. Final status is computed from amount math alone: route.ts:245-246 — `finalStatus = finalAmount >= original ? "REFUNDED" : finalAmount > 0 ? "PARTIAL" : newRefundStatus`. For a `refund.failed` event carrying `amount > 0` (normal), `finalAmount > 0` always holds ⇒ **FAILED branch unreachable**; order becomes `PARTIAL` with inflated `refundAmount`.
- **Impact:** After activation, any failed-then-webhooked refund records money returned that wasn't, permanently consuming refund headroom; dashboards/analytics overstate refunds.
- **Effort:** M (webhook handler needs to reconcile against the synchronous state machine instead of blind accumulation).
- **Fix sketch:** In the webhook branch: load order including `refundStatus`; if event is `refund.failed` → set `FAILED` (optionally release reservation, see S-2) and do not add amounts; if `refund.processed` and `refundStatus === "PENDING"` → finalize using the already-reserved amount rather than adding again; keep BillingEvent idempotency key as-is.

### S-2 — Reserved refund amount is never released on failure (headroom leak)

- **Severity:** P1 (same activation gate as S-1)
- **Confidence:** HIGH
- **Evidence:** D.3 optimistic lock permits re-initiation from `FAILED` (`refundStatus: { in: ["NONE", "PARTIAL", "FAILED"] }` — payment-account.actions.ts:233) but computes remaining headroom from the stored reservation: `remaining = original - (refundAmount ?? 0)` (214-219). Since FAILED retains the reserved amount (S-1 evidence step 2), a creator whose first attempt failed can request at most `original − X` next time, where X moved nowhere.
- **Impact:** Permanent understatement of refundable balance after any failed attempt; forces partial-refund workarounds that compound ledger drift.
- **Effort:** S–M
- **Fix sketch:** On transition to FAILED, release the reservation (`refundAmount` back to prior cumulative, or track `reservedAmount` separately from `refundedAmount`). Add regression test: fail → retry full amount → succeeds exactly once.

### S-3 — Digital downloads survive refunds

- **Severity:** P2 (**BUSINESS/POLICY GAP** — no existing contract mandates revocation; classified per audit instructions, not called a bug)
- **Confidence:** HIGH
- **Evidence:** `resolveDownloadToken` validates existence, expiry, count, URL — runtime.ts:153-164. Neither it nor `getOrderDownload` consults `refundStatus`. A refunded customer with a live token continues downloading up to limit/expiry.
- **Impact:** At DIRECT_CREATOR scale this becomes a chargeback/fraud vector; today PLATFORM_COLLECT refunds aren't creatable through this path, so exposure is theoretical.
- **Effort:** S
- **Fix sketch:** Policy decision first: (a) revoke on PARTIAL/REFUNDED — add refund-state check in `resolveDownloadToken`; or (b) accept and document. Recommended (a) with a `downloadsRevokedAt` marker so regeneration is blocked post-refund.

### S-4 — Refund↔fulfillment coupling absent (shipped/delivered fully refundable with no consequence)

- **Severity:** P2 (**BUSINESS-RULE GAP** — rules genuinely do not exist in repo; reported as gap, not invented)
- **Confidence:** HIGH
- **Evidence:** `requestProductOrderRefund` requires only order `status === "COMPLETED"` (payment-account.actions.ts:204); it does not inspect fulfillment status. `updateFulfillment` does not inspect refund state. No shared guard exists anywhere (grep across `src/` for both fields co-occurring returns nothing).
- **Impact:** Supported-but-unspecified flows: completed→shipped→refund (goods in transit), completed→delivered→refund (return handling), completed→refund-pending→still-shippable. Each will be decided ad hoc by creators unless codified.
- **Effort:** M
- **Fix sketch:** Define minimal matrix (e.g., block refund initiation when fulfillment `delivered` unless a `returned` transition precedes it; on REFUNDED, force fulfillment → `cancelled` if not yet shipped; leave shipped orders to a manual return flow). Implement as guards in the two actions + tests. Requires product sign-off — out of audit scope.

### S-5 — Creator cannot see the shipping address in the dashboard (workflow hole, not IDOR)

- **Severity:** P2
- **Confidence:** HIGH
- **Evidence:** Backend action `getOrderShippingAddress` correctly scopes by order tenancy first (fulfillment.actions.ts:36) — the IDOR question in ticket §6 answers **safe**: another creator's orderId yields "Order not found"; cross-creator address retrieval is impossible through audited paths (`saveShippingAddress` also re-verifies order tenancy internally, runtime.ts:108). However no component imports this action (grep of `.tsx`: zero hits) — `fulfillment-section.tsx` renders tracking inputs only.
- **Impact:** Creator physically cannot pack/ship without leaving the platform; invites off-system data sharing.
- **Effort:** S (UI wiring only)
- **Fix sketch:** Add an expandable address panel per physical row in `fulfillment-section.tsx` calling the existing action.

### S-6 — No inventory: overselling possible; fulfillment lacks quantity

- **Severity:** P2
- **Confidence:** HIGH
- **Evidence:** Registry declares `physical … requiresInventory: true` (product-types/index.ts:23) but no consumer reads that flag (grep: strategies copy it onto the fulfillment strategy object; nothing enforces stock). No quantity column exists on `ProductOrder` or `OrderFulfillment`; checkout creates exactly one implicit unit regardless of intent (checkout.actions.ts:155-164). Fulfillment therefore cannot know how many units to pack.
- **Impact:** Multi-unit demand cannot be expressed; stock-outs undetectable. Not a security bug; a fulfillment-correctness gap.
- **Effort:** M
- **Fix sketch:** Minimum viable: persist `quantity` at checkout, echo into fulfillment metadata, enforce `quantity === 1` server-side until real inventory lands; later add stock counter + conditional decrement inside `completeProductOrder`.

### S-7 — `listFulfillments` search runs after pagination

- **Severity:** P2 (functional correctness of creator queue search)
- **Confidence:** HIGH
- **Evidence:** runtime.ts:172-188 — `findMany` applies `take/skip` first; the `params.search` filter then narrows only the fetched page, and `total` reflects the unfiltered count. Creators searching for an older order by name/email silently miss it whenever it falls outside the first 100 rows (limit set in fulfillment.actions.ts:13).
- **Impact:** Missed fulfillments = missed shipments.
- **Effort:** S
- **Fix sketch:** Push `search` into the Prisma `where` (`order: { is: { OR: [{ fanEmail contains }, { product name contains }] } }`) before take/skip.

### S-8 — `fetchCustomers` unbounded scan

- **Severity:** P2 (performance; ticket §18)
- **Confidence:** HIGH
- **Evidence:** order.actions.ts:40-44 loads **every** tenant order with non-null email, no take/skip, then aggregates in JS. Grows linearly with lifetime orders per creator.
- **Impact:** Latency/memory degradation on mature tenants; called from admin surfaces.
- **Effort:** S
- **Fix sketch:** Replace with `groupBy([fanEmail])` + `_count` + `_sum(amount)` + `_max(createdAt)` — single aggregate query.

### S-9 — Free-order path completes without payment reference (by design, but interacts with refunds)

- **Severity:** P3
- **Confidence:** HIGH
- **Evidence:** checkout.actions.ts:170-193 completes `total <= 0` orders immediately with no `razorpayPaymentId`. D.3 correctly refuses such orders (`NO_CAPTURED_PAYMENT`). Behavior consistent; noted because analytics treat `PAID/COMPLETED` uniformly (e.g., lib/dashboard/service.ts:43) mixing ₹0 free completions with paid revenue.
- **Impact:** Cosmetic metric inflation only.
- **Effort:** S (segment by presence of paymentId in metrics).

### S-10 — Stale `"PAID"` status vocabulary queried, never written

- **Severity:** P3
- **Confidence:** MEDIUM-HIGH (all write paths audited write only PENDING/COMPLETED; exhaustive proof across future code impossible)
- **Evidence:** Queries include `status: { in: ["PAID", "COMPLETED"] }` (lib/dashboard/service.ts:43, lib/creator-success/runtime.ts:52, lib/platform/health/engine.ts:74) but no repository write path emits `"PAID"`; the canonical boundary writes `COMPLETED` (order-completion.ts). Dead clause, harmless today.
- **Impact:** None functional; misleading vocabulary.
- **Effort:** Trivial cleanup.

### Explicitly checked and NOT found (per ticket §17)

- Client-controlled `tenantId` / `paymentAccountId` / order status / refund amount — **none**: every mutation derives these server-side; refund amount arrives in paise and is re-derived/clamped server-side (payment-account.actions.ts:209-220).
- Shipping-address IDOR across creators — **not possible** through audited paths (S-5 evidence).
- Order enumeration by guests — mitigated: `/purchase/[orderId]` requires orderId **plus** exact buyer-email match or session ownership (customer-orders.actions.ts:59-67).
- Payment-credential exposure — credentials encrypted at rest (schema comments + encrypt/decrypt usage); decrypted only in-memory inside refund execution/verification; `PaymentAccountData` serializer intentionally omits secret material (`hasProviderKeys: !!row.providerKeyId && …`, payment-account runtime.ts:52).
- Unsafe provider references — webhook reconciliation keys exclusively on server-persisted `razorpayPaymentId` (route.ts:208-212), never notes/client input.

---

## Fulfillment State Machine (actual repository states)

Source: `src/modules/fulfillment/application/strategies.ts` (`STATUS` map) + domain types. **These are the only states; nothing invented.**

```
Physical (type=physical):
  pending → preparing → packed → shipped → delivered → completed
       \        \          \          \
        \        \          \          → returned | cancelled
         \        \          → cancelled
          \        → cancelled
           → (any of preparing/packed/shipped/ready/accepted/confirmed/completed/cancelled allowed directly from pending)

Digital / course (requiresDownload):
  pending → ready (on generateDownload) → completed
  ready → cancelled allowed

Service:
  pending → accepted → completed | cancelled

Booking:
  pending → confirmed → completed | cancelled

Terminal: completed · cancelled · returned (no outgoing edges)
```

Timestamps written automatically: `shippedAt` on first entry to `shipped`, `deliveredAt` on `delivered` (runtime.ts:90-91). Every transition appends `{status, at, by}` to `timeline`.

**ProductOrder state machine (actual):**

```
PENDING ──(verifyPayment | webhook payment.captured | free total≤0)──▶ COMPLETED
   ▼ refund axis (DIRECT_CREATOR only):
NONE → PENDING → PARTIAL → REFUNDED
          │           ▲
          └─→ FAILED ─┘ (re-initiation permitted from NONE/PARTIAL/FAILED — S-2 caveat)
Webhook may also write PARTIAL/REFUNDED/FAILED (currently defective — S-1)
No CANCELLED order state exists in code.
Note: legacy queries also accept "PAID" (S-10) though nothing writes it.
```

---

## Refund/Fulfillment Interaction (actual behavior + gaps)

Audited scenarios from ticket §8:

| Scenario | Current system behavior | Classification |
|---|---|---|
| Completed → shipped → refund requested | Allowed. Refund path never reads fulfillment. Fulfillment stays `shipped`; creator can still mark `delivered`. | BUSINESS-RULE GAP |
| Completed → delivered → refund requested | Allowed identically; no return/RMA concept beyond terminal `returned` state that nothing routes to automatically. | BUSINESS-RULE GAP |
| Completed → refund PENDING → fulfillment still pending | Allowed; creator can ship during an in-flight refund; no warning or block. | BUSINESS-RULE GAP |
| Refund finalizes (REFUNDED/PARTIAL) | Nothing touches the fulfillment. Digital tokens stay valid (see S-3). Physical goods stay "in progress". | Gap (policy decision required) |

No rules were invented here per instructions; the matrix above is the documented actual state.

---

## WhatsApp Integration (actual behavior)

- Canonical helpers: `resolveWhatsAppDestination` (server-side, from hero `socialLinks` where `platform === "whatsapp"`, safeUrl-guarded), `extractWhatsAppNumber` (E.164-ish validation, rejects `javascript:`/`data:` etc.), `buildWaMeLink` (encodeURIComponent message, empty string on invalid destination) — `src/lib/commerce/whatsapp.ts`.
- Per-product mode `ONLINE | WHATSAPP | BOTH` validated server-side in product validators (`products/validators.ts:19-21` against `COMMERCE_MODES`), normalized defensively everywhere (`normalizeCommerceMode`).
- Storefront rendering receives a server-baked `whatsappUrl` snapshot field (types/snapshot.ts:103-106; baked once in website-aggregate.service.ts:235-294), so the client cannot inject destinations.
- **Payment-control check (ticket §7):** the WhatsApp path constructs a prefilled chat link with a *display-only* price string and performs **zero** order/payment operations (module header contract, whatsapp.ts:1-10; no imports of checkout/prisma anywhere in the file). A WHATSAPP-mode product simply renders no buy button — there is no code route by which a WhatsApp click reaches Razorpay. **No bypass exists.**
- Physical-product support: WhatsApp is a generic text CTA; a physical product sold via WHATSAPP mode produces no `ProductOrder`, hence no fulfillment record and no address collection — settlement happens entirely off-platform by design. Sensible, but operators should know such orders are invisible to the entire order system above.

---

## Agency Boundary (actual behavior)

- Agency sessions carry `agencyId`, not a creator `tenantId`. `requireTenant()` (used by all order/fulfillment actions) throws/fails for them ⇒ **agency users cannot list creator orders, update fulfillments, generate downloads, or read shipping addresses**.
- Refund/payment-account surface additionally hard-denies roles by name: `AGENCY_ADMIN`, `AGENCY_STAFF`, `SUPPORT`, `READ_ONLY` (payment-account.actions.ts:24-27) — defense-in-depth even if a session ever gained a tenant context.
- **Payment credentials: inaccessible.** Encrypted columns; serializer strips secrets; no agency-reachable code path decrypts. Verified.
- Residual nuance (documented, not a finding): `AgencyTenant.productRevSharePercent` exists for commission math, but nothing in the audited order flow consumes it for DIRECT_CREATOR orders — expected while the strategy is disabled; revisit at activation.

---

## SUPER_ADMIN Boundary (actual behavior)

Intentional bypasses (documented in code, acceptable):

| Surface | SUPER_ADMIN power |
|---|---|
| Refunds | Skips tenant match (`isSuper`) — can initiate/execute refunds on any DIRECT_CREATOR order (payment-account.actions.ts:175, 325) |
| Fulfillment health | `getFulfillmentOpsData` super-admin-only platform stats (fulfillment.actions.ts:42-46) |
| Payment health | `getPaymentHealthData` super-admin-only (payment-account.actions.ts:482-486) |
| Customer portal | Treated as owner of every order via `role === "SUPER_ADMIN"` in `canAccessOrder` (customer-orders.actions.ts:64) — includes shipping addresses platform-wide |

The last row is the widest grant: SUPER_ADMIN can retrieve any customer's PII through the portal path. Consistent with platform-administration semantics already used elsewhere; flagged here so the boundary is explicit rather than accidental.

---

## Performance Findings (evidence-backed only)

| Finding | Evidence | Severity |
|---|---|---|
| Unbounded customer aggregation scan | order.actions.ts:40-44 (S-8) | P2 |
| Post-pagination search filtering | runtime.ts:184-187 (S-7) | P2 |
| Revenue timeline loads up to 1000 orders then merges in JS | billing/application/revenue-service.ts:192 | P3 (bounded, monitor) |
| `fetchOrders` fixed take:200 without pagination UI | order.actions.ts:22 | P3 (bounded) |
| Positive: hot-path caching | `computePaymentReadiness` and `resolveCommerceStrategy` are React-request-cached (payment-account runtime.ts:144; commerce-strategy runtime.ts:29) — repeated per-request calls collapse | — |
| Positive: fulfillment queue is two parallel queries with bounded take | runtime.ts:172-181 | — |
| Positive: webhook reconciliation is single indexed lookup (`razorpayPaymentId` unique per captured payment) | route.ts:211 | — |

No N+1 patterns found in audited order/fulfillment paths (includes/select used consistently). No DB measurement harness was run — unnecessary for the findings above and avoided per read-only mandate.

---

## Test Coverage

| Suite | Covers | Classification |
|---|---|---|
| tests/unit/fulfillment.test.ts | Strategy-per-type mapping; physical sequence legality + illegal-transition blocking; digital pending→ready→completed; status labels; download TTL/limit constants | GOOD for pure logic; **PARTIAL overall** — no DB, no authorization, no token-resolution tests |
| tests/unit/rccf38-order-metering.test.ts | Completion boundary quota metering | GOOD |
| tests/unit/rccf72-18d2-product-order-refund-binding.test.ts | Historical paymentAccount binding schema/logic | GOOD |
| tests/unit/rccf72-18d3-product-refund-initiation.test.ts | D.3 guards (authz, ceiling, optimistic lock) | GOOD |
| tests/unit/rccf72-18d4-product-refund-execution.test.ts | D.4 execution + transitions | GOOD |
| Webhook route | Subscription-path tests exist elsewhere; **MISSING**: signed-delivery E2E for product-order `payment.captured`, and ANY test of the refund.processed/refund.failed reconciliation block (which is where S-1 lives) | MISSING (matches deferred D.4 item) |
| Customer portal (/purchase) | **MISSING** — no unit/e2e test found for owner-or-email boundary, address submission, or download flow | MISSING |
| Creator orders/fulfillment UI | **MISSING** — no component tests for fulfillment-section actions | MISSING |
| Shipping-address IDOR | **MISSING** — the S-5 safety property is untested | MISSING |

Priority test debt for D.5.x: (1) webhook refund.reconciliation table-driven tests (would have caught S-1/S-2), (2) portal access-boundary tests, (3) transition-table × role matrix tests for fulfillment mutations.

---

## Recommended RCCF Sequence (smallest safe path)

```
D.5 (this audit)
 ↓
D.5.1  Refund ledger integrity — fix S-1 + S-2 (release-on-FAILED,
       state-aware webhook reconcile) + table-driven webhook tests
       [gate: none — improves dormant code safely]
 ↓
D.5.2  Creator order operations UI — refund panel (initiate/status),
       shipping-address panel (wire existing safe action), refund status
       column, order drill-down
 ↓
D.5.3  Business-rule ratification + implementation — refund↔fulfillment
       matrix (S-4) and download revocation policy (S-3); product sign-off
       required before coding
 ↓
D.5.4  Fulfillment correctness pack — S-7 search-before-pagination,
       S-8 groupBy customers, quantity=1 persistence + S-6 minimal guard
 ↓
D.5.5  Close deferred D.4 items — signed webhook E2E suite +
       X-Razorpay-Failure-Reason parsing surfaced on refund FAILED records
 ↓
D.5.6  Final DIRECT_CREATOR activation audit — re-run this checklist,
       verify P0/P1 empty, THEN flip registry status (separate RCCF, with
       go/no-go criteria)
```

Items deliberately excluded: notification expansion (no product contract requires it — revisit with D.5.3 decisions), inventory system (beyond minimal S-6 guard), order-cancellation feature (new scope).

---

## Verification (read-only, run at closure)

Commands executed per ticket requirements:

| Check | Result |
|---|---|
| `git status --short` baseline recorded before start | Matches pre-existing worktree; no unrelated files touched |
| `npx tsc --noEmit` | PASS — clean, zero errors |
| `npm run lint` | PASS — exit 0; warnings only, all pre-existing (unused vars / `<img>` / hook-deps); none introduced by this audit (no source written) |
| `npx prisma validate` | PASS — "The schema at prisma\\schema.prisma is valid" |
| `git diff --check` | PASS — no whitespace/conflict-marker errors (2 pre-existing CRLF→LF conversion notices on tests/fixtures/auth.ts + tests/fixtures/test-seed.ts, untouched by this audit) |
| `git status --short` (post-audit) | Sole addition vs baseline: this UNSTAGED report (`?? docs/rccf-72.18d5-creator-commerce-fulfillment-audit-closure.md`) |

No existing test suites were executed during closure (all findings are static code-path analyses; the D.2/D.3/D.4 refund suites were reviewed but not re-run, per read-only mandate and to avoid DB contact).

---

## Worktree Protection Statement

Baseline captured (`git status --short` + `git diff --stat`, 70 modified files / ~1373 insertions of pre-existing RCCF work incl. D.4 staged files). During this audit: **no source file modified, no schema change, no migration, no test change, no package/config/env change, no DB command executed, nothing staged, nothing committed, nothing pushed.** Sole artifact: this document (untracked, unstaged).

---

## Final Stop Condition

**RCCF-72.18D.5 Audit Closure**

**Verdict: B — Ready Except Defined Gaps**

**P0:**
- (none — no exploitable-today vulnerability found; PLATFORM_COLLECT storefront loop is safe as audited)

**P1:**
- S-1 Webhook refund reconciliation double-counts reserved `refundAmount`; `refund.failed` events with amount>0 compute to `PARTIAL` instead of `FAILED` (src/app/api/webhooks/razorpay/route.ts:229-257). Dormant while DIRECT_CREATOR disabled.
- S-2 Failed refunds never release reserved amount — permanent headroom leak; retry-from-FAILED cannot reach a truthful full refund (src/actions/payment-account.actions.ts:233, 411-428).

**P2:**
- S-3 Digital downloads not revoked after refund (policy gap — resolveDownloadToken ignores refund state).
- S-4 Refund↔fulfillment interaction rules absent (shipped/delivered/pending all refundable with no fulfillment consequence).
- S-5 Creator dashboard cannot display shipping addresses (safe backend action unused by UI).
- S-6 No quantity/inventory: `requiresInventory:true` unconsumed, overselling structurally possible, fulfillment has no quantity.
- S-7 Fulfillment-queue search filters after pagination (misses matches beyond first page).
- S-8 `fetchCustomers` unbounded scan (perf).
- Deferred-from-D.4: webhook-signature E2E suite still missing; `X-Razorpay-Failure-Reason` unparsed.

**P3:**
- S-9 Free-order completions mixed into PAID/COMPLETED revenue metrics.
- S-10 Dead `"PAID"` status vocabulary in three query files (never written).
- Missing notifications for refund lifecycle events (classified separately from bugs per instructions).
- No customer-portal or creator-orders-UI tests.

**DIRECT_CREATOR:** DISABLED — unchanged (`status: "future"`; registry untouched). Activation gated on D.5.1 + D.5.3 + D.5.6.

**Implementation recommendations:** Execute sequence D.5.1→D.5.6 above. Smallest first PR = D.5.1 (two functions + tests, zero storefront surface).

**Files modified:** NONE
**Files staged:** NONE
**Commit:** NOT CREATED
**Push:** NOT PERFORMED
