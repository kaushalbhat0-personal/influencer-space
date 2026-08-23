# RCCF-MKT-04-R1 — Homepage Imagery Restoration, Responsive Contracts & Retired Partner Growth Removal — Closure

Date: 2026-08-24 · Status: **COMPLETE** (staged, NOT committed) · Grade: **A**

---

## 1. Executive Verdict

RCCF-MKT-04-R1 is **COMPLETE**. The previous RCCF-MKT-04's imagery deletion was
**REVERSED** per product-owner decision: the certified SPower Gaming storefront
captures are restored to the homepage with genuine breakpoint-aware responsive
behavior (CSS `<picture>` selection — no JS viewport detection). The retired
**Partner Growth** agency plan is **fully removed** from runtime configuration
(Agency never launched; no users/subscribers). Creator and Agency capabilities
and pricing are **verified correct and unchanged**. Payment architecture,
checkout, Razorpay, refunds, DIRECT_CREATOR/PLATFORM_COLLECT, onboarding, and
builder behavior are **untouched**.

| Statement | Verdict |
| --- | --- |
| Homepage imagery | **RESTORED + MADE RESPONSIVE** |
| Creator capability matrix | **VERIFIED CORRECT — UNCHANGED** |
| Creator pricing | **VERIFIED CORRECT — UNCHANGED** |
| Agency capability matrix | **VERIFIED CORRECT — UNCHANGED** |
| Agency pricing | **VERIFIED CORRECT — UNCHANGED** |
| Partner Growth | **REMOVED — legacy, no users/subscribers, Agency not launched** |
| Homepage comparison table | **NOT PRESENT / NOT REINTRODUCED** |
| Payment architecture | **UNTOUCHED** |
| Protected work (`src/app/onboarding/page.tsx` et al.) | **UNTOUCHED** |
| Commit / Push | **NOT CREATED / NOT PERFORMED** |

## 2. Previous RCCF Correction

RCCF-MKT-04 (working tree, never committed) deleted the Hero visual, both
StorefrontShowcase captures, `ComparisonTable.tsx`, and gutted
`comparison.ts` — creating the "large empty region" hero the audit flagged.
That deletion is reversed for imagery. The comparison-table deletion is
**upheld** (see §11). The previous run also left a **broken re-export** in
`src/lib/marketing/trust/index.ts` (`SEED_COMPARISONS` no longer existed) —
the repo could not typecheck; fixed here.

## 3. Baseline

- HEAD `8493956` === `origin/main` (RCCF-RELEASE-01) — release baseline
  protected at commit level.
- Previous MKT-04 changes: **unstaged working-tree modifications** (verified,
  not assumed). Nothing was staged at preflight (`git diff --cached` empty).
- Certified assets verified on disk, untouched:
  - `public/marketing-assets/storefront/01-desktop.png` (1440×900)
  - `public/marketing-assets/storefront/02-mobile.png` (390×844)

## 4. Homepage Responsive Root Causes

1. **Hero visual deleted** → empty grid column at lg+ (previous RCCF).
2. **Hero had no mobile visual at all** (`hidden lg:block` even before MKT-04).
3. **StorefrontShowcase** showed the 1440×900 desktop capture at phone widths
   (unreadable) and hid the phone capture below `md`.
4. **CreatorShowcase** `w-56 shrink-0` forced intrinsic width at 320–414px.

## 5. Hero Image Restoration

`src/components/marketing/Hero.tsx` — restored the browser-chrome framed
preview with **CSS-only breakpoint-aware selection**:

- `<picture>` + `<source media="(min-width: 768px)" srcSet="01-desktop.png">`;
  base `<img src="02-mobile.png">` — only the selected resource downloads.
- Mobile (<768px): phone capture rendered as a device preview
  (`max-h-[420px]`, centered) — never a shrunken desktop screenshot.
- md+: desktop capture fills the frame (`md:w-full md:max-h-none`).
- Column is `relative min-w-0` so intrinsic image dimensions can never force
  grid overflow; decorative glow is `pointer-events-none` and clipped by the
  section's `overflow-hidden` (no global `overflow-x: hidden` used anywhere).

## 6. StorefrontShowcase Image Restoration

`src/components/marketing/StorefrontShowcase.tsx` — both certified captures
restored:

- Main frame uses the same `<picture>` pattern: phone capture <md (height
  capped 480px), desktop capture md+ (`min-w-0` fluid card).
- Phone side-card restored (`hidden md:block w-44 shrink-0`).
- Chrome label adapts by breakpoint (`Phone` <md / `Desktop` md+) via CSS.
- Facts grid, captions, and demonstration-only framing unchanged.

## 7. Responsive QA (real browser, dev server `SERVER_READY` PID 20268 :3000)

| Viewport | `scrollWidth === clientWidth` | Broken imgs | Notes |
| --- | --- | --- | --- |
| 320 | PASS (320=320) | 0 | phone capture, CTA fits |
| 360 | PASS | 0 | phone capture |
| 390 | PASS (390=390) | 0 | heading + CTA fit; hero visual present |
| 414 | PASS | 0 | — |
| 768 | PASS | 0 | breakpoint flip verified: hero + proof switch to `01-desktop.png`; side card 158px |
| 1024 | PASS | 0 | desktop capture |
| 1280 | PASS | 0 | — |
| 1440 | PASS | 0 | two-column hero (608/608), desktop capture 574px in frame |

Screenshots: `screenshots/rccf-mkt-04r1-homepage-{390,1440}-corrected.png`
(+ hero/proof close-ups). Visual inspection: composition balanced; no
clipping, stretching, collapse, or unexpected whitespace; CreatorShowcase /
SellAnything / Promote / Builder / Grow / Pricing / FinalCta all fit.

## 8. Creator Capability Audit

Runtime source `src/config/commerce/plans.ts` remains the single authority.
Creator Launch / Growth / Scale / Enterprise capabilities **byte-identical to
baseline** (no edits to any creator plan entry). Capability service, theme
experience registry, entitlement mapping untouched.

## 9. Agency Capability Audit

Partner Free / Solo / Scale / Enterprise capability bundles unchanged.
`capabilityService.can(...)` parity re-proven by the modernized
rccf71-6-2 guardrail suite (13 tests, green).

## 10. Partner Growth Removal

Classification of all repository references (audit before edit):

| Class | References | Action |
| --- | --- | --- |
| A runtime config | `plans.ts` plan entry + `agency_agency` alias; `constants.ts` PLAN_CODES/UPGRADE_PATHS/LEGACY_PLAN_MAP.GROWTH; `plan-resolution.ts` tier/display | **REMOVED** |
| B public pricing/marketing | none (was already `hidden`; pricing is runtime-derived) | n/a |
| C tests | commerce-registry, capabilities, plans-alignment, plan-resolution, rccf71-6-2, rccf73-3, implementation42.spec | **UPDATED** |
| D seed data | `tests/fixtures/test-seed.ts` — no partner_growth references | none |
| E documentation | 6 live operational docs | **UPDATED** (historical rccf-* docs untouched) |
| F migration/database | **No Prisma enum** — plan codes are `BillingPlan.code` strings; no schema change, **no migration required** | none |
| G historical closures | rccf-71.x/73.x docs | untouched (historical record) |
| H comments | `creator-plan.ts` | tidied |
| I unrelated Creator Growth | `creator_grow` everywhere | **preserved** |

Removed: the `partner_growth` plan object, the `agency_agency →
partner_growth` alias (its sole canonical target), `GROWTH` legacy-string
mapping, all upgrade-path edges, tier/display entries. After removal:
`canonicalPlanCode("partner_growth") === null`,
`capabilityService.getPlan("partner_growth") === undefined`, every
`can("partner_growth", …)` denied. No pricing, checkout, subscription,
provisioning, plan-switch, or seed references remain.

**DB safety:** no persisted enum; a leftover dev `BillingPlan` row (if any)
is ignored by the registry-driven runtime and is deprecated on the next
**Re-sync catalog** (deploy-day operational step; recorded in
`docs/launch-checklist.md`). Note: RCCF-73.2 once reported 1 dev-DB
subscription; product owner has confirmed Agency never launched and there are
no users/subscribers — full removal approved.

## 11. Pricing Verification

Runtime prices unchanged and re-asserted by tests:
Creator Launch ₹0 (15-day trial) / Growth ₹999 / Scale ₹1995 / Enterprise
manual; Partner Free ₹0 / Solo ₹4999 / Scale ₹7999 / Enterprise ₹14999.
**No stale price strings introduced; no hardcoded replacements.** Partner
Growth appears nowhere in the public lineup.

## 12. Comparison Table Decision

`ComparisonTable.tsx` deletion **upheld**: it had no non-homepage consumers
(retired from the homepage IA in MKT-02R1; pricing uses its own runtime-driven
`ComparisonMatrix`). The standalone trust registry (`registry.ts`,
`types.ts`) retains its generic `ComparisonConfig` API. Restoration of the
deleted files was **not** necessary; only the broken `SEED_COMPARISONS`
re-export fallout was repaired. Homepage renders no comparison table.

## 13. Accessibility

- Meaningful alt text on both captures (product proof, demonstration-framed).
- Decorative glow `aria-hidden="true"` + `pointer-events-none`.
- Headings hierarchy unchanged; CTA keyboard flow unchanged (HeroInput form);
- Mobile drawer retains `role="dialog"`, `aria-modal`, Escape close, skip-link.

## 14. SEO / Metadata

`src/app/layout.tsx` untouched: title template, OG/Twitter cards keep the
certified `01-desktop.png` (intended architecture; not replaced). Homepage
metadata (absolute title, description, canonical) unchanged. Organization
JSON-LD unchanged. No fabricated claims introduced.

## 15. Performance

- `<picture>` selection: narrow mobile downloads **only** the 390×844 asset;
  md+ downloads the 1440×900 asset (verified via `currentSrc` at each
  breakpoint). No double-download of the primary capture.
- Hero capture `loading="eager"` (above fold), showcase `loading="lazy"`.
- Intrinsic `width`/`height` attributes on every capture prevent CLS.

## 16. Tests

New: `tests/unit/rccf-mkt-04r1-homepage-responsive-legacy-plan.test.ts`
(19 tests) — certified assets on disk + wired in Hero/Showcase; no stray
asset references; positioning + five pillars; comparison table not on
homepage; SEED_COMPARISONS re-export gone; responsive structural rules
(`min-w-0`, height caps, `md:w-full`, no base `w-56 shrink-0`); Agency lineup
excludes partner_growth; canonical/legacy resolution denies retired codes;
upgrade paths clean; Creator lineup + all prices unchanged; surviving legacy
aliases intact.

Updated guardrails (modernized, never deleted): commerce-registry,
capabilities, plans-alignment, plan-resolution, rccf71-6-2 (partner_growth
now denied; storefront-loader assertion modernized to the RCCF-02
snapshot-only chain), rccf73-3 (rejection message branch), MKT-02R1 truth +
homepage-structure, MKT-03 audit (srcSet wiring), implementation42.spec
(Partner Growth absent from pricing).

## 17. Build / Verification Results

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npx eslint` (all touched files) | PASS (0 errors; 2 pre-existing warnings) |
| `npm run build` | PASS (full route compile) |
| `npx prisma validate` | PASS (schema valid) |
| `git diff --check` | PASS (clean) |
| Focused suites (6 files / 144 tests) | PASS |
| MKT-02R1 + MKT-03 suites (43 tests) | PASS |
| Commerce/capability suites (rccf67/68/73-3, theme-capabilities, provisioning — 66 tests) | PASS |
| Full unit suite | 4404 passed / 22 failed |

**Failure classification (full suite):** all 22 failures are
**PRE-EXISTING / UNRELATED** to this RCCF — traced to (a) `prisma.paymentAccount`
mock drift in products/whatsapp/content-transition/dashboard suites
(`paymentAccount.findUnique` undefined — newer payment-account runtime vs
stale mocks) and (b) the RCCF-02 snapshot-only `storefront-loader` refactor
vs stale token guardrails (rccf71-1/71-2/71-3/71-5.1/71.6.1). None touch
plans registry, capability constants, pricing, or marketing components. The
one stale guardrail in this RCCF's touched scope (rccf71-6-2 storefront-loader
assertion) was modernized; the others live outside this ticket's scope and are
left untouched per diff discipline. **No failures hidden.**

## 18. Protected Work

Untouched and **unstaged**: `src/app/onboarding/page.tsx` (protected future
work), `tests/fixtures/test-seed.ts`, `.env.example`, `opencode.json`,
`package.json`, `skills-lock.json`, `docs/design/Stitch-DNA.md`,
`docs/marketing-assets/**`, `src/components/dashboard/StorefrontStatusCard.tsx`,
`src/components/ui/Button.tsx`,
`src/modules/customer-success/**`, `tests/e2e/shared/auth.ts`, and all
pre-existing untracked files. Frozen surfaces: auth/middleware, Prisma
schema/migrations, capabilityService engine, billing/Razorpay, checkout,
refunds, publishing, media/storage, Builder/LayoutEngine, storefront runtime.

## 19. Exact Staged Files

Source (9): `src/components/marketing/Hero.tsx`,
`src/components/marketing/StorefrontShowcase.tsx`,
`src/components/marketing/CreatorShowcase.tsx`,
`src/components/marketing/trust/index.ts`, `src/lib/marketing/trust/index.ts`,
`src/config/commerce/plans.ts`, `src/lib/capabilities/constants.ts`,
`src/lib/capabilities/plan-resolution.ts`,
`src/modules/provisioning/application/creator-plan.ts`

Tests (10): `tests/unit/rccf-mkt-04r1-homepage-responsive-legacy-plan.test.ts`
(new), `tests/unit/commerce-registry.test.ts`,
`tests/unit/capabilities.test.ts`, `tests/unit/plans-alignment.test.ts`,
`src/lib/capabilities/__tests__/plan-resolution.test.ts`,
`tests/unit/rccf71-6-2-partner-theme-entitlement.test.ts`,
`tests/unit/rccf73-3-creator-client-subscription.test.ts`,
`tests/unit/rccf-mkt-02r1-marketing-truth.test.ts`,
`tests/unit/rccf-mkt-02r1-homepage-structure.test.tsx`,
`tests/unit/rccf-mkt-03-marketing-site-audit.test.ts`

E2E (1): `tests/e2e/production/implementation42.spec.ts`

Docs (7): `docs/rccf-mkt-04r1-homepage-responsive-legacy-plan-closure.md`
(new), `docs/commerce-registry.md`, `docs/pricing-migration.md`,
`docs/pricing-architecture.md`, `docs/plan-management.md`,
`docs/launch-checklist.md`,
`docs/launch-candidate/deployment-checklist.md`

Staging used explicit per-file `git add` only — never `git add .` / `-A`.

## 20. Deferred Items

- Deploy-day operational step: **Re-sync catalog** in Super Admin Pricing
  Center so any stale dev `partner_growth`/`agency_agency` `BillingPlan` rows
  are marked deprecated.
- Pre-existing full-suite failures (payment-account mock drift; rccf-71.x
  storefront-loader guardrails) — recommend a dedicated mock-drift RCCF.
- Previous RCCF's untracked closure doc
  (`docs/rccf-mkt-04-homepage-responsive-capability-truth-closure.md`) remains
  untracked as a historical record.

## 21. Git State

- Baseline: HEAD `8493956` === `origin/main` (protected).
- This RCCF: surgically staged, **NOT committed**, **NOT pushed**.
- Protected working-tree changes remain unstaged and untouched.

## 22. Final Verdict

**RCCF-MKT-04-R1 — COMPLETE.**

Homepage images: RESTORED · Responsive: 320/360/390/414/768/1024/1280/1440
PASS · Horizontal overflow: PASS · Creator capability matrix: CORRECT —
UNCHANGED · Creator pricing: CORRECT — UNCHANGED · Agency capability matrix:
CORRECT — UNCHANGED · Agency pricing: CORRECT — UNCHANGED · Partner Growth:
REMOVED (legacy / no users / Agency not launched) · Comparison table: NOT ON
HOMEPAGE · Payment architecture: UNTOUCHED · Protected work: UNTOUCHED ·
Commit: NOT CREATED · Push: NOT PERFORMED.

STOP.
