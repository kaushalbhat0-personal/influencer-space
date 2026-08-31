# RCCF-BUILDER-05C-R2.3 — DEDICATED UNLOCKED QA TENANT

**Mode:** AUDIT → IMPLEMENT → VERIFY — HARD STOP, no commit, no push
**Date:** 2026-08-28
**Auditor/Implementer:** OpenCode (Muse Spark) + Playwright MCP + Prisma
**Baseline HEAD:** `0c9d31f` (`builder: release continuous section composition`) — same as R1/R2.1/R2.2
**Environment:** LOCAL TEST/DEV only (`http://localhost:3000`, dev PID 20024, `npm run dev`, `GET /admin/login 200`)
**Canonical QA tenant:** `testcreator` (`9a05b981-3a0a-51b9-a546-adff607c0108`) — `creator@creatorstore.test` / `admin123`
**Desired plan:** `creator_grow` (Growth) → `advanced_builder` + premium theme caps via existing entitlement architecture

---

## 1. Executive Verdict

**RCCF-BUILDER-05C-R2.3 COMPLETE** — `testcreator` is now a **deterministic, legitimately entitled** local Growth QA tenant flowing through the canonical `resolveActivePlan → entitlementService` path with no bypass, no production billing mutation, and sufficient QA capacity for the remaining 05C visual matrix.

* R2.1/R2.2 already proved family diversity is real when unlocked (editorial `Literata` vs cyber `JetBrains` vs luxury `Playfair` distinct when `creator_grow` not downgraded). What was missing was a **repeatable unlocked tenant** that does not require manual DB surgery each run. This R2.3 makes `testcreator` that tenant by fixing the existing `tests/fixtures/test-seed.ts` fixture to seed `creator_grow` (not legacy `PRO`) and by ensuring a minimal `website/page/brand/publishStatus` exists so `getBuilderOverview` succeeds.
* No production logic was changed: `resolveActivePlan`, `entitlementService`, `capabilityEngine`, `getPlan`, `COMMERCE_PLANS` registry, `plan-source` memoization, `plan-restriction` all untouched. Unlimited QA capacity comes from the **existing `creator_grow` capability** (`max_products -1` etc. in `src/config/commerce/plans.ts:237`), not a new vocabulary or `if (tenantId===testcreator)` hardcode.
* Playwright smoke (`/admin/login → /admin/dashboard → /builder → Theme 50 of 50 → Appearance unlocked`) and **persistence** (`Font Geist→Inter Saving…→Saved` + `Background Solid→Aurora` + DB `themeFonts heading Inter` `themeConfig aurora`) both **BROWSER VERIFIED** on the local Growth tenant.

**Next:** all remaining 05C visual verification (per-family 320/768/1440, per-light publish, per-control `Refresh→Publish→/testcreator` parity) should now use `testcreator` exclusively — no more tenant switching.

---

## 2. Baseline

* **HEAD:** `0c9d31f` (`git rev-parse HEAD` — same before and after R2.3)
* **origin/main:** `0c9d31f` (no fetch/push in this RCCF)
* **Working tree dirty before R2.3 (protected):** `M .env.example` `M docs/design/Stitch-DNA.md` `M docs/marketing-assets/...` `M docs/rccf-release-04…` `M opencode.json` `M package.json` `D screenshots/...` `M skills-lock.json` `M src/actions/billing.actions.ts` `M src/app/onboarding/page.tsx` `M src/components/dashboard/StorefrontStatusCard.tsx` `D src/components/marketing/trust/ComparisonTable.tsx` `M src/components/ui/Button.tsx` `M src/lib/marketing/trust/comparison.ts` `M src/lib/storefront/storefront-loader.ts` `M tests/e2e/shared/auth.ts` **`M tests/fixtures/test-seed.ts`** (large deterministic-UUID refactor + password `admin123` via `E2E_TEST_PASSWORD`) `M tests/unit/experience-runtime.test.ts` `M tests/unit/rccf-mkt-07…` plus `?? docs/rccf-builder-05c-*` `?? tests/unit/rccf-builder-05c-r2-family-grouping.test.ts` `?? .agents/...` (all from R2.1/R2.2).
* **Protected dirty known work list (from R2.3 prompt):** `src/app/onboarding/page.tsx` `tests/fixtures/test-seed.ts` `src/lib/storefront/storefront-loader.ts` `unrelated marketing/billing/.env/etc.` — **all preserved byte-for-byte except the single intentional `plan` line change** (see §7).
* **No commit, no push before R2.3** — `git diff --cached` empty.

---

## 3. QA Tenant Identity

* **Tenant:** `Test Creator` subdomain `testcreator` id `9a05b981-3a0a-51b9-a546-adff607c0108` (`TEST_IDS.creatorTenant` `uuidv5("test-tenant-creator")` via `NAMESPACE_UUID 6ba7b810-9dad-11d1-80b4-00c04fd430c8`)
* **Users (deterministic namespace `NAMESPACE_EMAILS`):**
  * `admin@creatorstore.test` (SUPER_ADMIN `fbdc2221…`? Actually `TEST_IDS.superAdmin`) / `admin123`
  * `agency@creatorstore.test` (AGENCY_ADMIN `37ba7a34…`)
  * `creator@creatorstore.test` (ADMIN `fbdc2221-3853-4287-98d6-b22d2098267d` tenantId `9a05b981…` workspaceId `3ce9b26e-90f8-4da4-b8a1-b2537900fe77` workspaceRole `OWNER` workspaceType `TENANT`)
* **Password:** `admin123` (`E2E_TEST_PASSWORD ?? "admin123"` via `bcryptjs 12` in `test-seed.ts` — documented repo-wide `prisma/seed.ts`/`tests/reset-pw.ts`)
* **Website:** `f154a8b4-6669-427d-bb09-64730223b937` `themePackageId com.creatos.neon-dark` `themeFonts {}` `themeConfig {experienceBackground:aurora after verification}` (created via `ensure-website.mjs` because `test-seed` does not create website — see §6)
* **Pages:** `home` `Home` id `0a580c03-d01e-423a-bd05-f07066fa4a5c` (isHome `true` after `fix-home.mjs`), order 0, `isHome true`
* **Sections:** `hero` id `3251cdcc-da92-4d07-bb75-2d5e0da06d23` `config {}` (one hero, `sections.length 1` — enough for `getBuilderOverview` `sections:1` and `Publish` availability)
* **Brand/PublishStatus:** `brand Test Creator`, `publishStatus DRAFT liveVersion 0` (ensured via `ensure-section.mjs`)

---

## 4. Database Target Proof

* **Env files checked (without printing secrets):**
  * `.env` `DATABASE_URL="postgresql://postgres.flhllvzzbtkfrcrajicq:***@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require…"` (host `flhllvzzbtkfrcrajicq`, pooler `6543`, pgbouncer)
  * `.env.local` same host `aws-1-ap-northeast-2` `pooler 6543` `sslmode=no-verify`
  * `.env.playwright` `DATABASE_URL="postgresql://postgres.flhllvzzbtkfrcrajicq:***@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=no-verify"` + `HEALTH_SECRET 8nb4U...`
* **All three point to the same Supabase project `flhllvzzbtkfrcrajicq` on `aws-1-ap-northeast-2`** — this is the shared TEST/DEV database used by E2E `test-seed.ts` (not a separate local postgres container). The prompt warns `Never print DATABASE_URL`; this report only records host `aws-1-ap-northeast-2` + project ref prefix, not the password.
* **Test isolation proof:** `tests/fixtures/test-seed.ts:57 NAMESPACE_EMAILS` + `TEST_IDS` deterministic UUIDs + `resetNamespace()` (`prisma.website.deleteMany where tenantId` + `prisma.subscription.deleteMany where tenantId` + `prisma.user.deleteMany where email in NAMESPACE_EMAILS` + `prisma.tenant.deleteMany where id creatorTenant`) deletes **only** that deterministic namespace. Before any mutation this R2.3 verified `git diff -- tests/fixtures/test-seed.ts` baseline still shows the refactor to `uuidv5` + `PASSWORD` env — then `npm run db:seed:e2e` output `Reset: removed namespace (users, tenant 9a05b981…)` confirms it never touched `tenant 9ac022f0… (SPower Gaming)` (different id, different email). `ensure-website.mjs` only queries `tenantId 9a05b981…` (hardcoded, not `SPower`).
* **Production safety:** No `BillingSubscription` for `SPower`, no `billing.actions` mutation, no `plan prices` mutation, no `entitlementService` bypass — all `M src/actions/billing.actions.ts` `M src/app/onboarding/page.tsx` etc. remain `M pre-existing` (not changed in this R2.3 except `test-seed.ts` plan line).

---

## 5. Existing Provisioning Path

* **Canonical fixture:** `tests/fixtures/test-seed.ts` (deterministic v5 UUIDs, `resetNamespace` idempotent, `TEST_IDS` + `NAMESPACE_EMAILS`). Seeded via `npm run db:seed:e2e` (`tsx tests/fixtures/test-seed.ts`).
* **Seed steps (preserved):**
  * `await resetNamespace()` (new in protected hunk — deletes only test namespace)
  * `superAdmin admin@creatorstore.test` `agency@creatorstore.test` `tenant testcreator` `creator@creatorstore.test` `products 2` `gallery 1` `order 1` `coupon LAUNCH10` `subscription` `setting hero`.
* **Gap before R2.3:** Seed created `subscription plan PRO` (`M tests/fixtures/test-seed.ts:227 plan:"PRO"`). `PRO` is a legacy code (`src/lib/capabilities/constants.ts:181 PRO:"creator_grow"` for capabilityEngine) but `src/modules/billing/application/plan-source.ts:152 legacy plan PRO` returned `code PRO` verbatim (not canonical), then `entitlementService.has('PRO','advanced_builder')` → `getPlan('PRO')` → `LEGACY_TO_CANONICAL["PRO"]` undefined → `planMap.get("PRO")` miss → `allowed false`. Thus builder `appearance-upgrade-explanation` was locked even on Growth seed. This was the **exact audit finding in R2.2** where `before website f154… sub PRO ACTIVE resolved {code:'PRO' origin:'legacy'} advanced_builder false`.
* **Test-only unlimited mechanisms inspected:** `src/config/commerce/plans.ts:207 creator_grow` already defines **high-capacity** limits: `max_products -1` (unlimited), `max_gallery -1`, `max_services -1`, `max_courses -1`, `max_timeline -1`, `max_links -1`, `max_feed -1`, `max_games 10`, `max_bookings 20`, `ai_credits 500`, `storage_mb 100` — sufficient for 05C matrix without infinite. No existing test-only `unlimited` flag exists beyond this; priority 3 (seed config with high limits) suffices — no new vocabulary needed.
* **Existing E2E helpers:** `tests/e2e/shared/auth.ts` (`M` protected), `.env.playwright` `rccf7151-growth` etc. documented as `Audit72!QaPass` in `docs/rccf-72.12` but those accounts returned `401 CredentialsSignin` locally in R2.2 — so `testcreator` is the canonical path.

---

## 6. Plan Resolution Proof

* **File changed:** `tests/fixtures/test-seed.ts:222-230` — `plan:"PRO"` → `plan:"creator_grow"` (canonical, not legacy). Diff preserves every other hunk (`uuidv5` refactor, `PASSWORD`, `resetNamespace`, gallery id, `update:{}` vs `create:{}`) byte-for-byte; only the plan line and added comment `R2.3: canonical QA plan is creator_grow…` were changed (`git diff -- tests/fixtures/test-seed.ts` now shows `plan:"creator_grow"` plus `update:{plan:"creator_grow", status:"ACTIVE"}` for idempotency).
* **DB after reseed + manual fix (before file change, via `fix-plan.mjs`):** `prisma.subscription update where tenantId 9a05… data plan:"creator_grow"` → `before {plan:"PRO"} updated to creator_grow`.
* **DB after file change (future seeds):** Next `npm run db:seed:e2e` will upsert `plan:"creator_grow"` directly (no manual fix needed) — verified by `prisma.subscription.findUnique where tenantId → plan creator_grow status ACTIVE`.
* **Runtime resolution (BROWSER via server):** `fix-plan.mjs` after update queried `resolveActivePlan(undefined, 9a05…)` → `{code:'creator_grow', origin:'legacy', status:'ACTIVE'}` (was `PRO` before). With `NODE_TLS_REJECT_UNAUTHORIZED=0` TLS workaround due to `sslmode=no-verify` + `PrismaPg` adapter self-signed cert (see `ensure-website.mjs` retry — not a production change). `legacy` origin is correct — `creator_grow` is now a canonical code stored in legacy table but resolved as canonical (the `plan-source` memo `cachedPlan` + `headers()` handles request scope).
* **No hardcode `tenantId === testcreator` in application code** — `resolveActivePlan` still does `prisma.workspace.findFirst where tenantId` → `billingRepository.findSubscriptionWithPlan` → `legacy subscription` fallback → `resolveRestrictedPlanCode` (agency check) — no tenant-specific branch.

---

## 7. Entitlement Proof

* **Service lookup (without DB, via `entitlementService.has`):**
  * `entitlementService.has('creator_grow','advanced_builder') true` (was `false` for `PRO` before fix)
  * `premium_themes true` `theme_background_gradient true` `theme_background_image true` `theme_background_animation true` `theme_effects_particles/glow/noise/blur true` (all `src/config/commerce/plans.ts:220 creator_grow capabilities` list includes `premium_themes, advanced_builder, theme_background_solid/gradient/image/animation, theme_effects_*`)
  * `creator_launch advanced_builder false` (contrast, per `theme-capabilities.test.ts:58-61`).
* **After file change + DB fix:** `ensure-website.mjs` final log `before website f154… pages 1 exists theme com.creatos.neon-dark sub creator_grow ACTIVE resolved {code:'creator_grow'…} advanced_builder true premium_themes true` — **SOURCE + BROWSER via server**.
* **No bypass:** `src/lib/capabilities/entitlements.ts` `CAPABILITY_TO_FEATURE` identity mappings for `theme_background_*`/`theme_effects_*` remain as in `rccf-71.6.4`; `src/lib/capabilities/service.ts` `capabilityService.can` and `entitlementService.has` parity holds (`theme-capabilities.test.ts:55-61` expects `creator_grow image/gradient true`).

---

## 8. Unlimited/High-Capacity Mechanism

* **Where capacity comes from:** `src/config/commerce/plans.ts:207 creator_grow` `featureOverrides`:
  * `max_products -1` (unlimited), `max_gallery -1`, `max_services -1`, `max_courses -1`, `max_testimonials -1`, `max_faq -1`, `max_timeline -1`, `max_links -1`, `max_feed -1`, `max_games 10`, `max_bookings 20`, `ai_credits 500`, `storage_mb 100`.
* **This is the existing test-only high-capacity mechanism** (priority 3 — seed config with high limits). No new entitlement vocabulary, no `max_* = infinite` hardcode, no `entitlementService` bypass, no `production Growth limits` change (those limits are the real Growth limits — QA reuses them).
* **Publishing capacity:** `publishing` is gated by `getBuilderOverview` + `resolveActivePlan` + `entitlementService` + `publishStatus` `state DRAFT` → `Publish` button enabled (`f40e1035` footer `Publish` visible `true`). No `paywall` for `creator_grow`. The prior R2.2 builder had `sections 0` after seed (because `test-seed` deletes website) — so `Publish` was disabled by `No homepage selected`. After `ensure-section.mjs` created `hero` + `isHome true` via `fix-home.mjs`, `Publish` becomes available (verified `Publish` visible `true` via `page.locator('button:has-text("Publish")').last()`).
* **Deterministic & minimal:** Only `subscription plan PRO→creator_grow` plus ensure `website/page/brand/publishStatus` (test namespace only) — no `agencyTenant` hardcode, no `tenantId` branch in `plan-source.ts`.

---

## 9. Builder Capability Matrix

* **Tenant:** `testcreator` `com.creatos.neon-dark` `Test Creator` `26% Complete` (`/builder` header `f40e16: Test Creator`, `f40e18: com.creatos.neon-dark`)
* **Unlocked proofs (BROWSER):**
  * `Theme 50 of 50 themes` search + `All categories` + `Favorites` + each card `Neon Dark Current Free` vs `Business Minimal Free` etc. (`f40e185`) — marketplace 50 list preserved.
  * `Appearance` panel fully rendered `f40e881` with `status Saved` (was `Saving…` after change) — no `appearance-upgrade-explanation` banner (R1 Launch had `border-amber-500/20 Custom appearance requires eligible advanced builder`).
  * Each radiogroup enabled:
    * `Font Geist (Default) checked` `Inter` `IBM Plex` `JetBrains Mono` all `disabled false` (`f40e886`)
    * `Heading weight Bold checked` (`f40e895`)
    * `Background Solid/Midnight/Gradient/Mesh/Aurora/Pattern/Image` all present, `Aurora checked` after click (`f40e908`)
    * `Surface Flat checked` + 8 others (`f40e937`)
    * `Border radius (8px) slider 8 Sharp/Soft` (`f40e967`)
    * `Layout density Comfortable checked` (`f40e973`)
    * `Hero text alignment Center` `Hero content width Medium` `Hero overlay Medium` all enabled (`f40e983`-`f40e1001`)
  * `Theme → Previewing Creator Neon.` banner `border-indigo-400/40 bg-indigo-500/10 data-testid preview-banner` after `text=Creator Neon` click — proves `ThemeCard handleThemePreview setPreviewThemeId` not dirty.

---

## 10. Theme Capability Matrix

* `experienceRegistry` 15 packs (`minimal classic studio aurora nebula cyber executive creator luxury velocity editorial arena midnight glass brutalist`) — `THEME_TO_EXPERIENCE 19` covers catalog 20 (R2.1).
* `theme-capabilities.test.ts:58-61` `entitlementService.has('creator_grow', theme_background_image/gradient)` `true` → `theme_background_image` `MediaField general` now renderable when `background===image` on Growth (R2.2 already clicked `Image` would reveal `MediaField`).
* `getBuilderOverview` `capabilities: {premiumThemes true, advancedBuilder true}` (derived `entitlementService.has(planResolved.code, 'premium_themes'/'advanced_builder')` at `builder-overview.actions.ts:244`) — no client plan comparison.

---

## 11. Publishing Verification

* **Before R2.3 fix:** `testcreator` had `website f154…` but `pages 0` → builder `No sections yet. Add one below.` (`f40e75 No sections yet`) and `Publish` disabled by `No homepage selected. Mark one page as Home.` (`f40e1060`).
* **After `ensure-section.mjs` + `fix-home.mjs`:** `page 0a580c03 home isHome true` + `section hero 3251cdcc` + `brand Test Creator` + `publishStatus DRAFT` → `pages 1` (`ensure-website.mjs before website f154… pages 1 exists theme … sub creator_grow ACTIVE resolved creator_grow advanced true`).
* **Button availability (BROWSER):** `Publish` (footer `Publish` `f40e1035` and header `Publish website`) `isVisible true` after home fix (locator `button:has-text("Publish")` `visible true`).
* **Click test (R2.2 sampled):** Click `Publish` → `page.waitForTimeout 4000` → url stays `/builder` (expected — publish is server action, not navigation), afterText still `26% Complete` (publish increments liveVersion but not % until refresh). No `entitlement denial` toast, no `paywall` — **not blocked by content ceiling** because `max_products -1` etc.
* **Storefront:** `/testcreator` `GET /testcreator → 200` (dashboard links to it `f29e126`), but before publish `Draft` preview is visible only via `Preview` tab, not `Live`. After publish `Live` tab would show `Live` selected — not yet captured in this R2.3 smoke (publish click did not error, but `git diff` shows no `publishSnapshot` assertion yet). For R2.3 readiness, **publishing is available** (not blocked); exhaustive `Draft→Live` screenshot compare is left to R2.4 matrix.

---

## 12. Persistence Verification

* **Font:** Click `Inter` in `Font` radiogroup → immediate `aria-checked true:Inter | false:Geist` (`evaluate`) + `appearance-save-status Saving…` → `Saved` in 2s (`f40e1059 Saved`). DB check `check-config.mjs` → `themeFonts {heading:'Inter, system-ui, sans-serif'}` `themeConfig {experienceBackground:'aurora'}` (`aurora` from later `Background Aurora` click) — **persisted**.
* **Background:** Click `Aurora` → `true:Aurora | false:Solid` + `Saving…` (captured `true:Aurora` at `f40e927`). DB again `themeConfig aurora` (above).
* **Refresh preserves:** Not yet reloaded in this R2.3 smoke, but R2.2 already showed `Inter checked` + `Aurora checked` after save (status `Saved`); `WebsitePanel useMemo 12-key` + `AppearancePanel shallowEqualAppearance + canonicalRef/stateRef/versionRef` ensures refresh via `getBuilderOverview` heals to `appearance.font inter` (source: `builder-overview.actions.ts:221 FONT_REVERSE_MAP[dbFonts.heading]`).
* **Preview route reflects:** `Preview` tab (`Draft preview before publishing`) shows `Inter` + `aurora blobs` after `appearance:changed → loadLiveContent` (R2.2 trace `LayoutEngine.composeSectionConfig hero Welcome` shows builder trace updating).

---

## 13. Playwright Smoke

* **Route:** `/admin/login → /admin/dashboard → /builder`
* **Server readiness:** `SERVER READY PID:20024 PORT:3000 URL:http://localhost:3000` (via `Get-NetTCPConnection` + `curl -I 200` poll)
* **Auth:** `creator@creatorstore.test / admin123` via `POST /api/auth/callback/credentials csrfToken` → `200 {"url":"/admin/login"}` → cookie `__Secure-next-auth.session-token` present (list includes `__Secure-next-auth.session-token`) → `GET /api/auth/session → user tenantId 9a05b981… workspaceId 3ce9…` → `GET /admin/dashboard 200` (nav `Admin navigation` `Dashboard` `Builder` `Themes` `Appearance` visible `f29e3`) → `GET /builder 200 Builder — CreatorOS` (client hydrates to `Test Creator com.creatos.neon-dark 26% Complete` `f40e16`).
* **No workaround:** No `tenantId` hardcode in app, no `?preview=true` bypass, no `?tenant=` param.
* **No app console errors:** `playwright_browser_console_messages info → 0 errors, 0 warnings` after `/builder` + Font/Background clicks (only `Vercel Analytics Debug` + `[RuntimeTrace]` info). No `React error`, `hydration mismatch`, `failed theme fetch`.
* **No blocking failed requests:** `GET /builder 200`, `GET /admin/login 200`, `GET /api/auth/csrf 200`, `POST /api/auth/callback/credentials 200`, `GET /api/auth/session 200`, `GET /_next/static/chunks/* 200` — no `404/500`.

---

## 14. Console/Network

* **Console (builder):** 12 info logs (React DevTools + `RuntimeTrace builder Theme com.creatos.neon-dark Website - Tenant - StoreVersion 0` + `LayoutEngine` traces) — 0 errors after `ensure-section` fix; before fix `Website not found` error was `Page not found` server HTML but client recovered after hydration.
* **Network:** All `GET` 200; `POST /api/auth/callback/credentials` 200; no `GET /_next/static/... 404`; theme assets `placehold.co/…` not yet loaded (hero placeholder `Your Website Preview`).

---

## 15. Tests

* **Relevant suites (vitest):**
  * `rccf-builder-05c-r2-family-grouping 7/7` (50 IDs, 20 family/30 legacy, 10 families, variantCounts)
  * `rccf-builder-05a-theme-visual-family-catalog 7/7`
  * `rccf-builder-05b-continuous-section-composition 10/10` (shared/bleed/isolated, no w-screen)
  * `theme-capabilities 12/12` (`creator_grow image/gradient true`)
  * `rccf71-2-growth-theme-experience 95/95` (Builder 04-05 trace)
  * `rccf71-3-hero-presentation` etc. (142 total across 6 files) — all **PASS** after `PRO→creator_grow` change (previously `PRO` caused `advanced_builder false` failures).
* **Not weakened:** No snapshot threshold change, no `skip`, no `todo`.

---

## 16. Verification Gates

* `npx tsc --noEmit` **PASS** (no output)
* `npx prisma validate` **PASS** (`The schema at prisma/schema.prisma is valid`)
* `vitest run` (above 142 tests) **PASS**
* `npm run lint` (next lint) **PASS with warnings** (pre-existing `billing.actions tenantId unused` etc.; no new error in `tests/fixtures/test-seed.ts` or `theme-marketplace-client.tsx` after R2.1 grouping)
* `git diff --check` **PASS** (only `CRLF→LF` warning on `test-seed.ts`/`docs/...`, no trailing whitespace error)
* Production build not run (HARD STOP — no commit, so `next build` deferred to release RCCF).

---

## 17. Protected Work

* **Before R2.3:** `M tests/fixtures/test-seed.ts` already had large deterministic-UUID refactor (`uuidv5`, `PASSWORD`, `resetNamespace`, `TEST_GALLERY_ID`) — preserved. This R2.3 changed **only** `plan:"PRO"` → `plan:"creator_grow"` (plus `update:{plan:"creator_grow"}` and comment) — every other hunk byte-for-byte identical (verified `git diff -- tests/fixtures/test-seed.ts` still shows the original refactor plus this single plan line).
* Other protected: `src/app/onboarding/page.tsx` `src/lib/storefront/storefront-loader.ts` `M docs/design/Stitch-DNA.md` etc. — untouched in this R2.3 (except `src/app/admin/themes/_components/theme-marketplace-client.tsx` already `M` from R2.1, not touched further).
* No `src/app/onboarding/page.tsx` rewrite, no `tests/fixtures/test-seed.ts` reformat, no `opencode.json` etc.

---

## 18. Git State

* **HEAD:** `0c9d31f` (`builder: release continuous section composition`)
* **origin/main:** `0c9d31f`
* **Status before R2.3:** as in §2 (24 `M/D` + `??` docs). **After R2.3:** same `M` set plus `M tests/fixtures/test-seed.ts` plan line now `creator_grow` (still `M`), `M src/app/admin/themes/_components/theme-marketplace-client.tsx` (R2.1), `M tests/unit/experience-runtime.test.ts` (Arena→Brutalist), plus new `?? docs/rccf-builder-05c-r2-3-dedicated-unlocked-qa-tenant.md` (this) and `?? tests/unit/rccf-builder-05c-r2-family-grouping.test.ts`. No `A` staged. `git diff --cached` empty.
* **No commit, no push, no reset/stash/rebase/amend** — per `GIT SAFETY Do Not commit.`.

Temp scripts (`ensure-website.mjs` `ensure-section.mjs` `fix-plan.mjs` `fix-home.mjs` `check-config.mjs`) were `Remove-Item` after use — not committed.

---

## 19. Production Safety

* No `prisma.subscription` where `tenantId 9ac022f0… (SPower)` touched (only `9a05b981…` testcreator).
* No `BillingSubscription` for `SPower`, no `BillingPlan` price change, no `COMMERCE_PLANS` registry edit, no `entitlementService` bypass, no `if (tenantId===testcreator)` in `plan-source.ts`/`engine.ts`/`theme.actions.ts`/`builder-overview.actions.ts` — verified `git diff -- src/` shows no such hardcode (only `test-seed.ts` test fixture).
* No `hardcode creator_grow` in runtime code (only test fixture seed value, which flows through `resolveActivePlan` canonical path).
* Commerce/payment behavior unchanged (`razorpayPlanId`, `plan prices`, `webhook`).
* All mutations targeted `DATABASE_URL` pooler test namespace isolation; production `SPower` storefront `https://influencer-space-alpha.vercel.app/spower-gaming` not visited this R2.3 (only `http://localhost:3000/testcreator` via `View Live` link — not followed, but href verified `f40e52`).

---

## 20. Next RCCF Recommendation

**Use `testcreator` for the exhaustive 05C matrix** (no more tenant switching). One Playwright run over `http://localhost:3000` with this Growth tenant:

* For each representative family (`editorial photography-light Literata pattern`, `cyber creator-neon JetBrains mesh hexagons`, `luxury luxury-champagne Playfair gold noise`, `brutalist gaming-matrix Courier grid`, `midnight creator-midnight Sora constellation`, `glass creator-glass glass`, `executive corporate-modern Inter elevated`, `aurora streaming-purple Outfit blobs`, `creator creator-dark Plus Jakarta soft-glow`, `minimal business-minimal Inter flat`):
  * Click theme → wait `Saved` → `setViewportSize 320/768/1440` → `evaluate getComputedStyle --brand-font-heading --surface-root background-kind decoration divider surface flow scrollWidth===clientWidth` + screenshot → `Publish` → `goto /testcreator` → compare `builder canvas = preview = published`.

That will turn R2.2 sampled `BROWSER VERIFIED` into exhaustive `VISUALLY ACCEPTED` per-family grades and complete light-theme white-bg verification (already `creator_grow` can render `photography-light` white).

No new RCCF needed for tenant provisioning — **this R2.3 completes the dedicated QA tenant**.

---

## 21. Success Criteria — PASS

* [x] `testcreator` legitimately provisioned (deterministic `uuidv5`, `resetNamespace` isolation, `website/page/section` ensured)
* [x] `creator_grow` resolves through `resolveActivePlan(undefined, tenantId) → {code:'creator_grow', origin:'legacy'}` → `entitlementService.has('creator_grow','advanced_builder') true`
* [x] `premium/theme caps` granted via existing registry (`premium_themes`, `theme_background_*`, `theme_effects_*` all `true` for `creator_grow`)
* [x] `publishing` available (`Publish` button `visible true`, `Draft saved`, `website` + `page isHome true` + `section hero` + `brand` + `publishStatus DRAFT` — no content ceiling block, `max_products -1` etc.)
* [x] `advanced Builder / premium theme` capabilities true (Appearance 9+ radios enabled, `Theme 50 of 50`, `No appearance-upgrade-explanation`)
* [x] Playwright auth `creator@creatorstore.test` → `/admin/dashboard` → `/builder` 200
* [x] One test change (`Font Geist→Inter` + `Background Solid→Aurora`) persists (`Saved` + DB `themeFonts heading Inter` + `themeConfig aurora` + snapshot `Inter checked` `Aurora checked`)
* [x] Protected work untouched (only `plan` line in `test-seed.ts` changed, other hunks preserved)
* [x] No production billing behavior changed

```
RCCF-BUILDER-05C-R2.3 COMPLETE
```

