# DIRECT_CREATOR Production Readiness Checklist

Machine-auditable companion to `rccf-72.18d6.3-production-configuration-operational-readiness-closure.md`.
Every item cites its enforcing artifact (code path / test / doc).

## Application

- [x] DIRECT_CREATOR registry status `active` (activated RCCF-72.18D.6.5)
      — `src/modules/commerce-strategy/application/registry.ts`; rccf72-18d63/d65 suites
- [x] Readiness requires provider-verified credentials (`verified`, not `configured`)
      — `payment-account/application/runtime.ts computePaymentReadiness`; rccf72-18d62/d63 suites
- [x] Payment Link reconciliation active (plink id → providerReference, reconciliationRef → providerMetadata)
      — `billing/application/direct-creator-reconciliation.ts`; rccf72-18d61 suite
- [x] Refund ledger invariant active (`0 ≤ refundAmount ≤ captured`; reservation = refundStatus PENDING)
      — D.5.1 implementation + suites
- [x] Webhook HMAC-SHA256 active, timing-safe, fail-closed on missing secret
      — `api/webhooks/razorpay/route.ts`; d55/d61/d63 suites
- [x] Webhook idempotency active (BillingEvent unique keys; duplicate/concurrent collapse)
      — d55/d61 suites
- [x] Tenant isolation active (webhook identity-derived; actions session-scoped)
      — rccf69/rccf72-18d61/d62 suites
- [x] Historical PaymentAccount binding active (refunds use order.paymentAccountId)
      — D.2/D.4; runbook §7

## Configuration

- [x] Platform Razorpay credentials documented (`RAZORPAY_KEY_ID/SECRET`) — `.env.example`
- [x] Public checkout key documented (`NEXT_PUBLIC_RAZORPAY_KEY_ID`) — `.env.example` (added D.6.3)
- [x] Webhook secret documented + fail-closed without it (`RAZORPAY_WEBHOOK_SECRET`) — `.env.example` (added D.6.3); route returns 500
- [x] Credential encryption key documented (`TOKEN_ENCRYPTION_KEY`, AES-256-GCM) — `.env.example`; `lib/crypto.ts`
- [ ] **DEPLOY TASK:** set real values in the production environment (never in source); configure the SAME webhook secret in Razorpay Dashboard → Webhooks
- [x] Creator credentials never in source/tests; production `.env` gitignored
      — guardrails: rccf72-18d63 §D placeholder scan

## Creator onboarding

- [x] Creator can connect credentials (encrypted at rest) — `/admin/payments`
- [x] Creator can explicitly verify (1 probe = 1 read-only authenticated call)
- [x] Verified state persisted with `lastVerifiedAt` (surfaced safely in UI, D.6.3)
- [x] Failed verification is truthful and permanent-classified (`credential_failed`)
- [x] Transient failures do not destroy verified state (no-write rule)
- [x] Credential changes invalidate verification (→ pending)
- [x] Disconnect invalidates readiness (disconnected + unverified)
- [x] Legacy `configured` creators migrate by explicit re-verification (no data migration)

## Operations

- [ ] **DEPLOY TASK:** create/configure the Razorpay webhook endpoint (production URL) with required events:
      `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`
      (+ platform billing: `subscription.*`, `order.paid`)
- [x] Failure monitoring available — captureError diagnostics (classification, tenant-safe ids)
- [x] Refund monitoring available — BillingEvent types REFUND_*, audit log
- [x] Reconciliation monitoring available — direct-creator-reconciliation diagnostics
- [x] No sensitive logs — secrets excluded from results/logs/events/errors (test-pinned)

## Deployment verification boundary (RCCF-72.18D.7.4)

Classification legend: repository/Test-Mode proof vs public-deployment proof
are NEVER combined. Unchecked = DEPLOYMENT VERIFICATION REQUIRED.

### Public endpoint (probed live by D.7.4)

- [x] HTTPS deployment reachable — `https://influencer-space-alpha.vercel.app` (200)
- [x] `POST /api/webhooks/razorpay` live on the deployed build (GET → 405, POST-only as designed)
- [x] `RAZORPAY_WEBHOOK_SECRET` configured in the production environment
      — unsigned POST probe → **401 Invalid signature** (500 would mean missing secret)
- [x] Invalid/unsigned traffic rejected with zero mutation on the public route

### Deployed application build

- [ ] **DEPLOY TASK:** ship the staged D-chain/D.7.x work (D.7.3 repeat-purchase fix is
      staged-only and therefore NOT in the currently deployed build)
- [ ] Post-deploy smoke: same product checkout ×2 → distinct Payment Links / reference_ids

### Razorpay Dashboard (creator Test Mode account)

- [ ] Configure webhook endpoint (public URL) with: `payment.captured`,
      `payment.failed`, `refund.processed`, `refund.failed`
      (+ platform billing events if the endpoint also serves PLATFORM_COLLECT)
- [ ] Provider-originated `payment.captured` delivery observed by the application
- [ ] Dashboard resend/redelivery → idempotent no-op observed through the wire
- [ ] Provider-originated `payment.failed` observed (no completion/no fulfillment/no event)
- [ ] Provider-originated `refund.processed` → ledger/state convergence via wire
- [ ] Provider-originated `refund.failed` → headroom restored via wire

### Live mode

- [ ] Live credentials + webhook configured on the LIVE creator account
- [ ] Deliberate minimal live smoke transaction (OPERATIONAL AUTHORIZATION REQUIRED)
- [ ] Live refund verification if approved

## Rollback / reversibility

- [x] Activation is a one-line registry flip (D.6.5) — reversible by reverting that line
- [x] PLATFORM_COLLECT behavior independent (readiness branch untouched; own webhook paths intact)
- [x] DIRECT_CREATOR can be disabled post-activation without deleting creator accounts or orders
      (flip back to `future`; checkout gate closes immediately; reconciliation of in-flight payments remains safe)
- [x] Historical refunds remain correctly bound regardless of account changes
