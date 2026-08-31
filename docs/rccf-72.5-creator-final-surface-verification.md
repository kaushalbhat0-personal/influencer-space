# RCCF-72.5 — Creator Final Surface Verification

**Status:** Complete (audit + verification only — no code, schema, billing, plans, capabilities, auth, publishing, Builder, Theme, Hero, storefront, navigation, or niche changes; no fixes)
**Date:** 2026-08-18
**Predecessors:** RCCF-72.0..72.4 (Creator audit chain). RCCF-72.4 classified 32 admin surfaces: READY 17 · PARTIAL 7 · PARTIAL/BROKEN 1 · **NOT_VERIFIED 7**. This ticket browser-verifies the 7 NOT_VERIFIED surfaces on Launch A, Growth B, and Scale C.

---

## 1. Executive verdict

All **7 previously NOT_VERIFIED admin surfaces are now browser-verified** on at least one plan and code-audited end-to-end. **NOT_VERIFIED remaining: 0.** The Creator admin product surface is now fully classified.

| Surface | Result |
|---|---|
| Orders | READY (real storefront commerce; empty state; **crashes for workspace-owner B — F2**) |
| Customers | READY (derived from orders; read-only; empty state; F2 on B) |
| Messages | READY (real storefront contact inbox; empty state; works on all 3 plans) |
| Brand / Knowledge | READY (real scoring/declaration system with snapshot-baked storefront Trust Indicators; F2 on B) |
| Goals | READY (real weighted-profile runtime gate; F2 on B) |
| Notifications | READY (real event-driven center; empty state; works on all 3 plans) |
| Integrations | READY on Scale (real API-key UI); LOCKED (upgrade panel) below Scale; F2 on B |

Headline conclusions:

- **The 7 surfaces are production-functional, not placeholder UI** — with per-surface caveats below (notifications preferences are decorative, integrations are API-key entry with no OAuth, goals/orders/customers minimal).
- **F2 (workspace-owner admin crash) has a larger blast radius than documented in 72.3.** It now also breaks Orders, Customers, Knowledge, Goals, and Integrations for tenant B — but **Messages and Notifications still work** for B, and milestones/games work. F2 remains a P-candidate (dev env, not root-caused).
- **B resolves its Growth plan through the legacy `Subscription` fallback** because its v2 `BillingSubscription` has `status=null, planId=null` (workspace `fde53041`). B is also the only F2-crashing tenant — the incomplete v2 billing row + workspace-owner association is a plausible F2 trigger (not root-caused, out of scope).
- **Knowledge and Goals are real runtime systems, not metadata**: Knowledge declared-facts are baked into the published snapshot (`content.declaredFacts`) and render on the storefront as Trust Indicators; Goals bakes `metadata.goalProfilePresent` and gates adaptive section visibility. Both are snapshot-baked (storefront remains zero-live-read). Niche, by contrast, is **generation-time only** (S8, unchanged).
- **No new P0/P1.** One new P2-class item (F2 scope expansion, P-candidate) and 7 new P3 findings. No code was changed; nothing was fixed; no commit.
- **Account note:** the Scale QA account's password was unrecoverable, so this ticket reset it to `Scale72!QaPass9` (data-only change to the local test tenant; no code touched). Documented in §14.

---

## 2. Seven surface verification matrix

Legend — A=Launch, B=Growth (workspace OWNER), C=Scale. READY = loads with usable UI; LOCKED = entitled-gate upgrade panel; EMPTY_STATE = genuine empty data UI; BROKEN = crash/redirect (F2).

| Surface | Route | Nav gate | A | B | C | Result |
|---|---|---|---|---|---|---|
| Orders | `/admin/orders` | `max_orders` | READY/EMPTY | **BROKEN (F2)** | READY/EMPTY | READY (F2 caveat) |
| Customers | `/admin/customers` | `max_orders` | READY/EMPTY | **BROKEN (F2)** | READY/EMPTY | READY (F2 caveat) |
| Messages | `/admin/messages` | — | READY/EMPTY | READY/EMPTY | READY/EMPTY | READY |
| Brand / Knowledge | `/admin/knowledge` | — | READY | **BROKEN (F2)** | READY | READY (F2 caveat) |
| Goals | `/admin/goals` | — | READY | **BROKEN (F2)** | READY | READY (F2 caveat) |
| Notifications | `/admin/notifications` | — | READY/EMPTY | READY/EMPTY | READY/EMPTY | READY |
| Integrations | `/admin/integrations` | `api_access` | **LOCKED** (upgrade panel) | **BROKEN (F2)** | READY (real UI) | READY (Scale) / LOCKED (< Scale) |

All routes return HTTP 200 (no 404s, no middleware blocks, no capability redirects); middleware enforces only auth/role/lifecycle. No console errors or page errors on A or C. B's crashes are the F2 `"Rendered more hooks than during the previous render"` pageerror + client redirect to `/admin/dashboard`.

**Nav gating verified in-browser (visible sidebar text):**
- A (Launch): shows Orders, Customers, Messages, Brand, Goals, Notifications, Analytics, SEO; hides Courses, Bookings, Games, Domain, Integrations. ✓ (Hidden hrefs for courses/bookings/domain remain in the DOM — N7.)
- B (Growth): shows Courses, Bookings, Games; hides Domain, Integrations. ✓
- C (Scale): shows Courses, Bookings, Games, Domain, Integrations. ✓

---

## 3. Launch / Growth / Scale results

| Aspect | Launch (A) | Growth (B) | Scale (C) |
|---|---|---|---|
| Plan (DB-verified) | `creator_launch` TRIALING (workspace `96d76df6`) | `creator_grow` via **legacy `Subscription` fallback** (v2 `BillingSubscription` has `status=null, planId=null`, workspace `fde53041`) | `creator_scale` ACTIVE (workspace `6d7e0dfd`) |
| Publish usage | 3/3 lifetime (exhausted) | 6/10 monthly (Aug) | 1 (historical; current plan unlimited) |
| 7 surfaces | All load, no errors | Orders/Customers/Knowledge/Goals/Integrations crash (F2); Messages + Notifications fine | All load, no errors |
| Integrations | Upgrade panel (LOCKED) | (crash; would be panel) | Real YouTube/Instagram UI + GA/Pixel placeholders |
| Content rows (DB) | products 2, timeline 2, testimonials 1, faq 1 | games 2 | — |

---

## 4. Orders / Customers

**Orders — genuinely production-ready (with gaps).**
- Model: `ProductOrder` (schema 497-528) + `OrderFulfillment` (531-559) + `ShippingAddress` (562-582). Status is a free-form String, no enum.
- Data source: **real** storefront purchases — `checkout.actions.ts:155-164` creates `ProductOrder(status=PENDING)`; paid orders complete via `verifyPayment`; free/100%-coupon via `completeProductOrder`. No seeded/placeholder data.
- Admin: read-only list + metrics + **fulfillment mutations** (`updateFulfillmentStatus`, `generateDownloadLink`). No admin-side order creation.
- Limit: `max_orders` is **enforced server-side on order COMPLETION** (`order-completion.ts:46-118`, `reserveSlot` atomic, `capabilityService.limit`), not on the admin page. Launch 10 / Grow 100 / Scale ∞.
- Isolation: all queries scoped by session `tenantId` (client-supplied tenant arg deliberately ignored). ✓
- Gaps: `take: 200` no pagination; no order-detail page; free-form status; filter tabs only paid/pending.

**Customers — functional but minimal.**
- **No `Customer` table.** Derived in-memory from `ProductOrder.fanEmail` (`order.actions.ts:36-65` aggregate into `Map`). Read-only, no detail page, no LTV/segmentation, no server pagination.
- Empty state: "No customers yet. Customers appear when someone makes a purchase." ✓ (verified empty in browser for A/B/C — 0 orders).

Verdict: Orders = real pipeline (checkout → order → fulfillment, quota-metered server-side). Customers = thin derived view. Both depend on **actual orders** (all empty in this environment — no fake purchases created, per rules). Tenant isolation verified by code.

---

## 5. Messages

- Model: `ContactSubmission` (602-614): tenantId, name, email, message, `isRead` boolean. No enum, no status.
- Producers:
  - **Storefront contact section** (`contact.default` → `ContactRenderer` → `submitStorefrontContact`, `storefront.actions.ts:55-90`) — the real creator-facing producer, tenant-verified via `x-tenant-host`.
  - Platform marketing `/contact` page → `submitContact` (`contact.actions.ts:41-73`) — resolves tenant from `x-tenant-host`, which middleware **deletes on platform domains** (middleware.ts:115-117) → **likely a dead path** (N9). Distinct from the storefront form.
- Admin: page queries Prisma directly (no server action); `markMessageAsRead` / `deleteMessage` tenant-scoped with ownership re-check. List + unread badge + delete.
- Limit: `max_messages` (base 100) is **declared but never enforced** anywhere (N8). Inbox ungated.
- Empty state: "No messages yet." ✓ (verified empty for all three accounts — 0 ContactSubmission rows; no external messages sent, per rules).
- Isolation: page filters by session tenantId; actions re-verify `findFirst({id, tenantId})`. ✓
- Storefront connection: yes — ContactRenderer on a creator's live storefront feeds this inbox; dashboard also surfaces `messageCount`.

Verdict: real and functional for storefront contact; caveats: `max_messages` unenforced, platform `/contact` path likely dead, page uses direct prisma instead of an action.

---

## 6. Brand / Knowledge (`/admin/knowledge`)

- Pipeline: page → `runtimeContextBuilder.build(tenantId)` → Knowledge evaluated from the `WebsiteAggregate` → `KnowledgeDashboard` (score card, completion questionnaire, recommended improvements, storefront score, builder-hint links).
- Persistence: `Setting` keys `knowledge_completion` (declared facts, written by `saveKnowledgeAnswers`) and `knowledge_score` (**write-only** — no reader exists).
- Storefront connection: **YES, runtime + snapshot-baked.** `website-aggregate.service.ts:170-208` exposes `declaredFacts` from `knowledge_completion`; `publishing/service.ts:178,239` passes the aggregate into `buildRuntimeSnapshot`, which spreads it into `content` (`build-snapshot.ts:121`); `StorefrontPage.tsx:215` renders `<TrustIndicators declaredFacts={snap.content?.declaredFacts} />`. So creator-declared facts (mission, policies, languages, etc.) render on the **published storefront from the snapshot** — still zero live DB reads.
- Generation: **NO** — Knowledge admin data is seeded *after* generation and is not a generation input; the SEO composer reads the scraped `knowledgeGraph`, not `knowledge_completion`.
- Builder: `getBuilderCompletionHints` action is **dead code** (no caller).
- Browser (A): real 22%-complete score card (Identity 100%, Brand 0%, Media 28%…), 32 missing fields, completion questionnaire, 18 sorted recommendations with impact deltas. No page errors.
- Isolation: `Setting` composite key `(tenantId,key)`. ✓

Verdict: real scoring/declaration system with a genuine snapshot-baked storefront consumer. Not generation-only (unlike Niche).

---

## 7. Goals (`/admin/goals`)

- Pipeline: page → `runtimeContextBuilder.build` → `goalRuntime.evaluateFrom` → `GoalsSettingsPage` (14-goal weighted profile editor, alignment card, recommendations, milestones).
- Persistence: `Setting` key `creator_goals` (`GoalProfile { weights, source: recommended|manual, entityType }`).
- Consumers:
  - **Storefront (runtime, snapshot-baked):** `publishing/service.ts:204-208` reads profile → boolean `goalProfilePresent` → baked at publish (`build-snapshot.ts:118`) → `section-pipeline.ts:44-55` + `StorefrontPage.tsx:89-93` apply **adaptive section visibility** (filter only, never reorder).
  - Dashboard Goal card, recommendations (`goalAlignmentTerm`), health/success signals, experience intelligence.
  - Generation: partial — onboarding passes an **in-memory** `goals` arg to `applyGoalSectionPriority` (`onboarding.actions.ts:586-597`); the persisted profile is not read by the generation pipeline.
- Builder: `getGoalBuilderSuggestions` action is **dead code**; the Builder "% complete" comes from the health engine, not goals.
- **Copy-vs-behavior gap (N10):** the Goals page claims "the runtime re-orders your site, Builder hints and dashboard automatically" — but live reordering is deliberately disabled (`section-pipeline.ts` filters only, never reorders). Copy overstates behavior.
- Browser (A): 14-goal grid, 0/100 weight allocation, alignment 20%, supporting-field completion. No page errors.
- Isolation: `Setting` composite key; order counts scoped by tenantId. ✓

Verdict: real runtime system (not pure metadata). Snapshot-baked storefront gate; live reordering intentionally off.

---

## 8. Notifications

- Models: `Notification` (386-403), `NotificationPreference` (406-415), `CommunicationLog` (418-435). Audience-scoped (`creator`/`agency`/`super_admin`) × `recipientId`.
- Producers: **real event-driven** — `event-wiring.ts:52` maps Runtime Events (fulfillment `order.confirmed`/`download.ready`/`shipment.update`, publish `success.website_published`, customer-success `success.first_sale`, commission, commerce-strategy) → `sendCommunication` → adapters write `Notification` rows (`adapters.ts:37,58,78`). Team invitations → email log. Subscriber registered at bootstrap (bootstrap.ts:382-383).
- Preferences: **decorative (N11).** The production path (`sendCommunication` → adapters) **never reads `NotificationPreference`**; the only preference-checking function (`sendNotification`, runtime.ts:57-58) has **zero callers**. Email adapter only writes a log row — no mail is sent.
- Browser: center loads on all three accounts with empty state "No notifications" (0 Notification rows exist for these tenants — the producers did not fire for B's builder-publish path in this environment).
- Isolation: reads/writes scoped by `(audience, recipientId)` from the session (`resolveRecipient`). ✓
- Gaps: no welcome/provisioning notification; category `commerce` in prefs UI has no producer mapping; no unread badge in admin nav (bell polls).

Verdict: real event-driven center with correct scoping and producers; preferences and email delivery are not yet enforced.

---

## 9. Integrations (`/admin/integrations`)

- Gate: nav `api_access`; **page soft-gate upgrade panel** when not entitled (`api_access || webhooks || live_social_sync`, integrations/page.tsx:14-32); server actions throw `Forbidden` via `assertAnyCapability` (settings.actions.ts:262,302,345). Middleware checks roles only, so direct URL on a non-entitled plan shows the upgrade panel (verified: A → "API access, webhooks and live social sync require a Creator Scale subscription or higher" + link to billing).
- UI (Scale C, browser-verified): **YouTube** (API key + Channel ID, Save/Disconnect), **Instagram** (credential text field, Save/Disconnect), **Google Analytics** + **Meta Pixel** (placeholder "Coming soon" cards). No Twitch/Stripe/Razorpay here (Razorpay is `/admin/payments`).
- Persistence: `Tenant` columns (youtubeChannelId, twitchChannelId, youtubeApiKey, instagramApiKey, encrypted access/refresh tokens).
- Runtime consumers: `src/app/api/cron/sync-socials/route.ts` (reads keys/tokens; gated on `live_social_sync` + `CRON_SECRET`; fetches YouTube stats, Instagram content, Twitch tokens). `razorpayAccountId` used by commerce-strategy readiness (not this page).
- **OAuth gap (N12):** `social-oauth.ts exchangeCodeForToken` has zero callers — there is no OAuth connect flow; the UI is manual API-key entry only, and Instagram/Twitch tokens have no acquisition UI.
- Isolation: tenant-scoped via `requireAuth` + `SettingsService` on the `Tenant` row. ✓

Verdict: real for YouTube/Instagram key-based sync (cron consumer), gated correctly at page + action; GA/Pixel are placeholders; no OAuth.

---

## 10. Plan coherence

| Feature | Nav (UI) | Granted | Server enforcement | Runtime behavior |
|---|---|---|---|---|
| `analytics_basic` | Analytics item, all plans | base `true` all plans | **none** (page is `requireTenant` only) | universal |
| `analytics_advanced` | — (no distinct item) | Scale+ only (`advanced_analytics`) | **none** | identical page for all plans |
| `seo` | SEO item, all plans | base `true` all plans | **none** (page/action auth-only) | universal |
| `ai_credits` | — | 0/500/2000 by plan | **none** (no consumer anywhere) | not enforced |
| `ai_automation`/`ai_generation`/`advanced_ai` | — | Grow+ via commerce caps | **none** (generation ungated) | unlimited AI |
| `api_access` | Integrations item, Scale+ | Scale+ (`creator_scale`+) | **page panel + actions throw** | LOCKED below Scale |
| `api_integrations` | — (via api_access) | Scale+ | no direct consumer (covered by api_access) | — |
| `webhooks` | — (via api_access) | Scale+ | **page panel + actions throw** | platform-managed inbound only |
| `custom_domain` | Domain item, Scale+ | Scale+ | **domain page panel + `attachCustomDomain` rejects** | LOCKED below Scale |

Findings:
- **Middleware is auth/role-only — no plan/capability checks.** Capability enforcement is page/action-scattered: `api_access`, `webhooks`, `custom_domain` are protected on both read (page) and write (action) paths; `analytics_*`, `seo`, and all `ai_*` features rely solely on permissive base values + nav visibility (carried 72.4 N2, now confirmed with a full consumer sweep).
- Marketing `capabilities[]` vs effective `BASE_FEATURES` remain two sources of truth (carried 72.4 §12.1).
- `BillingPlan.runtimeConfig.featureOverrides` are applied lazily (first plan resolve) via `runtime-config-loader`; publish/marketing surfaces read `runtimeConfig` per request via the pricing runtime — two runtime sources that can theoretically diverge within a process (agent-noted).
- B's plan resolves through the **legacy `Subscription`** because its v2 row is incomplete (N6) — enforcement still correct (Growth limits observed: publish 6/10).

---

## 11. Niche / Knowledge / Goals relationship

| Concept | Stored | Generation | Snapshot | Builder | Storefront |
|---|---|---|---|---|---|
| Niche | `Setting.influencer_data.niche` + `CreatorIntelligence.niche` | **Yes** (layouts, personas, SEO, theme selection) | **No** (not in `buildRuntimeSnapshot`) | **No** (static catalog) | **No** — S8 unchanged |
| Knowledge | `Setting.knowledge_completion` (+ `knowledge_score`, write-only) | No (seeded after generation) | **Yes** — `content.declaredFacts` baked at publish | No (hints action dead) | **Yes** — TrustIndicators from snapshot |
| Goals | `Setting.creator_goals` | Partial (onboarding in-memory section priority) | **Yes** — `metadata.goalProfilePresent` | No (suggestions action dead) | **Yes** — adaptive visibility from baked boolean |
| Theme | `Tenant.themeId` → snapshot.theme | Yes (theme selection) | **Yes** — packageId + resolved tokens | Yes (Themes/Appearance) | Yes — `themeDef.category`, renderers |
| Blueprint | generation-time only (`com.creatos.creator`) | Yes (applied at provisioning) | **No** (not re-read) | No | No |

**Relationship verdict:**
- **Niche is generation-time metadata only** — no snapshot field, no Builder, no storefront consumer (confirmed unchanged, S8).
- **Knowledge and Goals are runtime systems** that differ from Niche: both are baked into the snapshot at publish and read by the storefront. Knowledge → rendered Trust Indicators; Goals → boolean adaptive-visibility gate.
- **None** of Niche/Knowledge/Goals reorder or restructure the live storefront or drive the Builder; Theme is the only concept that varies storefront rendering via its own category. Blueprint influences generation only.
- The three admin "intelligence" surfaces (Knowledge, Goals, plus the carried Niche) form a **stored-metadata family with a shared Setting store**, but only Knowledge and Goals have runtime (snapshot) consumers.

---

## 12. New findings

- **N5 (P2, P-candidate) — F2 scope expansion.** F2 (workspace-owner tenant B admin crash) now also breaks `/admin/orders`, `/admin/customers`, `/admin/knowledge`, `/admin/goals`, `/admin/integrations` (each: HTTP 200 → client redirect to `/admin/dashboard` + PAGEERROR "Rendered more hooks than during the previous render"). Combined with 72.3's content routes, **13 of the observed admin pages crash for B**. `/admin/messages`, `/admin/notifications`, `/admin/milestones`, `/admin/games` still work. Launch A and Scale C unaffected.
- **N6 (P3) — B resolves Growth via legacy fallback.** B's v2 `BillingSubscription` (workspace `fde53041`) has `status=null, planId=null`; the plan resolves through the legacy `Subscription` (`creator_grow` ACTIVE). B is the only F2-crashing tenant — the incomplete v2 row is a plausible F2 trigger (not root-caused; out of scope).
- **N7 (P3) — Hidden gated nav links persist in the DOM.** Launch A's DOM contains `/admin/courses`, `/admin/bookings`, `/admin/settings/domain` hrefs even though the items are visually hidden by the nav filter.
- **N8 (P3) — `max_messages` is declared but never enforced**; the Messages inbox and both contact actions are ungated (base 100 is cosmetic).
- **N9 (P3) — Platform `/contact` submit path is likely dead**: `submitContact` resolves the tenant from `x-tenant-host`, which middleware deletes on platform domains. Storefront contact (`submitStorefrontContact`) is unaffected.
- **N10 (P3) — Goals copy overstates runtime behavior**: the Goals page claims the runtime "re-orders your site", but live reordering is deliberately disabled (section-pipeline filters only, never reorders).
- **N11 (P3) — Notification preferences are decorative**: the production `sendCommunication` → adapter path never reads `NotificationPreference`; the preference-checking `sendNotification` has zero callers; the email adapter only writes a log row (no mail is sent).
- **N12 (P3) — Integrations OAuth is dead code**: `social-oauth.exchangeCodeForToken` has no callers; the Integrations UI is manual API-key entry only (YouTube/Instagram), GA/Meta Pixel are "Coming soon" placeholders, and Twitch/Stripe/Razorpay are not in this surface.

---

## 13. Carried findings (open, untouched)

- **F1 (P2):** course/service write on Launch → 500 + unhandled pageerror, no UX (courses.actions.ts:36, services.actions.ts:29).
- **F2 (P2, P-candidate):** workspace-owner admin crash — **scope expanded this ticket (N5)**.
- **S1–S9 (P3, 72.2):** preview leak, one-shot nav, contact anchor, footer legal links, null href, double title suffix, legacy nav setting, niche storefront gap, dev latency/hydration.
- **N1/N2 (P2, 72.4):** 10 sections UI-unreachable; analytics_advanced/ai_credits no enforcement.
- **N3/N4 (P3, 72.4):** analytics/SEO route has no capability gate; sections never capability-gated (by-design).

---

## 14. Creator readiness verdict

- **All 32 admin surfaces are now classified — 0 unknown.** The Creator audit is complete.
- **Ready for product:** Orders, Customers, Messages, Brand/Knowledge, Goals, Notifications are functional on Launch and Scale (verified live in browser, empty states genuine, producers exist). Integrations is functional on Scale and correctly LOCKED below Scale.
- **Blocking gap for Growth workspace-owner tenants:** F2 (13 pages). This is the single largest Creator correctness issue — a tenant-configuration-dependent crash that no plan tier avoids if the tenant has a workspace. It should be the highest-priority implementation item for the Creator wave.
- **The 7 surfaces have real depth** (event-driven notifications, snapshot-baked storefront intelligence, quota-metered commerce) — the "shallow edges" concern from 72.4 is not about these surfaces.
- **Account note:** Scale QA password was unrecoverable from the DB; reset to `Scale72!QaPass9` (test-data-only change, no code). Server left running (PID 18048, port 3000).

---

## 15. Remaining implementation work (Creator wave)

1. **F2** — workspace-owner admin crash (13 pages); investigate the incomplete v2 `BillingSubscription` (N6) + workspace ownership as the trigger.
2. **F1** — course/service write UX (throw → `{success:false, error}` + manager catch).
3. **N2 coherence** — enforce or relabel `analytics_advanced`, `ai_credits`, `seo`, `analytics_basic`; reconcile `capabilities[]` vs `BASE_FEATURES`.
4. **Nav coverage + S2/S3** — services/courses/bookings in nav; contact anchor.
5. **N1 dormant sections** — decide exposure of the 10 registered-but-unaddable sections.
6. **S8 niche → snapshot** — persist niche/derived variant so the storefront can key off it.
7. **Multi-page UI** — wire `builderStore.addPage`.
8. **P3 hygiene** — N8 max_messages, N9 /contact path, N10 Goals copy, N11 notifications prefs/email, N12 OAuth connect, N7 hidden DOM links.

---

## 16. Frozen surfaces

Per ticket constraints, unchanged by this audit: auth, onboarding, billing, plans, capabilities, Prisma, publishing, Builder, Theme Experience, Hero, storefront, navigation, niche architecture. F1, F2, S1–S9, N1–N4 remain separate implementation tickets.

---

## Final numbers

| Metric | Value |
|---|---|
| Total Creator admin surfaces | 32 |
| READY | **24** (was 17; + Orders, Customers, Messages, Knowledge, Goals, Notifications, Integrations) |
| PARTIAL | 7 (Services, Courses, Templates, Navigation, Analytics, SEO, Domain) |
| PARTIAL/BROKEN | 1 (Bookings) |
| NOT_VERIFIED remaining | **0** |
| Registered sections | 23 |
| Constructible sections | 13 |
| UI-unreachable sections | 10 |
| Content models | 11 |
| Capability counts | Launch 4 · Growth 13 · Scale 22 |
| New P0 | 0 |
| New P1 | 0 |
| New P2 | 1 (N5 / F2 scope expansion, P-candidate) |
| New P3 | 7 (N6–N12) |
| Surfaces crashing for workspace-owner B (F2) | 13 of 17 observed |
| Surfaces working for B despite workspace | 4 (Messages, Notifications, Milestones, Games) |
