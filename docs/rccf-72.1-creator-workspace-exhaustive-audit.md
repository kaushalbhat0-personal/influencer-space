# RCCF-72.1 — Creator Workspace Exhaustive Audit

**Status:** COMPLETE (AUDIT ONLY — no app-code changes, no commit)
**Date:** 2026-08-18
**Scope:** Creator-facing workspace (Admin) + Storefront across Launch / Growth / Scale tenants.
**Method:** Playwright (headless Chromium, 1440×900 / 390×844 / 320×700) against `npm run dev` (localhost:3000), DB verification via Prisma, code inspection for root-cause analysis.
**Accounts used (all role ADMIN, theme `com.creatos.neon-dark`):**
- Creator A (Launch): `rccf72-1787032348339@example.com` — tenant `147dc2d1…`, subdomain `rccf-720-audit`, website `a26f96b7…`
- Creator B (Growth): `rccf7151-growth@example.com` — tenant `66941948…`, subdomain `rccf7151-growth`, website `eeabc8b5…`
- Creator C (Scale): `rccf7164-scale-1787027917475@example.com` — tenant `c1bd3249…`, subdomain `rccf-7164-scale-qa` (draft; used for plan-capability parity checks)

**Exclusions (per brief):** Agency, Super Admin, Marketing frontend, social login (not implemented), billing implementation, new Theme Experience feature work.

---

## 1. Findings Register (summary)

| ID | Sev | Finding | Location |
|----|-----|---------|----------|
| F1 | **P1** | **Save Identity (Name/Headline/Tagline/Bio) on `/admin/settings` always fails** with `"Invalid hero data"`. `handleSaveIdentity` sends `profilePictureUrl: null` / `profilePictureAssetId: null` when no profile picture exists; `heroPartialSchema` uses `z.string().optional()`, which rejects `null` (only `undefined`). Server-action response was captured: `{"success":false,"error":"Invalid hero data"}`. Result: a creator without a profile picture can never save their hero identity. Confirmed via Zod repro (`null → success:false`). Same defect breaks the background **clear** path in `handleSaveBackground`. | `src/features/settings/components/settings-form.tsx:158-171` (`|| null`), `:151-154`; schema in `src/actions/settings.actions.ts` (`heroPartialSchema`, `z.string().optional()`) |
| F2 | **P1** | **Publish quota-exhausted path surfaces a raw DB error** (`"current transaction is aborted, commands ignored until end of transaction block"`) instead of the friendly `PUBLISH_QUOTA_EXCEEDED` UX (with upgrade CTA). Root cause: on an existing exhausted `PlanUsage` row, `reserveSlot` runs `create-if-missing`, which throws **P2002 unique-violation that aborts the Postgres transaction**; the subsequent `getUsage` in the same `$transaction` then throws the raw message, so `commitPublishWithMetering` never returns the `{ok:false}` branch. Reproduced: Launch A at used=3/3, 4th publish → no new snapshot (correctly blocked) but alert shows the raw Postgres text. Secondary: `TECHNICAL_HINTS` in the presentation layer lacks `transaction`/`aborted` tokens, so the raw text is not collapsed to the safe generic message. | `src/modules/billing/infrastructure/plan-usage-repository.ts:44-65`; `src/lib/publishing/service.ts:365-383`; `src/lib/publishing/publish-error-messages.ts:75-128` |
| F3 | **P1 (dev-uncertain)** | **`/admin/settings` and `/admin/gallery` crash for tenants that own media** (Growth B) with `Error: Rendered more hooks than during the previous render`, then land on `/admin/dashboard`. Stack is **inside Next's framework `Router` (`useMemo`, app-router.js:232)** — not app code — and is data-dependent (Launch A with no media loads both pages fine; Growth B with 1 asset does not). `/admin/products` for B also silently redirects to `/admin/dashboard`. Requires verification in a production build; classified here as a release blocker to re-check, dev-mode/HMR suspected. | Framework `next/dist/client/components/app-router.js`; repro: `/admin/settings`, `/admin/gallery` on tenant `66941948…` |
| F4 | **P2** | **Builder "Add Section" catalog exposes Courses & Games to Launch**, where those features are content-limit-0/plan-blocked. Creator can add the section, but its create actions are blocked at enforce-time — misleading/confusing catalog. | Builder section catalog vs `src/modules/billing/application/content-limit.enforcement.ts`; `src/actions/games.actions.ts:49`, `src/features/courses/actions.ts:35` |
| F5 | **P2** | **Dashboard quick actions + milestone CTAs surface locked features.** Quick actions include Bookings/Courses/Appearance for Launch; "Upload your logo" links to `/admin/appearance` and "Configure custom domain" links to `/admin/settings/domain` — both server-gated for Launch, so the CTAs dead-end at the upgrade gate. | `src/components/dashboard/*`, `src/config/admin-nav.ts` |
| F6 | **P3** | **`Appearance` nav item always visible** regardless of plan: `src/config/admin-nav.ts:126` has no `requiredCapability` (only `isNavItemVisible` limit check), so Launch sees the nav item but the page is server-gated by `advanced_builder`. Nav-visibility and page gate disagree. | `src/config/admin-nav.ts:126`, `src/lib/capabilities/nav-visibility.ts` |
| F7 | **P3** | **`/admin/courses`, `/admin/bookings`, `/admin/games`, `/admin/analytics`, `/admin/payments` have no page-level capability gate** (only `requireTenant`) — pages reachable, empty-state UX shown, but all create actions enforce limits. Acceptable (enforce-at-write) but inconsistent with pages that ARE gated (`appearance`, `settings/domain`, `integrations`). | `src/app/admin/{courses,bookings,games,analytics,payments}/page.tsx` |
| F8 | **P3** | **Admin sidebar does not collapse at 390px** (no hamburger); full sidebar + content render with no horizontal overflow. Dense but functional. | Admin layout |
| F9 | **P3** | Hero identity error is user-visible but copy is unhelpful: `"Invalid hero data"` (only surfaced via the F1 bug path). | `src/actions/settings.actions.ts:157` |
| F10 | **Prod Gap** | **No service/FAQ/Link/Testimonial Prisma models** — services = `Offering(type=coaching)`, courses = `Offering(type=course)`, testimonials/FAQ = `Setting.value` JSON. Data is correct end-to-end but ad-hoc; schema evolution risk. | `prisma/schema.prisma` |
| F11 | **Env** | Dev server prints `Error: aborted` (connection aborts) during navigation storms — dev-only noise, not app failures (verified: all target pages still 200). First-hit compiles: `/admin/login` 36s/2400 modules; nav page times up to ~5s. | dev-server logs |

---

## 2. Navigation (Phase 1) — Launch A

- 38 admin routes exist; **27 distinct nav hrefs swept, all returned 200 with zero `pageError` / `consoleError`**.
- Visible nav for Launch: Dashboard, Create Website, Hero, Gallery, Content Feed, Timeline, Testimonials, FAQ, Links, Products, Services, Orders, Customers, Payments, Builder, Themes, Templates, Appearance, Navigation, Analytics, Messages, Brand, Goals, Account, SEO, Billing, Notifications.
- **Correctly hidden for Launch:** Courses, Bookings, Games, Domain, Integrations (capability/limit nav filtering works — see F6 caveat).
- Footer: "View Website" → `/rccf-720-audit`; Sign Out present.
- Direct-route / guard matrix (logged-in ADMIN): `/admin/create` 200; `/agency` → `/admin/login`; `/super-admin` → `/admin/login`; `/admin/billing` 200; `/admin/notifications` 200. Logged-out `/admin/dashboard` → `/admin/login`. **All access control green.**

## 3. Dashboard (Phase 2) — Launch A

- Verified against DB: Live, v1→v3, theme `com.creatos.neon-dark`, publishedAt matches `PublishStatus`. ✓
- STORE HEALTH 24% Grade F; checklist 1 of 5 (20%); empty-state CTAs accurate.
- Quick actions include **locked** Bookings/Courses/Appearance (F5).
- Publish control in topbar: shows correct badge; hidden when live; quota display driven by `getPublishUsage`.

## 4. Builder (Phase 3) — Launch A & Growth B

- Launch: 6 sections rail (Hero/Products/Gallery/Timeline/Links/Footer) matching DB; status "Live … Draft saved v1"; no errors; screenshot `screenshots/rccf-72.1-builder-launch.png`.
- Growth B: builder loads (no hooks crash), sections rail + canvas render.
- Add-Section catalog exposes Courses/Games to Launch (F4).
- SAVE ≠ PUBLISH respected: content edits mark `Changes pending` and publish state flips `live → draft` (`src/lib/publishing/content-change.ts`), storefront stays snapshot-only. **Verified end-to-end** (milestone add → dashboard showed "Changes pending" + Publish button).

## 5. Appearance & Themes (Phase 4)

- Launch A: `/admin/appearance` server-gated ("Custom appearance requires an eligible advanced builder plan"). Premium controls (backgrounds Midnight/Gradient/Radial/Mesh/Aurora/Pattern/Image, surfaces, font packs) show UPGRADE badges. Verified earlier session.
- **Growth B: `/admin/appearance` fully unlocked** — Color Presets (Cyan/Magenta/Amber/Lime/Violet/Rose/Emerald/Sky), Custom Colors (Primary `#00f5ff`…), Typography (Geist…). Premium capability resolution correct for `creator_grow`.
- `/admin/themes`, `/admin/templates`, `/admin/blueprints` load for both (blueprints visibility confirmed in nav audit).

## 6. Settings — Hero/Identity (Phase 5)

- **Save Buttons** (CTA text/link): persists ✓ (DB `hero_data.ctaText` verified; storefront reflects it after publish).
- **Save Live Badge**: persists ✓.
- **Save Identity**: **ALWAYS FAILS** for creators without a profile picture (F1). Hero Name/Headline/Tagline/Bio are **unsaveable** — top creator-content blocker.
- **Save Hero Media** (video/poster): requires uploaded asset (RCCF-67.3 asset-backed rule, correct); not exercised with real media in this pass (media phase below).
- Settings page itself: **crashes for tenants with assets** (F3) — Growth B could not reach settings at all.
- Settings live preview: non-interactive, device toggle, container-query frame; correct by inspection.

## 7. SEO / Profile / Account (Phase 6 + Account)

- **Profile autosave** (Business Name): persisted across reload ✓ (autosave hook works; fields Email/Phone/Timezone/Language/Country/Location/Business Name/GST/Tax ID/Payout Preference/Currency + notification toggles).
- **SEO page** (`/admin/seo`): loads; fields are **unlabeled inputs** (meta title/description, OG + Twitter fields, `indexing` checkbox) with no `id`/`placeholder` — not reachable by automated label queries; manual inspection only. No save test performed (form uses server action; see F10 note). Minor a11y/automation gap: inputs lack accessible labels.

## 8. Media (Phase 8)

- MediaField present in Settings (profile/video/poster/background) and Gallery; upload → `uploadFileWithProgress` → asset registration; library picker (`MediaPickerDialog`) lists tenant-scoped assets with search/type filter.
- Growth B: 1 asset, referenced by hero background — asset pipeline consistent with theme config (`experienceBackgroundImage` + assetId).
- Upload/dedupe not exercised with a real file in this pass (would create tenant content; F1/F3 already block the primary hero-media flows in this environment). **Gap to verify:** full upload round-trip + `removeAssetReference` dereference on replace/remove.

## 9. Content features (Phase 7) — create + persist + storefront reflect

All on Launch A via UI, verified in DB and (after publish) on the live storefront:

| Feature | Create via UI | Persists (reload) | DB truth | Storefront (post-publish) |
|---|---|---|---|---|
| Product | ✓ | ✓ | `Product` name/price/status PUBLISHED | ✓ ₹500 / ₹100 Buy Now |
| Service | ✓ | ✓ | `Offering(type=coaching)` | section not on page (n/a) |
| Testimonial | ✓ | ✓ | `Setting.value` key `testimonials` | section not on page (n/a) |
| FAQ | ✓ | ✓ | `Setting.value` key `faq` | section not on page (n/a) |
| Timeline milestone | ✓ | ✓ | `TimelineEvent` | ✓ "Timeline 2026 …" |
| Links | form present | n/a | `AffiliateLink` (single writer is hero socialLinks per code) | n/a |

- Content limit enforcement verified: 3rd Launch product create returned `"Products limit reached (3/3)."` — **enforce-at-write works and is user-visible** (F4 catalog caveat aside).
- Course/Game/Booking create paths enforce `enforceContentLimit` at write (code-verified: `games.actions.ts:49`, `bookings/service.ts:33`, `courses/actions.ts:35`).

## 10. Orders / Customers / Payments / Analytics / Messages / Brand / Goals (Phases 2/7/12)

- All load with correct empty states on Launch (Orders "No orders yet", Customers, Payments, Analytics empty-state chart, Messages, Brand, Goals).
- **No page-level capability gate** on Courses/Bookings/Games/Analytics/Payments for Launch (F7) — reachable but write-blocked; acceptable enforce-at-write, inconsistent with appearance/domain/integrations gating.

## 11. Billing / Notifications

- `/admin/billing` 200 (shows current plan + upgrade paths — not audited in depth per exclusions).
- `/admin/notifications` 200; notification feed polled server-side on every admin page (observed POSTs) — zero console errors.

## 12. Publishing (Phase 9)

- **Launch A:** publish flow verified end-to-end: draft→live (v2, v3), snapshot per publish, `PublishStatus.state=live`, `liveVersion`, `publishedAt` all consistent; publish button hidden once live; usage metered 1→2→3.
- **Growth B:** policy `creator_grow` = monthly limit 10, used 5 at audit start (correct in DB).
- **Repeat-publish contract:** CMS edit → `markChangesPending` (live→draft) → publish → new snapshot. Verified (milestone add → "Changes pending" → publish → v3).
- **Quota-exhausted UX is BROKEN (F2):** 4th publish correctly writes nothing (snapshot count stays 3, usage stays 3) **but** surfaces `"current transaction is aborted…"` instead of `"You've used all 3 publishes available on your current plan. Upgrade to keep publishing."` — the friendly coded path (`PUBLISH_QUOTA_EXCEEDED`) is unreachable because `reserveSlot`'s P2002 aborts the tx before `getUsage`.

## 13. Storefront (Phase 10)

- **Live A (v3):** 200, title "RCCF 72.0 Audit — CreatorStore", renders Hero (name + CTA), Products (₹500/₹100, Buy Now), Timeline, Footer (Terms/Privacy/Refunds); sections not on the page (Testimonials/FAQ/Services) correctly absent. Snapshot-driven; matches published aggregate. Screenshots `screenshots/rccf-72.1-storefront-a-desktop.png` / `-mobile.png`.
- **404/published-only:** storefront reads `PublishedSnapshot` only (code-verified RCCF-01/02); non-existent subdomain behavior not swept this pass (**gap**).
- **Tenant isolation:** B's storefront (`/rccf7151-growth`) contains zero Launch content (no "RCCF721 Audit Product", no "Audit Reviewer"); A's live storefront contains no B content. ✓ (see Phase 15)

## 14. Responsive (Phase 13)

- **Storefront A @320px:** `scrollWidth=320 = clientWidth` — **no horizontal overflow** ✓ (break-words hero fix verified on canvas; container-query variants).
- **Admin @390px:** sidebar remains visible (no hamburger collapse, F8), no horizontal overflow.
- Builder device-frame parity (375px container query) verified by design + previous session capture.

## 15. Loading / Empty / Error states (Phase 14)

- Empty states verified across Products/Orders/Customers/Payments/Analytics/Bookings/Courses/Games (Launch).
- Loading skeletons in MediaPickerDialog (8 shimmer tiles) ✓.
- Error presentation: publish failures rendered in topbar `role=alert`; **F2 shows raw DB text** (TECHNICAL_HINTS gap).
- Dashboard STORE HEALTH 24% Grade F + checklist at correct counts.

## 16. Tenant isolation (Phase 15)

- Storefront cross-tenant leakage: none observed (A↔B). 
- Direct DB-ID/route swaps for another tenant's resources not swept in depth (no cross-tenant fetch tested beyond storefront) — **gap** (low risk given tenant-scoped queries + `requireTenant` in every page).

## 17. Direct-route / access control (Phase 12)

- `/agency`, `/super-admin` → login (role-guarded) ✓; `/admin/*` unauthenticated → login ✓; locked pages (`appearance`, `settings/domain`, `integrations`) correctly server-gated by capability for Launch ✓.
- Hidden-nav routes for Launch (`/admin/courses`, `/admin/bookings`, `/admin/games`, `/admin/settings/domain`, `/admin/integrations`): pages reachable via URL except domain/integrations which gate. Consistent with F7.

---

## 18. Final Summary Stats

| Metric | Value |
|---|---|
| Admin nav routes swept (Launch) | 27 — all 200, 0 page/console errors |
| Direct-route / guard matrix | 6 routes — all correct (3 guards verified) |
| Builder sections rendered | 6/6 (Launch, matches DB); Growth loads clean |
| Content features create+persist tested | 5/5 (Product, Service, Testimonial, FAQ, Milestone) |
| DB sources verified for content | 4 models/settings keys (Product, Offering, Setting×2, TimelineEvent) |
| Content-limit enforcement verified | Product 3/3 blocked with user-visible error ✓ |
| Publish lifecycle tests | draft→live ×2, snapshot versions 1→3, usage 1→3, live-button-hide ✓ |
| Quota-exhausted UX | ✗ broken (F2) — blocked but wrong message |
| Storefront parity (published content) | ✓ products/timeline/hero/footer render from snapshot |
| Responsive overflow | 0 (storefront 320px, admin 390px) |
| Tenant isolation | ✓ no cross-tenant leakage (storefront) |
| **P0** | **0** |
| **P1** | **3** (F1 Save Identity broken; F2 quota-exhausted raw-DB UX; F3 settings/gallery crash for media tenants — dev-uncertain) |
| **P2** | **2** (F4 builder catalog leaks plan-blocked sections; F5 dashboard CTAs to locked pages) |
| **P3** | **4** (F6 appearance nav visibility mismatch; F7 ungated empty-state pages; F8 390px sidebar; F9 terse error copy) |
| Product gaps | 1 (F10 schema fragmentation) |
| Env/needs-prod-recheck | F3, F11, upload round-trip, 404 storefront, cross-tenant deep swaps |

## 19. Blockers & Recommended Follow-up

1. **Fix F1** (Settings Save Identity): drop `|| null` for the profile-picture fields (or `z.string().nullish()` in the schema); restore `handleSaveBackground` clear path. Blocks core hero editing for every creator.
2. **Fix F2** (publish quota UX): in `reserveSlot`, don't `create` when the row exists — read-then-decide (or catch P2002 and read usage *before* the create, or use `SELECT … FOR UPDATE` / upsert). Add `transaction`/`aborted` to `TECHNICAL_HINTS`. Re-verify the `PUBLISH_QUOTA_EXCEEDED` friendly message + upgrade CTA render.
3. **Verify F3** in a production build; if it reproduces, isolate the conditional-hook path in the media/hero subtree (settings + gallery are the two media-hosting pages).
4. Optional P2s: hide Courses/Games in the Launch Add-Section catalog; gate dashboard quick actions by capability; align nav-visibility with page gates.

**Audit artifacts (screenshots):** `screenshots/rccf-72.1-builder-launch.png`, `rccf-72.1-settings-identity.png`, `rccf-72.1-storefront-a-desktop.png`, `rccf-72.1-storefront-a-mobile.png`, `rccf-72.1-admin-mobile-390.png`. Temp scripts under `C:\Users\91866\AppData\Local\Temp\opencode\rccf721-*.js`.

**Note:** During the audit, test content was created on QA account A (products, service, testimonial, FAQ, milestone, CTA/badge text) and A was republished v1→v3 (lifetime quota now 3/3). No production/default-tenant data was touched.