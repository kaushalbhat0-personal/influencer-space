# RCCF-72.18D.7.2 — Razorpay Test-Mode End-to-End Creator Commerce Verification — Closure

## 1. Executive Verdict

**B — REPOSITORY VERIFIED / EXTERNAL TEST PARTIAL (with one C-classified production blocker discovered).**

The complete DIRECT_CREATOR chain was exercised against **real Razorpay Test Mode** using a genuine
`rzp_test_…` key pair: provider credential verification, selling gate, storefront checkout, Payment Link
creation, a real captured Test Mode payment, signed webhook reconciliation (D.6.1), order completion,
fulfillment, partial refund through the creator UI, and refund-webhook ledger convergence (D.5.1).

One genuine architecture defect was discovered by the external boundary and is reported as a
**C-classified production prerequisite** (§25.1): Razorpay enforces globally-unique Payment Link
`reference_id`, but `createDirectCheckout` passes `productId` as `reference_id`, so the **second checkout
of any product fails permanently**. Per ticket scope discipline this closure does NOT change production
code; a follow-up fix RCCF is required before real-money activation.

- Staged only; **not committed, not pushed**.
- DIRECT_CREATOR registry status untouched (`"active"`); PLATFORM_COLLECT untouched (`"active"`).

## 2. Test Mode Environment Used

- Local Next.js dev server (`npm run dev`), port **3000**, worker PID 22120 (started for this RCCF).
- Database: project-local Supabase Postgres via pooler connection from `.env.local` (dev database).
- Browser automation: Playwright MCP (Chromium), trusted-event interactions on razorpay.com hosted pages.
- Provider scripts executed with Node `--env-file=.env.local`; secrets were read from env at runtime and
  never printed, logged, or staged.

## 3. Platform vs Creator Key Distinction (Phase 0 items 9–10)

| Credential | Prefix observed | Role in verification |
|---|---|---|
| `RAZORPAY_KEY_ID` / `_SECRET` (.env.local) | `rzp_live_…` | Platform LIVE keys — **never used**, never loaded into any test path |
| `TEST_RAZORPAY_KEY_ID` / `_SECRET` (.env.local) | `rzp_test_…` | Used as the **creator's own Test Mode account** inside a creator-owned `PaymentAccount` |

The platform live pair and the test pair are distinct credentials. The test pair belongs to an independent
Razorpay Test Mode dashboard account and was bound to the test tenant exactly the way a real creator binds
their own keys (encrypted at rest, verified via the D.6.2 probe). The mock bank page served by Razorpay
confirmed the key id in use was the `rzp_test_…` pair.

## 4. PaymentAccount Setup (Phase 1)

Provisioned through the application runtime itself (`savePaymentAccount` → AES‑256‑GCM encrypt at rest):

- provider = `razorpay`, status = `active`, settlement = UPI, holder name set
- `providerKeyId` / `providerKeySecret` stored encrypted (`hasProviderKeys: true`)
- Account row id: `5884fd42-f1cf-4150-86ec-bc5c7acf9e65`

## 5. Provider Verification (D.6.2)

Exact lifecycle proven:

```
save → verificationStatus "pending"
     → computePaymentReadiness = warning ("Provider credentials verified" missing)   [fail-closed]
     → explicit verifyPaymentAccount()
     → read-only probe GET /v1/orders?count=1 authenticated against api.razorpay.com (Test Mode)
     → classification "verified" → persisted guarded on readVersion
     → computePaymentReadiness = ready (6/6 requirements met)
```

Additional fail-closed behavior proven live: after `disconnectPaymentAccount()`, a direct re-verify is
**refused** (`status: { not: "disconnected" }` guard returns count 0 → “Credentials changed during
verification”) — a disconnected account cannot be resurrected by verify alone; explicit re-save is required.

## 6. Product Setup (Phase 3)

- Tenant: seeded `Test Creator` (`9a05b981-3a0a-51b9-a546-adff607c0108`, subdomain `testcreator`),
  strategy opt-in provisioned as tenant `Setting` `commerce_strategy = "DIRECT_CREATOR"` (data-level;
  registry untouched).
- Selling-gate live proof around verification:
  - disconnected → ONLINE create rejected with code `PAYMENT_SETUP_REQUIRED`
  - disconnected → WHATSAPP create **succeeded** (exemption)
  - re-save + real re-verify → readiness `ready`
- Products created via the canonical product service:
  - `cae4b395-b00c-463f-8c25-ea560b741bc3` “RCCF D7.2 Test Product” ₹1 digital ONLINE PUBLISHED
  - `fed615fb-332d-4a0a-9e97-34fe7f9526da` “RCCF D7.2 Test Product B” ₹1 digital ONLINE PUBLISHED
  - `93118531-e049-4a98-bd46-f17f93e73b05` “RCCF D7.2 Refund Probe C” ₹10 digital ONLINE PUBLISHED

## 7. Payment Link Creation (Phase 4)

Driven through the real storefront UI (`Buy Now` → email capture → `createCheckout` →
`createDirectCheckout`):

- Strategy gate: DIRECT_CREATOR + `active` ✓
- Readiness gate: `ready` ✓
- Server-generated `reconciliationRef` (UUIDv4) persisted in `providerMetadata` AND attached as link note ✓
- Order persisted with `providerReference`, `providerMetadata.reconciliationRef`,
  `paymentAccountId` (creator-owned), `commerceStrategy: "DIRECT_CREATOR"`, amount ₹1/₹10, `PENDING` ✓
- Redirect to Razorpay-hosted `short_url` (host `rzp.io`) ✓
- No credential material returned to the client (action payload contains only `checkoutUrl`) ✓

## 8. Real Test Mode Transactions (Phase 5)

Completed on Razorpay’s hosted Test Mode pages (banner: “This payment link is created in Test Mode”),
contact step + Netbanking mock bank page → **Success**:

| Product | Payment Link | Payment | Amount | Status |
|---|---|---|---|---|
| B (₹1) | `plink_TSnZIqK2UvbNRC` | `pay_TSnpVJhwsMiv8K` | 100 paise | **captured** |
| C (₹10) | `plink_TSoWqylrGmua5S` | `pay_TSoiFu1PHQ13YT` | 1000 paise | **captured** |

Razorpay propagated the link notes onto both payments verbatim, including
`notes.reconciliationRef` matching the server-persisted values
(`58444009-eaf0-4a2f-b6ff-3690cf8133f4`, `fe2e5226-c1de-4a07-b9a3-7b47d1bc8150`) — external proof of the
D.6.1 fallback identity assumption.

A card attempt (4111…) was refused by Razorpay as “International cards are not supported” — recorded as
environment behavior, not an app defect.

## 9. Webhook Events Actually Received (Phase 6)

Razorpay webhooks require a publicly reachable endpoint; localhost cannot receive them, so the **wire
delivery of events is classified C (deployment prerequisite)**. What WAS proven externally:

- Which payloads the integration must expect was determined from the fetched REAL entities:
  `payment.captured` carries `payment.entity.payment_link` (string) and the link notes;
  `payment_link.paid` is a separate event that our route intentionally does not act on (runbook D.6.3);
  reconciliation is fully served by `payment.captured` because it carries both link identity fields plus
  notes. No event-contract change was made.
- Full processing path proven locally with HMAC-SHA256-signed deliveries built from the REAL fetched
  entities (raw-body signing over byte-exact JSON).

## 10. D.6.1 Reconciliation Result (Phase 7)

Signed `payment.captured` (real ids/amounts/notes) → route →
`reconcileDirectCreatorPaymentLinkPayment` → resolved by `providerReference` primary match →
`completeProductOrder` → `COMPLETED`, `razorpayPaymentId` stamped, quota slot reserved, fulfillment
created, exactly one `PAYMENT_CAPTURED_PRODUCT` BillingEvent.

Negative probes (all correctly refused, zero mutation):
unknown/wrong link id → `unmatched`; underpayment 99 paise → `amount_mismatch`;
overpayment 101 paise → `amount_mismatch`. A pre-quota-fix delivery was truthfully refused with reason
`quota` (order completion is quota-authoritative even under a valid webhook).

## 11. Duplicate Delivery Result (Phase 8)

Replaying the identical signed capture: HTTP `{ok:true}`, order stays COMPLETED, fulfillment count stays 1,
BillingEvent count stays 1 (unique `idempotencyKey` collapse). No second completion, no second fulfillment,
no amount mutation.

## 12–14. Order Completion / Fulfillment (Phase 10)

- Order visible in creator dashboard (`/admin/orders`): product, buyer email, ₹1, COMPLETED, date,
  `plink_TSnZIq…` reference column.
- Digital fulfillment record created (type `digital`, status `pending`, `downloadLimit` 5, `downloadCount` 0).
- Download token minting is creator-gated (“mark ready” → 32-byte hex token + expiry); products without
  `downloadUrl` legitimately stay token-less until then — consistent with the ratified D.5.2-C design.
- Physical transition rules and illegal-transition rejection are covered by staged suites
  (rccf72-18d52c hardening) and were not re-exercised externally.

## 15–16. Refunds (Phases 11–14) — Partial, Failed, and Provider Truth

Executed through the real creator UI drawer (D.5.2-B/D) →
`requestProductOrderRefund()` + `executeProductOrderRefund()` against the historical
`order.paymentAccountId` binding:

- **Partial refund ₹5 of ₹10 (order C)** — SUCCEEDED end-to-end:
  provider accepted, app state `refundStatus=PARTIAL`, `refundAmount=500`,
  provider ref `rfnd_TSonDwvBVKD93s`, headroom input capped at remaining ₹5.
- **Sub-refund minimum**: Razorpay rejects refunds < ₹1 (“The amount must be atleast INR 1.00”).
  An attempted ₹0.50 partial on the ₹1 order was rejected; the app handled it fail-closed:
  `refundStatus=FAILED`, `refundAmount` unchanged, retry remained possible (**Phase 14 FAILED path proven
  with a real provider rejection**).
- **Second ₹5 execution attempt** was rejected by Razorpay because the payment had already reached full
  refunded state at the provider via a separate direct-API probe refund
  (`rfnd_TSokjQh4EMBjCa`, ₹5). App again failed closed (no mutation beyond the documented FAILED marker).
  This produced the ideal ledger-divergence fixture: app PARTIAL(500) vs provider FULL(1000).
- **Full refund state** was then reached exclusively through webhook reconciliation (next section):
  final `refundStatus=REFUNDED`, `refundAmount=1000 == captured 1000`.

External limitation recorded: the netbanking mocksharp instrument rejects refund creation outright
(“invalid request sent”), so refund E2E required the same instrument family used above; card instruments
were unavailable (international cards disabled in this test account).

## 17. Refund Webhook Result (Phase 15)

Real `refund.processed` envelopes (entities fetched from the API, raw-body signed):

- W1 `rfnd_TSokjQh4EMBjCa` (unknown to app, 500p) → cumulative ceiling applied atomically:
  `PARTIAL/500 → REFUNDED/1000`, `refundId` updated to the processed provider refund. Provider truth won.
- W2 `rfnd_TSonDwvBVKD93s` (app-recorded, 500p) → duplicate collapse, no double counting.
- W3 replay of W1 → idempotent no-op.

Historical binding held throughout: every refund resolution used `order.paymentAccountId`
(`5884fd42-…`), never a current-account lookup. No cross-tenant mutation occurred.

## 18. Historical Binding Result (Phase 16)

Live-proven in the single-account dimension (refunds resolve through the order-stored account id while the
tenant-level current row was mutated multiple times during gate testing — save/disconnect/re-save cycles —
without affecting any executed or reconciled refund). A true second-provider-account scenario requires a
second safe test credential pair which this environment does not have; multi-row semantics remain covered
by the staged D.4/D.5.1 suites. Classification: A (repository) + partial B as above.

## 19. Tenant Isolation Result

Checkout resolves tenant server-side (`x-tenant-host`/session; never client input); product lookup is
tenant-scoped; webhook reconciliation queries filter on `commerceStrategy` + exact server-persisted
identity and carry no tenant/email trust from the wire. Wrong-link and wrong-amount deliveries mutated
nothing (live). Cross-tenant webhook forgery remains covered by staged D.6.1/D.5.5 unit suites.

## 20. PLATFORM_COLLECT Regression (Phase 18)

Focused green runs during this closure:

- `tests/unit/commerce-strategy.test.ts`, `payment-account.test.ts`, rccf69 integrity, D.7.1 gate,
  D.6.1, D.5.5, D.4 — 136 tests passed.
- Billing module suites incl. platform subscription lifecycle + webhook payment guard — 79 tests passed.
- Registry file unchanged: PLATFORM_COLLECT `active`; platform billing paths untouched by this closure.

## 21. Security Result (Phase 19)

- No secret appears in any log, action return, snapshot, or document produced here; scripts printed only
  structural error fields and safe identifiers.
- `serialize(PaymentAccount)` exposes booleans (`hasProviderKeys`), never key material.
- Decryption occurs strictly server-side at verify/checkout/refund boundaries feeding provider calls only.
- No `input.tenantId` / `input.paymentAccountId` trust path exists in checkout or refund actions.
- Webhook uses timing-safe comparison over the raw body; invalid signature → 401 before parse/mutation.

## 22. Tests (Phase 20)

Added: `tests/unit/rccf72-18d72-testmode-boundaries.test.ts` — 5 source-level guardrails pinning:
reconciliationRef identity chain (checkout↔link notes), non-Error SDK rejection mapping to a safe generic
message, historical `order.paymentAccountId` refund binding + INVALID_STRATEGY/INVALID_PAYMENT_ACCOUNT
guards, timing-safe raw-body HMAC, and D.6.1 amount authority / PENDING-only / already-completed /
identity-mismatch invariants. All pass; no duplication of existing D-chain coverage.

## 23. Verification Gates (Phase 23)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx prisma validate` | PASS (schema valid) |
| `npx eslint` touched files | PASS (exit 0) |
| `git diff --check` | PASS (exit 0; CRLF warnings only) |
| `npm run build` | PASS |
| Focused D-chain + commerce/billing suites | PASS (136 + 79 + 5 new) |
| Full vitest sweep of `tests/unit/rccf72*` | 32/33 files, 739/745 tests PASS; **pre-existing** failure: `rccf72-16b-content-transition-enforcement.test.ts` (6 tests, Launch publish-ceiling suite using in-memory fixtures; unrelated to payments/commerce; present in the mixed uncommitted working tree before this RCCF and left untouched per scope rules) |
| Runtime E2E (browser + API) | See §4–§17 |

## 24. External Deployment Prerequisites (Phase 21 classifications)

- **A — Repository proven**: all source invariants above; gate/selling/refund/webhook logic suites.
- **B — Razorpay Test Mode proven**: credential probe; Payment Link create+notes propagation; two real
  captured payments; signed-capture reconciliation→completion→fulfillment; duplicate idempotency;
  wrong-link/under/over refusals; partial refund via UI; FAILED-refund fail-closed handling;
  refund.processed ledger convergence + duplicate collapse.
- **C — Deployment prerequisite**: real wire webhook delivery (public endpoint + dashboard webhook config
  against the CREATOR account); `payment_link.paid` observability in production; live-mode re-run.
- **D — Unable to verify here**: deterministic refund.failed generation at Razorpay (not offered for these
  instruments — covered instead by the real rejection path §15 and signed harnesses); second test
  credential pair for multi-row historical binding.

## 25. Known Limitations & Blockers

### 25.1 MUST-FIX production blocker (discovered by this E2E) — reference_id collision

Repro (exact app payload): `POST /v1/payment_links` with `reference_id=<productId>` twice →

```json
{"error":{"code":"BAD_REQUEST_ERROR","description":"payment link with given reference_id … already exists.
Please create a payment link with a different reference_id"}}
```

Razorpay treats Payment Link `reference_id` as globally unique (links cannot be deleted). Because
`createDirectCheckout` passes `referenceId: input.productId` (`src/actions/payment-account.actions.ts:122`)
into the adapter’s `reference_id`, **only the first checkout of any product can ever succeed; every later
checkout of that product fails with “Razorpay payment link failed.”** The first in-app failure occurred
before the dev DB had the D.2 migration applied (user applied the SQL mid-session), which also orphaned one
Test Mode link carrying productId as reference_id.

Required fix direction (follow-up RCCF, not done here): send an order-unique value (e.g. the existing
server-generated `reconciliationRef`, already carried in notes) as `reference_id`, keeping
`providerReference` as the primary reconciliation key; add migration-safe handling for pre-existing links.
No HARD STOP condition was triggered by this finding, so verification continued on fresh products.

### 25.2 Environment observations (out of scope, pre-existing)

- `/admin/products` reproducibly client-crashes in dev (“Rendered more hooks than during the previous
  render”, Router recovery → dashboard); the working tree carries unrelated unstaged cosmetic edits to
  `products-page.tsx`. Product management was therefore exercised via the canonical service.
- Blueprint-seeded gallery placeholder images (`placehold.co`) are not allowlisted in `next.config.js` and
  can 500 the published storefront; removed for the fixture tenant (data cleanup, no code change).
- Locale hydration mismatch on the Payments page (“Last verified” timestamp) — dev-only console noise.
- Fixture residue left in dev DB intentionally for traceability: strategy Setting, PaymentAccount
  `5884fd42-…`, three products, orders `cmt4am97b00012ghh3glxso8c` (REFUNDED/1000 via webhooks),
  `cmt4cmrg400022ghh4k8hqi8u` (REFUNDED/1000), legacy Subscription moved `PRO → creator_launch` to unblock
  the order quota (Launch allows 10 orders/mo).

## 26. Exact Staged Files (Phase 24/25)

Staged in this RCCF (surgical `git add`, nothing else):

- `docs/rccf-72.18d7.2-razorpay-test-mode-e2e-closure.md` (this file)
- `tests/unit/rccf72-18d72-testmode-boundaries.test.ts`

Pre-existing staged D-chain (D.2–D.7.1) was left byte-identical; mixed working-tree files were not staged.
`git diff --cached --check` clean; staged diff inspected — contains no credentials, tokens, encrypted
blobs, or customer data beyond synthetic fixtures above.

## 27. DIRECT_CREATOR Status

`src/modules/commerce-strategy/application/registry.ts`: DIRECT_CREATOR `status: "active"` — **unchanged**.
PLATFORM_COLLECT `status: "active"` — **unchanged**. MARKETPLACE/HYBRID `reserved` — unchanged.

## 28. Commit / Push Status

**Not committed. Not pushed.** No reset/checkout/stash/clean/amend/rebase performed. Dev server left
running on port 3000 per lifecycle skill.

---

### Final Verdict Statement

Per the verdict rules: the repository side is fully verified and the majority of the external Test Mode
boundary was genuinely exercised (two real captured payments, real partial refund, real webhook-ledger
convergence) — however repeat-purchase checkout is architecturally broken against Razorpay’s actual
reference_id uniqueness contract (§25.1) and wire-level webhook delivery requires deployment. Verdict **B**
with mandatory follow-up fix ticket before real-money activation; do not treat DIRECT_CREATOR commerce as
production-proven until §25.1 ships and §24-C prerequisites are met.
