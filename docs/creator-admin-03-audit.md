# RCCF-CREATOR-ADMIN-03 — Integrations Architecture Audit (Report Only)

- Scope: `/admin/integrations`, `/admin/settings` (Developer APIs card), sync infrastructure, OAuth/token handling, capability/plan gating.
- Method: static code audit of current `main` source (HEAD `91926be`), including verification against the preceding audit (`docs/creator-admin-01-audit.md`).
- Constraint honoured: **no code changes, no commits, no design modifications.** Report only. Working tree files listed in §16 are pre-existing RCCF-02 changes, not from this audit.

---

## 1. VERDICT

**The Integrations page is NOT blank — it already renders real read-only status cards** driven by the existing `Tenant` storage layer. The premise of the 01 audit (empty `<></>` fragments from `integration-list.tsx` / `integration-item.tsx`, hidden behind an `integrations_catalog` feature flag) is **out of date / partially inaccurate** for the current source:

- `src/features/_shared/components/integration-list.tsx`, `integration-item.tsx`, and `integration-config-input.tsx` **do not exist in the current tree nor anywhere in git history**. The page uses `integrationService.list()` directly.
- There is **no `integrations_catalog` feature flag** anywhere in `src` (zero occurrences). The page is **not feature-gated** — it only runs `requireTenant()`.

**Core question answered:** A clean creator-facing Integrations UI can be built **as an evolution of the current page over the existing `Tenant` fields + `integrationService` + existing actions**. No new Integration model, no schema migration, and no new service abstraction is required. What is genuinely missing is **interaction**: connect/disconnect/manage buttons, an OAuth connect flow for Instagram/Twitch, and a home for the API-key entry that currently lives only in Hero Settings.

**The guidance to keep the "Developer APIs" card (RCCF-02) was correct** — it is currently the **only** functional creator-facing surface that writes `Tenant.youtubeApiKey` / `Tenant.instagramApiKey`.

---

## 2. CURRENT ARCHITECTURE

Three conceptually distinct layers coexist:

1. **Tenant storage (source of truth)** — `prisma/schema.prisma` `Tenant` lines 45–64:
   - `youtubeChannelId`, `twitchChannelId` (plain channel IDs)
   - `youtubeApiKey`, `instagramApiKey` (creator-supplied plaintext keys)
   - `instagramAccessToken` (Text, encrypted), `instagramRefreshToken` (Text, encrypted), `instagramTokenExpiry`
   - `twitchAccessToken` (Text, encrypted), `twitchRefreshToken` (Text, encrypted), `twitchTokenExpiry`
   - Relations: `socialStats`, `contentFeedItems`.

2. **Read/sync layer** — `src/features/integrations/{service,actions,types}.ts` + `src/app/api/cron/sync-socials/route.ts` + `src/lib/social-oauth.ts` + `src/services/social-api.service.ts`.

3. **Creator UI surfaces** — `/admin/integrations` (read-only list) and `/admin/settings` → "Developer APIs" card (the only writer).

The Onboarding/import path (`src/lib/providers/youtube/*`) is a **separate acquisition abstraction** that uses platform env `YOUTUBE_API_KEY` via `YouTubeApiService` — it is not tenant-level integration and is not in scope for the Integrations page.

---

## 3. INTEGRATION INVENTORY

**Definitions** (`src/features/integrations/service.ts`) — `INTEGRATION_DEFS` has exactly 4 entries:

| Platform | Connected check | Config check | Notes |
|---|---|---|---|
| **YouTube** | `youtubeApiKey` **and** `youtubeChannelId` | `youtubeApiKey` | sync via `fetchYouTubeStats`/`fetchYouTubeContent` |
| **Instagram** | `instagramAccessToken` | `instagramApiKey` | sync via access token (OAuth or key) |
| **Google Analytics** | — | — | definition only; no data, no worker, no connect |
| **Meta Pixel** | — | — | definition only; no data, no worker, no connect |

`integrationService.list(tenantId)` returns all 4 defs with a `connected` boolean and static `scopes`; `getConfig`/`isConnected` exist. `integrationService.list()` always returns 4 cards — `isEmpty` on the page is effectively always false.

**Supporting sync infrastructure (all live, none feature-gated):**
- `src/lib/social-oauth.ts` — `exchangeCodeForToken(provider, code, redirectUri, tenantId)` for Instagram/Twitch (READS `${PROVIDER}_CLIENT_ID` / `${PROVIDER}_CLIENT_SECRET` from env via computed accessor), encrypts tokens, stores on Tenant. `getDecryptedToken()` (returns null on missing/expired/decrypt-failure), `refreshToken()` (Instagram refresh GET; Twitch returns `null`).
- `src/lib/crypto.ts` — aes-256-gcm `encrypt`/`decrypt` with `TOKEN_ENCRYPTION_KEY`.
- `src/app/api/cron/sync-socials/route.ts` — bearer `CRON_SECRET`; BATCH_SIZE=5, cursor = `orderBy updatedAt asc` + explicit `updatedAt` bump (VALIDATION-05 fix present); per-tenant: YouTube (key+channelId), Instagram (decrypted token → fallback `instagramApiKey`), Twitch (decrypted token; else `refreshToken`); upserts `socialStats` and `contentFeedItem`; calls `afterContentChange`; records `persistedJobRuntime.recordCron`.
- `src/services/social-api.service.ts` — `getYouTubeStats(channelId)` (env `YOUTUBE_API_KEY`, ISR revalidate 3600 via fetchJson), `twitchToken()` (client-credentials grant). **No consumers** except the dead `LiveMilestones`.
- `src/components/public/LiveMilestones.tsx` — imports `SocialApiService`, **zero imports/consumers** → dead.

---

## 4. YOUTUBE

- **Auth model:** API key + channel ID (not OAuth). The cron explicitly comments "YouTube (API key — no OAuth needed)".
- **Creator setup:** `Tenant.youtubeApiKey` + `Tenant.youtubeChannelId`. The **channel ID has no creator UI** — there is no field for it. Grep found `updateSocialChannels` (action) can write `youtubeChannelId`, but **no component calls `updateSocialChannels`**. So a creator can paste a key but cannot set the channel ID anywhere in the UI → YouTube sync only works if the channel ID was written some other way (e.g., manually). **This is a genuine gap for the future UI.**
- **Key entry surface (sole functional):** `/admin/settings` → "Developer APIs" card (`settings-form.tsx` ≈ lines 420–460) — `youtubeApiKey` + `instagramApiKey` password fields → `updateApiKeys(tenantId, formData)` → `settings.actions.ts` zod-validated → `SettingsService.updateApiKeys`. Success flash "API keys saved successfully!".
- **Consumption:** cron `fetchYouTubeStats`/`fetchYouTubeContent` (lines ~365–383) use tenant key + channelId.
- **Import path (separate):** `src/lib/providers/youtube/{api,provider,cache,quota}.ts` — `YouTubeApiService` uses **platform env** `YOUTUBE_API_KEY` for onboarding URL import + site generation; unrelated to tenant key.
- **Env:** `.env.example:37` documents `YOUTUBE_API_KEY` as "Platform-level fallback key". `youtube-scraper.service.ts:47` also uses env key.

---

## 5. INSTAGRAM

- **Dual token path:**
  1. **OAuth (encrypted):** `exchangeCodeForToken("instagram", code, redirectUri, tenantId)` → `instagramAccessToken`/`instagramRefreshToken`/`instagramTokenExpiry` (all encrypted at rest with `TOKEN_ENCRYPTION_KEY`). `getDecryptedToken` prefers expiry check; quote: "if it fails, the admin must re-connect."
  2. **Plaintext key fallback:** `Tenant.instagramApiKey` typed in Developer APIs; cron falls back to it when no decrypted token.
- **Cron usage:** `getDecryptedToken({instagram})` → fallback `instagramApiKey` → `fetchInstagramStats`/`fetchInstagramContent` → upsert socialStats/contentFeedItem.
- **Gaps:**
  - **No OAuth callback route exists** — `src/app/api` contains auth/refresh-session, crons, health, media, platform/sync, support/search, test-storage only. `exchangeCodeForToken` has **zero callers** in src (verified grep).
  - `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` are **not documented in `.env.example`** (only `INSTAGRAM_ACCESS_TOKEN`, which is itself unused by any code path).
  - `refreshToken("instagram")` is implemented (GET `graph.instagram.com/refresh_access_token`) but only invoked by the cron for Twitch, not for Instagram.

---

## 6. TWITCH / OTHER

- **Twitch:** `Tenant.twitchChannelId` + encrypted token. Cron: decrypted token (else `refreshToken` — which returns `null` for Twitch per the code comment "client-credentials grant … no refresh grant"). `social-api.service.ts` has a Twitch client-credentials token flow (env `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET`, documented in `.env.example:39-40`). **No creator UI writes** `twitchChannelId` (only the unused `updateSocialChannels` action does). No `TwitchStats` is read by any UI. The `LiveMilestones` component that would consume it is dead.
- **Google Analytics / Meta Pixel:** definitions + scopes only; never connected, no worker, no config persistence anywhere. They render as "not connected" on the current page.

---

## 7. SURFACES

| Surface | Source | Reads | Writes | Gated |
|---|---|---|---|---|
| `/admin/integrations` (nav: Settings → Integrations) | `src/app/admin/integrations/page.tsx` | `integrationService.list` | — (read-only) | `requireTenant()` only — **no feature flag** |
| `/admin/settings` "Hero & Integrations" | `settings-form.tsx` Developer APIs card | `youtubeKeyConfigured`/`instagramKeyConfigured` from settings page | `updateApiKeys` | **no feature gate** |
| Content Feed manager | `src/app/admin/settings/content/page.tsx` → `content-feed.actions.ts` | socialStats/contentFeedItem | pin/hide/delete feed items only | `requireAuth` |
| Onboarding | import flow | — | — | copy text only ("connect more profiles later from Settings.") |
| Dashboard / Builder | `features/dashboard`, `features/builder` | — | — | no integration controls at all |
| `src/app/dev/commerce` (+ super-admin tooling) | capability registry | — | — | dev-only |

---

## 8. FLAGS

- **No `integrations_catalog`** feature flag exists in `src` (0 matches). The only platform flag consumer is `isFlagEnabled("maintenanceMode")` via `src/lib/platform/platform-config.ts` (prisma `platform_config` setting on the first tenant). `getPlatformConfig`/`isFlagEnabled` are the only real flag mechanism in the repo.
- The 01 audit's claim that `/admin/integrations` is "feature-flagged" (via `featureService.getFeatureState()`) **is not present in the current code**. Nothing gates the page.
- `src/features/integrations/actions.ts` → `listIntegrations()` is exported but the page uses `integrationService.list()` directly (bypassing the action).

---

## 9. AUTH MODELS

- Creator surfaces use `requireTenant` / `requireAuth` (session-based, server-side).
- Sync cron uses `CRON_SECRET` bearer.
- **No OAuth callback route → no OAuth redirect/state validation exists.** `exchangeCodeForToken` would accept a raw code server-side with no PKCE/state check.
- No capability/plan check on any integration surface or action: `updateApiKeys`, `updateSocialChannels`, `listIntegrations`, and the sync cron are ungated (grep for `isFeatureEnabled|hasPlanFeature|entitle|requirePlan|api_integrations` in `settings.actions.ts`, `settings/page.tsx`, `sync-socials/route.ts` all empty).

---

## 10. DATA OWNERSHIP

- **`Tenant` fields are the single source of truth** for keys/tokens/channel IDs.
- `socialStats` (written only by cron, `route.ts:284`) — **no UI reads it anywhere** (grep: only writer is the cron). Data currently lands but has zero consumers.
- `contentFeedItem` — written by cron, read/managed by Content Feed manager (pin/hide/delete). No channel-config surface.
- `hero_data.socialLinks` / brand `socialLinks` — separate (social link-in-bio), out of scope.
- Env-level platform keys (`YOUTUBE_API_KEY`, Twitch credentials) belong to the platform, not tenants — used only by import scraper, disabled-service flows, and Twitch client-credentials.

---

## 11. SERVICES / ACTIONS

**Reusable as-is for the future UI:**
- `src/actions/settings.actions.ts`
  - `updateApiKeys` (zod: `apiKeysSchema` → `youtubeApiKey`, `instagramApiKey`; writes via `SettingsService.updateApiKeys`). ⚠️ **Note:** the Developer APIs card is the *only* caller today.
  - `updateSocialChannels` (zod includes `twitchChannelId`, `youtubeChannelId`; writes via `SettingsService.updateTenantChannels`) — **fully implemented but has zero UI callers.** This is effectively a hidden, ready-to-wire action.
- `src/features/integrations/service.ts` — `integrationService.list/isConnected/getConfig` + `INTEGRATION_DEFS`.
- `src/features/integrations/actions.ts` — `listIntegrations` (session-checked wrapper).
- `src/lib/social-oauth.ts` — `exchangeCodeForToken`, `getDecryptedToken`, `refreshToken` (incomplete for Twitch; Instagram needs a caller).
- `src/lib/crypto.ts` — encrypt/decrypt (used by oauth + cron).
- `src/services/settings.service.ts` — `updateApiKeys`, `updateTenantChannels`.

**Not needed / do not use:**
- `SocialApiService` (`getYouTubeStats` ISR-cached, `TwitchStats`) — no live consumers; `LiveMilestones` is dead.
- `youtube-scraper.service.ts` — import side, out of scope.
- Any new `Integration` model / repository — existing Tenant fields suffice.

---

## 12. ERROR / SECURITY

- **Encryption at rest:** tokens encrypted aes-256-gcm with `TOKEN_ENCRYPTION_KEY` (`.env.example:23`). Plaintext `instagramApiKey` fallback is a deliberate downgrade path — acceptable but should be surfaced honestly in the UI when a decrypted token also exists.
- `getDecryptedToken` handles missing/expired/bad-decrypt gracefully (returns null).
- `exchangeCodeForToken` throws informative errors on missing env config / failed exchange.
- **Not covered:** no rate limiting on `updateApiKeys`, no audit log of connect/disconnect, no prompt for OAuth re-connect when expiring (UI-level), `INSTAGRAM_CLIENT_ID/SECRET` not in `.env.example`.
- Cron swallows per-tenant errors per-provider (skips failures) — good; whole-batch only fails on query errors.

---

## 13. CANONICAL UX (proposal) — nothing built, reference only

A future build-out should keep **one** reading home (the current card grid at `/admin/integrations`) and add interaction in place:

- Each card → **Connect / Manage / Disconnect**.
- YouTube: show key-configured + channel-ID state; allow entering channel ID (wire existing `updateSocialChannels`). Connect = developer-API-key flow (key + channelId).
- Instagram: **OAuth "Connect with Instagram"** → new `/api/auth/{provider}/callback` route calling the existing `exchangeCodeForToken`, with state/redirect validation added; show "Connected as @handle" + expiry + Reconnect. Fallback: paste API key (existing field).
- Google Analytics / Meta Pixel: keep as "Coming soon" defs, or drop from the grid, rather than claim false scopes.
- Move Developer APIs card out of Hero Settings **only when** the above input surface lands (RCCF-02 already flags this as the migration dependency).
- Surface last-sync status per card (data already written by cron into `socialStats`/`contentFeedItem`).

---

## 14. MIGRATION PLAN (deferred — do NOT execute in this audit)

1. Keep current `/admin/integrations` read-only list; add `listIntegrations` (or keep direct service call) + a per-platform status summary (key vs OAuth vs none).
2. Add manage interactions on the page reusing existing actions only: `updateApiKeys` (YouTube/Instagram keys), `updateSocialChannels` (channel IDs). No new persistence.
3. Add OAuth connect route only if Instagram OAuth is to be activated: new `GET /api/auth/instagram/callback` + state validation; reuse `exchangeCodeForToken`; document `INSTAGRAM_CLIENT_ID/SECRET` in `.env.example`.
4. Remove Hero "Developer APIs" card and route settings-page reads of `youtubeKeyConfigured`/`instagramKeyConfigured` to the Integrations page.
5. Optional: wire `LiveMilestones` to `socialStats` or delete it; register `contentFeedItem` readers.
6. Gate the whole surface behind a real capability/plan flag **if** required (currently nothing gates it and plans already expose `social_integrations`/`api_integrations`/`api_access`).

No schema migration required at any point — all fields already exist on `Tenant`.

---

## 15. KEEP / REUSE / MOVE / HIDE / BUILD / DEPRECATE / FUTURE

| Item | Action | Basis |
|---|---|---|
| `/admin/integrations` read-only card grid | **KEEP + BUILD ON** | correct pattern; only interaction is missing |
| `integrationService.list` + `INTEGRATION_DEFS` | **REUSE** | canonical definitions |
| `updateApiKeys` + `SettingsService.updateApiKeys` | **REUSE** | only working writer of keys |
| `updateSocialChannels` / `updateTenantChannels` (channel IDs) | **REUSE (wire into UI)** | implemented, zero UI callers today |
| Developer APIs card in Hero Settings | **KEEP temporarily → MOVE** after §14.4 | only functional key entry; do not remove yet (RCCF-02 reasoning) |
| `exchangeCodeForToken` + `getDecryptedToken` | **REUSE** for OAuth connect | backend exists, no route/caller |
| `refreshToken` | **REUSE** (Instagram); **fix/flag** for Twitch | Twitch returns null by design |
| `socialStats` write | **KEEP** (future display); currently unread | already produced by cron |
| `SocialApiService` + `LiveMilestones` | **DEPRECATE/REUSE-later** | zero consumers; either wire to socialStats or delete |
| `Google Analytics` / `Meta Pixel` defs | **HIDE or drop** | definition-only, no worker/data |
| `integrations_catalog` flag | **DO NOT add** | no flag mechanism exists for it; nothing gates the page now |
| `youtube-scraper.service.ts` / `providers/youtube/*` | **KEEP** untouched | import/acquisition, out of scope |

---

## 16. GIT STATUS / VERIFICATION

- Repo: `influencer-space` @ `main`, HEAD `91926be`.
- `git status --short` before/after this audit is **identical** — the 13 modified/deleted files + 2 untracked docs are the **pre-existing RCCF-02 changes** (nav regroup, obsolete-route deletions, dead-component removal; no new modifications from this audit). No new files except this report.
- No lint/typecheck/test run performed — **no code changed**; this is static analysis only.
- Tools used: Grep/Read/Select-String across `src`, `prisma`, `tests/e2e`, `.env.example`, `docs/*`.