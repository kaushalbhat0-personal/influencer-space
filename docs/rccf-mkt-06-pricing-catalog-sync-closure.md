# RCCF-MKT-06 Closure — Pricing Catalog Synchronization & Subscription Readiness

| | |
|---|---|
| **Ticket** | RCCF-MKT-06 |
| **Date** | 2026-08-24 |
| **Status** | ✅ COMPLETE (catalog synced & verified) · ⛔ one BLOCKED item (live Razorpay provisioning) |
| **Baseline HEAD** | `fd92b982a57b9fab582746d6fb98173aafd25f8f` (= origin/main) |
| **Depends on** | RCCF-MKT-05 (pricing truth correction — already staged) |
| **Commit policy** | NO COMMIT / NO PUSH — files surgically staged only; release handled by a later RCCF |

---

## 1. Executive Verdict

The runtime/catalog layer now agrees with the MKT-05 corrected pricing registry everywhere it is consumed:

- **All six public BillingPlan rows** on the authorized SupDev database were re-synced to registry defaults via the product's own Super Admin operation (`resyncBillingCatalog`) — no hand-written SQL, no schema changes.
- **Zero subscriptions were touched** by catalog operations (verified byte-level before/after): existing customers keep their contracted amounts and their immutable Razorpay plans.
- The retired legacy `partner_growth` plan row (₹4,999, DEPRECATED, carrying one ACTIVE subscription) was left completely untouched, as required.
- Creator Scale subscription-readiness plumbing is verified end-to-end at the code level (provisioning path, amount conversion, storage location, safe fallback), but actual provisioning is **BLOCKED** because the environment uses live Razorpay keys and no authorization was given. A fail-closed guard was added so this cannot happen accidentally.

## 2. Scope

**In scope:** BillingPlan catalog rows ↔ registry parity; runtime pricing resolution; marketing surface correctness (`/`, `/pricing`); Creator Scale Razorpay provisioning *readiness*; guardrail test suite; closure documentation.

**Out of scope (untouched frozen surfaces):** checkout/refund/webhook architecture; subscription lifecycle service; entitlement/capability engine semantics; theme experience; Builder/Admin panels beyond using the existing Pricing Center UI for the sanctioned resync.

## 3. Pre-flight State

- Baseline HEAD = origin/main = `fd92b982a57b9fab582746d6fb98173aafd25f8f`.
- MKT-05 work already staged (registry, runtime resolver, marketing components, tests, docs).
- Pre-existing dirty-unstaged files unrelated to pricing (incl. `src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts`) were inventoried and **never modified or staged**.
- `.env.local` confirmed to use **live** Razorpay keys (`rzp_live_…`); local dev server connects to the authorized SupDev Postgres instance.

## 4. Registry Verification (source of truth)

`src/config/commerce/plans.ts` — all values correct before any write:

| Plan | Monthly | Annual (×10 invariant) |
|---|---:|---:|
| creator_launch | ₹0 | ₹0 |
| creator_grow | ₹999 | ₹9,990 |
| creator_scale | ₹1,999 | ₹19,990 (`razorpayPlanId: null`) |
| partner_free | ₹0 | ₹0 |
| partner_solo | ₹4,999 | ₹49,990 |
| partner_scale | ₹14,999 | ₹149,990 |

`partner_enterprise` is manual-quote (price 0, no annual field). No `partner_growth`. Retired provider plan ID `plan_TLTH45wQlPdW7v` appears only inside an explanatory comment documenting why it was nulled — never as an assigned value.

## 5. Catalog Re-sync — Before → After (remote SupDev DB)

Executed through the product's own Super Admin Pricing Center ("Reset to defaults" → `resyncBillingCatalog()`), i.e. the same path an operator would use. The operation runs `seedBillingCatalog()` (upserts registry values), wipes every row's `runtimeConfig` to `DbNull` (removing stale scalar overrides), resets the loader cache, and revalidates paths.

### BEFORE (audit snapshot)

| Code | Status | Price | Notes |
|---|---|---:|---|
| creator_grow | ACTIVE | **699 ❌ stale** | pre-correction value |
| creator_scale | ACTIVE | 1995 ❌ | carried retired provider amount |
| partner_solo | ACTIVE | **2999 ❌ stale** | pre-correction value |
| partner_scale | ACTIVE | **7999 ❌ stale** | pre-correction value |
| partner_growth | DEPRECATED | 4999 | legacy row, carries 1 ACTIVE subscription — untouched |
| all rows | — | — | zero rows had `runtimeConfig`; version counters v1 |

### AFTER (verified)

| Code | Status | Price | Version | runtimeConfig |
|---|---|---:|---:|---|
| creator_launch | ACTIVE | 0 | v2 | null |
| creator_grow | ACTIVE | **999 ✅** | v2 | null |
| creator_scale | ACTIVE | **1999 ✅** | v2 | null |
| partner_free | ACTIVE | 0 | v2 | null |
| partner_solo | ACTIVE | **4999 ✅** | v2 | null |
| partner_scale | ACTIVE | **14999 ✅** | v2 | null |
| partner_enterprise | ACTIVE | 0 (manual) | v2 | null |
| partner_growth (legacy) | DEPRECATED | 4999 | unchanged | unchanged |

Legacy/deprecated historical rows outside the six public codes were left byte-identical.

## 6. Subscription Safety Audit

- 61 subscriptions total (43 TRIALING, 18 ACTIVE) — **identical before and after**, including amounts, statuses, and timestamps.
- The single ACTIVE subscription on legacy `partner_growth` remains valid: it bills against its own immutable Razorpay contract, unaffected by catalog edits.
- No Razorpay-side objects were created, modified, or deleted during this ticket.

## 7. Creator Scale Provisioning — ⛔ BLOCKED (per §8/§28 report format)

- **Reason:** LIVE mode confirmed — `.env.local` Razorpay credentials use the `rzp_live_` key prefix. Creating a paid provider plan would create a real, billable object in the production Razorpay account without explicit operator authorization.
- **Evidence:** key-mode prefix inspection of `.env.local` only (no secret values quoted anywhere in this document).
- **Affected layer:** `BillingPlan.runtimeConfig.pricing.razorpayPlanId` for `creator_scale` remains `null` (correct pre-provisioning state; asserted in tests).
- **Safe next action (operator, when authorized):**
  1. Set `RAZORPAY_LIVE_PROVISIONING_AUTHORIZED=1` in the deploy environment (the new fail-closed gate requires it under live keys).
  2. Super Admin → Pricing Center → Creator Scale → Save Plan Configuration at ₹1,999 (= `199900` paise, INR, monthly). The system provisions the provider plan, stores the returned ID in `runtimeConfig`, and bumps the pricing version automatically.
- **What stays untouched until then:** Razorpay account, checkout/refund/webhook architecture, all existing subscriptions. Meanwhile checkouts for Creator Scale remain fully functional via the existing fallback chain (`razorpay.ts`: DB plan id → registry id → one-time order at the DB-authoritative price).

## 8. Source Change Record (one minimal edit)

**File:** `src/actions/super-admin-pricing.actions.ts`
**Change:** fail-closed live-mode guard at the top of `createRazorpayPlanForPlan`.

```ts
// RCCF-MKT-06 — live-mode fail-closed guard …
if ((process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_")
    && process.env.RAZORPAY_LIVE_PROVISIONING_AUTHORIZED !== "1") {
  throw new Error("LIVE MODE CONFIRMATION REQUIRED: set RAZORPAY_LIVE_PROVISIONING_AUTHORIZED=1 …");
}
```

- Rationale: provisioning is otherwise automatic on price change; with live keys a stray save would mutate the production Razorpay account. TEST keys are unaffected.
- Failure semantics are already non-fatal by design: the thrown error is caught by the existing handler → price still saves, warning surfaces, plan id stays `null` → checkout falls back safely.
- This is a guard inside the existing helper — no architectural change, consistent with §22's allowance.

## 9. Runtime & Marketing Verification (post-resync, post-rebuild)

- `/pricing` returns 200; `<title>` intact; meta description derives "from ₹999/month" and "from ₹4999/month" via `paidFromPrice()` over live runtime data (no hardcoded literals).
- JSON-LD structured data serves `"price":"999" / "1999" / "4999" / "14999"` from the synchronized catalog.
- Creator cards render ₹999 / ₹1,999; Partner tab renders ₹4,999 / ₹14,999 (verified in-browser after tab switch — Partner cards mount client-side, which is why raw SSR HTML shows them only in JSON-LD; expected behavior, not a regression).
- Comparison matrix columns Feature / Creator Launch / Growth / Scale; the `launch-core-content-note` ("combined allowance of up to 3 active items") renders correctly.
- Homepage pricing tabs verified visually earlier in-session (both Creator and Partner views correct).
- Zero console errors on `/pricing` and `/`.

### Hydration-mismatch root-cause finding (§21 note)

A transient React hydration mismatch appeared mid-session on `/pricing`. Root cause was **stale browser HTTP cache of unhashed Next.js dev chunks** (`/_next/static/chunks/app/pricing/page.js`) surviving server rebuilds — the browser executed an old chunk against freshly rendered markup. Resolution: `Network.clearBrowserCache` via CDP (+ fresh rebuild). **Not** an app-code defect, not DB-related; documented here so future sessions don't misattribute it. Production builds hash chunks and are immune.

## 10. Stale-Sweep Results (§18/§19)

- Prices `699 / 1995 / 2999 / 7999`: no active pricing source carries them; remaining occurrences are negative-assertion guards in tests, legacy fixtures, or unrelated revenue math (e.g., commission percentages).
- `partner_growth`: absent from canonical constants and registries; `canonicalPlanCode("partner_growth")` → `null`. Remaining references are comments/guardrail tests only.
- Retired provider plan ID `plan_TLTH45wQlPdW7v`: never assignable; guarded by test.

## 11. Test Suite

**New:** `tests/unit/rccf-mkt-06-pricing-catalog-sync.test.ts` — **22/22 passing.**

Sections: registry contract (prices, ×10 invariant, no retired prices, no Partner Growth, capability-engine mirror parity) · runtime resolution (all six plans resolve corrected values; stale `runtimeConfig` shadow motivation for the DbNull wipe; resync calls seed + wipe + cache reset) · Razorpay readiness (Scale starts `null`; provisioning stores returned ID with `amount: 199900, INR, monthly`; retired ID never stored/assigned; unchanged-price Growth save does **not** call `plans.create`; LIVE fails closed without auth env; provisions when authorized) · marketing source guards (runtime-derived prices, no hardcoded literals, launch note) · safety (catalog ops never touch subscriptions/billing events; checkout fallback chain preserved; lifecycle webhook guard intact).

**Full suite:** 4475 tests → **4454 passed / 21 failed**, all 21 pre-existing and classified in the MKT-05 closure (7 dashboard WIP + 6 theme-experience WIP in untracked files; 6 prisma-mock drift + WhatsApp commerce + products service in tracked files). **Zero new failures introduced by MKT-06.**

## 12. Verification Gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ exit 0 |
| Lint (touched files) | `npx eslint src/actions/super-admin-pricing.actions.ts tests/unit/rccf-mkt-06-pricing-catalog-sync.test.ts` | ✅ exit 0 |
| Build | `npm run build` | ✅ exit 0 |
| Prisma schema | `npx prisma validate` | ✅ valid |
| Whitespace | `git diff --check` | ✅ clean (only pre-existing CRLF notice on protected fixture) |
| Focused suites | MKT-05 + super-admin-pricing-actions + rccf36 + rccf60 + pricing-runtime×2 + commerce-registry + plans-alignment | ✅ 89/89 |
| New suite | `rccf-mkt-06-pricing-catalog-sync.test.ts` | ✅ 22/22 |
| Full suite | `npx vitest run` | ✅ 4454 passed; 21 pre-existing (classified above) |

Post-build hygiene: dev server killed, `.next` wiped, restarted clean; `/pricing` and `/admin/login` re-verified 200 with corrected data afterwards.

## 13. Cleanup Performed

- Temp read-only audit script deleted from repo root; its entry removed from `.git/info/exclude`.
- No secrets quoted anywhere in this document (key modes referenced by prefix only).

## 14. Deferred Items

1. **Creator Scale live provisioning** — blocked pending explicit authorization (see §7). One-operator action once approved.
2. Optional hardening: alert when a public ACTIVE BillingPlan price diverges from the registry (would have caught the pre-sync drift automatically).
3. Stray `//touch` comment at `src/components/marketing/Pricing/comparison.tsx:118` — cosmetic, out of scope.

## 15. Protected Work & Exact Staged Files

**Protected dirty-unstaged files (inventoried, never modified, never staged):** `src/app/onboarding/page.tsx`, `tests/fixtures/test-seed.ts`, and all other unrelated dirty/untracked files present at baseline.

**Staged (exactly three files, nothing else):**

1. `src/actions/super-admin-pricing.actions.ts` — the live-mode fail-closed guard only.
2. `tests/unit/rccf-mkt-06-pricing-catalog-sync.test.ts` — new guardrail suite (22 tests).
3. `docs/rccf-mkt-06-pricing-catalog-sync-closure.md` — this document.

## 16. Final Verdict

Catalog synchronization **COMPLETE and verified end-to-end**: registry → DB → runtime resolver → marketing surfaces all agree on the corrected MKT-05 prices, with subscriptions provably untouched and the legacy partner_growth row preserved exactly as required. Subscription readiness for Creator Scale is code-verified; the single remaining step (actual live provisioning) is **correctly blocked** behind explicit authorization and now additionally guarded against accidental execution. All gates green; work staged, uncommitted, awaiting release.
