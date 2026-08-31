# RCCF-71.4.3 — Growth Entitlement + Hero Mobile Closure

## 1. Executive Verdict

**Verdict: B — PASS (staged, not committed).**

- **Growth entitlement: PASS.** A legitimately ACTIVE Creator Growth
  subscription resolves `premium_themes` through the canonical Capability
  Runtime and the Growth Builder is unlocked; a fresh Launch signup stays
  FREE-only (`creator_launch` only) and its Builder/Appearance controls remain
  locked. No billing enforcement, capability authority, or plan definitions were
  modified.
- **Hero mobile: PASS.** The Builder canvas no longer permanently clips the Hero
  identity heading at 390/375/320px. The canonical storefront runtime never
  clipped; the clipping was confined to the Builder device-frame container.

Staged only — no commit was created. Pre-existing unrelated working-tree
changes (including earlier RCCF-71.x Builder work and a11y/color tweaks in
`section-actions.tsx`) were left untouched.

## 2. Production Root Cause

### P1-A — signup offered paid plans the registration lifecycle cannot grant

The signup plan step enumerated every plan in the family
(`getPlansByFamily(...).filter(p => !p.hidden || contact)`), and the register
route previously accepted an arbitrary `body.planCode` from the client. A fresh
signup could therefore select **Creator Growth** and the account would receive a
subscription for it — but as a TRIALING plan with no verification — while the
server-derived `premium_themes` entitlement resolved from the *plan code*, which
for the free/launch family path left the Builder locked. Result (RCCF-71.4.2):
a fresh Growth signup saw "requires a Creator Grow plan" and disabled controls.

Note the codebase already had the RCCF-LAUNCH-01 guard (register hardcodes
`creator_launch` for creators and `partner_free` for agencies, ignores client
`planCode`). The mismatch was in the **signup wizard**: it offered plans that
registration cannot actually provision, so the UI promise (paid plan at signup)
did not match the registration lifecycle (FREE-only).

### P1-B — Builder canvas device frame left edge unreachable on narrow viewports

`interactive-canvas.tsx` centered the fixed-width device frame (1200px desktop /
375px mobile / 768px tablet) inside an `overflow-auto` container using
`justify-center`. When the frame is wider than the browser viewport,
`justify-center` pushes the overflow to **both** sides, but `scrollLeft` cannot
go below 0 — so the left overflow is permanently clipped and unreachable via
scroll. On narrow screens the Hero identity heading (first line, `text-5xl`,
wrapped) sat in that unreachable left overflow, producing the clipped first line
seen in RCCF-71.4.2 (`h1` measured at x=-160 / x=-132.5 at 320/375px viewports).

The canonical storefront runtime never clipped: its Hero h1 (`text-3xl`,
`overflow-wrap: break-word`) fits at the real viewport width. The bug was purely
the Builder canvas frame container.

## 3. Architecture Invariant & Option Selection

**Invariant:** entitlement and capabilities are owned by the server-side
Capability Runtime (`capabilityService`/`entitlementService`); the Builder never
hardcodes plan codes; paid subscriptions only arrive through the canonical
billing/webhook path (never created at registration).

**P1-A options considered:**

1. **`getSignupEligiblePlans` + wizard uses it (CHOSEN).** A registry-driven
   helper (`ctaType === "signup"`) limits the signup wizard to plans
   registration can actually provision. Root-cause site (the wizard) fixed;
   register route stays FREE-only by construction; registry stays the single
   source of plan structure.
2. **Grant paid plans at signup (rejected).** Directly contradicts
   RCCF-LAUNCH-01 and would create unverified paid TRIALING subscriptions — the
   exact behavior the ticket must prevent.
3. **Hide paid plans by `hidden` flag only (rejected).** The `hidden` flag also
   governs contact/enterprise; it is not a truthful "provisionable at signup"
   signal, and `hidden` plans with `ctaType === "contact"` were already shown.

**P1-B options considered:**

1. **`justify-start` parent + `mx-auto` frame (CHOSEN).** When the frame fits it
   stays centered (auto margins); when it overflows the margins collapse to 0
   and the left edge is reachable via scroll. Minimal, layout-only, no renderer
   change; the storefront runtime and container-query breakpoints are untouched.
2. **Reposition through flex-wrap/scroll anchoring (rejected).** No benefit over
   auto margins and risks shifting layout under container queries.
3. **Patch the renderer/storefront (rejected).** The storefront was already
   correct; the fix belongs to the canvas container only.

## 4. Implementation Changes

| File | Change |
| --- | --- |
| `src/lib/capabilities/plans.ts` | Added `getSignupEligiblePlans(family)` — registry-driven (`ctaType === "signup"`), no plan codes hardcoded. |
| `src/lib/capabilities/index.ts` | Exported `getSignupEligiblePlans`. |
| `src/components/auth/signup/SignupForm.tsx` | Plan step iterates `getSignupEligiblePlans(...)`; `?plan=` URL validation requires a signup-eligible code (paid codes fall back to no pre-selection); still posts `planCode` (server is authoritative). |
| `src/features/builder/canvas/interactive-canvas.tsx` | Canvas frame container: `justify-center` → `justify-start`; device frame gains `mx-auto` (documented with RCCF-71.4.3 rationale). |

Not changed (frozen/root-cause sites): `src/app/api/auth/register/route.ts`
(FREE-only hardcode), `entitlementService`/`capabilityService`,
`builder-overview.actions.ts` gate, billing/Razorpay, plan definitions.

## 5. Behavior Preservation

- Registration stays FREE-only: creator → `creator_launch` TRIALING 15-day,
  agency → `partner_free` TRIALING; register route ignores `body.planCode`; no
  paid plan is ever granted at signup (source-level guardrails pin this).
- `premium_themes` remains plan-code driven by the Capability Runtime: Launch
  false, Growth true, Scale true, unknown false. The Builder gate
  (`entitlementService.has(planResolved.code, "premium_themes")`) is unchanged;
  the Builder never hardcodes plan codes.
- Billing enforcement, Razorpay webhook path, lifecycle transitions, checkout,
  and the capability service were not modified.
- The Builder canvas keeps `DEVICE_WIDTHS` (375/768/1200) and `overflow-auto`;
  renderers keep container-query breakpoints (`@container/main`).
- The canonical storefront Hero rendering is unchanged.

## 6. Regression Coverage

### `tests/unit/rccf71-4-3-growth-entitlement-signup.test.ts` (15 tests, passing)

- Signup is FREE-only: creator → exactly `["creator_launch"]`, agency → exactly
  `["partner_free"]`; paid `ctaType === "checkout"` plans are never offered;
  form filters the plan step through `getSignupEligiblePlans`; paid `?plan=`
  URL codes are rejected; legacy contact-enterprise listing is gone; helper
  exported from index.
- Register route never grants paid plans: hardcodes `creator_launch` /
  `partner_free`; never reads `body.planCode`; never references
  `creator_grow|creator_scale|creator_enterprise`; signup subscriptions are
  always `TRIALING`, never `ACTIVE`.
- `premium_themes` via Capability Runtime: Launch false / Growth true / Scale
  true / unknown false; Builder gate still server-derived
  (`entitlementService.has(planResolved.code, "premium_themes")`); Builder
  canvas + appearance panel never hardcode `creator_launch|creator_grow|creator_scale`.

### `tests/unit/rccf71-4-3-hero-closure-canvas.test.ts` (3 tests, passing)

- `justify-center` centering pattern is absent from the canvas container.
- `DEVICE_WIDTHS[device] ?? 1200` + mobile 375 + desktop 1200 preserved.
- Canvas `overflow-auto` preserved.

Combined with the retained RCCF-71.4.1 suite: **24/24 passing**.

## 7. Verification Results

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean |
| `npx vitest run` (full) | 228/229 passed; 1 failure in `tests/unit/rccf68-retry-catalog-timeout.test.ts` — pre-existing flake (test timeout: "Not implemented: navigation to another Document"); passes 11/11 in isolation |
| Focused `rccf71-4-3-*` + `rccf71-4-1-*` | 24/24 passed |
| `npm run build` | Success |
| `npx prisma validate` | Schema valid |
| `npx eslint` (touched files) | 0 errors; 1 pre-existing warning (`LayoutSnapshot` unused in interactive-canvas.tsx:22) |
| `git diff --check` | Clean (CRLF warnings only) |
| Runtime (dev server) | Healthy; all Builder/storefront routes 200 |

### Browser matrix (numeric bounding-rect measurements; model cannot read images)

**Post-fix — Hero identity heading left edge (target: no clipping):**

| Viewport | Mobile frame (375) | Desktop frame (1200) |
| --- | --- | --- |
| 390 | h1 x=65, `clipVsViewportLeft:false` (30px) | frame x=32, h1 x=312, `clipVsViewportLeft:false` (48px) |
| 375 | h1 x=65, `clipVsViewportLeft:false` (30px) | frame x=32, h1 x=312, `clipVsViewportLeft:false` (48px) |
| 320 | h1 x=65, `clipVsViewportLeft:false` (30px), `scrollW=407` | frame x=32, h1 x=312, `clipVsViewportLeft:false` (48px) |

In every case the Hero identity heading's left edge is within the viewport and
the frame's right overflow is scrollable (`scrollLeft` can reach it). Before the
fix the desktop frame sat at x=-412.5 and the h1 at x=-132.5 / x=-160 (left
overflow unreachable). Storefront verification: no clipping at 390/375/320.

Screenshots: `screenshots/rccf-71.4.3-fixed-mobile-{390,375,320}.png`,
`rccf-71.4.3-desktopframe-{390,375,320}.png`, `rccf-71.4.3-storefront-{390,375,320}.png`.

## 8. Growth Entitlement QA (staged proof)

Used the existing dev-only QA mechanism (`simulateRazorpayEvent`, guarded by
NODE_ENV non-production + session auth, driving the canonical
`handleSubscriptionWebhook` path) to activate the QA account's **Creator Growth**
plan. `TRIALING → ACTIVE` is a legal lifecycle transition. The QA account
(`rccf7143qa1786958578299@example.com`, subdomain `rccf-7143-qa`) now has an
ACTIVE `creator_grow` subscription. Billing harness shows the full matrix
including `premium_themes, advanced_builder, ai_generation,
social_integrations, priority_support`. Builder: no "requires a Creator Grow
plan" message; all Appearance chips enabled; functionally applied Hero
alignment "Left" and restored "Center (Default)".

### Launch stays locked (fresh signup, staged proof)

A fresh Launch signup (`rccf7143launch1786965646094@example.com`, subdomain
`rccf-7143-launch-qa`) confirmed end-to-end in the browser: plan step offers
**only Creator Launch**; DB shows TRIALING `creator_launch`; Builder shows
*"Custom appearance (fonts, background, surface, heading weight, hero
presentation) requires a Creator Grow plan. Upgrade"*; Appearance shows
*"Premium appearance and themes require a Creator Grow subscription or higher."*
Screenshots: `rccf-71.4.3-launch-plan-step.png`, `rccf-71.4.3-launch-builder-locked.png`,
`rccf-71.4.3-launch-appearance.png`.

## 9. Diff Discipline

- **In scope (RCCF-71.4.3):** the four files in §4 + the two new test files +
  this doc.
- **Untouched (pre-existing dirty worktree, not ours):** earlier RCCF-71.x
  Builder changes already present in `interactive-canvas.tsx`
  (themeConfig/hero-presentation/selection-ring/experience-override work) and
  `section-actions.tsx` (a11y aria + indigo color tweaks). Left as-is.
- **Frozen:** auth, middleware, tenant resolution, Prisma schema/migrations,
  capabilityService, billing/Razorpay, publishing, media/storage,
  Builder/LayoutEngine architecture, storefront, Stitch.
- Temporary QA artifacts removed: `src/app/dev/qa-growth/page.tsx` (dev-only
  simulate route) deleted; temp QA scripts in the temp directory cleaned.

## 10. Risks & Edge Cases

- `mx-auto` only affects horizontal centering; vertical layout is unchanged.
- Very narrow viewports (< 375) still overflow to the right — now scrollable and
  left-reachable, which is the correct behavior for an oversized frame.
- The rate-limiter (5 registrations/hour per IP) intermittently 429'd the
  auto-signIn after register during QA; accounts and subscriptions were created
  correctly regardless (verified via DB). Not a product defect.
- Two partially-created duplicate QA launch user rows exist in the dev database
  from the 429 interruption; harmless dev data, no code impact.
- `npm run build` overwrote `.next` with a production build during the gate,
  requiring a `.next` cleanup + dev-server restart; dev server re-verified
  healthy. Operational only.

## 11. Recommendation

Proceed with the staged RCCF-71.4.3 fix. Growth entitlement now behaves
truthfully end-to-end (FREE-only signup; paid plans via checkout; ACTIVE Growth
unlocks premium appearance; Launch stays locked) and the Hero identity no longer
clips in the mobile Builder canvas at 390/375/320px. No commit was created.

RCCF-71.4.3 complete. Verdict: B — PASS (staged, not committed).
Growth entitlement: PASS — FREE-only signup; ACTIVE Growth unlocks premium appearance; Launch stays locked.
Hero mobile: PASS — Builder canvas left edge reachable; Hero identity not clipped at 390/375/320px.