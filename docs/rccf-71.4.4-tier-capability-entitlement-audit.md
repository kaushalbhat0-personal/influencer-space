# RCCF-71.4.4 — Tier Capability + Entitlement Consistency Audit (READ-ONLY)

**Scope:** cross-tier audit of the capability/entitlement authority chain and
signup lifecycle invariant from RCCF-71.4.3 — *paid plans MUST NOT be granted as
TRIALING merely because signup submitted a paid plan code; paid entitlements
only via the canonical checkout/webhook/subscription lifecycle; capability
derived from the canonical plan/entitlement authority; the client never decides
paid capability ownership; runtime enforces the same semantics as the UI.*

**Audit date:** 2026-08-17 · **Mode:** READ-ONLY — no code, no Prisma, no
billing, no capability-authority, no publishing changes. Findings are documented
with source + minimal recommended fix only. **No commit created.**

**Classification key:** **A** invariant holds · **B** holds with a documented
latent gap · **C** mismatch between UI and server semantics · **D** needs a fix.

---

## 1. Executive Verdict

**Verdict: C — PASS on the signup/TRIALING invariant; findings documented for a
follow-up closure ticket.**

- **Invariant PASSED (verified against source):** signup is FREE-only. The
  register route hardcodes `creator_launch` (creator) / `partner_free` (agency)
  and **ignores `body.planCode`** (`src/app/api/auth/register/route.ts`); the
  signup wizard iterates `getSignupEligiblePlans` (`ctaType === "signup"`, only
  free plans); provisioning/onboarding hardcode `creator_launch`
  (`provision.actions.ts:92`, `onboarding.actions.ts:507`). **No paid plan is
  ever created at signup**, and signup subscriptions are always `TRIALING`,
  never `ACTIVE`.
- **Entitlement authority PASSED:** all capability checks resolve through the
  canonical Capability Runtime — `capabilityService`/`entitlementService` read
  plan features built from `BASE_FEATURES + featuresForPlan(code) +
  featureOverrides` (`src/lib/capabilities/plans.ts`), never a client-supplied
  code. Paid plans are only activated via checkout/webhook
  (`createCheckout`/`handleSubscriptionWebhook`); no bypass path found — the only
  `changePlan` callers are billing.actions, partner.actions, and
  super-admin-billing.actions; `createCheckout` is otherwise test-only.
- **Client gating PASSED:** the Builder/theme UI receives server-derived codes
  (`builder-overview.actions.ts:228`, `getLivePreviewData.planCode`,
  `admin/themes/page.tsx`, `admin/appearance/page.tsx`) and never decides paid
  ownership.
- **Findings:** 8 documented (1 HIGH — webhook activation before payment guard
  [F1]; 1 MEDIUM — theme tier-band UI gate vs server `premium_themes`-only gate
  [F2]; others LOW). None were fixed — this is a read-only audit.

Staged RCCF-71.4.3 files remain staged and were NOT touched by this audit.

---

## 2. Method & Inputs Read

Read-only source verification of the full authority chain, plus grep for
hardcoded plan codes and `changePlan`/`createCheckout` callers. No DB writes, no
mutations, no commits.

Inputs read (all verified against source): `src/config/commerce/plans.ts`,
`src/lib/capabilities/{plans,service,engine,entitlements,constants,limits,plan-resolution,registry,index}.ts`,
`src/modules/billing/application/{service,plan-source,plan-restriction,capability-gates,entitlements,runtime-config-loader}.ts`,
`src/modules/billing/domain/{lifecycle,webhook}.ts`,
`src/modules/billing/infrastructure/{repository,revenue-repository}.ts`,
`src/modules/pricing/application/runtime.ts`,
`src/lib/theme/{tiers,access,entitlement,registry-new}.ts`,
`src/modules/theme/runtime/experience/{capabilities,experience-registry,theme-experience}.ts`,
`src/lib/publishing/{service,publish-policy,publish-usage}.ts`,
`src/lib/storefront/{storefront-loader,build-snapshot}.ts`,
`src/components/storefront/StorefrontPage.tsx`,
`src/app/[domain]/{page.tsx,[slug]/page.tsx}`,
`src/actions/{billing,checkout,theme,domain,create,builder-overview,provision,onboarding,builder-preview}.actions.ts`,
`src/app/api/auth/register/route.ts`,
`src/components/auth/signup/SignupForm.tsx`,
`src/features/builder/canvas/interactive-canvas.tsx`,
`src/app/agency/billing/_components/agency-plan-manager.tsx`,
`src/modules/partner/application/access-lock.ts`,
`src/modules/provisioning/application/provisioning-service.ts`,
`src/modules/workspace/application/resolve-workspace.ts`,
`src/modules/billing/application/__tests__/*`, `tests/unit/billing-v2.test.ts`,
prior docs `rccf-71.4.3-growth-entitlement-hero-closure.md`,
`rccf-71.3-hero-presentation-audit.md`, `rccf-71.2-growth-theme-experience.md`.

---

## 3. Canonical Authority Chain (verified)

```
config/commerce/plans.ts  COMMERCE_PLANS (9 plans) + LEGACY_TO_CANONICAL
  → capabilitiesForPlan(code) / featuresForPlan(code)  (CommerceCapability union)
      → lib/capabilities/plans.ts  plan.features = { ...BASE_FEATURES, ...featuresForPlan(code), ...featureOverrides }
          → lib/capabilities/service.ts  CapabilityService.can(code, featureKey)
              → engine.ts  CapabilityEngine.can  (reads plan.features[featureKey])
  ↑ runtime overrides:  modules/pricing/application/runtime.ts (BillingPlan DB wins)
    + runtime-config-loader.ts (only featureOverrides propagate)
  ↑ plan identity:        modules/billing/application/plan-source.ts resolveActivePlan (v2-first, legacy fallback)
    → lib/capabilities/plan-resolution.ts resolvePlan / PLAN_TO_TIER / canonicalPlanCode
  ↑ restriction:          modules/billing/application/plan-restriction.ts (agency-managed Launch→Grow clamp)
  ↑ lifecycle:            modules/billing/domain/{lifecycle,webhook}.ts
  ↑ activation:           modules/billing/application/service.ts createCheckout / handleSubscriptionWebhook
```

Key facts confirmed:

- **Canonical registry:** `src/config/commerce/plans.ts` — 9 plans
  (`creator_launch/grow/scale/enterprise`, `partner_free/solo/growth/scale/enterprise`),
  `LEGACY_TO_CANONICAL`, granular `CommerceCapability` union (incl.
  `theme_background_*`, `theme_effects_*`).
- **Capability runtime:** `src/lib/capabilities/plans.ts` merges base +
  per-plan + overrides; `service.ts`/`engine.ts` read that merged map. Runtime
  pricing (`modules/pricing/application/runtime.ts`) makes the persisted
  `BillingPlan` the live source when present; the static registry is fallback.
- **Plan identity:** `resolveActivePlan` returns `{ code, origin, status }`
  v2-first; `resolveRestrictedPlanCode` clamps Launch→Grow for agency-managed
  creators (`plan-restriction.ts`) — intended (IMPLEMENTATION-42 Phase 5 /
  RCCF-11).
- **Two `EntitlementService` classes exist** (see F3).

---

## 4. Signup Lifecycle Matrix (per tier) — INVARIANT CHECK

| Tier (canonical) | Offered at signup | Server grants | Status | Trial | Payment required |
| --- | --- | --- | --- | --- | --- |
| `creator_launch` | ✅ (only creator signup option) | `creator_launch` (hardcoded) | TRIALING | 15-day `trialEndsAt` | No |
| `creator_grow` | ❌ not eligible (`ctaType==="checkout"`) | never at signup | — | — | Yes (Razorpay) |
| `creator_scale` | ❌ | never at signup | — | — | Yes |
| `creator_enterprise` | ❌ (contact) | never at signup | — | — | Manual |
| `partner_free` | ✅ (only agency signup option) | `partner_free` (hardcoded) | TRIALING | 15-day | No |
| `partner_solo` | ❌ | never at signup | — | — | Yes |
| `partner_growth` | ❌ (hidden legacy) | never at signup | — | — | Yes |
| `partner_scale` | ❌ | never at signup | — | — | Yes |
| `partner_enterprise` | ❌ (contact) | never at signup | — | — | Manual |

- **Verdict: A.** Register route hardcodes `creator_launch` / `partner_free`,
  ignores `body.planCode`, never references paid codes, and creates
  `TRIALING` subscriptions only. `SignupForm.tsx` filters through
  `getSignupEligiblePlans(family)` (`ctaType === "signup"`), validates `?plan=`
  against the eligible set, and posts `planCode` — which the server ignores
  (server is authoritative).
- Subscription workspace linkage is backfilled post-creation:
  `repository.linkSubscriptionToWorkspace` (RCCF-07),
  `provisioning-service.ts:280-287`, `resolve-workspace.ts` `linkAgencySubscription`
  (RCCF-40).

---

## 5. Subscription Status / Transition Matrix

`LIFECYCLE_STATES = DRAFT, TRIALING, ACTIVE, PAST_DUE, CANCELLED, EXPIRED`
(`src/modules/billing/domain/lifecycle.ts`).

| From → To | Legal | Used by |
| --- | --- | --- |
| DRAFT → TRIALING | ✅ | register route (signup) |
| DRAFT → ACTIVE | ✅ | adminSetPlan |
| TRIALING → ACTIVE | ✅ | webhook `subscription.activated` (QA harness proof in 71.4.3) |
| ACTIVE → PAST_DUE | ✅ | webhook pause/past_due |
| ACTIVE → CANCELLED / EXPIRED | ✅ | cancel / expiry |
| CANCELLED → ACTIVE | ✅ | reactivation |
| EXPIRED → ACTIVE | ✅ | renewal |

- Webhook mapping: `RAZORPAY_EVENT_MAP` (`subscription.activated → activate`,
  `payment.captured → renew`, `subscription.cancelled → cancel`, etc.;
  `src/modules/billing/domain/webhook.ts`).
- **TRIALING is granted only at signup (register) or by Super Admin
  `adminSetPlan`** — never by checkout (`createCheckout` mints a Razorpay order
  only) and never by webhook (`statusForWebhookEvent` produces ACTIVE/PAST_DUE/
  CANCELLED, never TRIALING). **Verdict: A.**
- ⚠️ `handleSubscriptionWebhook` flips the subscription to ACTIVE **before** the
  invoice/commission amount guard → **F1**.

---

## 6. Tier Capability Matrix (feature resolution)

`PLAN_TO_TIER` (`plan-resolution.ts`): `creator_launch→free`, `creator_grow→pro`,
`creator_scale→business`, `creator_enterprise→enterprise`; `partner_free→free`,
`partner_solo→business`, `partner_growth→business`, `partner_scale→enterprise`,
`partner_enterprise→enterprise`; legacy `FREE/STARTER→free`, `PRO→pro`,
`GROWTH→business`, `ENTERPRISE→enterprise`, `FREELANCER→free`.

| Capability (feature key) | launch | grow | scale | ent | partner_free | partner_solo | partner_scale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `custom_domain` | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| `premium_themes` | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| `advanced_builder` | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| `ai_generation` | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| `theme_background_gradient` | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| `theme_effects_blur` | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ |
| `theme_background_solid` | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | ✓ |
| `max_products` (numeric) | 3 | -1 | -1 | -1 | 3 | -1 | -1 |

> Values shown are illustrative of the per-plan feature maps in
> `src/config/commerce/plans.ts` / `src/lib/capabilities/plans.ts`; exact
> per-capability truth lives in those two files. Rows verified for the three
> granular theme capabilities and the headline flags via the 71.2/71.3/71.4.3
> docs and the 71.4.3 QA harness matrix.

- **Verdict: A/B.** All tiers resolve through the same engine; no tier is
  unrepresented in capability resolution (see §13 UNKNOWN for contact-only
  enterprise display semantics). Minor asymmetry: `partner_free` lacks
  `theme_background_solid` where `creator_launch` has it → **F7** (harmless —
  solid renders via fallback anyway).

---

## 7. Theme / Experience Capability Matrix

| Surface | Server gate | Client/UI gate | Parity |
| --- | --- | --- | --- |
| `updateTheme` (write) | `themeEntitlementDecision` (`src/lib/theme/entitlement.ts`): tier `free` → allowed; else **`premium_themes` capability only** | — | ⚠️ see F2 |
| Theme marketplace card | — | `themeUnlockedForPlan(theme, planCode)` tier-band (`src/lib/theme/access.ts`, `PLAN_TO_TIER` + `TIER_THEME_LIMITS`: free 5 / starter 15 / pro 30 / business 50 / ent ∞) | ⚠️ see F2 |
| Theme Marketplace page | server precompute (`admin/themes/page.tsx`) | `isThemeUnlocked(t.tier, plan)` + `isExperienceAvailableForPlan` | ✅ |
| Appearance panel | `builder-overview.actions.ts:228` server-derived `premiumThemes` | `locked = !premiumThemes` | ✅ |
| Admin Appearance page | `entitlementService.has(code, "premium_themes")` | — | ✅ |
| Manual creation (`create.actions.ts:106-118`) | `themeEntitlementDecision` | — | ✅ |
| Experience resolution | `resolveExperienceForCapabilities` (capability-based) | Builder canvas uses `getLivePreviewData.planCode` | ✅ |

- **Verdict: A/B**, with **F2** (MEDIUM): the write/apply boundary checks only
  the boolean `premium_themes`, while the marketplace locks by tier band. A
  `creator_grow` (tier `pro`) user sees business/enterprise-tier themes locked in
  the UI, but the server `themeEntitlementDecision` **allows** applying them
  (it never consults the tier band).
- `EXPERIENCE_MIN_PLAN` (`theme-experience.ts`) is **informational only**;
  actual enforcement is via `capabilityService` (`capabilities.ts`
  `THEME_CAPABILITY` map). **Verdict: A.**

---

## 8. Publishing / Quota Matrix

`DEFAULT_PUBLISH_POLICIES` (`src/lib/publishing/publish-policy.ts`):

| Plan | Policy |
| --- | --- |
| `creator_launch` | `{ mode: "lifetime", limit: 3 }` |
| `creator_grow` | `{ mode: "monthly", limit: 10 }` |
| `creator_scale` / `creator_enterprise` | `{ mode: "unlimited", limit: null }` |
| **all `partner_*` (incl. free `partner_free`)** | **not mapped → fallback `{ mode: "unlimited" }`** → **F4** |

- Trial expiry blocks new publishes: `isTrialExpiredForTenant` (RCCF-34,
  `publish-usage.ts`).
- Publishing bakes the capability-resolved experience into the snapshot
  (`publishing/service.ts`); a downgrade after publish keeps premium rendering
  until republish — documented RCCF-02 tradeoff → **F5**.

---

## 9. Builder / Client Gating Matrix

| Client surface | Plan code source (server-derived) | Gate decision |
| --- | --- | --- |
| Builder overview | `resolveActivePlan` → `builder-overview.actions.ts` (planCode + `premiumThemes`) | `premium_themes` |
| Builder canvas | `getLivePreviewData.planCode` (`builder-preview.actions.ts:52`) | `resolveExperienceForCapabilities` |
| Theme marketplace | `admin/themes/page.tsx` (server precompute) | tier band + capability |
| Appearance panel | `capabilities.premiumThemes` | boolean capability |
| Admin Appearance | `entitlementService.has(code, "premium_themes")` | boolean capability |
| Builder overview DOM | `planResolved.code` (`builder-overview.actions.ts:~204`) | plan code |

- **Verdict: A.** No client surface hardcodes a paid plan decision; all are fed
  by server-derived codes/capabilities. The Builder never decides paid ownership.

---

## 10. Server-side Enforcement Checks

| Boundary | Gate | Verified |
| --- | --- | --- |
| `register/route.ts` | FREE-only hardcode + ignores `planCode` | ✅ |
| `provision.actions.ts:92` / `onboarding.actions.ts:507` | hardcode `creator_launch` | ✅ |
| `theme.actions.ts` `updateTheme` | `themeEntitlementDecision` | ✅ (F2 caveat) |
| `create.actions.ts:106-118` | `themeEntitlementDecision` | ✅ |
| `domain.actions.ts` | billing `entitlement` (fallback `creator_launch`) | ✅ |
| `workspace/policy.ts` `assertCanPublish` | plan/capability | ✅ |
| `admin/appearance/page.tsx` | `premium_themes` | ✅ |
| `partner/application/access-lock.ts` | `PARTNER_FREE_PLAN = "partner_free"` | ✅ |
| billing gates | `capability-gates.ts` `assertAnyCapability` | ✅ |

---

## 11. Runtime Enforcement Checks

| Runtime surface | Enforcement | Verified |
| --- | --- | --- |
| Published storefront | snapshot-only; zero plan reads; baked experience; free fallback for old snapshots (`StorefrontPage.tsx`) | ✅ (F5) |
| Preview route | `storefront-loader.ts`: published = snapshot as-is; preview = Draft Layout + Live Content, `bakedExperience ?? resolveExperienceForCapabilities(base, livePlan)` | ✅ |
| Builder canvas | live aggregate + `getLivePreviewData.planCode` → same experience resolver | ✅ |
| Publish | `publish-policy` quotas + `isTrialExpiredForTenant` | ✅ (F4) |
| `[domain]/[slug]/page.tsx` | same `StorefrontPage` path (force-dynamic) | ✅ |

- **Verdict: A** for parity: canvas == `?preview=true` == published for
  identical inputs (RCCF-02 / RCCF-70.5.2 pattern). F5/F8 are the two status/
  freshness caveats.

---

## 12. Preview / Published Parity

- Publish bakes `resolveExperienceForCapabilities` into the immutable snapshot;
  preview re-resolves live; canvas re-resolves live. All three use the same
  `THEME_CAPABILITY` map and `resolveExperienceForCapabilities`. **Verdict: A.**
- Old snapshots without a baked experience render the free/minimal fallback —
  forward-compatible, backward-safe.

---

## 13. Findings (mismatches — documented, NOT fixed)

### F1 — HIGH: webhook activation happens before the payment guard
`handleSubscriptionWebhook` (`src/modules/billing/application/service.ts`)
upserts the subscription to **ACTIVE** when `subscription.activated` /
`payment.captured` arrives; the amount guard (RCCF-41) only blocks invoice +
commission minting **after** the status flip. A zero/absent-amount event still
flips the subscription ACTIVE → `resolveActivePlan` then returns the paid code
→ full paid entitlements with no payment recorded.
- Minimal fix: require a positive captured amount before the ACTIVE transition
  (validate in `statusForWebhookEvent` or gate the upsert on amount), or defer
  the ACTIVE flip until an invoice exists.

### F2 — MEDIUM: theme UI tier-band gate vs server `premium_themes`-only gate
`themeUnlockedForPlan` / `isThemeUnlocked` lock business/enterprise-tier themes
for `creator_grow` (tier `pro`), but the write/apply boundary
(`themeEntitlementDecision`, `src/lib/theme/entitlement.ts`) checks only the
boolean `premium_themes` — so the server **allows** a theme the UI shows as
locked.
- Minimal fix: `themeEntitlementDecision` should also verify
  `tierRank(theme.tier) <= tierRank(planTierFor(planCode))` (mirror
  `themeUnlockedForPlan`), keeping the capability check as the outer gate.

### F3 — LOW (latent): two `EntitlementService` classes + capability-id vs feature-key namespace
- `src/lib/capabilities/entitlements.ts` — lib service mapping *capability ids*
  → feature keys via `CAPABILITY_TO_FEATURE` (lacks the granular
  `theme_background_*` / `theme_effects_*` entries → false negatives if called
  with those ids).
- `src/modules/billing/application/entitlements.ts` — second class of the same
  name wrapping `capabilityService.can`, exported as `entitlement` + `featureGate`;
  consumed by `domain.actions.ts` and tests.
- Minimal fix: single canonical service; extend `CAPABILITY_TO_FEATURE` to cover
  all `CommerceCapability` ids, or assert through `capability-gates.ts` only.

### F4 — LOW: partner plans fall back to unlimited publishing
`DEFAULT_PUBLISH_POLICIES` maps only the four `creator_*` codes; every
`partner_*` code (including the free `partner_free`) resolves to the unlimited
fallback — the free Partner tier effectively has no publish quota while
`creator_launch` is capped at lifetime 3.
- Minimal fix: add `partner_free → { mode: "lifetime", limit: 3 }` (or a defined
  partner quota) to `publish-policy.ts`.

### F5 — LOW (documented tradeoff): baked experience is stale until republish
Published snapshots freeze the capability-resolved experience at publish time
(RCCF-02). A downgrade after publish keeps premium rendering live until
republish. Preview/canvas re-resolve live, so only the published surface lags.
- Minimal fix: none required if this remains a documented tradeoff; if stricter,
  re-resolve at serve time (breaks snapshot-only rule — not recommended).

### F6 — LOW (maintainability): hardcoded plan codes outside registries
Fallback/UI defaults hardcode `creator_launch` (billing.actions.ts:50,
domain.actions.ts:45, register/route.ts:120, onboarding.actions.ts:507,
provision.actions.ts:92, admin/billing/page.tsx:38-44, dev/billing/page.tsx:109,
super-admin/subscriptions/page.tsx:24, tenant-ledger.tsx:142/193/290,
SignupForm.tsx:71, Pricing/data.ts:69, invoice-engine.ts:9, mapper.ts:82,
plan-restriction.ts:67/75), plus hardcoded upgrade targets in
`agency-plan-manager.tsx:53-54` and a `creator_grow` seed default in
creator-import-client. All are fallback/UI-only; none gate entitlements.
`EXPERIENCE_MIN_PLAN` is informational only. **No `creator_growth` typo exists
anywhere.**
- Minimal fix: route fallbacks through `PLAN_CODES`/`resolvePlan`; no behavior
  change required.

### F7 — LOW (minor): `partner_free` lacks `theme_background_solid`
`creator_launch` has `theme_background_solid`; `partner_free` does not — yet both
are free tiers. Solid background still renders via the runtime fallback, so the
visible behavior is identical today.
- Minimal fix: add `theme_background_solid` to the `partner_free` feature map for
  parity with `creator_launch`.

### F8 — LOW (latent): cancelled/expired subscriptions still resolve a paid code
`resolveActivePlan` returns `sub.plan.code` **without consulting `sub.status`**
(`plan-source.ts:46-63`). A CANCELLED/EXPIRED/PAST_DUE subscription still yields
the paid code for `capabilityService`/`entitlementService` until the row is
removed or its plan is downgraded. The publish trial gate (`isTrialExpiredForTenant`)
handles TRIALING expiry, but no gate consults non-trial statuses.
- Minimal fix: decide whether capability resolution should treat
  CANCELLED/EXPIRED as `code: null` (or a free fallback) in `resolveActivePlan`;
  document the intended semantics.

---

## 14. UNKNOWN Entries

- **`creator_enterprise` / `partner_enterprise` (contact-only):** no self-serve
  checkout path exists; plan rows exist and resolve capabilities, but there is no
  signup/checkout representation. Capability behavior for the enterprise band is
  defined by its feature map but was not exercised at runtime (no QA account) —
  **UNKNOWN at runtime, defined in the registry.**
- **`partner_growth`:** `hidden` legacy code (`ctaType` non-signup); no UI
  surface offers it. Resolves via `LEGACY_TO_CANONICAL` when referenced —
  **UNKNOWN end-to-end, defined in registry.**
- **Legacy `Subscription` (v1) tenants:** capability resolution supports the
  legacy fallback, but no such tenant was exercised in this audit — status
  semantics for v1 rows are assumed equivalent (F8 applies).

---

## 15. Recommendation & Verdict

Core invariant **holds**: signup is FREE-only, paid plans are never granted as
TRIALING, capability is derived from the canonical authority, the client never
decides paid ownership, and runtime parity is verified. The audit surfaced one
HIGH (F1) and one MEDIUM (F2) that should be fixed in a follow-up closure ticket
(not this read-only audit), plus LOW maintainability findings (F3–F8).

Proceed by filing a follow-up for F1 + F2 (billing-webhook activation gate;
theme tier-band server gate). This audit made **no code changes and no commit**.

---

**RCCF-71.4.4 audit complete. Verdict: C — PASS on the signup/TRIALING
invariant; 8 findings documented (1 HIGH, 1 MEDIUM) for follow-up. Tier
consistency: A — all nine canonical tiers resolve through a single canonical
capability/entitlement authority; signup grants FREE-only (TRIALING), paid plans
arrive only via checkout/webhook/lifecycle; client surfaces are server-derived.**