# RCCF-72.18D.7.1 — Creator Payment Readiness & Storefront Selling Gate — Closure

## 1. Executive Verdict

**A — IMPLEMENTED AND VERIFIED.** Staged, NOT committed, NOT pushed.

An ONLINE or BOTH offering can no longer become sellable unless the tenant's
canonical payment readiness is `ready`. WHATSAPP-only commerce remains sellable
with zero payment setup. Three boundaries stand: **A** (new publishing gate),
**B** (storefront fails-safe, audited), **C** (checkout — unchanged final
authority). DIRECT_CREATOR and PLATFORM_COLLECT both remain `active`.

## 2. Business Contract

| commerceMode | Payment setup required to become sellable? |
|---|---|
| ONLINE | YES |
| BOTH | YES (it promises online payment) |
| WHATSAPP | NO — pure lead CTA, exempt |

## 3. Canonical Readiness (reused — no second implementation)

`computePaymentReadiness(tenantId)` from `@/modules/payment-account` — the same
D.6.2/D.6.3 runtime (strategy → PaymentAccount active → `verified` credentials →
decrypt → holder + settlement). Legacy `configured` cannot satisfy it.
Agency/platform creators pass automatically because canonical readiness is
strategy-aware (PLATFORM_COLLECT ⇒ ready) — Phase 10 satisfied by reuse, with a
regression test pinning the contract shape.

## 4. Publishing Gate (Boundary A)

Enforced inside the single product-write authority,
`src/features/products/service.ts`:

- **create** — gate runs when the created state is sellable
  (`status ?? "PUBLISHED"` === PUBLISHED && `isActive ?? true`) and mode ≠ WHATSAPP.
- **update** — gate runs only when the update would GRANT online sellability:
  draft/inactive → sellable transition, reactivation, or WHATSAPP→ONLINE/BOTH
  mode upgrade on an already-sellable product.
- Rejection: coded error `PAYMENT_SETUP_REQUIRED` with the safe creator message;
  no partial write (gate precedes any Prisma mutation).
- Pure metadata edits of an already-sellable product with unchanged mode are NOT
  blocked (Phase 6 — existing published offerings stay intact; checkout Boundary C
  still protects customers if readiness later lapses).

## 5. Storefront Gate (Boundary B)

Audited `BuyNowButton`: when checkout refuses ("Creator payment account not
ready") the storefront shows an error toast, never opens the gateway, never fakes
success; preview mode is inert; WHATSAPP CTAs render independently of payment
state. No anonymous-traffic payment queries were added (§22 honored). BOTH mode
is never downgraded — commerceMode persistence untouched.

## 6. Checkout Gate (Boundary C)

Unchanged: `checkout.actions` still requires PUBLISHED product + strategy gate +
`createDirectCheckout`'s full readiness verification. Source-contract test pins
the chain (PUBLISHED lookup → createDirectCheckout → computePaymentReadiness ≠
ready refuses).

## 7. Agency Regression

No agency-specific code paths touched; platform-collected creators keep selling
via canonical readiness-by-strategy (pinned by test).

## 8. Security

- Tenant for the gate = server session tenant (`session?.user?.tenantId`);
  client cannot inject tenantId/paymentAccountId/verificationStatus/canSellOnline.
- Foreign-tenant product ids resolve to not-found (pinned).
- Gate contains no credential/verification vocabulary (source-scan guardrail).
- Server-side enforcement only; client UX is informational.

## 9. Performance

One request-cached `computePaymentReadiness` call per create/gating-update —
no per-offering loops, no N+1, no new cache layer, no anonymous-storefront
payment queries.

## 10. Creator UX (Phase 9)

`products-page` save errors surface a guided banner:
"Payment setup required … Open Admin → Payments to connect and verify your
account." with a **Set up payments** link to `/admin/payments`. Unknown failures
rethrow (never swallowed).

## 11. Test Matrix — `tests/unit/rccf72-18d71-selling-gate.test.ts` (24 tests)

CREATE: ONLINE+ready ALLOW · ONLINE×{unverified,pending,failed,configured} DENY ·
no-account DENY · missing-settlement DENY · BOTH ready/unready ·
WHATSAPP×{none,unverified,failed} ALLOW · DRAFT/inactive no-setup ·
platform-collect reuse.
UPDATE: draft→published deny/allow · already-sellable metadata edit ALLOW despite
lapse (Phase 6) · WHATSAPP→ONLINE upgrade deny/allow (+ no silent mutation) ·
reactivation deny · foreign-tenant not-found.
Guardrails: canonical-runtime reuse token · session-only tenant in actions ·
mode-based (not type-based) exemption · Boundary-C source contract.

## 12. Verification Gates

tsc ✅ · eslint(touched) ✅ · build ✅ · prisma validate ✅ · git diff --check ✅
Focused chain incl. D.6.2–D.6.5 + commerce-strategy + payment-account:
**15 files, 449/449 PASS.**

## 13. Protected Work

Baseline preserved (422 entries / staged 52+). Mixed-file handling:
- `products-page.tsx` carried protected unstaged edits → index blob surgically
  constructed (`git show :file` + exact-match replacement of ONLY my three
  hunks → `hash-object` + `update-index`). Staged-vs-HEAD diff reviewed:
  exclusively D.7.1 lines; protected hunks remain UNSTAGED in worktree.
- `commerce-strategy.test.ts` modernized per stale-guardrail rule (post-D.6.5
  canonical registry: both strategies active); file was clean vs HEAD before edit.

## 14. Exact Staged Files

```
src/features/products/service.ts                                  (Boundary A gate)
src/features/products/components/products-page.tsx                (surgical: 3 hunks)
tests/unit/rccf72-18d71-selling-gate.test.ts                      (new, 24 tests)
tests/unit/commerce-strategy.test.ts                              (modernized guardrails)
docs/rccf-72.18d7.1-creator-payment-selling-gate-closure.md       (this doc)
```

## 15. Deferred

- Legacy dead path `contentAppService.publishProduct`/`useProducts` (no live
  consumers found) — documented, intentionally unmodified.
- Storefront snapshot-level readiness surfacing (would add authenticated
  payment queries to anonymous rendering) — declined per §22; Boundary B
  behavior stands as-is.
- Dedicated inventory RCCF; monitoring/alerting RCCF (carried from D.7).

## Git

Commit: **NOT CREATED** · Push: **NOT PERFORMED**
DIRECT_CREATOR: **active** · PLATFORM_COLLECT: **active**
