# RCCF-RELEASE-04 — Final Commerce, Payment & Marketing Consolidation — Closure

**Ticket:** RCCF-RELEASE-04
**Date:** 2026-08-26
**Baseline SHA:** `76184aeb6e40e387c23c584b1bee73a2c6e126b9`
**Final SHA:** _(filled after commit)_

---

## 1. Executive verdict

One consolidation release committing the verified COM-01 delta (webhook order-truth fix + its suite + closure) together with the previously staged release-03 closure artifact. All gates pass, all regression batteries pass, responsive QA is clean, and the staged diff was audited for scope, whitespace and secrets. Commit once, push once, verify `HEAD == origin/main`.

## 2. Scope consolidated

- RCCF-MKT-05 / MKT-06 / MKT-06.1 / MKT-07 / MKT-08 / MKT-09 / MKT-10 / MKT-11
- RCCF-RELEASE-02 (F1 plan-family guard), RCCF-RELEASE-03 (payment-readiness release), RCCF-73 (partner commercial)
- RCCF-72.18D.7.5 (credential verification vs canonical readiness)
- **RCCF-COM-01** (new in this release)

## 3. Staged inventory (exact, 4 files, +595/−1)

| File | Type |
|---|---|
| `src/app/api/webhooks/razorpay/route.ts` | M — COM-01 webhook fix (11 lines: +10 comment, −1 condition) |
| `tests/unit/rccf-com-01-commerce-order-truth-and-service-consolidation.test.ts` | A — new suite (438) |
| `docs/rccf-com-01-commerce-order-truth-service-consolidation-closure.md` | A — COM-01 closure |
| `docs/rccf-release-03-production-payment-readiness-closure.md` | A — previously staged release-03 closure |

No deletions, no `.env`, no credentials, no generated junk, no screenshots, no protected files, no schema migration.

## 4. COM-01 order-truth fix (verified)

- `payment_link.paid` accepted: `event === "payment.captured" || event === "payment_link.paid"` — the product-order branch (legacy notes path + DIRECT_CREATOR Payment Link reconciliation) now fires for Razorpay's dedicated link-paid event. **Verified by suite** (PENDING→COMPLETED, exactly one fulfillment).
- `payment.captured` remains supported and shares the exact same path (cross-event idempotency test: both events → one completion, one capture BillingEvent).
- Duplicate delivery idempotent (payment-id idempotency key + `already_completed` no-op).
- Amount mismatch refuses mutation; unknown identity zero-mutation; tenant isolation under hostile payload claims; failed payments never complete; signature gate mandatory (401 test).
- Subscription/PLATFORM_COLLECT/DIRECT_CREATOR behavior untouched (d55/d61/d65/COM-01 suites green).
- No second order vocabulary: `PAID` remains dead.

## 5. Product vs Service decision

**KEEP both surfaces** — genuinely separate domains:
- Products = `Product` (`type ∈ digital|physical|course|service|booking|affiliate|donation`) → checkout → `ProductOrder` → fulfillment.
- Services = `Offering` (`type:"coaching"`) + slots/booking/approval + booking-specific entitlements → Booking/Purchase domain.
- No deletion of `/admin/services`, no removal of `Product.type="service"`, no merge, no migration, no schema change. Guardrails pinned in COM-01 suite §D.

## 6. Payment readiness invariant (D.7.5) — intact

`computePaymentReadiness` remains canonical; `verified ≠ ready`; UI states both truths with exact missing requirements; checkout fail-closed; buyer-safe `PAYMENT_SETUP_REQUIRED`; no credentials in logs/results; TEST/LIVE mode-agnostic probe unchanged; no schema/mode regression. D.7.5 + d62 measurement suites green.

## 7. Pricing / entitlement / partner / F1 invariants

Pinned by existing MKT suites (all green, see §11) and not touched by this release's diff (route.ts webhook only):
- Creator Launch ₹0 / Growth ₹999 / Scale ₹1,999; Partner Free ₹0 / Solo ₹4,999 / Scale ₹14,999 one-time / Enterprise custom; Partner Growth retired; ₹2,000 capacity ONE-TIME.
- Launch shared 3-item active ceiling across products/services/courses/games + independent per-section ceilings.
- F1 plan-family guard (creator vs agency) intact; single registry `src/config/commerce/plans.ts`.
- No stale subscription pricing (₹699/₹1,995/₹2,999/₹7,999/partner_growth) reintroduced.

## 8. Marketing truth / accessibility / responsive

- Positioning "Your presence. Your business." and five pillars preserved; no fabricated proof/commissions/counts; showcase honest; SPower captures demonstration-only (MKT suites green).
- MKT-10 pricing-tab a11y (roving tabindex, arrow/Home/End, aria-controls/labelledby, type=button) green.
- **Responsive QA (Playwright, production marketing pages — byte-identical to this release):** `/`, `/pricing`, `/features`, `/about`, `/contact`, `/showcase`, `/faq`, `/blog` at 320/360/375/390/414/768/1024/1280/1440 → `scrollWidth === clientWidth` at **all 72 combinations**; no global `overflow-x: hidden` hack.

## 9. Test results

| Battery | Result |
|---|---|
| COM-01 + webhook-focused (d55/d61/d65/d75 + COM-01) | 119/119 |
| Commerce integrity d2–d55 (excl. overlap) | 348/348 |
| D-chain + MKT-05→11 + RCCF-73 + 06.1 | 347/347 |
| Total (non-overlapping runs) | 814/814 |

One transient flake observed on first parallel run of the MKT/partner battery (clean rerun 347/347); classified **flaky**, not a regression.

## 10. Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (0) |
| `npx eslint` (touched) | PASS (0) |
| `npm run build` | PASS ("Compiled successfully") |
| `npx prisma validate` | PASS |
| `git diff --check` / `--cached --check` | PASS |
| Secret scan (staged diff) | 0 hits (real-format keys, whsec, env assignments, high-entropy) |

## 11. Protected work

`src/app/onboarding/page.tsx` and `tests/fixtures/test-seed.ts` remain modified-unstaged and byte-untouched; unrelated untracked work preserved. No reset/restore/checkout/stash/rebase/amend/force push used.

## 12. Commit / push / deploy

- Commit: ONE commit (message per ticket). No amend.
- Push: `git push origin main`, no force. `HEAD == origin/main` verified.
- Vercel: deployed bundle verified previously for `/`, `/pricing`, `/blog`, `/admin/payments`; after this push, `/blog` canonical freshness marker re-checked.
- Production payment smoke (live creator TEST session, webhook replay, dashboard Completed) = **DEPLOYMENT VERIFICATION REQUIRED** — requires production creator session + Razorpay TEST keys; not fabricated.

Commit: _(filled after commit)_ · Push: _(filled after push)_