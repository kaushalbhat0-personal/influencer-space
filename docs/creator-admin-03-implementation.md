# RCCF-CREATOR-ADMIN-03 — Integrations Build-out (Implementation)

- Scope: make `/admin/integrations` the canonical creator-facing integration surface and remove the Developer APIs card from Hero Settings.
- Builds on: `docs/creator-admin-03-audit.md` (report-only audit, §14 migration plan) and `docs/creator-admin-02-implementation.md` (§3 deferred item 1).
- Guardrails honoured: **no backend/schema/data-architecture changes**; existing `Tenant` fields remain the single source of truth; existing actions/services are reused where possible. No OAuth callback route was added in this pass.

---

## 1. WHAT CHANGED

### 1.1 `/admin/integrations` is now interactive (was read-only card grid)

`src/app/admin/integrations/page.tsx` renders a `FeaturePage` and delegates to a new client component `src/features/integrations/components/integrations-client.tsx`:

- **Card grid** (responsive, 1/2/3 columns) — one card per platform def from `integrationService.list()`.
- **Status badges per card** derived from real tenant state:
  - `connected` (YouTube: API key **and** channel ID present)
  - `configured` (Instagram: credential present)
  - `incomplete` (YouTube: only one of key/channel present — "needs attention")
  - `not_connected` (no tenant config)
  - `coming_soon` (Google Analytics / Meta Pixel — definition only)
- **YouTube card**: shows channel ID when connected; inline form for API key + channel ID; **Save** (reuses `updateApiKeys` + `updateSocialChannels`), **Manage**, **Disconnect** (reuses new `clearIntegration`), cancel.
- **Instagram card**: inline credential form (**Save** reuses `updateApiKeys`), **Manage**, **Disconnect**.
- **GA / Meta cards**: static "Coming soon" — no false connect affordances.
- Save/error messages are surfaced inline with `role="status"`; native `confirm()` guards disconnects.

### 1.2 Richer integration status in the service layer

`src/features/integrations/{types,service}.ts`:

- New `IntegrationStatus` union type; `IntegrationData` now carries `status` alongside the existing `connected` boolean (kept for backward compat).
- `getStatus()` computes per-platform status (see badges above).
- `getConfig()` for YouTube now also exposes `channelId` (read-only, for display) — **never** leaks the API key values.
- `isConnected()` tightened: YouTube requires **both** key and channel; Instagram requires the credential (previously YouTube treated key *or* channel as connected).

### 1.3 Scoped disconnect — new `clearIntegration` action

`src/actions/settings.actions.ts`:

- `clearIntegration(tenantId, platform)` — zod-validates platform ∈ {youtube, instagram}; guards tenant ownership; delegates to new `SettingsService.clearTenantIntegration`; revalidates `/admin/integrations`. Unsupported platforms return `{ success: false, error: "Unsupported integration" }`.
- Exported from `src/actions/index.ts`.

`src/services/settings.service.ts`:

- `clearTenantIntegration(tenantId, platform)` — **platform-scoped** `tenant.update`: YouTube clears `youtubeApiKey` + `youtubeChannelId`; Instagram clears `instagramApiKey`. Never touches hero/social-link data or unrelated tenant fields (e.g. Twitch, OAuth tokens).

### 1.4 `updateSocialChannels` no longer wipes unrelated channels

`src/actions/settings.actions.ts` — previously it built `rawData` with both `youtubeChannelId` and `twitchChannelId` defaulting to `""`, so saving one channel cleared the other. Now it only includes fields actually present in the submitted `FormData` (and trims), so saving YouTube never wipes Twitch and vice-versa. `revalidatePath("/admin/integrations")` added to the channel/key update actions.

### 1.5 Developer APIs card removed from Hero Settings

`src/features/settings/components/settings-form.tsx` and `src/app/admin/settings/page.tsx`:

- Removed the "Developer APIs" card (YouTube/Instagram key entry), its `apiKeysSave` state, `handleSaveApiKeys`, `updateApiKeys` import, and the `youtubeKeyConfigured` / `instagramKeyConfigured` props.
- Settings page header/subtitle reverted from "Hero & Integrations" to **"Hero"** (subtitle "Customize your hero section.").
- The page no longer fetches tenant API keys via Prisma.
- `/admin/integrations` is now the **only** creator-facing surface that writes `Tenant.youtubeApiKey` / `Tenant.instagramApiKey` — the RCCF-02 migration dependency is resolved. Social Links stays out (owned by `/admin/links`).

### 1.6 Tests

- `tests/unit/integrations-actions.test.ts` (new): `updateSocialChannels` partial-update behaviour, `updateApiKeys`, `clearIntegration` (success / unsupported platform / cross-tenant Forbidden).
- `src/features/integrations/__tests__/integrations.test.ts` (extended): connected/not-connected/incomplete YouTube states, Instagram configured, GA/Meta coming soon, scopes, null-tenant, and a **secret-leak guard** asserting config JSON never contains key values.

---

## 2. VERIFICATION (all green)

| Check | Result |
|---|---|
| `npx tsc --noEmit` / `npm run build` | ✅ no errors (build type-checks) |
| `npx vitest run src/features/integrations/__tests__/integrations.test.ts tests/unit/integrations-actions.test.ts` | ✅ 20 tests passed |
| `npm run lint` | ✅ warnings only — all pre-existing (logger imports, `setHeroSubtitle`) |
| E2E grep | ✅ no spec depends on the removed Developer APIs card, "Hero & Integrations" heading, or old settings page props |
| `tests/admin/*` legacy specs | ✅ not part of any Playwright project (testDir is `tests/e2e`) — no impact |

---

## 3. STILL DEFERRED (accurately documented)

1. **OAuth connect flow — deferred.** No `/api/auth/{provider}/callback` route was added. `exchangeCodeForToken` / `getDecryptedToken` in `src/lib/social-oauth.ts` remain uncalled from the UI. Connect is key-based only (YouTube API key + channel ID; Instagram credential).
2. **Google Analytics / Meta Pixel — definition-only.** Cards render "Coming soon"; no connect, no worker, no data. No false affordances shown.
3. **Twitch — no creator UI.** `clearIntegration` rejects non-{youtube,instagram} platforms; the Integrations page shows no Twitch card; `Tenant.twitchChannelId` has no UI writer. `updateSocialChannels` still supports `twitchChannelId` as a field, so wiring a Twitch card later is possible.
4. **OAuth-state validation / PKCE** — not applicable until a callback route exists (item 1).
5. **`socialStats` display** — cron still writes it, but no UI reads it; wiring per-card "last synced" is future work.
6. **Capability/plan gating** — nothing gates the Integrations surface or actions today (matches audit §9); no gate added in this pass.
7. **Dead code (`LiveMilestones` / `SocialApiService`)** — untouched; still zero consumers (audit §11). Options remain: wire to `socialStats` or delete.

---

## 4. GIT STATUS / VERIFICATION

- Repo: `influencer-space` @ branch `main`.
- This pass modifies existing files only (actions, service, types, settings page/form, integrations page, action barrel, tests) plus one new component directory and one new unit test file.
- RCCF-02 changes (nav regroup, dead-code removal, route deletions) are **also still uncommitted** in the working tree and interleave with this pass in `settings-form.tsx` / the settings page — commit scope should be agreed before committing (see §5 note in the conversation).
- No commits made in this pass (per working rules — commit only on explicit request).
