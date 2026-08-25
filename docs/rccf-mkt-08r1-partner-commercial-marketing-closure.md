# RCCF-MKT-08-R1 — Partner Pricing Truth, Commercial Messaging & Marketing Frontend — Closure

**Status:** ✅ COMPLETE — all presentation work implemented and verified; no billing-engine changes by this ticket.
**Date:** 2026-08-25
**Base:** `68dc9dd5e1692bd62d324564fdaf3ebae027352f` (HEAD == origin/main at start; RCCF-73 engine set already staged on top).
**Supersedes:** `docs/rccf-mkt-08-partner-pricing-model-closure.md` (the R0 architectural STOP — its blocking condition was resolved when RCCF-73 flipped Partner Solo/Scale to one-time Razorpay orders).

---

## 1. Executive Verdict

**PASS (presentation layer).** The marketing frontend now states the RCCF-73 commercial model truthfully:

- Partner Solo ₹4,999 and Scale ₹14,999 render as **one-time purchases** ("One-time" badge) — never `/month`, never billed-yearly, never subscription framing.
- The Monthly/Yearly toggle is **not rendered at all** for Partners (no fake disabled control).
- The additional-client price renders from the canonical constant `PARTNER_ADDON_UNIT_PRICE_INR = 2000` as **"₹2,000 one-time — it is not a monthly charge."**
- Commission copy uses **eligibility wording only** ("recurring commission from eligible active clients"); no fixed percentage, no "commission that grows", no fabricated 20% × 10-client example.
- Every signup CTA carries a family-consistent persona (`persona=partner` | `persona=creator`), including free-trial fallback CTAs.
- Creator pricing (Launch ₹0 trial / Growth ₹999/mo / Scale ₹1,999/mo, annual toggle) is unchanged.

**Combined-release requirement:** RCCF-73 (engine) + MKT-08-R1 (marketing) MUST ship in the same release. Shipping marketing alone would advertise prices the current engine does not sell; shipping engine alone leaves the marketing lies in place.

---

## 2. Exact Files Changed (this ticket's unstaged delta)

| File | Change |
|---|---|
| `src/components/marketing/Pricing/index.tsx` | Family-aware trust items; toggle gated `!isPartner`; one-time price branch via `isOneTimePlan(plan.code)`; new truthful "How Partner plans work" ordered list (`data-testid="how-partner-plans-work"`); removed 20% × 10-client commission example; persona ternary on checkout CTA **and** free-trial fallback CTA |
| `src/components/marketing/Pricing/data.ts` | `PARTNER_VALUE_POINTS` rewritten to 4 truthful steps + add-on line sourced from canonical constant |
| `src/config/commerce/plans.ts` | Surgical wording only (file also carries staged RCCF-73 content): Solo highlight/description → "recurring commission eligibility"; Scale highlight → "Recurring commission from eligible active clients". No price/billing/commission fields touched |
| `src/app/pricing/page.tsx` | Metadata partner line → "Partner plans from ₹{minPartner} one-time."; JSON-LD category branches `isOneTimePlan(p.code) ? "Partner plan (one-time purchase)" : "…subscription…"` |
| `tests/unit/rccf-mkt-08-partner-commercial-marketing.test.tsx` | NEW guardrail suite (23 tests) |
| `tests/unit/rccf-mkt-06-pricing-catalog-sync.test.ts` | Metadata assertions modernized to one-time wording |
| `tests/unit/rccf58-marketing-pricing-truth.test.ts` | Scale-highlight assertion modernized |
| `tests/unit/rccf60-partner-pricing-truth.test.ts` | Commission assertion modernized (eligibility wording; bans "commission that grows") |

Note: ticket §23 named a `.test.ts` file; `.tsx` was used because the suite includes Testing Library render tests per repo skill rules ("UI fixes use .tsx").

---

## 3. Guardrail Tests

**New suite:** `tests/unit/rccf-mkt-08-partner-commercial-marketing.test.tsx` — **23/23 PASS**

Covers: registry truth (one_time billing forms, ₹4,999/₹14,999, partner_free ₹0 + 15-day trial not one-time), `isCommissionEligiblePartnerPlan` matrix, component renders for both tabs (toggle absence/presence, One-time labels, add-on line, persona on every CTA incl. `partner_free&persona=partner` and `creator_launch&persona=creator`), creator regression (₹999/month ↔ yearly switch), metadata/JSON-LD source contracts, stale-token scans with digit-boundary regex (`/1499(?!\d)/`).

**Modernized suites (still green):** rccf-mkt-05, rccf-mkt-06, rccf-mkt-07, rccf58, rccf60, plus related RCCF-61/62/73 suites — 13 files / 257 tests PASS after edits.

---

## 4. Build Gates (all re-run after final edit)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| ESLint on touched files | PASS (exit 0; repo-wide run shows pre-existing warnings only) |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| `git diff --check` | PASS (no whitespace errors) |

---

## 5. Responsive QA (Playwright, real Chromium against dev server)

Matrix: widths **320 / 375 / 414 / 768 / 1024 / 1280 / 1440**, both tabs — **14/14 PASS**.

Per cell verified: horizontal overflow = 0 everywhere; creator tab keeps `[role="switch"]` billing toggle; partner tab has NO toggle, ≥2 "One-time" labels, how-block present, add-on line present; zero stale tokens ("Example:", "10 clients on Creator Growth", "/month" on partner cards).

Process note (for reproducibility): an early QA round hit stale-JS execution caused by `next.config.mjs`'s `Cache-Control: immutable` on unhashed dev chunk URLs combined with a long-lived browser profile; a fresh browser context resolved it. Separately, running `npm run build` while `next dev` serves from the same `.next` corrupts the dev server — always restart dev after builds.

---

## 6. Accessibility (ticket §21)

Verified with keyboard-only Chromium session: tablist/tab/tabpanel semantics correct (`aria-selected` flips on activation), partner tab reachable via Tab traversal and activated with Enter, visible focus ring (3px outline + shadow), billing switch has `aria-label="Toggle yearly billing"` with live `aria-checked`, no `<img>` missing alt inside main, heading order H2→H3 clean.

Observation (pre-existing, out of scope): the tab control does not implement arrow-key roving per WAI-ARIA tabs authoring practices. Enter/space activation satisfies operability; recommend a follow-up ticket.

---

## 7. Provider E2E — Razorpay TEST mode

**NOT VERIFIED / DEFERRED.** No live Razorpay TEST-mode order was created or captured in this ticket. This is explicitly out of scope for MKT-08-R1 (marketing presentation). It remains REQUIRED for the combined RCCF-73 release gate.

---

## 8. Full-Suite Disclosure

Full `vitest run`: **4578 passed / 22 failed** across 10 files. All 22 are **pre-existing baseline failures from unrelated foreign WIP streams**: rccf66 whatsapp commerce (DB-state), rccf70-4-3 dashboard (imports protected in-progress `StorefrontStatusCard.tsx`), rccf71.x theme-chain snapshot threading (other stream's staged/unstaged work), rccf72-16b transition ceilings + products/payment-account service tests (require live Postgres transaction semantics). Verified zero import-graph overlap with any file this ticket touched.

---

## 9. Out-of-Scope Footgun (recommend follow-up)

`next.config.mjs` sets `Cache-Control: public, max-age=31536000, immutable` on `/_next/static/:path*`. In production these assets are content-hashed so it is safe, but Next dev serves some chunk URLs unhashed — the header then poisons browser caches across dev-server restarts. Not modified here (production behavior unaffected).

---

## 10. Staging Plan

Surgically staged (this ticket only; staged RCCF-73 set left intact; NO commit, NO push):

```
src/components/marketing/Pricing/index.tsx
src/components/marketing/Pricing/data.ts
src/config/commerce/plans.ts            (unstaged wording delta on top of staged RCCF-73)
src/app/pricing/page.tsx
tests/unit/rccf-mkt-08-partner-commercial-marketing.test.tsx
tests/unit/rccf-mkt-06-pricing-catalog-sync.test.ts
tests/unit/rccf58-marketing-pricing-truth.test.ts
tests/unit/rccf60-partner-pricing-truth.test.ts
docs/rccf-mkt-08r1-partner-commercial-marketing-closure.md
```
