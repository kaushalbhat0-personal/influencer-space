# RCCF-72.6 — F2 Root-Cause Audit: Creator Workspace-Owner Admin Crash

**Status:** Complete (audit only — no code, database, fixture, or configuration changes; no fixes; no commit)
**Date:** 2026-08-18
**Predecessors:** RCCF-72.0..72.5 (Creator audit chain). F2 was introduced in RCCF-72.3 as a "workspace-owner" admin crash and expanded in RCCF-72.5 (N5). This ticket root-causes it.

---

## 1. Executive verdict

**ROOT CAUSE: CONFIRMED — F2 is not a workspace bug.** The crash is a lifecycle-gate defect: tenant **B** (`66941948-7f71-461d-aa26-db86598c945a`) is missing the **`onboarding_completed`** Setting, so `requireTenant()` (DB-based lifecycle) resolves B as **ONBOARDING** and throws `redirect("/onboarding")` on every admin page that calls it. The **middleware** uses a *different* lifecycle source (`resolveFromToken`, token-based) that treats B as **READY**, so it allows `/admin/*` and bounces `/onboarding → /admin/dashboard`. The two lifecycle sources disagree, producing a redirect ping-pong (`/admin/page → /onboarding → /admin/dashboard → /onboarding → …`) during which the Next.js App Router's concurrent error recovery throws **"Rendered more hooks than during the previous render"** in the framework `Router` component (a dev-mode symptom).

**The "workspace-owner" correlation was a red herring.** All three QA tenants (A, B, C) are workspace OWNERS (`WorkspaceMember.role = OWNER`). The real discriminator is **`requireTenant()` usage per page**:

- **17 admin pages crash** for B — exactly the pages that call `requireTenant()`.
- **Messages / Notifications / Milestones / Games (and 8 others) work** — exactly the pages that use `getServerSession` directly (or no gate) and never call `requireTenant()`.
- **B's dashboard renders as an empty shell** (also calls `requireTenant`); Analytics and Billing bounce to the shell without a pageerror.
- A and C are also workspace owners with the same workspace shape yet work perfectly — they have `onboarding_completed`.

The trigger is a **legacy provisioning gap**: B was provisioned on 2026-08-17T09:17 (RCCF-71.5.1) *before* the `onboarding_completed` lifecycle gate existed (RCCF-72.0). The Setting is written **only** by the onboarding-completion action (`onboarding.actions.ts:831-833`), not by provisioning, and no migration backfills it for pre-gate tenants. A (created after the gate) has it; C (created before the gate) received it when C's onboarding was re-completed during 72.x audits. B never did.

---

## 2. Reproduction

Account B (Growth): `rccf7151-growth@example.com` / `Growth7151!Qa9`. Dev server healthy on `:3000`.

| Route | HTTP | JS on → final URL | PAGEERROR | JS off (SSR) |
|---|---|---|---|---|
| `/admin/orders` | 200 | → `/admin/dashboard` | Rendered more hooks | shell + "Loading... Loading..." (no content) |
| `/admin/customers` | 200 | → `/admin/dashboard` | Rendered more hooks | 307 → `/admin/dashboard` |
| `/admin/knowledge` | 200 | → `/admin/dashboard` | Rendered more hooks | ERR_ABORTED (redirect) |
| `/admin/settings` | 200 | → `/admin/dashboard` | Rendered more hooks | — |
| `/admin/courses` | 200 | → `/admin/dashboard` | Rendered more hooks | — |
| `/admin/messages` | 200 | stays | none | full content ("No messages yet.") |
| `/admin/games` | 200 | stays | none | — |

- **Hard refresh** reproduces on every attempt (each route, each fresh context). **Soft nav** reproduces identically. Deterministic.
- **JS disabled** proves the server layer behaves differently per route: crashing pages' server components either suspend to a loading fallback or server-redirect, while working pages fully server-render.
- **RSC payload** for a crashing page (direct `RSC: 1` request) contains:
  `{"digest":"NEXT_REDIRECT;replace;/onboarding;307","message":"NEXT_REDIRECT", "stack":"… at redirect … at requireTenant (src/lib/auth/require-tenant.ts) …"}`
- Dev-server log shows repeated `Compiling /_error` for these routes (server-side render error recovery).
- Dashboard for B renders shell-only (no widgets); Analytics and Billing bounce to the shell with **no** pageerror.

### Full crash surface for B (all 32 admin routes probed)

- **Crash (17):** settings(hero), gallery, testimonials, faq, links, products, services, courses, orders, customers, bookings, themes, knowledge, goals, profile, seo, integrations.
- **Bounce without pageerror (2):** analytics, billing.
- **Shell-only (1):** dashboard.
- **Work (12):** create, settings/content, milestones, games, payments, builder, blueprints, appearance, website/navigation, messages, settings/domain, notifications.
- Not browser-tested but `requireTenant()`-gated and therefore affected in kind: `ai-assistant`, `email`.

---

## 3. Exact React error

```
Error: Rendered more hooks than during the previous render.
```

Preceded (console) by:

```
Warning: Cannot update a component (`%s`) while rendering a different component (`%s`). …
HotReload Router Router
    at Router (app-router.js:207:11)
```

The raw args show the state-update target was **`HotReload`** (Next.js dev `react-dev-overlay/app/hot-reloader-client`) while the rendering component was **`Router`** — i.e., a render-phase state dispatch caused by chained redirect processing during a navigation, which React's dev-mode concurrent renderer then attempts to recover.

---

## 4. Stack trace (PAGEERROR, trimmed)

```
Error: Rendered more hooks than during the previous render.
    at updateWorkInProgressHook (react-dom.development.js:11435)
    at updateMemo (react-dom.development.js:12613)
    at Object.useMemo (react-dom.development.js:13563)
    at useMemo (react.development.js:2537)
    at Router (app-router.js:232:59)
    at renderWithHooks (react-dom.development.js:11121)
    at updateFunctionComponent (react-dom.development.js:16290)
    at beginWork$1 (react-dom.development.js:18472)
    ...
    at recoverFromConcurrentError (react-dom.development.js:24597)   <-- error recovery re-render
    at performConcurrentWorkOnRoot (react-dom.development.js:24542)
```

---

## 5. Root component

**`Router`** — the Next.js App Router client component (`node_modules/next/dist/client/components/app-router.js`). The throw is at its **first hook**: `useMemo(createInitialRouterState, …)` at `app-router.js:232`.

It is **not** an application component. No app component with a conditional-hook violation was found (see §6). The hook-count mismatch is a **framework artifact of concurrent error recovery** (`recoverFromConcurrentError → renderRootSync`) re-rendering the `Router` fiber after a render-phase dispatch occurred during redirect churn.

---

## 6. Hook divergence

**There is no application-level conditional-hook bug.** Verified clean:
- `src/features/_shared/components/feature-page.tsx` — client component, **zero hooks** (used by both crashing and working pages).
- `src/components/data/DataTable.tsx` — all hooks at top (4× `useState`, 2× `useMemo`), no conditional hooks (used by orders/customers and by super-admin/agency pages).
- `src/features/_shared/hooks/use-autosave.ts` — hooks at top, clean.
- The crashing pages' client components are **identical for A and B**; only the surrounding redirect behavior differs.

**Actual mechanism (render trace):**

```
Render #1 (hydrate /admin/orders):
  Router { initialTree = orders segment }
    hooks: h1 useMemo(initialState) · h2 useReducer · h3 useEffect · h4 useUnwrapState ·
           h5 useMemo(pathname) · h6 useMemo(appRouter) · … hN
  → orders flight data contains NEXT_REDIRECT(/onboarding)   [requireTenant throws]
  → Router dispatches navigation → state change

Render #2 (process /onboarding):
  middleware (token lifecycle = READY) → server 307 → /admin/dashboard
  → dashboard flight data ALSO contains NEXT_REDIRECT(/onboarding)   [requireTenant again]
  → Router dispatches a redirect WHILE rendering the new segment
    → "Cannot update a component (HotReload) while rendering a different component (Router)"
    → React dev enters recoverFromConcurrentError → renderRootSync

Render #3 (recovery re-render):
  Router fiber's hook list is partially-consumed/mismatched from the aborted pass
  → updateWorkInProgressHook throws "Rendered more hooks than during the previous render"
    at Router's first hook (app-router.js:232 useMemo)
  → ErrorBoundaryHandler catches → page ends at /admin/dashboard shell
```

The redirect target (`/admin/dashboard`) is reached because the client router coalesces the `dashboard ↔ onboarding` hop (redirect to the current route becomes a no-op), leaving B stuck on an empty admin shell.

---

## 7. Workspace / plan comparison

| Dimension | Launch A | Growth B | Scale C |
|---|---|---|---|
| User id | `87e0b38f…` | `6e979280…` | `caf5f9bf…` |
| Role | ADMIN | ADMIN | ADMIN |
| Workspace | `96d76df6` TENANT ACTIVE | `fde53041` TENANT ACTIVE | `6d7e0dfd` TENANT ACTIVE |
| Membership role | **OWNER** | **OWNER** | **OWNER** |
| BillingSubscription (v2) | `2448e5bb` **TRIALING**, plan `creator_launch` | **none** | `f3523d05` **ACTIVE**, plan `creator_scale` |
| Legacy `Subscription` | none | `6e891161` **creator_grow ACTIVE** | none |
| Effective plan | creator_launch | creator_grow (legacy fallback) | creator_scale |
| `onboarding_completed` Setting | **present** | **MISSING** | present |
| DB lifecycle (`lifecycle.service.ts resolve`) | PUBLISHED/READY | **ONBOARDING** | PUBLISHED/READY |
| Token lifecycle (`token-resolver.ts resolveFromToken`) | READY | READY | READY |
| requireTenant pages | render | **redirect /onboarding** | render |

---

## 8. BillingSubscription analysis

- **B has NO v2 `BillingSubscription` row** (verified: only A and C have rows). The workspace `fde53041` (created 2026-08-17T09:29:56) was never attached to a plan; plan resolution falls back to the legacy `Subscription` (`plan-source.ts:102-105`).
- A: `TRIALING` (trialEndsAt 2026-09-02); C: `ACTIVE` (trialEndsAt 2026-09-01).
- **Classification: E. expected legacy compatibility state.** B predates the v2 workspace-billing attachment for its plan (provisioned via the RCCF-71.5.1 path). The legacy Subscription supplies a valid `creator_grow`, and enforcement (limits, publish 6/10) works correctly.
- **Not the crash cause.** Proof: the crash class (missing `onboarding_completed`) is independent of billing; A/C share the same lifecycle-gate mechanism and are not affected.

---

## 9. Legacy Subscription analysis

- B: `Subscription { plan: "creator_grow", status: "ACTIVE", currentPeriodEnd: null }`, created 2026-08-17T09:17:13 — 12 minutes before the workspace.
- Resolved by `resolveActivePlan` → `billingRepository.findSubscriptionWithPlan(workspaceId)` finds nothing → legacy `subscription.findUnique({ where: { tenantId } })` → `creator_grow ACTIVE` → entitlement eligible (ACTIVE) → plan `creator_grow`. Confirmed working (nav shows Growth items; publish quota 6/10 metered).
- The legacy fallback is functioning as designed. **Not the crash cause.**

---

## 10. First divergence (A/C vs B)

| # | Check | A | B | C | Divergence first seen? |
|---|---|---|---|---|---|
| 1 | Workspace exists / OWNER | ✓ OWNER | ✓ OWNER | ✓ OWNER | **No** — all three identical |
| 2 | BillingSubscription attached | ✓ TRIALING | ✗ none | ✓ ACTIVE | No (A/C differ from each other in status too) |
| 3 | Legacy Subscription fallback | n/a | ✓ grow | n/a | No (C has neither and works) |
| 4 | `onboarding_completed` Setting | ✓ | **✗** | ✓ | **YES — the first behavioral divergence** |
| 5 | DB lifecycle state | PUBLISHED/READY | ONBOARDING | PUBLISHED/READY | Consequence of #4 |

The **first divergence that explains the crash is `onboarding_completed` presence** (#4). Workspace ownership (#1) is identical across all three tenants and is therefore not a discriminator.

**Why is the Setting missing for B?** The Setting is written **only** by the onboarding-completion action (`src/actions/onboarding.actions.ts:831-833` — best-effort upsert on completing onboarding). It is **not** written by provisioning. B was provisioned at 2026-08-17T09:17, before the RCCF-72.0 onboarding flow and lifecycle gate existed; B never completed (or never saw) the new onboarding flow, and **no migration/backfill guarantees the Setting for pre-gate tenants**. A was created after the gate; C's Setting was written when C's onboarding was completed at 2026-08-18T04:43 during the 72.x audits.

---

## 11. Root-cause classification

```
ROOT_CAUSE: confirmed
Category:    application bug — lifecycle-source inconsistency
             + legacy compatibility gap (pre-gate tenants never backfilled)
```

- **Underlying category: application bug (lifecycle/legacy-compatibility).** `requireTenant()` (DB resolver, `src/lib/lifecycle/service.ts`) and the middleware (`src/lib/lifecycle/token-resolver.ts` `resolveFromToken`) disagree: the DB resolver keys onboarding off the `onboarding_completed` Setting; the token resolver keys it off tenantId presence. For a tenant with a Website but a missing Setting, the two sources diverge, and every `requireTenant()` page redirect-loops through `/onboarding`.
- **NOT** workspace architecture (A and C are owners too), **NOT** billing data inconsistency (plan resolves correctly), **NOT** hydration per se (the root is the server-side redirect; the "Rendered more hooks" is a client symptom of the redirect churn), **NOT** merely a test-fixture issue — any tenant provisioned before the lifecycle gate (production or QA) is affected.
- The "Rendered more hooks" crash signature is a **React dev-mode** artifact of the redirect churn (the `Cannot update a component … HotReload … Router` warning + concurrent error recovery). In production React the pageerror likely differs, but the **functional break (redirect loop, empty shell, unreachable admin pages) persists**, so this is not "dev-only".

---

## 12. Minimal correct fix (design only — NOT implemented)

**Recommended fix — two layers, both small, both preserve invariants:**

1. **Immediate data remediation (one-time backfill):** for every tenant that has a `Website` but no `onboarding_completed` Setting, insert `Setting { tenantId, key: "onboarding_completed", value: { completedAt: <website created / now> } }`. A tenant with a Website was de-facto onboarded (a Website can only exist after provisioning/onboarding).
   - *WHY correct:* directly restores the missing gate state B (and any similar tenant) needs; matches what A/C already have; zero behavior change for healthy tenants.
   - *Invariants preserved:* tenant scoping, onboarding gate semantics, no auth/plan/billing/capability changes.

2. **Architectural code fix (prevents recurrence) — reconcile the lifecycle sources:** in `src/lib/lifecycle/service.ts`, treat **`hasWebsite` as implying onboarding completion** (`hasOnboardingCompleted = !!onboardingSetting || !!websiteWithStatus`), so the DB resolver agrees with the token resolver (which already returns READY for any ADMIN with a tenantId). This makes B resolve READY/PUBLISHED and eliminates the redirect loop permanently without weakening the gate for genuinely new (no-website) tenants.
   - *WHY correct:* the two resolvers must agree on one model; `PROVISIONING` already encodes "onboarded but no website", so "has a website ⇒ onboarded" is consistent with existing semantics; it is the smallest change that removes the divergence.
   - *WHY alternatives are inferior:* see §13.

3. **Defensive (optional, same ticket):** a startup/migration check that emits an alert if any tenant has a Website without `onboarding_completed` (data-integrity guard).

---

## 13. Alternatives rejected

| Alternative | Why rejected |
|---|---|
| Add error boundaries / conditional-hook patches to admin pages | Treats the client symptom; the pages would still redirect-loop and never render content for affected tenants |
| "Move hook above conditional" type fixes | No application conditional-hook bug exists (verified §6); nothing to fix in app hooks |
| Make the middleware use the DB lifecycle resolver | Requires a Prisma DB read per middleware request (edge perf risk) and re-architects auth routing; heavier than needed |
| Remove the legacy Subscription fallback | Unrelated to the crash; B's plan resolution is correct |
| Weaken `requireTenant` (stop redirecting) | Would remove the onboarding gate for genuinely-unonboarded tenants |
| Normalize B's `BillingSubscription` (attach a plan) | Unrelated — B's plan resolves correctly via legacy fallback; does not touch the lifecycle gate |
| Only backfill B's row (no code change) | Fixes B but not the class; any future pre-gate/stale tenant reproduces the same failure |

---

## 14. Regression surface

**Routes affected by the root cause (every page calling `requireTenant()` = 22):**
settings(hero), gallery, settings→ai-assistant, billing, courses, seo, profile, bookings, products, analytics, orders, themes, testimonials, email, dashboard, gallery, services, customers, knowledge, links, faq, goals, integrations — browser-confirmed crash/bounce/shell for 20 of them; `ai-assistant` and `email` are gated the same way and will behave identically.

**Routes currently working for B** (12) that must not regress and must not gain a naive `requireTenant()` in any fix: create, settings/content, milestones, games, payments, builder, blueprints, appearance, website/navigation, messages, settings/domain, notifications. They work **only because** they bypass the DB lifecycle gate (they use `getServerSession` directly or no gate).

**At risk from a fix:** (a) if a fix adds `requireTenant()` to any of the 12 working pages, they will start redirecting for B; (b) if the lifecycle resolver change is applied too broadly (e.g., treating ANY tenant without a website as onboarded), genuinely-new tenants could bypass the onboarding gate; (c) the dashboard's shell-only state is part of the same bug and should be verified after the fix.

---

## 15. Security / authorization impact

- **No privilege escalation and no cross-tenant exposure.** The divergent gate is *stricter* than intended for affected tenants (denies legitimately-provisioned tenants their own admin), never weaker. Content actions remain tenant-scoped and capability-gated as before.
- **Self-DoS for affected tenants:** B cannot operate any `requireTenant()` admin surface (Orders, Customers, Knowledge, Goals, Integrations, all content managers, Themes, Profile, SEO, Hero, Analytics, Billing) and the dashboard is an empty shell — a functional availability bug, not a confidentiality bug.
- **Lifecycle authority inconsistency:** the middleware (token) and page guard (DB) encode different rules for the same state. Until reconciled, any future tenant-data drift can silently re-enable or re-disable admin access in ways that are hard to diagnose (a page-redirect loop reads as an opaque client crash).
- Fixing the gate (backfill + resolver reconciliation) is **safe**: it only relaxes the DB resolver to the level the token resolver already applies, so no access decision becomes weaker than the middleware's existing decision.

---

## 16. Frozen surfaces

Per ticket constraints, this audit changed nothing: auth, onboarding, lifecycle, tenant resolution, billing, plans, capabilities, Prisma, publishing, Builder, Theme Experience, Hero, storefront, navigation, niche architecture. All proposed fixes in §12 are design-only recommendations for a future implementation ticket.

---

## 17. Implementation ticket recommendation

Create **RCCF-72.7 — "Lifecycle gate backfill + resolver reconciliation"**:
1. One-time backfill of `onboarding_completed` for tenants with a Website but no Setting (production + all QA tenants).
2. Reconcile `src/lib/lifecycle/service.ts` with `token-resolver.ts` (hasWebsite ⇒ onboarded) so `requireTenant` and middleware can never diverge.
3. Add a data-integrity alert for tenants with a Website but no Setting.
4. Regression suite: all 32 admin routes on a backfilled B (expect all render), plus a fresh pre-provisioned tenant without the Setting (expect onboarding gate still enforces for no-website tenants), plus a genuinely-new signup (gate intact).

---

## STOP — final verdict block

```
ROOT CAUSE:   Tenant B is missing the `onboarding_completed` Setting; requireTenant()
              (DB lifecycle) redirects every gated admin page to /onboarding while the
              middleware (token lifecycle) bounces /onboarding back to /admin/dashboard,
              producing a redirect loop that crashes the App Router
              ("Rendered more hooks than during the previous render", dev-mode symptom).
CONFIDENCE:   CONFIRMED (DB-proven missing Setting; RSC-proven NEXT_REDIRECT from
              requireTenant; per-page crash surface exactly matches requireTenant() usage;
              A/C also workspace owners yet unaffected).
MINIMAL FIX:  1) Backfill `onboarding_completed` for tenants that have a Website;
              2) lifecycle.service.ts: treat hasWebsite as onboarding-complete so the DB
              resolver matches the token resolver (single lifecycle source of truth).
AFFECTED ROUTES: 22 requireTenant() admin pages (17 crash + analytics/billing bounce +
              dashboard shell + ai-assistant/email gated in kind). 12 pages work only
              because they bypass requireTenant().
DATABASE INVOLVEMENT: onboarding_completed Setting row missing for tenant
              66941948-7f71-461d-aa26-db86598c945a (and any pre-gate tenant).
              BillingSubscription absent for B's workspace (legacy Subscription
              creator_grow ACTIVE) — orthogonal, NOT the cause.
CODE INVOLVEMENT: src/lib/auth/require-tenant.ts (redirect on !hasOnboardingCompleted);
              src/lib/lifecycle/service.ts (DB resolver keys off Setting);
              src/lib/lifecycle/token-resolver.ts (token resolver keys off tenantId) —
              the divergence. Fix in lifecycle.service.ts; no page/app hook changes.
```
