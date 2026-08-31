# RCCF-71.4.5 — Entitlement Enforcement Closure

Closes the read-only audit `docs/rccf-71.4.4-tier-capability-entitlement-audit.md`.
Scope: implement the minimum safe fixes for **F1** (webhook payment guard, HIGH),
**F2** (theme tier-band server enforcement, MEDIUM), and **investigate F8**
(subscription status semantics). All other findings (F3–F7) remain open,
documented below. **No commit was made.**

---

## 1. F1 — root cause + fix (HIGH: webhook activation before the payment guard)

### Root cause
`BillingService.handleSubscriptionWebhook` (`src/modules/billing/application/service.ts`)
upserted the subscription to **ACTIVE** as soon as `subscription.activated` /
`subscription.charged` arrived. The RCCF-41 zero-value guard ran **after** the
status flip and only prevented invoice + commission minting. A webhook with a
zero/absent/invalid `amount` therefore still flipped the subscription ACTIVE →
`resolveActivePlan` returned the paid code → full paid entitlements were
granted with **no payment recorded**.

### Fix (single payment authority preserved)
For **paid transitions** (`activate` / `renew`), the webhook now validates a
positive captured amount **before** the subscription upsert:

- `validPaidAmount` = amount when it is `number`, `Number.isFinite`, `> 0`
  (rounded to 2dp); otherwise `null`.
- If `null` for a paid transition:
  - the `BillingEvent` is still recorded (same `idempotencyKey`) so duplicate
    deliveries remain idempotent,
  - `billing:payment-ignored` is logged (same reason `zero-or-missing-amount`),
  - the subscription **status is left unchanged** and `{ handled: true }` is
    returned — **ACTIVE is never reached**, so no paid plan resolution and no
    paid entitlement.
- On a valid amount the existing flow is untouched: upsert → event →
  invoice + commission in one transaction (RCCF-41/50) → `PaymentCaptured`
  event (RCCF-37 dedupe preserved).
- Non-paid transitions (`cancel`, `pause`, `resume`, `past_due`) never enter
  the payment guard — their lifecycle behavior is byte-for-byte unchanged.
- The return type was widened to `status?: string | null` so the blocked path
  can report the **unchanged** status truthfully.

### Companion change — dev QA harness
`simulateRazorpayEvent` (`src/actions/billing.actions.ts`, dev-only) did not
pass an `amount`, so the new guard would have broken the dev/Playwright harness
that drove `subscription.activated` to prove Growth entitlement (71.4.3). It now
sends the plan's runtime price as the captured amount for paid events, exactly
emulating a real Razorpay payment. No production surface changed.

### Files
- `src/modules/billing/application/service.ts` — guard moved before upsert.
- `src/actions/billing.actions.ts` — simulator passes a valid amount.
- `src/modules/billing/application/__tests__/lifecycle.test.ts` — RCCF-41 test
  updated to assert the new invariant.
- `tests/unit/rccf71-4-5-webhook-payment-guard.test.ts` — new regression suite.

---

## 2. F2 — root cause + fix (MEDIUM: theme tier-band UI gate vs server gate)

### Root cause
The marketplace/builder lock surfaces (`themeUnlockedForPlan`,
`isThemeUnlocked`) locked business/enterprise-tier themes behind a plan tier
band (`PLAN_TO_TIER` + `tierRank`), but the server write boundary
`themeEntitlementDecision` (`src/lib/theme/entitlement.ts`) checked only the
boolean `premium_themes` capability. The server therefore **allowed** themes the
UI showed as locked (e.g. a business-tier theme on `creator_grow`).

### Fix
`themeEntitlementDecision` now enforces **both** conditions, in order:

1. **Capability (outer gate, unchanged — never weakened):**
   `capabilityService.can(canonical, "premium_themes")`.
2. **Tier band (new):** `tierRank(theme.tier) > tierRank(planTierFor(canonical))`
   → `{ allowed: false, reason: "theme_tier:plan_too_low" }`.

No plan matrix was duplicated, no plan/tier/theme names were hardcoded — it
reuses the canonical `PLAN_TO_TIER` registry (`planTierFor`) and the existing
`tierRank`, i.e. the exact helpers the UI uses, so the invariant
**UI-allowed == server-allowed** now holds by construction. Because every apply
surface (`theme.actions.ts` `applyThemePackage`, `create.actions.ts`
`applyBlueprintToWebsite`, `provisioning-service.ts` theme resolution) routes
through this single decision, one change fixes all write paths.

### Behavior matrix (verified by tests)
| User's plan | Canonical tier | pro theme | business theme | enterprise theme |
| --- | --- | --- | --- | --- |
| creator_launch | free | blocked (capability) | blocked | blocked |
| creator_grow | pro | allowed | **blocked (tier)** | blocked |
| creator_scale | business | allowed | allowed | blocked |
| creator_enterprise | enterprise | allowed | allowed | allowed |
| free-tier theme | any | always allowed | always allowed | always allowed |

### Files
- `src/lib/theme/entitlement.ts` — tier-band check added.
- `src/lib/capabilities/__tests__/plan-resolution.test.ts` — the legacy
  `PRO → creator_grow` expectation at line 147 flipped `true → false`
  (business theme on a pro-tier plan is now correctly denied); boundary
  assertions added.
- `tests/unit/rccf71-4-5-theme-tier-boundary.test.ts` — new regression suite
  incl. a full server-vs-UI agreement sweep.

---

## 3. F8 — investigation + decision (no code change)

### Investigation
Traced every status consumer and revocation path:

- `resolveActivePlan` (`plan-source.ts:36-76`) returns `sub.plan.code`
  **without consulting `sub.status`**; it feeds ~25 enforcement surfaces
  (storage, content limits, publishing, capability gates, storefront loader,
  admin layout, integrations, domain settings, partner locks…). None read the
  returned `status` to gate capability resolution.
- `getSubscriptionStatus` (`service.ts:665-676`) is the only helper that maps
  status → boolean `active` (`ACTIVE || live TRIALING`); it is consumed only by
  the custom-domain attach path and the billing page.
- `isTrialExpiredForTenant` (`publish-usage.ts`, RCCF-34) is a targeted publish
  gate: only `TRIALING` + expired trial → block publish.
- `subscription-engine.ts` models a **grace period** for `PAST_DUE`
  (`isInGracePeriod`, 7 days) — evidence of a retain-during-grace model.
- Lifecycle allows `PAST_DUE → ACTIVE` (resume) and `CANCELLED → ACTIVE`
  (reactivation via `changePlan`); `cancelSubscription` keeps `planId`.
- **No code anywhere auto-downgrades a subscription to free on
  CANCELLED/EXPIRED/PAST_DUE, and no end-of-period downgrade exists.**

### Decision: genuinely ambiguous → documented, NOT changed
The architecture consistently grants paid capabilities from the subscription
row's plan code, with status handled by narrow, purpose-built gates (trial
publish gate, domain attach). Whether a cancelled/expired/past-due subscription
should retain its paid band until the paid period ends (grace model) or be
revoked immediately (free fallback) is a **product decision the code does not
establish**. Implementing either would be a guess and could silently revoke or
retain entitlements for paying customers.

Per the ticket: **DO NOT change behavior. F8 is deferred as a product /
architecture decision** (see §9). `resolveActivePlan` stays status-blind.

---

## 4. Tests

New guardrail suites (assert correct token present + wrong token absent):

- `tests/unit/rccf71-4-5-webhook-payment-guard.test.ts` (F1) — valid amount →
  ACTIVE + invoice; zero / missing / NaN / negative amount → **never ACTIVE**
  (no upsert, no invoice, event recorded); duplicate delivery idempotent;
  zero-amount renew leaves an ACTIVE sub unchanged; valid renewal mints
  invoice; cancel and PAST_DUE behavior unchanged.
- `tests/unit/rccf71-4-5-theme-tier-boundary.test.ts` (F2) — Launch cannot apply
  premium themes (incl. catalog business theme); Growth: pro OK / business &
  enterprise blocked; Scale: business OK (incl. `com.creatos.midnight-ocean`);
  Enterprise: enterprise OK; exact-boundary cases OK; full server-vs-UI
  agreement sweep across 5 tiers × 11 plans; `themeUnlockedForPlan` agreement.

Updated existing tests (behavior intentionally changed by F1/F2):

- `src/modules/billing/application/__tests__/lifecycle.test.ts` — RCCF-41 zero
  amount now asserts `status === null` + `upsertSub` NOT called (was `ACTIVE`).
- `src/lib/capabilities/__tests__/plan-resolution.test.ts:147` — business theme
  on legacy `PRO` now `false` (tier band).

Unchanged & still green: `rccf36-theme-entitlement.test.ts`,
`rccf41-settlement.test.ts`, `rccf43`, `rccf44`, `rccf50`, `trial-lifecycle`.

---

## 5. Verification gate (all run)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ clean (only a pre-existing stale `.next/types/app/dev/qa-growth` artifact from a removed page — `.next` is gitignored) |
| Focused RCCF-71.4.5 + billing/theme suites | ✅ 63 + 18 tests pass |
| `npx vitest run` (full) | ✅ 3497 passed / 1 failed — `rccf68-retry-catalog-timeout` 5000ms jsdom timeout; **passes 11/11 in isolation** (pre-existing environmental flake, unrelated to this work) |
| `npm run build` | ✅ compiled, linted (0 errors, warnings all pre-existing), 160 pages generated |
| `npx prisma validate` | ✅ schema valid |
| `npx prisma generate` | ✅ client regenerated |
| `npx eslint <touched files>` | ✅ 0 errors, 4 warnings (all pre-existing) |
| `git diff --check` | ✅ no whitespace errors (only pre-existing CRLF notices in unrelated dirty files) |

---

## 6. Tier behavior matrix (post-fix, canonical registry)

| Plan (canonical) | PLAN_TO_TIER | premium_themes | UI lock band | Server decision |
| --- | --- | --- | --- | --- |
| creator_launch / creator_free / partner_free | free | ✗ | free only | free themes only |
| creator_grow / creator_pro / partner_solo | pro | ✓ | ≤ pro | ≤ pro (new: business blocked) |
| creator_scale / creator_elite / partner_growth | business | ✓ | ≤ business | ≤ business |
| creator_enterprise / partner_enterprise | enterprise | ✓ | ≤ enterprise | ≤ enterprise |
| partner_scale / agency_studio / agency_enterprise | enterprise | ✓ | ≤ enterprise | ≤ enterprise |

Free-tier themes remain universally allowed. The server now agrees with the UI
marketplace/builder lock at every boundary.

---

## 7. Security / billing implications

- **F1:** eliminates the "ACTIVE with no payment" entitlement hole — the
  strongest path to paid capabilities without revenue. Idempotency is preserved
  (the blocked event carries the same key), so retries of the same webhook do
  not loop. Invoice/commission/reconciliation guarantees (RCCF-37/41/50) and the
  single payment authority (Razorpay capture → BillingService) are intact.
- **F2:** closes the server-side bypass of the marketplace tier lock — a user
  could previously apply a UI-locked premium theme via the apply boundary; the
  capability gate is unchanged (no downgrade of any legitimate entitlement).
- **F8:** no change made — no new attack surface introduced; status semantics
  remain a tracked product decision (§9).

---

## 8. Frozen surfaces (untouched, verified)

Signup FREE-only behavior, plan definitions/pricing, Razorpay checkout flow,
capability registry, Builder UI, Theme UI, publishing architecture, Hero,
Prisma schema/migrations — none modified. Unrelated dirty worktree files were
left as-is; no reset/stash/clean was used. The staged RCCF-71.4.3 files remain
staged and were not committed. No commit was made in this ticket.

---

## 9. Remaining findings (F3–F7, deferred — from RCCF-71.4.4 audit)

- **F3 (LOW, latent)** — two `EntitlementService` classes
  (`lib/capabilities/entitlements.ts` vs `modules/billing/application/entitlements.ts`);
  `CAPABILITY_TO_FEATURE` lacks granular `theme_background_*`/`theme_effects_*`
  ids → false negatives if queried by id. Consolidate to one canonical service.
- **F4 (LOW)** — `DEFAULT_PUBLISH_POLICIES` maps only `creator_*`; `partner_free`
  falls back to **unlimited** publishing while `creator_launch` is capped at 3.
  Add a defined partner quota (e.g. `partner_free → { mode: "lifetime", limit: 3 }`).
- **F5 (LOW, documented tradeoff)** — baked experience in published snapshots is
  stale until republish (RCCF-02); preview re-resolves live. No change unless the
  snapshot rule is relaxed (not recommended).
- **F6 (LOW, maintainability)** — hardcoded `creator_launch` fallbacks across ~15
  UI/fallback sites + hardcoded upgrade targets in `agency-plan-manager.tsx:53-54`.
  Route through `PLAN_CODES`/`resolvePlan`; no behavior change required.
- **F7 (LOW, minor)** — `partner_free` lacks `theme_background_solid` (free-tier
  parity gap with `creator_launch`); visible behavior identical today via runtime
  fallback. Add the feature-key for parity.
- **F8 (LOW→ deferred, product decision)** — define intended paid-capability
  semantics for CANCELLED / EXPIRED / PAST_DUE (grace-period retain vs immediate
  free fallback), then decide whether `resolveActivePlan` should consult
  `status`. Requires product/architecture sign-off; no code change here.

---

No commit was made. All changes are confined to the seven files in §1/§2/§4.

RCCF-71.4.5 complete. Verdict: C (closes). F1: fixed (valid positive payment required before ACTIVE). F2: fixed (server tier-band = UI tier-band). F8: documented, no change (product decision required).
