# RCCF-71.6.1 — Canonical Entitlement Status Correctness Closure

## 1. Executive Verdict

**Verdict: A — staged and uncommitted.** Effective plan resolution now represents current entitlement rather than merely returning a historical subscription plan code.

## 2. Production Root Cause

`resolveActivePlan()` returned any Billing v2 subscription's plan code and any legacy `Subscription.plan` value without checking whether the subscription status still granted access. A `CANCELLED`, `EXPIRED`, `PAST_DUE`, or ended `TRIALING` paid record could therefore continue feeding `premium_themes` and other capabilities.

The Billing lifecycle already contained the intended status model and an existing `getSubscriptionStatus()` implementation that treated only `ACTIVE` and a currently valid `TRIALING` subscription as active. The canonical plan source was not using that policy.

## 3. Architecture Invariant & Option Selection

```text
subscription status/effective period
  -> resolveActivePlan()
  -> canonical capability engine
  -> theme entitlement
  -> runtime capability resolution
```

Chosen option:
- Centralize effective-status evaluation in `plan-source.ts`.
- Apply it to direct v2 resolution, tenant v2 resolution, legacy fallback, and batched resolution.
- Preserve v2 precedence: an existing inactive v2 subscription returns no effective plan and does not fall through to a legacy paid plan.

Rejected options:
- Client-side locks: not security authoritative.
- Changing `themeEntitlementDecision()` alone: too late; raw paid plan codes would still leak to other capability consumers.
- Changing webhook transitions: lifecycle transitions already encode the intended statuses.
- Schema changes: existing status, trial end, renewal end, cancellation, and legacy period fields are sufficient.

## 4. Final Canonical Status Policy

| Status | Effective entitlement |
|---|---|
| `ACTIVE` | Granted while `renewsAt`/legacy `currentPeriodEnd` is absent or future. A known past period end revokes access. |
| `TRIALING` | Granted while `trialEndsAt`/legacy `currentPeriodEnd` is future. Existing open-ended records with no end date remain eligible, matching current `getSubscriptionStatus()` semantics. |
| `PAST_DUE` | Not granted. No grace period was invented. |
| `CANCELLED` | Not granted immediately, matching the existing lifecycle transition and `cancelledAt` write. |
| `EXPIRED` | Not granted. |
| `DRAFT` | Not granted. |
| `FREE` legacy status | Not granted. |
| Missing subscription | Existing `{ code: null, origin: "none", status: null }` fallback preserved. |

## 5. Implementation Changes

| File | Change |
|---|---|
| `src/modules/billing/application/plan-source.ts` | Added `isSubscriptionEntitlementEligible`; applied it to v2, legacy, and batched resolution; selected legacy `currentPeriodEnd`; preserved v2 precedence with an explicit no-entitlement result. |
| `src/modules/billing/application/__tests__/plan-source.test.ts` | Added direct resolver tests for inactive v2 statuses, ended v2 trials, and expired legacy periods. |
| `tests/unit/rccf71-6-1-entitlement-status.test.ts` | Added focused status, period, legacy, capability, runtime degradation, server-gate, and parity guardrails. |
| `docs/rccf-71.6.1-entitlement-status-closure.md` | This closure document. |

## 6. Why the Fix Is Server-Authoritative

All capability consumers receive the result of `resolveActivePlan()` or the batched equivalent. An inactive subscription now yields `code: null`, so:

- `entitlementService.has(null, "premium_themes")` is false.
- `themeEntitlementDecision()` rejects premium theme application.
- `updateTheme()` rejects premium ThemeConfig mutations at its existing server gate.
- `resolveExperienceForCapabilities()` receives no paid plan and degrades to the safe Launch experience.
- Client URL parameters, premium theme IDs, ThemeConfig payloads, Builder state, and client lock manipulation cannot restore entitlement.

## 7. Regression Coverage

Relevant focused verification: **82 tests passed** across 6 test files.

Covered:
- ACTIVE Growth and Scale.
- Valid TRIALING Launch/paid behavior.
- Ended trial revocation.
- CANCELLED, EXPIRED, PAST_DUE, DRAFT, and FREE statuses.
- ACTIVE records past/future effective period boundaries.
- Legacy `currentPeriodEnd` policy.
- Direct `resolveActivePlan()` v2 and legacy revocation behavior.
- v2 precedence over a legacy fallback after revocation.
- Missing subscription fallback.
- `premium_themes` rejection without an effective plan.
- Safe runtime experience degradation.
- Existing server theme mutation/application gates.
- Builder/preview/publish resolver chain preservation.

## 8. Verification Results

| Gate | Result |
|---|---|
| Focused RCCF-71.6.1 + plan-source + billing lifecycle + capability/theme suites | PASS — 82/82 |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npx eslint` on touched TypeScript files | PASS |
| `git diff --check` | PASS with pre-existing CRLF warnings only |

The build reported existing repository-wide lint warnings; no new error was introduced by the touched files.

## 9. Behavior Preservation

- ACTIVE paid subscriptions retain their plans.
- Valid trials retain their existing intended access.
- Existing open-ended TRIALING behavior is preserved.
- Launch/free fallback remains unchanged.
- v2 remains authoritative over legacy when a v2 subscription exists.
- Billing webhook lifecycle code was not modified.
- Prisma schema/migrations were not modified.
- Theme, Builder, Hero, publishing, and snapshot architectures were not modified.

## 10. Diff Discipline

In scope:
- Effective plan status resolution.
- Resolver tests and focused security guardrails.
- This closure document.

Frozen and untouched:
- Billing webhook lifecycle and subscription transition implementation.
- Prisma schema/migrations.
- Signup/authentication.
- Builder architecture and device frames.
- ThemeRegistry/theme runtime architecture.
- Hero ownership.
- Publishing contract and snapshot schema/version.
- Client-side entitlement authority.

No commit was created.

## 11. Remaining Entitlement Risks

- Partner-plan granular Theme Experience alignment remains unresolved and is intentionally out of scope for RCCF-71.6.1.
- Scale video/custom visual capability representation remains unresolved and is intentionally out of scope.
- Enterprise-specific theme package assignment remains unresolved.
- Open-ended legacy `TRIALING` records remain eligible because the existing repository semantics treat a missing trial end as open-ended. A future lifecycle policy would be needed to change that safely.

## 12. Recommendation

**Proceed.** RCCF-71.6.1 corrects the central server-side stale-entitlement defect without changing billing transitions or schema. Partner, Scale, Enterprise, and new capability work should follow as separate scoped tickets.
