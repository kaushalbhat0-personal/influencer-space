# RCCF-72.8 — Creator Remediation Consolidation Audit

**Status:** Complete (audit + consolidation only — no application-code, Prisma, plan, capability, billing, auth, lifecycle, publishing, Theme, Hero, navigation, or storefront changes; no fixes; no commit)
**Date:** 2026-08-18
**Predecessors:** RCCF-72.0..72.7 (Creator audit chain) + prior closures (71.4.x, 71.5.x, 71.6.x). This ticket consolidates ALL remaining Creator findings into one authoritative remediation backlog.

---

## 1. Executive verdict

The Creator audit chain produced **44 historical findings**. After re-verification against the current repository state:

- **FIXED: 2** (F2 admin crash / redirect loop — resolved by RCCF-72.7's lifecycle reconciliation + backfill; and its scope-expansion note N5). The 71.4.x/71.5.x/71.6.x fixes were re-confirmed as closed by their closure evidence and are **not reopened**.
- **OPEN: 24** actionable findings, including **one confirmed P1 SECURITY finding** (S1 — anonymous `?preview=true` draft leak, re-proven in the browser this ticket).
- **PRODUCT GAPS: 8** (capabilities the platform does not claim to ship; explicitly deferred, including the niche runtime).
- **DUPLICATE 1 · OBSOLETE 1 · ENVIRONMENT 3 · DEFERRED-as-policy 5.**
- **No P0.** **P1 = 3** (S1 security; 72.1-F1 Save Identity; 72.1-F2 publish-quota raw-DB UX).
- **Creator freeze decision: NO** until the security blocker (S1) and the two core workflow P1s land. After Wave 1 + Wave 2 the Creator can be frozen while Agencies are audited.

Severity labels from prior reports were re-checked against source. Notable reclassifications: **72.1-F3 is a duplicate of the F2 class (now fixed)**, **72.4-N1/N2 and 72.5-N12 are product gaps/coherence, not bugs**, **S4's real-world impact is low on the current single-origin hosting** (root-relative `/terms` resolves to the platform legal pages), and **72.3's "bookings not constructible" is now half-resolved** (admin pages work post-72.7; the section is still not addable — a product gap).

---

## 2. Master Finding Register

Legend — Status: `FIXED / OPEN / DUPLICATE / OBSOLETE / ENVIRONMENT / PRODUCT_GAP / DEFERRED / UNKNOWN`. IDs are prefixed with their source ticket to disambiguate the F1/F2 collisions between 72.1 and 72.3.

| ID | Ticket | Finding | Orig. Sev | Current Status | Evidence (current repo) |
|---|---|---|---|---|---|
| 72.0-P2-1 | 72.0 | Signup error-state recoverability gap (register-succeeded / sign-in-failed dead-end) | P2 | OPEN | `SignupForm.tsx:100-102` unchanged; 409 dead-end |
| 72.0-P3-1 | 72.0 | `/admin` bare → 404 "Creator Not Found" | P3 | OPEN | `[domain]/[slug]` catch-all; no `/admin` redirect |
| 72.0-P3-2 | 72.0 | Authed users stay on `/admin/login` | P3 | DEFERRED | Design behavior (always-allow) |
| 72.0-P3-3 | 72.0 | `BillingPlanFeature` catalog mirror stale vs registry | P3 | DEFERRED | Informational; runtime authority is the registry |
| 72.0-P3-4 | 72.0 | Billing price display parity (₹1,999 vs ₹1,995) | P3 | DEFERRED | Pricing-center divergence; billing scope |
| 72.0-PG | 72.0 | Social login not implemented (Credentials-only) | Gap | PRODUCT_GAP | `src/lib/auth.ts` — Credentials only |
| 72.0-ENV | 72.0 | Dev connection aborts / first-hit compile / rate-limit budget | Env | ENVIRONMENT | dev-only; server state correct |
| 72.1-F1 | 72.1 | **Save Identity always fails** (`profilePictureUrl: null` vs `z.string().optional()`) → "Invalid hero data"; background clear broken | P1 | **OPEN** | `settings-form.tsx:152-167` (`\|\| null`), `settings.actions.ts:59-60` unchanged |
| 72.1-F2 | 72.1 | **Publish quota-exhausted shows raw DB error** (P2002 create aborts tx; retry throws) | P1 | **OPEN** | `plan-usage-repository.ts:44-65` unchanged (create-if-missing on exhausted row) |
| 72.1-F3 | 72.1 | Settings/Gallery crash for media tenants | P1 | **DUPLICATE** → FIXED | Same class as 72.3-F2/72.6/72.7 (redirect loop); now fixed |
| 72.1-F4 | 72.1 | Builder Add-Section catalog leaks Courses/Games to Launch | P2 | OPEN | `section-manager.tsx:60-74` ungated (re-confirmed 72.4/72.5) |
| 72.1-F5 | 72.1 | Dashboard quick actions / CTA to locked pages | P2 | OPEN | `dashboard-page.tsx` quick cards unchanged |
| 72.1-F6 | 72.1 | Appearance nav item always visible (no capability) | P3 | OPEN | `admin-nav.ts:126` — no `requiredCapability` |
| 72.1-F7 | 72.1 | Ungated empty-state pages (courses/bookings/games/analytics/payments) | P3 | OPEN | page files — `requireTenant` only |
| 72.1-F8 | 72.1 | Admin sidebar no collapse at 390px | P3 | OPEN | layout unchanged |
| 72.1-F9 | 72.1 | Terse "Invalid hero data" copy | P3 | OPEN | `settings.actions.ts:157` (fold into 72.1-F1 ticket) |
| 72.1-F10 | 72.1 | Schema fragmentation (Offering/Setting JSON) | Gap | PRODUCT_GAP | `prisma/schema.prisma` unchanged |
| 72.1-F11 | 72.1 | Dev `Error: aborted` | Env | ENVIRONMENT | dev-only |
| S1 | 72.2 | **Anonymous `?preview=true` leaks unpublished draft content** | P1 | **OPEN — P1 SECURITY** | **Re-proven this ticket**: `/rccf-720-audit?preview=true` anonymous → 200 + "PREVIEW MODE" + draft-only timeline "Quota Probe Milestone 2027" + "Checkout available on your live website" placeholders; live page shows only published 2026 milestone. `storefront-loader.ts:53-110` (no auth), `[domain]/page.tsx:39-40` |
| S2 | 72.2 | Navigation auto-gen is one-shot (never regenerates as content grows) | P2 | OPEN | `navigation/service.ts:89-93` `getOrGenerate` returns existing |
| S3 | 72.2 | Dead "Contact" nav anchor (no contact section) | P2 | OPEN | `navigation/service.ts:81-83` unconditional Contact |
| S4 | 72.2 | Footer legal links root-relative → 404 on tenant hosts | P2 | **OPEN (downgraded P3)** | `renderers.tsx:585-587`; browser: on `localhost:3000/{domain}` the href `/terms` resolves to platform origin → 200. Impact low on single-origin hosting |
| S5 | 72.2 | Nav anchors JS-only (`href=undefined`) | P3 | OPEN | `StorefrontNav.tsx:78,106` |
| S6 | 72.2 | Double title suffix | P3 | OPEN | `layout.tsx:32` template; **re-proven**: B preview title "… — CreatorStore — CreatorStore" |
| S7 | 72.2 | Legacy `themeConfig.navigation` dead config | P3 | OPEN | not consumed by any runtime |
| S8 | 72.2 | Dynamic niche-driven storefront not implemented | Gap | PRODUCT_GAP | 0 runtime niche consumers (72.4/72.5) |
| S9 | 72.2 | Dev preview latency / aborts | Env | ENVIRONMENT | dev-only |
| 72.3-F1 | 72.3 | **Course/Service write-block → 500 + unhandled pageerror, no UX** | P2 | **OPEN** | `courses/actions.ts:36` + `services/actions.ts:30` both `throw` on `!limit.ok`; managers have no catch; Games/Bookings use structured errors (contrast) |
| 72.3-F2 | 72.3 | Workspace-owner admin crash (redirect loop) | P2 | **FIXED** | RCCF-72.7 — lifecycle reconcile + backfill; 32-route regression |
| 72.3-PG1 | 72.3 | Multi-page UI missing (View-All unreachable) | Gap | PRODUCT_GAP | `builderStore.addPage` has no UI |
| 72.3-PG2 | 72.3 | Nav never surfaces services/courses/bookings/affiliate/newsletter/hero-variants/embeds/socials | Gap | PRODUCT_GAP | `navigation/service.ts` generateDefaults coverage |
| 72.3-PG3 | 72.3 | Bookings not constructible end-to-end | Gap | PRODUCT_GAP (partial) | admin works post-72.7; section not addable; Launch=0 |
| 72.4-N1 | 72.4 | 10 registered sections UI-unreachable in Builder | P2 | PRODUCT_GAP | `section-manager.tsx` catalog = 13 of 23 |
| 72.4-N2 | 72.4 | `analytics_advanced`/`ai_credits` no runtime enforcement | P2 | DEFERRED | coherence cleanup; no consumer (72.5 full sweep) |
| 72.4-N3 | 72.4 | Analytics/SEO route has no capability gate | P3 | OPEN | `analytics/page.tsx` + `seo/page.tsx` — `requireTenant` only |
| 72.4-N4 | 72.4 | Sections never capability-gated (by-design) | P3 | OBSOLETE | Confirmed design (enforce-at-write) |
| 72.5-N5 | 72.5 | F2 scope expansion (13 pages) | P2 | **FIXED** | 72.7 lifecycle fix |
| 72.5-N6 | 72.5 | B resolves Growth via legacy `Subscription` fallback | P3 | DEFERRED (ENV QA data + coherence note) | B v2 `BillingSubscription` absent; legacy fallback works by design |
| 72.5-N7 | 72.5 | Hidden gated nav links persist in DOM | P3 | OPEN | nav filter hides visually; hrefs in DOM |
| 72.5-N8 | 72.5 | `max_messages` declared but never enforced | P3 | OPEN | no consumer anywhere (72.5 sweep) |
| 72.5-N9 | 72.5 | Platform `/contact` submit path likely dead | P3 | OPEN | `submitContact` resolves `x-tenant-host`, deleted on platform domains |
| 72.5-N10 | 72.5 | Goals page copy overstates reordering | P3 | OPEN | copy vs filter-only pipeline |
| 72.5-N11 | 72.5 | Notification prefs decorative; email adapter log-only | P3 | OPEN | `sendCommunication` never reads prefs; `sendNotification` unused |
| 72.5-N12 | 72.5 | Integrations OAuth connect dead | P3 | PRODUCT_GAP | `social-oauth.exchangeCodeForToken` no callers |

**Additional verified-not-fixed classes (72.0-72.7 appendices):** dev-env connection aborts (ENVIRONMENT), upload round-trip unexercised (NEEDS_REPRODUCTION → 0 open), cross-tenant deep-swap not swept (0 open — tenant-scoped queries).

---

## 3. Fixed findings

| Finding | Fix | Evidence |
|---|---|---|
| **F2 (72.3-F2 / 72.5-N5 / 72.1-F3)** | RCCF-72.7 lifecycle resolver reconciliation (`hasOnboardingCompleted = setting \|\| website`) + idempotent backfill (5 tenants, drift 0) | Commit `b78f404`; 32-route browser regression (A 29P+3L, B 30P+2L, C 32P); fresh-tenant gate proven intact |
| **71.4.1** login hard-navigation | Prior closure | `tests/unit/rccf71-4-1-login-hardnav.test.tsx` + 72.0 §5 routing re-verified |
| **71.4.1** onboarding CTA / **71.4.3** onboarding plan-step | Prior closure | 72.0 §4 verified; `rccf71-4-3-growth-entitlement-signup.test.ts` |
| **71.4.1** Hero responsive wrapping | Prior closure | 0 horizontal overflow at 320/375/390/1440 (72.0 §11, 72.1 §14, 72.2 §14) |
| **71.5.1** Growth visual differentiation | Prior closure | 72.2 §11 Growth premium experience renders |
| **71.5.2** Builder preview right gutter | Prior closure | `tests/unit/rccf71-5-2-builder-preview-gutter.test.ts` |
| **71.6.4** Growth/Scale background image | Prior closure | 72.2 §10 background layer renders; 71.6.4 report |

These are NOT reopened — closure evidence holds.

---

## 4. Open findings (24)

1. **S1** — anonymous preview draft leak (P1 SECURITY)
2. **72.1-F1** — Save Identity fails without profile picture (P1)
3. **72.1-F2** — publish quota-exhausted raw DB error (P1)
4. **72.0-P2-1** — signup error-state dead-end (P2)
5. **72.1-F4** — Builder catalog leaks plan-blocked sections (P2)
6. **72.1-F5** — dashboard CTAs to locked pages (P2)
7. **72.3-F1** — course/service write-block 500 + no UX (P2)
8. **S2** — stale auto-nav (P2)
9. **S3** — dead Contact anchor (P2)
10. **72.0-P3-1** — `/admin` bare 404 (P3)
11. **72.1-F6** — Appearance nav always visible (P3)
12. **72.1-F7** — ungated empty-state pages (P3)
13. **72.1-F8** — sidebar no collapse 390px (P3)
14. **72.1-F9** — terse hero-error copy (P3; fold with F1)
15. **S4** — footer legal link robustness (P3, low impact)
16. **S5** — JS-only nav anchors (P3)
17. **S6** — double title suffix (P3)
18. **S7** — dead `themeConfig.navigation` (P3)
19. **72.4-N3** — analytics/SEO route no capability gate (P3)
20. **72.5-N7** — hidden gated nav links in DOM (P3)
21. **72.5-N8** — `max_messages` unenforced (P3)
22. **72.5-N9** — platform `/contact` dead path (P3)
23. **72.5-N10** — Goals copy overstates reordering (P3)
24. **72.5-N11** — notification prefs decorative + email log-only (P3)

---

## 5. Duplicate findings

- **72.1-F3** (settings/gallery crash) = duplicate of **72.3-F2 / 72.6 / 72.7** (lifecycle redirect loop). Now FIXED.

---

## 6. Obsolete findings

- **72.4-N4** ("sections are never capability-gated") — confirmed by-design (enforce-at-write is the documented contract); not a defect, no action.

---

## 7. Environment findings

- **72.0-ENV / 72.1-F11 / S9** — dev-mode connection aborts (`Error: aborted`), first-hit compile latency, shared in-memory rate-limit budget. Not application defects; server state verified correct in every case.

---

## 8. Product gaps (8 — explicitly deferred; NOT bugs)

| Gap | Origin | Note |
|---|---|---|
| Social login | 72.0-PG | Credentials-only by design |
| Schema fragmentation (Offering/Setting JSON) | 72.1-F10 | Data correct end-to-end; evolution risk only |
| Niche-driven storefront | S8 / 72.4 | Generation-time only; **niche runtime NOT implemented in this program** |
| Multi-page UI (View-All) | 72.3-PG1 | Server supports `[slug]`; no UI |
| Nav coverage (services/courses/bookings/…) | 72.3-PG2 | Folded into navigation-derivation work |
| Bookings section constructibility | 72.3-PG3 | Admin works post-72.7; section not addable |
| 10 registered sections UI-unreachable | 72.4-N1 | Renderers/models exist; no builder affordance |
| Integrations OAuth | 72.5-N12 | API-key entry by design; OAuth flow unwired |

---

## 9. Security findings

- **P1 SECURITY — S1 (open):** anonymous `?preview=true` exposes unpublished draft content (draft timeline items, checkout placeholders, plan-gated theme/config drafts). Within-tenant draft leakage via URL guess; **not** cross-tenant and **not** privilege escalation. Verified exploitable this ticket.
- **P3 (open):** **72.4-N3** — analytics/SEO routes lack a capability gate (any authenticated tenant reaches them; tenant-scoped data only, no cross-tenant exposure). Low.
- **No plan/capability bypass, no tenant-isolation breach** (72.1 §16, 72.2 §15, 72.5 §13 hold). F2 was a strictness bug (over-denial), not an exposure.

---

## 10. Revenue / Growth impact

- **72.1-F1 (Save Identity) — highest revenue-adjacent risk:** the primary hero-identity edit is un-saveable without a profile picture; hits the primary paid tier (Growth) hardest and degrades first-impression storefronts that drive conversions.
- **72.1-F2 (publish-quota UX) — direct revenue-path break:** at quota exhaustion the friendly "Upgrade to keep publishing" CTA is unreachable (raw DB text). This is the paid-upgrade upsell moment; breaking it loses conversion on the Growth upgrade path.
- **72.3-F1 (course/service write)** — mostly Launch (limit 0/3); Growth/Scale have unlimited courses so the block rarely fires, but the crash-on-block pattern is a paid-tier quality risk at limit edges.
- **72.5-N11 (email notifications log-only)** — order-confirmation / download-ready emails are never delivered; downstream revenue/trust impact once commerce flows.
- **S2/S3 (nav)** — storefront discoverability of products/timeline is silently broken on first publish; directly reduces storefront conversion.

---

## 11. Launch / Growth / Scale impact matrix

| Finding | Launch | Growth (primary paid) | Scale | Impact type |
|---|---|---|---|---|
| S1 preview leak | ✓ | ✓ | ✓ | Security — all tiers |
| 72.1-F1 Save Identity | ✓ | ✓ | ✓ | All tiers — core workflow |
| 72.1-F2 publish quota UX | ✓ (3/lifetime) | ✓ (10/mo) | — (unlimited) | Revenue path |
| 72.3-F1 course/service write | ✓ (0/3) | ~ (unlimited, edge only) | ~ | UX |
| S2/S3 nav | ✓ | ✓ | ✓ | Storefront conversion |
| F4/F5 catalog/CTAs | ✓ | — | — | Launch UX |
| S4 legal links | ✓ | ✓ | ✓ (custom domain) | Compliance/robustness |
| N11 notifications | ✓ | ✓ | ✓ | Trust/revenue |
| N12 OAuth / integrations | — | — | ✓ | Scale differentiation |
| S8 niche / N1 sections | ✓ | ✓ | ✓ | Product gap (deferred) |

---

## 12. Combined ticket recommendations

| Combined ticket | Findings | Rationale |
|---|---|---|
| **RCCF-72.9 — Preview Security Boundary** | S1 | Single security defect; owner/session or signed-token gate on the preview branch |
| **RCCF-72.10 — Structured Commerce Write Errors** | 72.3-F1 (course + service) | Shared root cause: `enforceContentLimit` `!limit.ok` → `throw`. Match Games/Bookings structured-error contract |
| **RCCF-72.11 — Navigation Derivation Consistency** | S2 + S3 (+ 72.3-PG2 nav coverage) | One architectural root: nav derived once and never reconciled against the resolved section graph; also add missing section types |
| **RCCF-72.12 — Hero Settings Write Fix** | 72.1-F1 + F9 (+ background clear) | Same form/action pair; `null` vs `optional()` schema + error copy |
| **RCCF-72.13 — Publish Quota UX** | 72.1-F2 | `reserveSlot` create-if-missing on exhausted row aborts tx; read-then-decide + TECHNICAL_HINTS |
| **RCCF-72.14 — Capability-Gated UI Coherence** | F4 + F5 + F6 + F7 (+ N3) | Builder catalog, dashboard CTAs, nav visibility, page gates — one "UI reflects enforcement" contract |
| **RCCF-72.15 — Signup Recovery + Admin Routing** | 72.0-P2-1 + P3-1 + P3-2 | Small auth/onboarding UX batch |
| **RCCF-72.16 — Plan/Capability Coherence** | N2 + N6 + 72.0-P3-3 (+ P3-4) | analytics_advanced/ai_credits enforcement-or-relabel; catalog mirror; legacy fallback documentation |
| **RCCF-72.17 — Storefront Polish & Hygiene** | S4 + S5 + S6 + S7 + N7 + N8 + N9 + N10 | Storefront/copy/DOM hygiene batch |
| **RCCF-72.18 — Notifications Delivery** | N11 | wire preferences/email delivery |

---

## 13. Implementation waves

- **WAVE 1 — Security / production blockers:** RCCF-72.9 (S1 preview). *Must land first.*
- **WAVE 2 — Core Creator workflow defects:** RCCF-72.12 (Save Identity), RCCF-72.13 (publish quota UX), RCCF-72.10 (course/service structured errors).
- **WAVE 3 — Navigation / storefront correctness:** RCCF-72.11 (nav derivation), RCCF-72.17 partial (S4/S5/S6).
- **WAVE 4 — Plan/capability coherence:** RCCF-72.14, RCCF-72.16.
- **WAVE 5 — Growth/Scale value:** RCCF-72.18 (notifications), bookings section exposure, integrations OAuth (Scale).
- **WAVE 6 — Product gaps / niche architecture:** multi-page UI, N1 sections, S8 niche runtime (design decision), social login.
- **WAVE 7 — Polish:** RCCF-72.15, RCCF-72.17 remainder, F8 sidebar, N9/N10 copy.

---

## 14. Creator freeze decision

**NO** — not yet frozen.

Blockers before freeze (must land):
1. **RCCF-72.9** (S1 preview security — P1 SECURITY).
2. **RCCF-72.12** (Save Identity — P1 functional, core creator workflow).
3. **RCCF-72.13** (publish quota UX — P1 functional, paid-upgrade revenue path).

After those three land (Waves 1–2), Creator is safe to freeze while Agencies are audited; the remaining waves (3–7) become the post-freeze remediation backlog and do not block the Agency audit.

---

## 15. Recommended RCCF sequence

1. **RCCF-72.9** — Preview Security Boundary (S1)
2. **RCCF-72.12** — Hero Settings Write Fix (72.1-F1)
3. **RCCF-72.13** — Publish Quota UX (72.1-F2)
4. **RCCF-72.10** — Structured Commerce Write Errors (72.3-F1)
5. **RCCF-72.11** — Navigation Derivation Consistency (S2+S3)
6. **RCCF-72.14** — Capability-Gated UI Coherence (F4/F5/F6/F7)
7. **RCCF-72.16** — Plan/Capability Coherence (N2/N6/P3-3)
8. **RCCF-72.15** — Signup Recovery + Admin Routing (72.0 P2-1/P3-1)
9. **RCCF-72.18** — Notifications Delivery (N11)
10. **RCCF-72.17** — Storefront Polish & Hygiene (S4–S7, N7–N10)
11. **Wave 6 gaps** — multi-page, sections, niche runtime, social login (design-ticket first)
12. **Wave 7** — remaining polish

---

## 16. Frozen surfaces

Per ticket constraints, unchanged by this audit: application code, Prisma schema, plans, capabilities, billing, auth, lifecycle, publishing, Theme Experience, Hero ownership, navigation, storefront, preview security, course/service writes, niche architecture, sections, pricing. No data created; no commit. Dev server left running (port 3000).

---

## 17. Explicitly deferred work

- **Niche runtime architecture** (S8 / 72.4-N1 intent) — NOT being implemented in this program; requires a design ticket.
- **Multi-page UI** (72.3-PG1) — deferred to Wave 6.
- **Dormant sections exposure** (72.4-N1) — deferred (product decision required per section).
- **Social login** — roadmap.
- **OAuth connect for integrations** (72.5-N12) — Scale-side product decision.
- **`BillingPlanFeature` mirror + pricing display parity** (72.0-P3-3/P3-4) — billing-domain cleanup.
- **Schema fragmentation refactor** (72.1-F10) — no behavior change until schema evolution is scheduled.
- **N6 legacy plan-resolution observation** — no action (works by design); document only.

---

## Final numbers

| Metric | Value |
|---|---|
| Total historical findings (72.0–72.5 registers) | **44** |
| Fixed | **2** (72.3-F2/N5 via 72.7; + 72.1-F3 duplicate) |
| Open | **24** |
| Duplicate | **1** (72.1-F3) |
| Obsolete | **1** (72.4-N4) |
| Environment | **3** (72.0-ENV, 72.1-F11, S9) |
| Product gaps | **8** (social login, F10, S8, PG1, PG2, PG3, N1, N12) |
| Needs reproduction | **0** (S1 and F1 re-confirmed this ticket) |
| P0 | **0** |
| P1 | **3** (S1 SECURITY; 72.1-F1; 72.1-F2) |
| P2 | **7** (72.0-P2-1, F4, F5, 72.3-F1, S2, S3, N1-gap) |
| P3 | **29** (remaining actionable incl. deferred P3s) |
| Security findings | 2 (S1 = P1; N3 = P3) |
| Revenue-impacting | 3 (72.1-F2, 72.1-F1, N11) |
| Growth-impacting | 6 (72.1-F1, F2, S2, S3, N8, N11) |
| Scale-impacting | 2 (N12, S4/custom-domain) |
