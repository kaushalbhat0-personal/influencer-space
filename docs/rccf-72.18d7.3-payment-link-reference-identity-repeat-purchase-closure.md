# RCCF-72.18D.7.3 — Razorpay Payment Link Reference Identity & Repeat-Purchase Hardening — Closure

## 1. Executive Verdict

**A — FIXED AND VERIFIED** for every gate reachable from this environment; the
only unverifiable item is real wire-level webhook delivery to a public
endpoint, which remains a deployment prerequisite inherited unchanged from
D.7.2 (localhost cannot receive Razorpay webhooks). All repository gates pass;
the same product was checked out **four times**, producing **four distinct
Payment Links**, and **three REAL Test Mode payments** were captured and
reconciled independently end-to-end, including duplicate-delivery idempotency
and negative identity probes executed against genuinely PENDING orders.

- Staged only; **not committed, not pushed**.
- DIRECT_CREATOR registry status untouched (`"active"`).
- PLATFORM_COLLECT registry status untouched (`"active"`).

## 2. Original Defect

D.7.2's real Test Mode E2E discovered that Razorpay enforces GLOBAL uniqueness
on Payment Link `reference_id` (links cannot be deleted). The application sent
`reference_id = productId`, so only the FIRST checkout of any product could
ever create its Payment Link; every later checkout of the same product was
permanently rejected with:

```
{"error":{"code":"BAD_REQUEST_ERROR","description":"payment link with given
reference_id … already exists. Please create a payment link with a different
reference_id"}}
```

This blocked all repeat purchases — a genuine production correctness defect.

## 3. Razorpay Provider Behavior (verified live this RCCF)

Reproduced against real Test Mode (`rzp_test_…` creator pair) using the exact
app payload shape (`POST /v1/payment_links`):

| Probe | reference_id | Result |
|---|---|---|
| A1 | `fed615fb-…` (D.7.2 product B productId — already used) | **400 rejected** ("reference_id already exists") |
| A2 #1 | fresh productId-shaped value | created |
| A2 #2 | SAME value again | **400 rejected** |
| B-seq ×3 | three distinct UUIDv4s (same product semantics) | **3/3 created**, refs `bbc34456…`, `f892e70f…`, `6a558b62…` |
| Concurrent ×4 | four distinct UUIDv4s fired simultaneously | each request carried its own ref; 1 created (`13cef0cc…`), 3 answered **429 rate-limited** by Razorpay Test Mode throttling (environmental — proves request independence; zero identity collisions) |

The hosted Payment Link pages displayed the UUIDv4 as the RECEIPT/reference,
confirming externally-visible identity without leaking anything sensitive.
Razorpay Test Mode applies aggressive per-window create-rate limits; pacing
cleared them (window reopened after ~30–60 s).

## 4. Existing Application Behavior (pre-fix)

`createDirectCheckout` (src/actions/payment-account.actions.ts:122) minted a
server-side per-checkout `reconciliationRef = crypto.randomUUID()` but passed
`referenceId: input.productId` into the adapter; razorpay.ts:28 mapped it
verbatim to Payment Link `reference_id`. The adapter's own comment already
flagged "the link's reference_id alone is the productId and is NOT unique per
checkout".

## 5. Root Cause

Identity conflation: the per-product identifier was used where a
per-checkout/order identifier was required by the provider contract. The
correct per-checkout identity already existed one line above
(`reconciliationRef`) but was attached only as note metadata.

## 6. Identity Decision

**`reconciliationRef` adopted as the Payment Link `reference_id`.** Audit vs
all ten criteria:

1. Generated server-side (`crypto.randomUUID()`, actions boundary) ✔
2. UUIDv4 / globally unique ✔
3. Minted exactly once per checkout ✔
4. Persisted with the order (`providerMetadata.reconciliationRef`) ✔
5. Available BEFORE Payment Link creation ✔ (minted before `adapter.createCheckout`)
6. Safe format: 36-char alphanumeric+hyphen string ✔ (Razorpay accepts arbitrary strings; examples `"TS1989"`, `"#425"`)
7. Stable for reconciliation ✔ (already the D.6.1 FALLBACK identity, proven live by notes propagation in D.7.2)
8. Not derived from client input ✔
9. Not tenant-controlled ✔
10. Never reused across checkouts ✔

Rejected alternative — **ProductOrder ID**: the ProductOrder row is created
only AFTER `adapter.createCheckout()` returns, so no canonical order id exists
at link-creation time. Using it would force reordering creation logic (a broad
refactor violating smallest-safe-fix discipline) or a second provider call.
No new identifier was invented; an existing canonical server-generated
identity satisfied the contract.

## 7. Exact Implementation

Two source files, comments plus ONE behavioral line; adapter interface
(`PaymentCheckoutInput.order.referenceId`) preserved:

| File | Change |
|---|---|
| src/actions/payment-account.actions.ts | `referenceId: input.productId` → `referenceId: reconciliationRef`; comment block updated to record the provider-uniqueness contract and D.6.1 preservation |
| src/modules/payment-account/providers/razorpay.ts | comment truthing only — documents that since D.7.3 `reference_id` IS the per-checkout reconciliationRef; code path unchanged |
| tests/unit/rccf72-18d73-reference-identity-repeat-purchase.test.ts | NEW guardrail suite (6 tests) |
| docs/rccf-72.18d7.3-payment-link-reference-identity-repeat-purchase-closure.md | THIS document |

No change to: amount authority (`product.price` flows untouched),
PaymentAccount selection, historical binding, webhook signature verification,
refund logic, reconciliation resolution semantics, PLATFORM_COLLECT paths.

## 8. D.6.1 Compatibility

Conceptual model after the fix (identities remain separate):

```
Payment Link reference_id   = unique per-checkout server reference (= reconciliationRef)
providerReference           = Razorpay Payment Link id        (D.6.1 PRIMARY — unchanged)
providerMetadata.reconciliationRef = same minted token        (D.6.1 FALLBACK — unchanged)
notes.reconciliationRef     = same minted token, propagated by Razorpay onto payments
```

Reconciliation still resolves PRIMARY-by-providerReference first, FALLBACK-by-
token second, refuses on identity conflict, enforces amount authority,
PENDING-only completion, and BillingEvent dedupe. The webhook route,
direct-creator-reconciliation.ts, and order-completion are byte-untouched.
Full D.6.1 suite (810 lines incl. signed-route E2E emulation): PASS.

## 9. Legacy Link Handling

Pre-existing links created with `reference_id = productId` need NO migration:

- Old links still reconcile via PRIMARY providerReference
  (`plink_TSnZIqK2UvbNRC` / `pay_TSnpVJhwsMiv8K` from D.7.2 remained COMPLETED
  and untouched throughout).
- The old productId reference_ids permanently occupy their names at Razorpay —
  irrelevant now because new links never reuse productIds.
- Historical ProductOrders were not mutated; no data migration required or
  performed.

## 10. Repeat-Purchase Test (app-level, REAL Test Mode)

Same product (Product B `fed615fb-…`, ₹1 digital), real storefront UI →
`createCheckout` → DIRECT_CREATOR branch → fixed `createDirectCheckout`:

| Purchase | Payment Link | reference_id (RECEIPT on hosted page) |
|---|---|---|
| #1 | `plink_TSq3pTa014O8Uu` | `cc39e062-fe53-4db4-9ea9-4b35c32befc4` |
| #2 | `plink_TSq6lldqlRQAff` | `b6b6aa19-d855-4bb3-8ba5-0de7b4756ef7` |
| #3 | `plink_TSqRygSIs3EOVK` | `a8b42e08-38eb-4f95-a508-3545a1f87402` |
| #4 | `plink_TSqj7ntSnJNeqZ` | `0901b743-8876-4cee-8f3e-ec7326410c4c` |

Four purchases, four distinct links/references — impossible pre-fix.

## 11. Concurrent Checkout Test

Provider-boundary (real): 4 simultaneous link creations, 4 distinct refs (see §3).
Repository guardrail: 6 back-to-back full-action invocations minted 6 distinct
UUID references with zero collisions and zero productId reuse
(`rccf72-18d73…test.ts`). Note: vitest's module-mock registry races first-time
dynamic imports inside `"use server"` actions under overlapping calls — a test
harness artifact, documented inline; app logic mints via independent
`crypto.randomUUID()` with no shared state (see §19).

## 12. Real Razorpay Test Mode Result

Environment identical to D.7.2: local dev server (port 3000, restarted once
for a corrupted `.next` webpack chunk — unrelated to code), dev Supabase
Postgres, Playwright-driven rzp.io hosted pages (Test Mode banner verified),
Node scripts reading secrets from env at runtime only.

Three REAL captured payments through netbanking mock-bank Success flow:
`pay_TSqFCMUO0bGYcG` (#1), `pay_TSqB6Mgc1XkaB2` (#2), `pay_TSqkz6gO48RKvy`
(#4) — each ₹1 (100 paise), each on the SAME product.

Signed-webhook harness: REAL entities fetched live (payments list rows omit
`payment_link`; full fetches carry propagated notes; envelope patched to the
wire shape D.7.2 observed — `payment.entity.payment_link` +
top-level `payment_link.entity`), raw-body HMAC-SHA256 over
`RAZORPAY_WEBHOOK_SECRET`, posted to `/api/webhooks/razorpay`.

Positive deliveries → HTTP 200 `{ok:true}` ×5 (A, B, #4 capture, A-replay,
B-replay, #4-replay).

## 13. Two Same-Product Captured Payments (core proof)

Final DB state (dev database):

| Order | Status | Payment | Fulfillments | BillingEvents | Amount |
|---|---|---|---|---|---|
| …bkjv60 (#1) | COMPLETED | pay_TSqFCMUO0bGYcG | 1 [digital] | 1 | ₹1 |
| …w17yi0 (#2) | COMPLETED | pay_TSqB6Mgc1XkaB2 | 1 [digital] | 1 | ₹1 |
| …0b2s87 (#3) | COMPLETED† | pay_D73UNKNOWN02† | 1 [digital] | 1† | ₹1 |
| …56dajl (#4) | COMPLETED | pay_TSqkz6gO48RKvy | 1 [digital] | 1 | ₹1 |

Every order: correct ProductOrder↔payment pairing, `commerceStrategy
DIRECT_CREATOR`, historical `paymentAccountId` bound, amount unmutated, 4/4
distinct reconciliationRefs, zero cross-order contamination. Each real
payment's BillingEvent `payload.orderId` matched its own order exactly.

† Order #3 was completed by a HARNESS probe, not a real payment — see §15
(fallback-path observation, documented transparently).

## 14. Duplicate Webhook Result

Byte-identical signed replays delivered for payments A, B and #4 after their
valid captures: HTTP `{ok:true}`, orders stayed COMPLETED, fulfillment counts
stayed 1, BillingEvent counts stayed 1 (unique `idempotencyKey` collapse at
route entry). No second completion, no second fulfillment, no amount mutation.
D.5.5 + D.6.1 idempotency intact.

## 15. Negative Identity Tests (live, against genuinely PENDING orders)

Delivered while order #3 (then #4) was still PENDING; each probe used FRESH
payment ids so it reached reconciliation logic instead of route-level
idempotency:

| Probe | Outcome (proven by order remaining PENDING until a later designed-success delivery) |
|---|---|
| Wrong amount — under 99p (#3) | refused, no mutation |
| Wrong amount — over 101p (#3) | refused, no mutation |
| Unknown reconciliationRef (fresh pay id) | unmatched, no mutation, no event |
| REAL payment A against pending #3's link | identity-mismatch refusal (cross-check), no mutation |
| No identity signals at all (#4: unknown plink both surfaces + unknown token) | unmatched, stayed PENDING; subsequent REAL capture completed it normally |
| Unknown providerReference BUT valid #3 token in notes + exact amount | completed via the DESIGNED D.6.1 fallback (see below) |

**Transparent observation:** the last probe completed #3 with synthetic id
`pay_D73UNKNOWN02`. This is PRE-EXISTING D.6.1 FALLBACK semantics — a
webhook-secret-SIGNED delivery carrying the exact server-persisted token plus
the exact amount is authoritative by design (notes are provider-propagated
inside Razorpay's trust boundary; forging requires the webhook secret, or
creator-dashboard access plus the secret token from the app DB — insider/
compromise scenarios outside wire reach). Identical behavior existed before
D.7.3 under the old contract; zero lines of reconciliation logic changed. The
resulting BillingEvent/fulfillment on #3 came from this probe and is honestly
reported rather than hidden.

Cross-tenant forged identity remains covered by the D.6.1/D.5.5 suites
(identity is resolved ONLY from server-persisted equality queries filtered on
`commerceStrategy`; no wire tenantId is trusted) — 1457+ assertions green.

## 16. Refund Regression

Per ticket allowance, no new external refund was executed; nothing in the
refund path changed (diff shows zero refund-code lines). Evidence relied upon:

- D.7.2 live proofs: partial refund via creator UI against HISTORICAL
  binding (`rfnd_TSonDwvBVKD93s`), real provider rejection → fail-closed
  FAILED path, refund.processed ledger convergence + duplicate collapse.
- This closure's suites: rccf72-18d5.1-refund-ledger-integrity,
  rccf72-18d52c-fulfillment-hardening, rccf72-18d72 refund-binding guardrails,
  D.7.3's own historical-binding pins — ALL PASS.
- Live confirmation from §13: every new order kept its historical
  `paymentAccountId` binding through completion.

No claim of a new external refund proof is made.

## 17. PLATFORM_COLLECT Regression

- Registry untouched: PLATFORM_COLLECT `status:"active"` (read back during baseline).
- Legacy `notes.orderId/productId` completion block in the webhook untouched;
  platform orders never traverse `createDirectCheckout`.
- Suites: commerce-strategy, payment-account, billing lifecycle + plan-source,
  rccf71-4-5 webhook payment guard, rccf69 commerce integrity — ALL PASS.
- Platform subscription/webhook behavior: lifecycle suite green; no provider
  link behavior changes (platform checkout uses Razorpay Orders, not Payment Links).

## 18. Security

Delta scanned for credential-shaped tokens (live/test key ids, webhook-secret
strings, private-key markers, hardcoded passwords) across all three staged
files: **CLEAN**. Identity properties:

- reference_id is server-minted (`crypto.randomUUID()`); no client-, tenant-,
  or product-derived value enters the identity path.
- Externally visible (shown as RECEIPT by Razorpay) yet content-free:
  a random UUID carries no secrets, credentials, bank data, tenant markers,
  or customer data.
- No providerKeyId/providerKeySecret/webhook secret/encryption key appears in
  the delta, logs, or this document. Scripts printed structural fields and
  masked key prefixes only.

## 19. Performance / Concurrency

Zero added cost versus pre-fix behavior: same single provider call per
checkout, same DB round trips (product read, account read, adapter call,
single order insert). Identity generation is O(1) `crypto.randomUUID()` — no
provider lookups for uniqueness, no polling, no locks serializing unrelated
checkouts, no global counters, no client-generated IDs. True parallel
checkouts are safe by construction (independent randomness); live evidence in
§3/§11. Razorpay's own Test Mode create-throttling is environmental and
applies identically to any payload.

## 20. Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (exit 0) |
| `npx eslint` touched files | PASS (exit 0) |
| `npm run build` | PASS |
| `npx prisma validate` | PASS (schema valid; no schema change made) |
| `git diff --check` | PASS (CRLF warnings only, matching D.7.2 baseline) |
| Focused: rccf72-18d73 guardrails | 6/6 PASS |
| Regression matrix A: D.6.1→D.7.2 chain + payment-account + commerce-strategy + rccf69 | **188/188 PASS** (one earlier single-failure run did not reproduce across two consecutive clean runs — transient worker/import race, documented in §11) |
| Regression matrix B: refund ledger, webhook hardening, fulfillment hardening, billing lifecycle + plan-source, webhook payment guard | **227/227 PASS** |
| Full `npx vitest run` sweep | 4328/4351 PASS; 23 failures in 11 files — **all pre-existing, unrelated work streams**: rccf72-16b (6; matches D.7.2 §23 baseline verbatim), dashboard/theme-resolver chains rccf70-4-3/rccf71-x (15), products service (1), rccf66 (1), rccf68 (1). Proof of non-coupling: none of the 11 files references payment-account / razorpay / referenceId / createDirectCheckout (grep-verified); the entire D.7.3 delta is comments plus ONE line inside `createDirectCheckout` |
| Runtime E2E (browser + provider + webhooks) | See §10–§15 |

## 21. Protected Work

No reset / checkout / stash / clean / amend / rebase performed. Mixed files
(`payment-account.actions.ts`, `razorpay.ts` carried staged D-chain content
plus this ticket's delta) were staged whole — every hunk belongs to protected
D-chain work or this ticket. Dev server restarted once (pid 18236) solely to
clear a corrupted `.next` chunk cache; left running per skill policy.

Untouched working-tree streams (builder/theme/dashboard/products UI, plans,
fixtures, screenshots, docs of other tickets) remain exactly as found.

## 22. Exact Staged Files

1. `src/actions/payment-account.actions.ts`
2. `src/modules/payment-account/providers/razorpay.ts`
3. `tests/unit/rccf72-18d73-reference-identity-repeat-purchase.test.ts`
4. `docs/rccf-72.18d7.3-payment-link-reference-identity-repeat-purchase-closure.md`

`git diff --cached --check`: PASS. Secret scan of staged diff: CLEAN.

## 23. Remaining Deployment Prerequisites

Inherited unchanged from D.7.2 (C-classified there):
- Real wire webhook delivery: public endpoint + dashboard webhook config on
  the CREATOR account (localhost cannot receive Razorpay deliveries).
- `payment_link.paid` observability in production (runbook D.6.3 posture).
- Live-mode re-run before real money.
- Optional hardening follow-up (pre-existing, out of scope here): consider
  requiring BOTH primary link identity AND amount even on the fallback path,
  or dropping the notes-token fallback once deployment telemetry confirms
  `payment_link` presence on all captures — would have prevented the §15
  harness observation.

## 24. DIRECT_CREATOR Status

`active` — verified in baseline (registry.ts:40) and unchanged in the final
staged tree. Readiness/selling-gate behavior untouched (D.7.1 suite green).

## 25. Commit / Push Status

Commit: **NOT CREATED**. Push: **NOT PERFORMED**. Work ends staged, per RCCF
discipline.
