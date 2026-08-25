# RCCF-72.18D.7.5 — Creator Razorpay credential verification vs canonical payment readiness — Closure

**Ticket:** RCCF-72.18D.7.5
**Date:** 2026-08-26
**Verdict:** **B — APPLICATION READY / DEPLOYMENT VERIFICATION REQUIRED**
(The deployed host `https://influencer-space-alpha.vercel.app` still serves the pre-fix bundle — same production-stale caveat recorded in RCCF-MKT-11. The fix is verified locally and staged; it becomes visible only after the staged set is committed and deployed.)

---

## 1. Reported production divergence

1. Creator opens Admin → Payments, enters Razorpay credentials (`rzp_test_*` or `rzp_live_*`), saves.
2. Creator clicks **Verify** → UI reports **"Provider credentials verified."**
3. A buyer attempts checkout on the storefront.
4. Storefront rejects: **"Payments for this store aren't available yet."** (internal denial `"Creator payment account not ready"`).
5. For LIVE keys the creator additionally reports a "LIVE warning" — actually the amber readiness badge.

Creators are told their credentials work while checkout stays closed, with no actionable next step.

## 2. Root cause classification

**Classification A — UI/state-communication defect.** Checkout fail-closed behavior is CORRECT; the readiness engine is CORRECT; persistence is CORRECT.

Evidence:

- `computePaymentReadiness` (`src/modules/payment-account/application/runtime.ts`) requires six conditions: active strategy registration, provider adapter present, credentials configured (`hasProviderKeys || upiId || bankAccountName`), holder identity (`accountHolderName`), settlement detail (UPI → `upiId`; bank → name+number+IFSC), and `verificationStatus === "verified"`. Severity bands: at most 2 missing → `warning`, more → `blocked`.
- The verification probe (`RazorpayPaymentAdapter.getAccountStatus`, authenticated GET `/v1/orders`) proves only that the key pair **authenticates**; it cannot prove identity/settlement completeness.
- "Verified" and "ready" are therefore different states; a keys-only verified account is legitimately not ready. The defect: `verifyPaymentAccount` returned no readiness information, so the creator UI could never explain what remained.
- TEST/LIVE analysis: the adapter accepts any `rzp_test_*`/`rzp_live_*` prefix with **no persisted mode column** on `PaymentAccount` (`prisma/schema.prisma`). Both prefixes take an identical probe path; the reported "LIVE + warning" was the amber readiness badge (missing-requirements list), not a mode warning. No schema change warranted.

## 3. Fix (minimal, single-authority, fail-closed preserved)

| File | Change |
|---|---|
| `src/modules/payment-account/application/runtime.ts` | `verifyPaymentAccount` success path also returns `readiness` — the CANONICAL snapshot from `await computePaymentReadiness(tenantId)` (never hand-rolled). Return type widened with optional `readiness?: PaymentReadinessReport`. |
| `src/actions/payment-account.actions.ts` | `verifyMyPaymentAccount` return type widened to pass the snapshot through. Gate strings untouched. |
| `src/app/admin/payments/_components/payments-client.tsx` | Verify handler states both truths: ready → "Provider credentials verified. Your payment account is ready to accept storefront payments."; not ready → "Provider credentials verified. Storefront payments stay unavailable until you complete: {exact missing labels}." |
| `src/actions/checkout.actions.ts` | DIRECT branch maps the internal denial to buyer-safe copy + stable category: `{ error: "Payments for this store aren't available yet. Please contact the seller.", code: "PAYMENT_SETUP_REQUIRED" }`. `CheckoutResult` gained optional `code?: string`. Fail-closed semantics unchanged. |

No schema migration. No provider-call changes. No new environment variables.

## 4. New test suite

`tests/unit/rccf72-18d75-payment-readiness-production-fix.test.ts` — **25 tests, all passing.** Renders the real client component against the real server action and real readiness runtime (Prisma stubbed at the boundary); `createElement` keeps the `.ts` suite JSX-free.

Coverage map:

- **A. Readiness truth matrix** — keys-only verified ≠ ready (identity + settlement enumerated); verified+holder without settlement = `warning`; complete UPI = `ready`; bank needs name+number+IFSC together; unverified/pending/configured/failed all fail-closed; cross-tenant isolation; severity bands (2 missing=warning, 3=blocked); PLATFORM_COLLECT regression.
- **B. The fix** — verify response carries `verified:true` AND canonical `readiness` matching a fresh `computePaymentReadiness` exactly; failed verification carries no readiness payload.
- **C. TEST/LIVE parity** — real adapter: both prefixes take the identical authenticated probe; malformed ids fail closed without a provider call.
- **D. Checkout boundary** — verified-incomplete denied with zero side effects; ready allowed with order binding tenant/strategy/paymentAccountId; unverified denied; server-authoritative tenant blocks cross-tenant purchase; inactive strategy refused before readiness.
- **E. Buyer-safe mapping** — source guardrails pin `PAYMENT_SETUP_REQUIRED`, safe copy, mapping trigger, `code?: string`, and the untouched canonical gate in the direct action.
- **F. Creator UI contract** — incomplete account: message names the EXACT missing requirements and never claims "ready"; complete account: message states readiness explicitly (RTL render of the real component).
- **G. Security/hygiene** — zero credential material in results/events/logs/captured errors; anonymous callers denied; requirement label stability pinned.

## 5. Regression coverage & guardrail modernization

- D.6.x/D.7.x battery (`rccf72-18d61…65`, `d71–d75` incl. whatsapp CTA): **195/195 passing**.
- Commerce integrity (`rccf72-18d2…d55`): **376/376 passing** ("Direct creator checkout is not available yet." untouched).
- MKT-05→MKT-11 guardrails: **184/184 passing**.
- **One stale guardrail modernized (recorded):** `rccf72-18d62` measurement asserted exactly ONE account read per verification. D.7.5 adds one indexed single-row re-read (request-cached) to build the readiness snapshot; provider calls remain exactly ONE, guarded writes remain exactly ONE, historical orders untouched. Assertion updated with an inline comment referencing D.7.5. No N+1 introduced.
- Diagnostic scratch file removed before staging; pre-existing unrelated untracked files left alone.

## 6. Verification gate

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npx eslint` (all touched files) | PASS (0 problems) |
| `npm run build` | PASS ("Compiled successfully") |
| `npx prisma validate` | PASS |
| `git diff --check` (whitespace) | PASS |

## 7. Staged artifacts

- `src/modules/payment-account/application/runtime.ts`
- `src/actions/payment-account.actions.ts`
- `src/actions/checkout.actions.ts`
- `src/app/admin/payments/_components/payments-client.tsx`
- `tests/unit/rccf72-18d75-payment-readiness-production-fix.test.ts` (new)
- `tests/unit/rccf72-18d62-provider-credential-verification.test.ts` (modernized measurement)
- `docs/rccf-72.18d7.5-creator-payment-readiness-production-fix-closure.md` (this document)

## 8. Deployment notes

1. After commit + deploy, re-run the MKT-11/D.7.5 production smoke against the live host (currently serving a stale baseline).
2. Optional follow-up (out of scope): surface the readiness badge's missing list directly next to the Verify button so creators see remaining steps before verifying.
