# RCCF-72.13 — Publish Quota UX (Closure)

**Status:** Complete — implemented + verified. **No commit** (per ticket instruction).
**Date:** 2026-08-19
**Predecessor:** RCCF-72.8 (Wave 2 — Core Creator workflow). Closes **72.1-F2** (P1 — publish quota-exhausted exposes a raw database transaction error). NOT in scope: 72.9 / 72.10 / 72.11 / 72.12 / 72.14 (implemented separately).

---

## 1. Executive Verdict

**VERDICT: A — VERIFIED.**

Publishing at quota exhaustion now resolves to a deterministic, write-free structured quota failure across all three tiers. The creator-facing UX shows an actionable message plus the existing upgrade path — and no raw Prisma/Postgres/transaction text can reach the UI. Successful publishing, monthly windows, and Scale's unlimited behavior are unchanged.

Verified end-to-end: Launch successful publish, Launch exhausted denial (snapshot count and usage unchanged), Growth successful publish, Growth exhausted denial (monthly-specific copy), Scale unlimited publish, Builder reload after denial, and storefront remaining on the last successfully published snapshot.

---

## 2. Original Finding (72.1-F2)

> **72.1-F2 (P1)** — Publish quota-exhausted shows raw DB error (P2002 create aborts tx; retry throws) — `plan-usage-repository.ts` create-if-missing on exhausted row unchanged.

When a Creator had exhausted their publish allowance, clicking Publish surfaced a raw database error such as `Current transaction is aborted, commands ignored until end of transaction block` instead of the friendly "upgrade to keep publishing" CTA. This is the primary paid-upgrade revenue moment; breaking it loses conversion on the Growth upgrade path.

---

## 3. Root Cause

`PlanUsageRepository.reserveSlot` (the RCCF-31 atomic quota reservation) used a create-if-missing strategy that cannot distinguish "row missing" from "row exhausted" before attempting a write:

1. Conditional increment `updateMany { used < limit }` matches 0 rows (row exists **at** the limit, or missing).
2. `create` is attempted on the **existing, exhausted** row → the `(tenantId, featureKey, periodStart)` unique key collides → PostgreSQL raises **P2002**.
3. Any error inside a PostgreSQL transaction block aborts the whole transaction.
4. The catch handler retries `updateMany` on the **already-aborted** transaction → `current transaction is aborted, commands ignored until end of transaction block`.
5. That non-P2002 error is rethrown, the caller's `prisma.$transaction` propagates it, `publishingService.publish` returns `{ success:false, error: <raw DB text> }`, and the presentation layer classified it as a *known product failure* (the raw message contained no technical hint), rendering the DB internals verbatim to the Creator.

The same latent abort pattern existed for the concurrent final-slot race (the loser's retry ran on an aborted transaction).

---

## 4. Quota Authority

Canonical limits verified from the repository's own authority — not invented:

| Plan | Mode | Limit | Source |
|---|---|---|---|
| `creator_launch` | `lifetime` | 3 | `DEFAULT_PUBLISH_POLICIES` (`src/lib/publishing/publish-policy.ts`) |
| `creator_grow` | `monthly` | 10 | `DEFAULT_PUBLISH_POLICIES` (`src/lib/publishing/publish-policy.ts`) |
| `creator_scale` | `unlimited` | null | `DEFAULT_PUBLISH_POLICIES` (`src/lib/publishing/publish-policy.ts`) |

Super Admin `BillingPlan.runtimeConfig.publishing` overrides flow through `resolvePublishPolicy` via the pricing runtime (the same source marketing reads). The fix hardcodes no limits.

**Monthly reset:** `computePublishPeriod` (`src/lib/publishing/publish-period.ts`) computes a UTC calendar-month window server-side (`periodStart` = 1st UTC, `periodEnd` = last day 23:59:59.999 UTC). Browser QA confirmed a Growth publish created a row with `periodStart 2026-08-01` / `periodEnd 2026-08-31` and the UI read "resets 2026-08-31". No local/browser time is used as quota authority.

---

## 5. Transaction Model

The existing RCCF-31 strategy is preserved: **conditional atomic increment** (`UPDATE … SET used = used + 1 WHERE used < limit`) inside the caller's transaction, so quota reservation and snapshot creation commit/roll back together, and concurrent final-slot publishes cannot both succeed.

The fix adds an existence **read before write** so the exhausted path never performs a write:

```
conditional increment (used < limit)
   ├─ 1 row        → reserved (true)
   └─ 0 rows       → findUnique by (tenantId, featureKey, periodStart)
                        ├─ row exists & used < limit → retry conditional increment (no create)
                        ├─ row exists & used ≥ limit → EXHAUSTED → false (no write, no abort)
                        └─ row missing (first publish) → create-if-missing (P2002-retry unchanged)
```

The quota decision is deterministic: the conditional increment is the only place usage increases, `used` can never exceed `limit`, and an exhausted row is never written to.

---

## 6. Implementation

### `src/modules/billing/infrastructure/plan-usage-repository.ts` (primary fix)
`reserveSlot` now resolves the row by primary key **before** attempting any write. When the row exists:
- below the limit (narrow concurrent first-create race where the row became visible between the increment and the read) → retry the conditional increment — no create, no P2002;
- at/over the limit → return `false` immediately. **No create attempt, no P2002, no transaction abort, no raw DB error.**

The `create` path now runs only when the row is genuinely missing (first publish), preserving the documented atomic create-if-missing + P2002-retry strategy for the concurrent first-create race.

### `src/lib/publishing/publish-error-messages.ts` (defense-in-depth)
Added `"transaction is aborted"`, `"commands ignored"`, and `"aborted"` to the `TECHNICAL_HINTS` classifier so any residual PostgreSQL transaction-abort phrasing (current or future) collapses to the safe generic message instead of rendering verbatim. No product-facing copy contains these tokens.

### No other application changes
`commitPublishWithMetering`, `publishingService.publish`, `publishWebsite`, the Builder/Dashboard/Admin publish surfaces, the quota policies, the period calculation, and the snapshot pipeline were already correct once `reserveSlot` returned a clean `false` on exhaustion. No Prisma schema, billing, Razorpay, plan, capability, auth, lifecycle, preview-security, Theme, Hero, builder-architecture, or storefront-architecture change was made.

---

## 7. Files Changed

| File | Change |
|---|---|
| `src/modules/billing/infrastructure/plan-usage-repository.ts` | `reserveSlot`: existence check before create; exhausted path is write-free (RCCF-72.13) |
| `src/lib/publishing/publish-error-messages.ts` | `TECHNICAL_HINTS`: added `transaction is aborted` / `commands ignored` / `aborted` |
| `tests/unit/plan-usage-repository.test.ts` | Reworked exhausted test to assert no-create; added 4 new RCCF-72.13 repository tests |
| `tests/unit/publish-metering.test.ts` | Strengthened exhausted tests (no create, exactly-one increment); added monthly-exhausted, concurrent final-slot, exactly-once-increment tests |
| `tests/unit/rccf72-13-publish-quota-ux.test.ts` | NEW focused suite — 17 required scenarios + source guardrails |
| `screenshots/rccf72-13-B-launch-exhausted-topbar.png` | Browser evidence — Launch exhausted topbar UX |
| `screenshots/rccf72-13-G-storefront-unchanged.png` | Browser evidence — storefront still on last snapshot |

Temporary inspection/fixture scripts used for QA were removed after use (not committed).

---

## 8. Launch Verification

- **Below quota:** publish succeeds; snapshot created (1 → 2); lifetime usage incremented exactly once (1 → 2). Verified in browser + DB.
- **At limit (3/3):** publish denied with `PUBLISH_QUOTA_EXCEEDED`; no snapshot; no usage increment; actionable message + "Upgrade to Growth" → `/admin/billing`. Verified in browser (topbar and Builder surfaces) + DB (snapshots stayed 3, usage stayed 3).

## 9. Growth Verification

- **Below quota:** publish succeeds; snapshot created (1 → 2); a new monthly row created at `used = 1` (`2026-08-01` → `2026-08-31`). Verified in browser + DB.
- **At limit (10/10 fixture):** publish denied; no snapshot; usage stayed 10 (never exceeded, no double charge); **monthly-specific** message "You've reached your publish limit for this billing period… allowance resets" + "Upgrade to Scale" → `/admin/billing`. Verified in browser + DB. Fixture restored afterward.

## 10. Scale Verification

Publish succeeds with **no quota interaction** — snapshot created (2 → 3), no usage row created, existing usage row untouched. UI shows "Publish allowance: Unlimited". Verified in browser + DB.

---

## 11. Exhausted-State Verification

| Assertion | Launch (3/3) | Growth (10/10) |
|---|---|---|
| Publish denied | ✓ | ✓ |
| No raw Prisma/Postgres/transaction text in UI | ✓ | ✓ |
| Actionable creator message | ✓ ("…all 3 publishes… Upgrade to keep publishing") | ✓ ("…publish limit for this billing period… allowance resets") |
| Upgrade path preserved | ✓ "Upgrade to Growth" → `/admin/billing` | ✓ "Upgrade to Scale" → `/admin/billing` |
| Snapshot count unchanged | ✓ (3) | ✓ (2) |
| Usage unchanged (no increment / no double charge) | ✓ (3) | ✓ (10) |
| No console errors | ✓ | ✓ |
| Builder reloads cleanly after denial | ✓ | ✓ |

## 12. Snapshot Invariant

The denied publish path returns from `commitPublishWithMetering` **before** `publishRepository.createPublish` runs, inside the same transaction. No snapshot row is created (verified counts above) and the live storefront stays on the last successfully published snapshot (verified: `rccf-720-audit` still renders v3 content — hero "Audit CTA 999", products, "Audit Milestone Title" timeline — after the denied attempts).

## 13. Usage Invariant

Usage is incremented **exactly once** on a successful limited publish (conditional increment returns count 1; create is never called on an existing row). A failed/exhausted publish performs the single conditional increment that matches 0 rows and stops — no create, no retry, no abort. `used` can never exceed `limit` because the increment is the sole write and it is gated by `used < limit`.

## 14. Error UX

All three publish surfaces (Admin topbar `AdminPublishControl`, Builder `workspace.tsx`, Dashboard `StorefrontStatusCard`) translate failures through the shared `getPublishFailurePresentation`. Exhausted quota returns the coded `PUBLISH_QUOTA_EXCEEDED` result → friendly, tier-aware copy + upgrade CTA. Defense-in-depth: any transaction-abort / provider-internal phrasing is classified as technical and collapses to "Publishing failed. Please try again." The existing coded mappings (quota, trial, known product failures) are unchanged.

## 15. Concurrency Verification

The conditional increment is the atomic boundary: two concurrent final-slot publishes cannot both match `used < limit`. The loser now resolves the existing (at-limit) row and is denied **without a create** — no P2002, no aborted transaction. The concurrent **first-create** race (two publishes when no row exists) retains the pre-existing create-if-missing + P2002-retry strategy; in real PostgreSQL the retry-after-P2002 would run on an aborted transaction and throw — an extreme, pre-existing edge that now at worst surfaces the safe generic message (never raw DB text) and rolls the loser's transaction back cleanly with no double charge. It is documented in Remaining Risks and is not a regression.

---

## 16. Browser QA

Per `.agents/skills/dev-server-lifecycle/SKILL.md`, the dev server on port 3000 was confirmed healthy (HTTP 200 on `/admin/login`), then restarted once after an earlier production build corrupted its dev cache, and polled to readiness. Playwright MCP with the canonical `login-as` impersonation mechanism was used to authenticate real QA accounts (no credential/secret exposure):

- **A. Launch successful publish** (`rccf-7143-launch-qa`, 1/3 → 2/3): Builder Publish → success → reload; DB snapshots 1→2, usage 1→2.
- **B. Launch exhausted publish** (`rccf-720-audit`, 3/3): topbar + Builder Publish → alert "You've used all 3 publishes available on your current plan. Upgrade to keep publishing." + "Upgrade to Growth" → `/admin/billing`; snapshots stayed 3, usage stayed 3; zero console errors.
- **C. Growth successful publish** (`rccf-7143-qa`, monthly 0/10 → 1/10): Builder Publish → success; snapshots 1→2; monthly row `2026-08-01..31` used=1.
- **D. Growth exhausted publish** (controlled fixture set 10/10, restored after): Builder Publish → "You've reached your publish limit for this billing period…" + "Upgrade to Scale"; snapshots stayed 2, usage stayed 10.
- **E. Scale publish** (`rccf-7164-scale-qa`): Builder Publish → success; snapshots 2→3; no usage interaction; UI "Publish allowance: Unlimited".
- **F. Builder reload after each exhausted attempt:** loads normally, no crash, draft preserved.
- **G. Storefront parity:** `/rccf-720-audit` still renders the last successfully published snapshot (v3) after the denied attempts.

QA safety: usage was inspected before mutation; the exhausted Launch account required zero new quota; the Growth exhausted fixture was set and **restored** to its legitimate post-C state (monthly `used=1`); no billing/subscription events were fabricated; unrelated QA data untouched.

---

## 17. Full Regression

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| Focused `npx vitest run tests/unit/{plan-usage-repository,publish-metering,rccf72-13-publish-quota-ux,rccf38-order-metering,rccf70-6-5-publish-error-ux,rccf70-6-5-admin-publish,rccf70-4-5-builder}` | ✅ 128/128 |
| `npx vitest run` (full suite) | ✅ 3652 passed; **1 flaky fail** `rccf68-retry-catalog-timeout.test.ts` ("Not implemented: navigation to another Document" jsdom timeout) — **passes in isolation** (11/11); unrelated to this ticket (onboarding-retry jsdom test) |
| `npm run build` | ✅ (pre-existing warnings only; none in touched files) |
| `npx prisma validate` | ✅ schema valid |
| `npx prisma generate` | ✅ |
| `npx eslint` (touched files) | ✅ clean |
| `git diff --check` | ✅ (only pre-existing CRLF notices on untouched files) |
| Browser QA | ✅ all A–G scenarios |

---

## 18. Frozen Surfaces

Unchanged by RCCF-72.13: Prisma schema/migrations, billing, Razorpay, plans, capability definitions, authentication, lifecycle, preview security, Theme Experience, Hero ownership, Builder architecture, storefront architecture, quota limits, Scale's unlimited behavior. No data created beyond legitimate QA publishes; no commit.

## 19. Remaining Risks

1. **Concurrent first-create race** (two simultaneous publishes when no PlanUsage row exists): the pre-existing P2002-retry runs on an aborted transaction in real PostgreSQL and would throw. Outcome today: loser's transaction rolls back cleanly, no double charge, and the defense-in-depth hint maps any residual error to the safe generic message (no raw DB text). Not a regression; a full fix (e.g. upsert-based row-ensure) is possible but was deliberately out of scope per "do not introduce a new concurrency architecture unless necessary".
2. **Order metering shares the repository:** the same fix benefits `completeProductOrder`'s `max_orders` metering (same abort pattern), which is a positive side effect; order-metering tests confirm no regression.
3. **Dev-only flaky test:** `rccf68-retry-catalog-timeout.test.ts` times out under full-suite load (jsdom navigation) but passes in isolation — pre-existing, unrelated.

---

## 20. Final Verdict

**A — VERIFIED.** 72.1-F2 is closed. Publish quota exhaustion now produces a deterministic, write-free structured quota failure with friendly, actionable copy and the preserved upgrade path — on every tier — and raw database/transaction errors can never reach the Creator UI.