# RCCF-CREATOR-ADMIN-02 — Creator Admin Information Architecture / Cognitive Load Reduction (Implementation)

- Scope: `/admin/*`, `/builder` creator-facing navigation and route consolidation.
- Builds on: `docs/creator-admin-01-audit.md` (report-only audit).
- Guardrails honoured: **no backend/data-architecture changes**, no Integrations page build-out, `/lib/navigation/config.ts` (legacy) untouched because it is consumed by agency/super-admin layouts and unit tests (`tests/architecture/*`, `tests/unit/dashboard-platform*`).

---

## 1. WHAT CHANGED

### 1.1 Sidebar re-grouped to the target IA (`src/config/admin-nav.ts`)

7 groups / 33 items → **6 groups / 33 items**, one mental model per group, no duplicate labels:

| Group | Items | Diff vs baseline |
|---|---|---|
| (Dashboard) | Dashboard, Create Website | unchanged |
| **Content** | Hero, Gallery, Content Feed, Timeline, Testimonials, FAQ, Links, Games | Media Library removed from nav; Links moved here from Marketing |
| **Sell** | Products, Services, Courses, Orders, Customers, **Bookings**, **Payments** – soon | Bookings added (was orphan); Payments moved from Account with honest `soon` badge |
| **Design** | **Builder**, **Themes**, **Templates**, **Appearance**, Navigation, Sections | Builder shown once (footer duplicate removed); re-labelled from "Layout Builder / Theme Marketplace / Website Templates / Theme Settings / Section Headings" |
| **Grow** | Analytics, Messages, **Brand**, Goals | replaces "Marketing" + "Profile" split; knowledge page labelled **Brand** (was "Profile") |
| **Settings** | **Account**, SEO, Domain, Billing, Notifications, Integrations | profile page labelled **Account** (was "Profile") |

Route-to-href mapping is otherwise **unchanged** — no existing functionality was moved between routes; this pass relabels and re-groups only.

### 1.2 Builder entry de-duplicated
Removed the *footer* Builder link from `src/app/admin/_components/admin-sidebar.tsx` (the same link already existed in the Design group and the topbar). Contextual topbar + Design-group Builder links remain.

### 1.3 Social Links consolidated to `/admin/links`
Removed the duplicate "Social Links" card from `src/features/settings/components/settings-form.tsx` (card, `socialLinks` state, `SocialLinksEditor` import, unused `HeroSocialLink` import). `/admin/links` remains the single CRUD surface writing `hero_data.socialLinks` (unchanged).

### 1.4 Developer APIs card **kept** (migration dependency)
The "Developer APIs" card stays inside `/admin/settings` **intentionally**: the task says not to build the Integrations page. Removing the card now would destroy the only place creators can save YouTube/Instagram API keys. ⚠️ **Migration dependency:** when Integrations is built out, move this card's persistence (`updateApiKeys`, `Tenant.youtubeApiKey`/`instagramApiKey`) into `/admin/integrations` and remove the card. See §3. *(Resolved in RCCF-03: the card was removed once `/admin/integrations` became the functional surface.)*

### 1.5 Obsolete routes removed
- Deleted `src/app/admin/website/seo/` — stale placeholder that duplicated `/admin/seo` (canonical SEO lives at `/admin/seo`). Only inbound reference was the e2e page-object helper; updated `tests/e2e/pages/CreatorAdminPage.ts` `gotoSEO()` → `/admin/seo`.
- Deleted `src/app/admin/website/pages/` — truly orphaned (zero inbound references in src or tests); pointed users at the Builder.

### 1.6 Hidden from creator navigation (page kept, future)
- Removed "AI Assistant" from `CommandPalette` `DEFAULT_ITEMS` (creator ⌘K surface). `/admin/ai-assistant` still exists as a FUTURE page, but is no longer advertised to creators.
- `/admin/email` (coming soon), `/admin/media` (placeholder), `/admin/payments` (placeholder) remain reachable directly; only Media was *removed from the nav surface*.

### 1.7 Dead legacy code removed (verified zero consumers)
- `src/components/layout/DashboardShell.tsx` + its barrel export in `src/components/layout/index.ts`.
- `src/components/dashboard/{DashboardHero,QuickStartGuide,ProgressChecklist,HealthScore}.tsx`.

`src/lib/navigation/config.ts` (`CREATOR_NAV` etc.) was **NOT touched**: still consumed by agency layout + `tests/architecture/dashboard-platform*`.

---

## 2. VERIFICATION (all green)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ no errors |
| `npx vitest run` | ✅ 122 files / 2148 tests passed |
| `npm run lint` | ✅ warnings only — all pre-existing (confirmed `setHeroSubtitle` warning exists on baseline) |

Every `admin-nav.ts` href resolves to an existing route; the two deleted routes had no src consumers besides the updated test helper.

---

## 3. DEFERRED / MIGRATION DEPENDENCIES

1. **Integrations build-out** — ✅ **COMPLETE** (implemented in RCCF-03; see `docs/creator-admin-03-implementation.md`). `/admin/integrations` is now the **canonical creator-facing integration surface**:
   - The "Developer APIs" card has been **removed from Hero Settings** — the settings page is now purely "Hero" again (`/admin/settings` header + subtitle reverted).
   - YouTube + Instagram configuration (API key + channel ID) is now available on the Integrations page.
   - Existing `Tenant` persistence is retained — no schema change, no new model; the page reuses `updateApiKeys` / `updateSocialChannels` and adds a scoped `clearIntegration`.
   - `updateSocialChannels` no longer overwrites unrelated channel fields (saving YouTube no longer clears Twitch).
   - **OAuth remains deferred** (no callback route; key-based flow only). GA/Meta remain definition-only ("Coming soon"), and Twitch has no creator UI — see the 03 implementation report for the accurate deferred list.
2. **Themes / Templates / Appearance / Navigation / Sections** — kept as separate Design entries (not force-merged into Builder) per "Do NOT force Themes/Blueprints into Builder" constraint. They are co-located under Design for a coherent mental model; folding them into Builder remains a separate, higher-risk change (section-order parity — this repo has a prior defect class here, commit `769e813`).
3. **`/admin/website-ready`** — remains orphan-from-nav by design; it is a publish-state surface reachable from the dashboard status card and create wizard. Opening it widely is deferred (publish UX pass).
4. **`/admin/ai-assistant`** — page exists but is display-only and now hidden from ⌘K; wire it or delete it in a later pass.
5. **`/admin/bookings`, `/admin/payments`** — now visible in the nav (Bookings implemented; Payments honest `soon` badge). No backend changes made.

---

## 4. GIT STATUS / VERIFICATION

- Repo: `influencer-space` @ branch `main`, HEAD `91926be`.
- 13 files changed (+30 / −482); 1 new report.
- No commits made (per working rules — commit only on explicit request).