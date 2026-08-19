# RCCF-72.13 — Publish Quota UX Remediation (Closure)

**Status:** Complete — AUDIT FIRST → IMPLEMENT → VERIFY executed. **Staged, NOT committed** (per ticket instruction).
**Date:** 2026-08-19
**Predecessor:** RCCF-72.8 (Wave 2 — Core Creator workflow). Closes **72.1-F2** (P1 — publish quota-exhausted exposes a raw database transaction error). Out of scope: 72.9 / 72.10 / 72.11 / 72.12 / 72.14 (implemented separately).

---

## 1. Executive Verdict

**VERDICT: A — VERIFIED.**

Publishing at quota exhaustion now resolves to a deterministic, **write-free** structured quota failure across all three tiers. The creator-facing UX shows an actionable, tier-aware message plus the existing upgrade CTA — and no raw Prisma/Postgres/transaction text can reach the UI. Successful publishing, monthly windows, and Scale's unlimited behavior are unchanged.

Verified end-to-end in this session: Growth successful publish (7→8), Growth exhausted denial (fixture 10/10 → restored to 8), Launch exhausted denial (3/3, zero new quota), Scale unlimited publish (snapshot 3→4, usage row untouched), Builder reload after denial, and storefront remaining on the last successfully published snapshot.

---

## 2. Production Root Cause (72.1-F2)

> **72.1-F2 (P1)** — Publish quota-exhausted shows raw DB error (P2002 create aborts tx; retry throws) — `plan-usage-repository.ts` create-if-missing on exhausted row unchanged.

When a Creator had exhausted their publish allowance, clicking Publish surfaced a raw database error such as `Current transaction is aborted, commands ignored until end of transaction block` instead of the friendly "upgrade to keep publishing" CTA. This is the primary paid-upgrade revenue moment; breaking it loses conversion on the Growth upgrade path.

`PlanUsageRepository.reserveSlot` (the RCCF-31 atomic quota reservation) used a create-if-missing strategy that cannot distinguish "row missing" from "row exhausted" before attempting a write:

1. Conditional increment `updateMany { used < limit }` matches 0 rows (row exists **at** the limit, or missing).
2. `create` is attempted on the **existing, exhausted** row → the `(tenantId, featureKey, periodStart)` unique key collides → PostgreSQL raises **P2002**.
3. Any error inside a PostgreSQL transaction block aborts the whole transaction.
4. The catch handler retries `updateMany` on the **already-aborted** transaction → `current transaction is aborted, commands ignored until end of transaction block`.
5. That non-P2002 error is rethrown, the caller's `prisma.$transaction` propagates it, `publishingService.publish` returned `{ success:false, error: <raw DB text> }`, and the presentation layer classified it as a *known product failure* (no technical hint matched), rendering DB internals verbatim to the Creator.

The same latent abort pattern existed for the concurrent final-slot race (the loser's retry ran on an aborted transaction).

---

## 3. Architecture Invariant & Option Selection

**Invariant:** quota enforcement remains **server-authoritative and atomic**. The conditional increment (`UPDATE … SET used = used + 1 WHERE used < limit`) is the single place usage increases; `used` can never exceed `limit`; quota reservation and snapshot creation commit/roll back in the same caller transaction; and concurrent final-slot publishes cannot both succeed.

**Chosen option — read-before-write in the exhausted path:** after the conditional increment matches 0 rows, resolve the row by primary key *before* attempting any write. If the row exists and is at/over the limit → return `false` with **no create, no P2002, no transaction abort**. A `create` is attempted only when no row exists (first publish). This is the smallest possible fix: no new repository result types, no change to the `commitPublishWithMetering` / `publish` / `publishWebsite` contract, no schema change.

**Rejected alternatives:**
- **Catch P2002 and return `false`** — rejected: a P2002 has already aborted the caller's PostgreSQL transaction; the transaction is unusable afterward and the snapshot could not be written anyway. It also does not prevent the raw abort error.
- **Catch "current transaction is aborted" and return `false`** — rejected: it would *accept a failed transaction* as a successful denial, is exception-string matching (fragile), and could mask genuine transaction failures.
- **Upsert-based row-ensure (new concurrency architecture)** — rejected per ticket: "do not introduce a new concurrency architecture unless necessary." The conditional increment remains the concurrency boundary.
- **Raise quota / remove enforcement / silently allow** — rejected outright (CRITICAL RULE): would corrupt the paid-upgrade model.

---

## 4. Quota Authority & Model Preservation

Canonical limits verified from the repository's own authority — not invented:

| Plan | Mode | Limit | Source |
|---|---|---|---|
| `creator_launch` | `lifetime` | 3 | `DEFAULT_PUBLISH_POLICIES` (`src/lib/publishing/publish-policy.ts`) |
| `creator_grow` | `monthly` | 10 | `DEFAULT_PUBLISH_POLICIES` (`src/lib/publishing/publish-policy.ts`) |
| `creator_scale` | `unlimited` | null | `DEFAULT_PUBLISH_POLICIES` (`src/lib/publishing/publish-policy.ts`) |
| `creator_enterprise` | `unlimited` | null | `DEFAULT_PUBLISH_POLICIES` (`src/lib/publishing/publish-policy.ts`) |

Super Admin `BillingPlan.runtimeConfig.publishing` overrides flow through `resolvePublishPolicy` via the pricing runtime (the same source marketing reads). The fix hardcodes no plan limits — verified by guardrail tests (see §9). QA accounts in the DB confirm the live model: `rccf7151-growth` (creator_grow, monthly 2026-08-01..31), `rccf7151-launch` (creator_launch, lifetime), `rccf-7164-scale-qa` (creator_scale, unlimited).

**Monthly reset:** `computePublishPeriod` (`src/lib/publishing/publish-period.ts`) computes a UTC calendar-month window server-side (`periodStart` = 1st UTC, `periodEnd` = last day 23:59:59.999 UTC). Browser QA confirmed a Growth publish used `periodStart 2026-08-01` / `periodEnd 2026-08-31` and the exhausted copy referenced the allowance reset. No local/browser time is used as quota authority.

---

## 5. Transaction Model & Concurrency Safety

The existing RCCF-31 strategy is preserved: **conditional atomic increment** inside the caller's transaction, so quota reservation and snapshot creation commit/roll back together, and concurrent final-slot publishes cannot both succeed.

The fix adds an existence **read before write** so the exhausted path never performs a write:

```
conditional increment (used < limit)
   ├─ 1 row        → reserved (true)
   └─ 0 rows       → findUnique by (tenantId, featureKey, periodStart)
                        ├─ row exists & used < limit → retry conditional increment (no create)
                        ├─ row exists & used ≥ limit → EXHAUSTED → false (no write, no abort)
                        └─ row missing (first publish) → create-if-missing (P2002-retry unchanged)
```

- **Exhausted path (the P1):** deterministic — resolves the existing at-limit row and returns `false`. No write is attempted, so no P2002, no aborted transaction, no raw DB error. The caller reads the row once more (`getUsage`) on a healthy transaction to build the structured failure result.
- **Concurrent final-slot race:** only one request can match `used < limit`; the loser resolves the existing at-limit row and is denied **without a create**.
- **Concurrent first-create race:** two publishes when no row exists. The winner creates; the loser still takes the P2002-retry path. In real PostgreSQL the retry runs on an aborted transaction and throws — an extreme, pre-existing edge (documented in §13). Today the defense-in-depth hint classifier maps any residual error to the safe generic message, the loser's transaction rolls back cleanly, and no double charge occurs. Not a regression.
- **Rollback coupling:** a successful reservation that later fails during snapshot creation still rolls the usage increment back (the pre-existing "a failed snapshot rolls the quota back" test remains green).

---

## 6. Error Taxonomy & Presentation Layer

All publish surfaces (Admin topbar `AdminPublishControl`, Builder `workspace.tsx`, Dashboard `StorefrontStatusCard`) translate failures through the shared `getPublishFailurePresentation` (`src/lib/publishing/publish-error-messages.ts`).

- **Coded result:** exhaustion returns `{ success:false, code:"PUBLISH_QUOTA_EXCEEDED", used, limit, periodStart, periodEnd, mode, suggestedUpgrade }` → friendly, tier-aware copy + upgrade CTA (`/admin/billing`). Lifetime mode: "You've used all 3 publishes available on your current plan. Upgrade to keep publishing." + "Upgrade to Growth". Monthly mode: "You've reached your publish limit for this billing period… allowance resets." + "Upgrade to Scale".
- **Defense-in-depth:** `TECHNICAL_HINTS` classifies `transaction is aborted` / `commands ignored` / `aborted` (plus Prisma/provider-internal phrasing) as technical → collapsed to the safe generic "Publishing failed. Please try again." No product-facing copy contains these tokens, so raw DB text can never render.
- **No new exception-string matching** in the enforcement path: the quota decision is a boolean from `reserveSlot` plus a structured `commitPublishWithMetering` result.

---

## 7. Implementation Changes

| File | Change |
|---|---|
| `src/modules/billing/infrastructure/plan-usage-repository.ts` | `reserveSlot`: existence check by primary key **before** any write; exhausted path is write-free; first-create P2002-retry unchanged; header docs (RCCF-72.13). |
| `tests/unit/plan-usage-repository.test.ts` | Reworked exhausted test to assert no-create; added 4 RCCF-72.13 repository tests (exhausted no-create, concurrent final-slot, concurrent first-create retry, exactly-once increment). |
| `tests/unit/publish-metering.test.ts` | Strengthened exhausted tests (no create, exactly-one increment); added monthly-exhausted, concurrent final-slot, exactly-once-increment tests. |
| `tests/unit/rccf72-13-publish-quota-ux.test.ts` | **NEW** focused suite — 16 behavioral scenarios + source guardrails (present, absent, invariant). |
| `docs/rccf-72.13-publish-quota-ux-closure.md` | This document. |

**Not changed by 72.13** (verified): `publish-policy.ts`, `publish-period.ts`, `publish-usage.ts`, `publish-error-messages.ts` (untracked file created by RCCF-70.6.5.3 — the transaction-abort hints were already present and are pre-existing, not a 72.13 diff), `publishing/service.ts` (working-tree diff is pre-existing RCCF-71.2 themeConfig/applyExperienceOverride — must NOT be committed as 72.13), `publish.actions.ts`, the three publish UI surfaces, Prisma schema, billing, plans, capabilities.

---

## 8. Behavior Preservation

- **Below quota:** publish succeeds; snapshot created; usage incremented **exactly once** (conditional increment count 1; create never called on an existing row).
- **Exhausted:** denied; no snapshot; no usage increment; the single conditional increment matches 0 rows and stops. `used` can never exceed `limit`.
- **Unlimited (Scale/Enterprise):** publish succeeds with **no** quota interaction — no usage row read/write; UI shows "Publish allowance: Unlimited".
- **Lifetime vs monthly:** unchanged period semantics; monthly copy references the allowance reset.
- **Rollback coupling:** a failed snapshot write still rolls the increment back.
- **Order metering:** `max_orders` metering shares the same repository and benefits from the same write-free exhausted path (rccf38-order-metering suite stays green).

---

## 9. Regression Coverage

Focused suite `tests/unit/rccf72-13-publish-quota-ux.test.ts` — 16 scenarios mapping to ticket invariants INV-01..INV-16:

| Scenario | Pins |
|---|---|
| 1. Launch below quota reserves (no create) | increment once, no create, no findUnique |
| 2. Launch at quota denied deterministically | `false` from existing at-limit row |
| 3–4. Exhausted quota creates no row, never increments again | no create, exactly-one increment |
| 5–6. Growth (monthly) below quota succeeds | exact `where { used: { lt: 10 } }` + increment payload |
| 7–8. Growth exhausted denied with no writes | no create, single increment |
| 9. Scale unlimited: snapshot created, no usage interaction | no usage read/write |
| 10/10b. Postgres abort text collapses to safe generic | `getPublishFailurePresentation` sanitization |
| 11. Exhausted returns structured quota failure (not thrown) | `ok:false` + used/limit/mode/periodStart/periodEnd |
| 12. Existing coded quota mapping intact | friendly copy + `/admin/billing` CTA |
| 13. Successful limited publish increments exactly once | one increment, one snapshot |
| 14. Failed (exhausted) publish never increments | single 0-row increment |
| 15. Concurrent final-slot: loser denied without create | no create |
| 16. Successful publish lifecycle intact | snapshot state `live` + statusUpsert |

Source guardrails (readFileSync): `findUnique` present and ordered before `planUsage.create` in the repository; `existing.used < limit` and `return false; // exhausted` present; transaction-abort tokens present in the classifier; **no plan limits hardcoded** in repository or presentation layer (`creator_launch`/`creator_grow`/`creator_scale` and `limit: 3`/`limit: 10` absent).

Repository + metering suites (`plan-usage-repository.test.ts`, `publish-metering.test.ts`) reworked to the no-create contract: exhausted lifetime, exhausted monthly, concurrent final-slot (loser no-create), concurrent first-create retry (increment retry, no create), exactly-once increment, and rollback-coupling preserved.

---

## 10. Verification Results

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| Focused `npx vitest run tests/unit/{plan-usage-repository,publish-metering,rccf72-13-publish-quota-ux,rccf38-order-metering,rccf70-6-5-publish-error-ux,rccf70-6-5-admin-publish,rccf70-4-5-builder}` | ✅ 128/128 |
| `npx vitest run` (full suite) | ✅ 3667 passed; **7 failed — all pre-existing out-of-scope rccf71-* theme guardrails** (rccf71-1, rccf71-2×2, rccf71-3, rccf71-5-1, rccf71-6-1, rccf71-6-2 — frozen storefront-loader/theme surfaces, unrelated to 72.13; identical set as the 72.12 baseline) |
| `npm run build` | ✅ clean (after stopping dev server + clearing `.next`; build-vs-dev `.next` conflict resolved) |
| `npx eslint` (touched files) | ✅ 0 errors |
| `git diff --check` | ✅ clean on 72.13 files (CRLF notices only on pre-existing untouched files) |
| `npx prisma validate` / `generate` | not rerun this session (no schema change); prior baseline green |
| Browser QA | ✅ all scenarios below |

---

## 11. Browser QA

Dev server (port 3000) confirmed healthy (HTTP 200 on `/admin/login`) per `.agents/skills/dev-server-lifecycle/SKILL.md`. Playwright MCP authenticated real QA accounts (NextAuth credentials, password `Audit72!QaPass` — bcrypt-verified against DB, cost 12). QA accounts: `rccf7151-growth@example.com` (creator_grow), `rccf7164-scale-1787027917475@example.com` (creator_scale), `rccf72-1787032348339@example.com` (rccf-720-audit, Launch lifetime 3/3).

| Scenario | Result |
|---|---|
| **A. Growth successful publish** (`rccf7151-growth`, 7/10 → 8/10) | ✅ Builder Publish → success; DB: snapshots 7→8, usage 7→8 (monthly row 2026-08-01..31); 0 console errors |
| **B. Growth exhausted** (fixture set 10/10, **restored to 8 after**) | ✅ denial: "You've reached your publish limit for this billing period. You can upgrade now or continue when your publishing allowance resets." + "Upgrade to Scale" → `/admin/billing`; DB: snapshots stayed 8, usage stayed 10; 0 console errors |
| **C. Launch exhausted** (`rccf-720-audit`, 3/3 lifetime, zero new quota) | ✅ denial: "You've used all 3 publishes available on your current plan. Upgrade to keep publishing." + "Upgrade to Growth" → `/admin/billing`; DB: snapshots stayed 3, usage stayed 3; 0 console errors |
| **D. Scale unlimited publish** (`rccf-7164-scale-qa`) | ✅ success; DB: snapshots 3→4, usage row untouched (used=1); dashboard "Publish allowance: Unlimited", Status Live, v4; 0 console errors |
| **E. Builder reload after denial** | ✅ loads cleanly, all controls present, 0 console errors |
| **F. Storefront parity** (`/rccf-720-audit`) | ✅ still renders last published snapshot (v3): "Audit CTA 999", products, "Audit Milestone Title" timeline |

Evidence: `screenshots/rccf72-13-Growth-published-topbar.png`, `rccf72-13-Growth-exhausted-builder.png`, `rccf72-13-Launch-exhausted-builder.png`, `rccf72-13-Launch-storefront-unchanged.png`, `rccf72-13-Scale-dashboard-unlimited.png`.

QA safety: usage inspected before mutation; the exhausted Launch account required zero new quota; the Growth exhausted fixture was set and **restored** to its legitimate post-A state (monthly `used=8`); no billing/subscription events fabricated; unrelated QA data untouched. Temporary inspection/fixture scripts removed after use (not committed).

---

## 12. Diff Discipline

**In-scope (72.13):**
- `src/modules/billing/infrastructure/plan-usage-repository.ts` (+42/−2)
- `tests/unit/plan-usage-repository.test.ts` (+68)
- `tests/unit/publish-metering.test.ts` (+86)
- `tests/unit/rccf72-13-publish-quota-ux.test.ts` (new)
- `docs/rccf-72.13-publish-quota-ux-closure.md` (this doc) + QA screenshots

**Pre-existing working-tree changes NOT part of 72.13 (left untouched, must not be committed under this ticket):**
- `src/lib/publishing/service.ts` — pre-existing RCCF-71.2 themeConfig/`applyExperienceOverride` work (+11/−2)
- `src/lib/publishing/publish-error-messages.ts` — **untracked** file from RCCF-70.6.5.3 (transaction-abort hints pre-existing)
- The 58-file working-tree diff from tickets 70.x/71.x/72.x (settings-form, appearance, builder components, plans.ts, plan-source, storefront, etc.)
- `.env.example`, `opencode.json`, `docs/design/Stitch-DNA.md`, skills, WORKSPACE checkpoint, other untracked docs/screenshots

**Frozen surfaces (unchanged by 72.13):** Prisma schema/migrations, billing/Razorpay, plans/capabilities, authentication/middleware, tenant resolution, preview security, Theme Experience, Hero ownership, Builder architecture, storefront architecture, quota limits, Scale's unlimited behavior, error-message copy.

---

## 13. Risks & Edge Cases — Recommendation

**Risks:**
1. **Concurrent first-create race** (two simultaneous publishes when no `PlanUsage` row exists): the pre-existing P2002-retry runs on an aborted transaction in real PostgreSQL and throws. Outcome today: loser's transaction rolls back cleanly, no double charge, defense-in-depth maps any residual error to the safe generic message (no raw DB text). Not a regression; a full fix (upsert-based row-ensure) was deliberately out of scope per the ticket. Mitigation if it ever becomes a support signal: promote the generic message + add row-ensure.
2. **Order metering shares the repository:** same fix benefits `max_orders` metering; order-metering tests confirm no regression.
3. **Environment:** `npm run build` while the dev server holds `.next` fails with ENOENT (dev/build cache conflict) — resolved by stopping the dev server and clearing `.next`; the 72.12 session documented the same restart-after-build step. Not a code defect.

**Recommendation:** **Proceed / staged.** 72.1-F2 is closed. Quota exhaustion produces a deterministic, write-free structured quota failure with friendly tier-aware copy and the preserved upgrade path on every tier; raw database/transaction errors cannot reach the Creator UI; quota enforcement is unchanged, server-authoritative, and atomic. **No commit made** — awaiting explicit approval. When committing, stage ONLY the four in-scope files (+ closure doc + screenshots) and leave the pre-existing 70.x/71.x/72.x working-tree changes untouched.
