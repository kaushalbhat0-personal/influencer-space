# RCCF-72.18D.7.4 — Production Webhook Delivery & Deployment Verification Readiness — Closure

## 1. Executive Verdict

**B — APPLICATION READY / DEPLOYMENT VERIFICATION REMAINING**

Repository gates pass; the full D-chain (D.5.1 → D.7.3) plus platform/billing/
gate suites pass **265/265**; Test Mode application proof stands from D.7.3.
The public deployment was probed live for the first time in this sequence:
the production endpoint exists, is HTTPS-reachable, enforces the webhook HMAC
gate, and has `RAZORPAY_WEBHOOK_SECRET` configured (evidence below). What can
NOT be verified from this environment — Razorpay Dashboard webhook
configuration, provider-originated event delivery, dashboard redelivery, and
anything live-mode — is classified **DEPLOYMENT VERIFICATION REQUIRED** and is
left unchecked in the runbook checklist. Nothing is fabricated.

One concrete deployment-boundary defect was found and fixed (fail-closed,
smallest change): `scripts/validate-env.mjs` did not require the webhook
secret or the public checkout key, and it leaked credential prefixes into
deployment logs. Details in §4/§5.

Layer classification (never combined):

| Layer | Status |
|---|---|
| REPOSITORY VERIFIED | All gates + 265/265 suite runs (this ticket) |
| TEST MODE VERIFIED | D.7.3: 4 links / 3 real captures / idempotency (local signed harness over real entities) |
| PUBLIC DEPLOYMENT VERIFIED | Config/security layer only: endpoint live, secret configured, HMAC enforcing, zero-mutation rejections |
| LIVE MODE VERIFIED | None |
| DEPLOYMENT VERIFICATION REQUIRED | Provider-originated deliveries (captured/failed/refunds/redelivery), post-deploy repeat-purchase smoke, deployed-build content, live mode |

## 2. Baseline

Read D.7.3 closure; verified its four staged artifacts intact
(`git diff --cached --stat`: 1152 insertions across actions/provider/test/closure).
Registry: DIRECT_CREATOR `active`, PLATFORM_COLLECT `active`
(`registry.ts` read back at baseline and re-pinned by the new guardrail).
Working tree unchanged from D.7.3 end state (same unrelated dirty streams;
none disturbed). Dev server restarted twice during this ticket — once after
D.7.3's `npm run build` corrupted `.next` dev chunks under the running server
(MODULE_NOT_FOUND in webpack-runtime; infrastructure artifact, not app logic),
once after this ticket's own build — both per dev-server-lifecycle policy.

## 3. Deployment Environment Audit

| Surface | Finding |
|---|---|
| Deployment target | `NEXT_PUBLIC_APP_URL=https://influencer-space-alpha.vercel.app` (.env.example) |
| HTTPS reachability | **PUBLIC DEPLOYMENT VERIFIED** — root returns 200 over HTTPS |
| Webhook route liveness | **PUBLIC DEPLOYMENT VERIFIED** — `GET /api/webhooks/razorpay` → 405 (POST-only, as designed) |
| Secret configured in production | **PUBLIC DEPLOYMENT VERIFIED** — unsigned POST probe → **401 Invalid signature** (a missing secret would answer 500 before the signature gate; see §5) |
| Deployed build contains D.7.x fixes | **NOT AVAILABLE TO VERIFY / NO by construction** — D-chain work is staged-only, never pushed; the deployed build predates D.7.3 |
| Razorpay Dashboard access | Not available in this environment (API key pair ≠ dashboard login) |

## 4. Environment-Variable Classification

Values are never printed; presence only.

| Variable | .env.example | Local dev (.env.local) | Production |
|---|---|---|---|
| RAZORPAY_KEY_ID / _SECRET | documented (platform) | PRESENT | NOT AVAILABLE TO VERIFY directly; indirectly evidenced live: platform serves traffic (root 200) |
| NEXT_PUBLIC_RAZORPAY_KEY_ID | documented | PRESENT | NOT AVAILABLE TO VERIFY (now deploy-gated) |
| RAZORPAY_WEBHOOK_SECRET | documented ("REQUIRED… fails closed (500)") | PRESENT | **VERIFIED CONFIGURED via 401-probe** |
| TOKEN_ENCRYPTION_KEY | documented (AES-256-GCM) | PRESENT | NOT AVAILABLE TO VERIFY (now covered by existing REQUIRED entry) |
| Creator credentials | n/a — PaymentAccount rows, encrypted at rest (AES-256-GCM via lib/crypto), never in source/tests | TEST_RAZORPAY_* pair separate from platform pair | NOT AVAILABLE TO VERIFY |

Separation confirmed structurally: platform API keys ≠ public browser key ≠
webhook secret ≠ encryption key ≠ creator-stored credentials (see §10).
Local presence is explicitly NOT proof of production configuration.

## 5. Webhook Endpoint Audit + Defect Fixed

Route (`src/app/api/webhooks/razorpay/route.ts`) application-level behavior,
each pinned by existing suites (d55/d61) and re-pinned where touched:

| Scenario | Expected | Evidence |
|---|---|---|
| Missing secret | 500, zero mutation, pre-parse | route source + d61 "unconfigured webhook secret → 500" |
| Missing signature | 401 | d55 "rejects a missing signature header" |
| Invalid signature | 401 | d55 "rejects an invalid signature" |
| Wrong secret | 401 | d55 "payload signed with the WRONG webhook secret" |
| Tampered body after signing | 401 | d55 "body TAMPERED after signing" |
| Short/malformed signature | 401 (length guard, no crash) | d55 "malformed length-mismatched signature" |
| Valid signature | normal processing | d61 full matrix |
| Valid signature + malformed JSON | 400, zero mutation | d55/d61 (×2 suites) |
| Duplicate valid event | 200, single financial mutation | d55+d61 sequential AND concurrent collapse |

**Defect found & fixed (smallest fail-closed change):**
`scripts/validate-env.mjs` REQUIRED lacked `RAZORPAY_WEBHOOK_SECRET` (a deploy
without it passed validation while ALL webhook processing would 500 at runtime
— exactly the gap D.6.3 deferred to this boundary) and lacked
`NEXT_PUBLIC_RAZORPAY_KEY_ID` (PLATFORM_COLLECT browser checkout silently
broken without it). Additionally the validator echoed 12-char PREFIXES of
credential values (key secret, encryption key) into deployment logs — a
diagnostics leak inside this ticket's Phase-1 scope.

Change: both keys added to REQUIRED (placeholder/empty still reject → exit 1);
reporting made presence-only (`Set (N chars)`). Verified: local run lists all
payment vars present; forced-empty probe lists them MISSING and exits 1.
Focused suite: `tests/unit/rccf72-18d74-deploy-gate.test.ts` (5 tests) pins
all of the above + registry-active states + unchanged route fail-closed path.

## 6. Razorpay Dashboard Event Requirements

Confirmed against route source — no events added:

| Event class | Route handling |
|---|---|
| `payment.captured` | Product completion: legacy notes block (PLATFORM_COLLECT) + D.6.1 DIRECT_CREATOR plink reconciliation. AUTHORITATIVE (unchanged). |
| `payment.failed` | Sanitized diagnostics only (`sanitizeFailureReason`); never completes; also feeds subscription failure handling via SUBSCRIPTION_EVENTS |
| `refund.processed` / `refund.failed` | Ledger convergence (provider-truth clamp, refund-id keyed dedupe); FAILED restores headroom |
| `subscription.*`, `order.paid` | PLATFORM_COLLECT billing service (SUBSCRIPTION_EVENTS set) |
| `payment_link.paid` | **UNHANDLED by design** — no branch exists; reconciliation is fully served by `payment.captured` which carries link identity + notes. Documented, not changed. |

Dashboard configuration itself = DEPLOYMENT VERIFICATION REQUIRED (§8).

## 7–8. Public Webhook Verification & Provider-Originated Delivery

**Verified live (config/security layer):** the unsigned-POST probe returning
`401 Invalid signature` proves, on the REAL deployed endpoint: secret present,
HMAC gate first-class, rejection pre-parse with zero mutation. This is the
first genuinely public evidence in the D-chain.

**DEPLOYMENT VERIFICATION REQUIRED (not fabricated):** provider-originated
delivery chain — Dashboard webhook registration on the creator Test Mode
account, real `payment.captured`/`payment.failed`/`refund.processed`/
`refund.failed` arriving over the wire, and Dashboard redelivery. The
application side of every one of these flows IS proven (Test Mode entities +
signed local harness + suites); only the wire hop needs a human with
Dashboard access.

Evidence provenance discipline maintained throughout:
- signed local harness = transport emulation, labeled as such
- provider API-created entity = REAL (fetched live)
- provider-originated webhook delivery = NOT CLAIMED anywhere

## 9. Duplicate Delivery

Wire-level redelivery: DEPLOYMENT VERIFICATION REQUIRED (needs Dashboard
resend). Application idempotency: REPOSITORY VERIFIED — sequential AND
concurrent duplicate collapses pinned by two independent suites and exercised
live in D.7.3 (byte-identical replays → no second completion/fulfillment/event).

## 10. payment.failed

Live local exercise THIS ticket: the REAL provider-created failed payment
`pay_TSof9RnIfHH1H9` (₹10, netbanking, carries creatorStore notes) fetched
from the Test Mode API and delivered through the signed local harness with a
whitespace-padded `X-Razorpay-Failure-Reason`. Result: `200 {ok:true}`;
DB verified ZERO mutation — no order matched (correct skip), no BillingEvent,
no completion; all four D.7.3 COMPLETED orders untouched. Sanitization
persistence itself remains pinned by d55. Provider-wire observation:
DEPLOYMENT VERIFICATION REQUIRED.

## 11–12. refund.processed / refund.failed

No new external refund executed (per ticket allowance; zero refund-path code
changed). Repository proof: D.5.1 ledger integrity suite, d55 refund
determinism (processed-then-failed and failed-then-processed ownership),
historical-binding guardrails — all PASS in this ticket's runs. D.7.2 holds
the real partial-refund + refund.processed convergence evidence. Wire-level
refund webhooks: DEPLOYMENT VERIFICATION REQUIRED.

## 13. HMAC Security

Source-verified and test-pinned: raw-body HMAC-SHA256, timingSafeEqual with
explicit length guard (401 not 500 on malformed), signature gate strictly
before JSON parse and any mutation, missing-secret 500 pre-parse. Public
endpoint enforcement confirmed by the live 401 probe. No bypasses created.

## 14. D.6.1 Identity Verification

Reconfirmed unchanged (source read + suites):

```
reference_id            = reconciliationRef (D.7.3)
providerReference       = plink id   (PRIMARY)
providerMetadata.reconciliationRef = same token (FALLBACK)
notes.reconciliationRef = provider-propagated echo
```

Primary/fallback resolution, conflict refusal, amount-mismatch refusal,
unknown-identity refusal, cross-tenant refusal — all green inside the 265-test
matrix (d61 alone spans identity/conflict/amount/state/signature/idempotency).

## 15. Fallback Identity Policy

**DEFERRED / POLICY REQUIRED — code unchanged.**

The disclosed behavior: a webhook-secret-SIGNED delivery carrying the exact
server-persisted token + exact amount completes via FALLBACK even when the
plink id is unknown (exercised honestly in D.7.3 §15). Options evaluated:

- **Option A — require BOTH identities:** strongest (drops the fallback's
  standalone authority); changes reconciliation semantics; needs its own RCCF
  with regression rewrite; risks orders whose payloads legitimately lack the
  top-level link entity depending on Razorpay payload variants.
- **Option B — fallback with stronger provider evidence:** e.g. require
  `description: "#plink_…" corroboration or amount+currency+notes triple-match;
  middle ground, still a semantic change needing design sign-off.
- **Option C — retain fallback as-is:** defensible TODAY because the boundary
  is webhook-HMAC trust + server-persisted exact equality + exact amount; the
  token is unguessable (UUIDv4) and only leaves the server via provider
  propagation. Residual risk requires webhook-secret compromise OR
  creator-dashboard insider access — outside wire-threat scope.

Recommendation recorded (not implemented): keep C for launch; schedule A/B as
a hardening follow-up once production telemetry shows how often payloads lack
top-level link identity. Decision owner: project policy.

## 16. Creator Selling Gate

Reconfirmed (D.7.1): WHATSAPP exempt (early return); ONLINE/BOTH require
`computePaymentReadiness = ready` (strategy → PaymentAccount → provider-
verified credentials → settlement); enforced on create-into-sellable,
transition-into-sellable, and WHATSAPP→ONLINE upgrades; pure metadata edits of
already-sellable products are NOT destructively blocked; checkout readiness
remains the final money authority on later lapse. Suite green in matrix.

## 17. Repeat-Purchase Deployment Verification

- Repository/Test Mode proof: **PASS** (D.7.3 — 4 distinct links, 3 real captures).
- Deployment proof: **REQUIRED** — the deployed build predates the fix
  (staged-only work is not shipped). Post-deploy smoke ×2 same-product listed
  unchecked in the runbook.

## 18. PLATFORM_COLLECT Regression

Registry untouched; legacy notes-completion block untouched; subscription
lifecycle + plan-source + webhook-payment-guard suites green; platform
checkout key now deploy-gated (protects, not breaks). Creator-direct
configuration cannot affect platform subscription billing (separate
credential surface; separate webhook branches).

## 19. Observability

Present (source-verified): captureError across route/reconciliation/payment-
account boundaries; BillingEvent financial audit trail; logAction audit log;
runtimeEventBus `payment.account.*` lifecycle events; sanitized failure
reasons; direct-creator reconciliation refusal diagnostics with tenant-safe
context. Alerting/dashboards: none exist — **FUTURE OBSERVABILITY**, not
classified a launch blocker by this ticket.

## 20. Live-Money Verification Status

**DEPLOYMENT / OPERATIONAL REQUIRED.** No explicit operational authorization
exists in this environment; no live transaction attempted; none fabricated.
Runbook live-mode items remain unchecked.

## 21. Exact Remaining Deployment Prerequisites

1. Ship staged D-chain/D.7.x work (build currently deployed lacks D.7.3).
2. Configure the creator-account webhook endpoint in Razorpay Dashboard
   (events: payment.captured, payment.failed, refund.processed,
   refund.failed; + platform events if shared endpoint).
3. Observe one provider-originated Test Mode capture through the wire →
   COMPLETED with single fulfillment/event.
4. Dashboard resend → idempotent no-op through the wire.
5. Generate one Test Mode failure + (if available) one refund processed/failed
   through the wire.
6. Post-deploy repeat-purchase smoke (same product ×2 → distinct links).
7. Live-mode items (credentials/webhook/smoke/refund) under explicit
   operational authorization.

## 22. Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (0) |
| `npm run lint` | PASS (0; one pre-existing unused-var warning in an unrelated file) |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| `git diff --check` | PASS (CRLF notices only, consistent baseline) |
| D-chain + platform/gate suites (16 files) | **265/265 PASS** (D.5.1, D.5.5, D.6.1–D.6.5, D.7.1, D.7.2, D.7.3, D.7.4 new, commerce-strategy, payment-account, billing lifecycle/plan-source, webhook payment guard) |
| validate-env runtime behavior | PASS locally; fail-closed exit 1 with forced-empty secret/key |
| Full-sweep comparison vs D.7.3 baseline | D.7.3 recorded 23 failures across 11 unrelated files (dashboard/theme/products/rccf66/rccf68/rccf72-16b streams). This ticket's delta (validate-env script + one new test file + docs) touches NONE of those surfaces — grep-verified non-coupling; no new failures introduced or observed in targeted runs |

No failure is claimed pre-existing without the D.7.3-baseline cross-reference
and coupling check above.

## 23. Protected Work

No reset/checkout/stash/clean/amend/rebase. Mixed files handled surgically:
runbook checklist (staged D-chain doc) edited in place — protected content
intact, additions scoped to a new section + one stale-line correction.
Unrelated dirty streams untouched. Dev server left running healthy
(worker 25556).

## 24. Exact Staged Files

1. `scripts/validate-env.mjs` — deployment-gate defect fix (required keys + presence-only logging)
2. `tests/unit/rccf72-18d74-deploy-gate.test.ts` — NEW focused suite (5 tests)
3. `docs/runbooks/direct-creator-production-checklist.md` — stale-status fix + new "Deployment verification boundary" section
4. `docs/rccf-72.18d7.4-production-webhook-deployment-verification-closure.md` — NEW (this document)

`git diff --cached --check`: PASS. Staged-diff secret scan: CLEAN.

## 25. DIRECT_CREATOR Status

`active` (baseline read-back + guardrail-pinned). Selling gate active. Untouched.

## 26. Commit / Push Status

Commit: **NOT CREATED**. Push: **NOT PERFORMED**. Work ends staged, per RCCF
discipline. STOP — no further RCCF started automatically.
