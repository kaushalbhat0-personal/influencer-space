# RCCF-73.1 — Exhaustive Agency / Partner Platform Audit

**Status:** Complete — AUDIT ONLY. No application code modified, no commit.
**Date:** 2026-08-19
**Mode:** Read-only. Evidence from current source (`file:line`), live DB, and browser QA. Historical docs treated as evidence, not authority.

---

## 1. Executive Summary

The Agency / Partner platform is **architecturally sound and mostly secure**, but it is **not production-ready** for a fully self-serve Partner acquisition funnel. The core relationship engine, tenant isolation, and the recurring-commission runtime are real and verified; however there are **three P1 defects and several P2/P3 gaps** that block a clean Partner launch:

1. **P1 — Agency dashboard "Recurring Revenue" section 500s for every agency.** `getPartnerRevenueSummary` (`src/lib/commission/runtime.ts:343-344`) generates a 3-level relation filter that crashes the Postgres driver adapter with `operator does not exist: uuid = text`. The section silently never renders; the RSC payload returns HTTP 500 and 22 console errors on `/agency` (and every agency page that mounts the revenue section).
2. **P1 — Agency-provisioned clients are created with NO BillingSubscription.** The selected plan ("Creator Growth") is never persisted. The client falls back to a phantom "Creator Launch · Active" with free-tier limits, and — because `resolvePublishPolicy(null)` defaults to **unlimited** — gets unlimited publishing instead of the intended 10/month Growth quota. The `isTenantAgencyManaged` Launch→Grow clamp never triggers.
3. **P1 — Partner `partner_growth` (hidden legacy tier) resolves to `max_clients: 0`.** `partner_growth` has no `max_clients` override and `BASE_FEATURES` defaults `max_clients: DISABLED` (0). Any agency on the legacy `agency_agency → partner_growth` mapping is treated as a paid ACTIVE plan yet can provision **zero** clients.

Plus revenue-impacting **pricing drift**: the DB runtime price for `partner_solo` (₹2,999) disagrees with the static registry + marketing copy (₹4,999), and the annual price for `partner_solo` (₹49,990) and `creator_grow` (₹9,990) yield **negative** yearly savings (−39% / −19%) contradicting the marketing "Save ~17%" claim.

On the **positive** side, verified: signup→agency→dashboard flow works; all 16 agency routes render; client provisioning works end-to-end (tenant/workspace/membership/AgencyTenant link/invitation); client capacity is atomically enforced (1/1 denial verified); white-label branding is correctly server-gated (Solo denied, Scale allowed); cross-agency IDOR reads return 404/NEXT_NOT_FOUND; the provisioned client cannot access `/agency`; the storefront renders correctly; the recurring-commission pipeline (historically "dead") is now live and DB-backed.

---

## 2. Audit Scope

- **In scope:** partner signup, auth, onboarding, agency workspace, client provisioning, client workspace, builder/publish/storefront, billing/subscriptions, capacity/limits, roles/authz, tenant isolation/IDOR, super-admin propagation, marketing price cross-check, DB consistency, browser QA.
- **Out of scope (per ticket):** Enterprise plan detail; full marketing audit; any implementation/fix; any code/test modification.
- **Surfaces classified** READY / PARTIAL / BROKEN / LOCKED / NOT_VERIFIED / NOT_APPLICABLE.

---

## 3. Architecture Map

```
User ─(role AGENCY_ADMIN|AGENCY_STAFF, agencyId)→ WebsiteAgency ─(id)→ Workspace(type=AGENCY, agencyId)
                                                                        │  workspaceId
                                                                        ▼
                                                              BillingSubscription → BillingPlan (partner_*)
WebsiteAgency ─(AgencyTenant {agencyId, tenantId, workspaceId, revShare 20/10, canEdit*})→ Tenant (creator)
                                                                        │
                                                                        ▼
                                               Workspace(type=TENANT, tenantId) → WorkspaceMember(OWNER)
                                                                        │
                                                                        ▼
                                               Website → Brand → PublishStatus → PublishSnapshot
```
- **Agency ↔ Creator relationship:** `AgencyTenant` (DB-owned, single source of truth; `partner-relationship.ts` is the canonical writer). NOT membership-owned, NOT Setting-owned, NOT Subscription-owned, NOT duplicated.
- **Identity:** `User` (role ADMIN/AGENCY_ADMIN/AGENCY_STAFF/SUPER_ADMIN/SUPPORT/READ_ONLY; `tenantId` XOR `agencyId`), `Tenant` (creator), `WebsiteAgency` (agency), `Workspace` (aggregate root), `WorkspaceMember` (membership), `BillingSubscription` (per workspace).
- **Sources of truth:** commerce registry `src/config/commerce/plans.ts` (defaults) → `BillingPlan.runtimeConfig`/scalar (DB runtime authority) → `lib/capabilities` (derived feature map) → `plan-source.resolveActivePlan` (effective plan). Agency↔creator = `AgencyTenant`.

---

## 4. Identity & Lifecycle

- **Roles:** SUPER_ADMIN, AGENCY_ADMIN, AGENCY_STAFF, ADMIN, SUPPORT, READ_ONLY (`schema.prisma` enum `Role`).
- **Agency lifecycle:** signup creates `WebsiteAgency(status ACTIVE)` + `BillingSubscription(TRIALING, 15d)` on `partner_free` (`api/auth/register/route.ts:46-104`). Trial expiry → `resolveAgencyAccess` derives PLATFORM_LOCKED (access-lock.ts) — server-side gate, no client bypass. Verified for fresh accounts.
- **Lifecycle resolver:** `token-resolver.ts` short-circuits agency roles to `READY` (L67-76); DB resolver `service.ts` is creator-only. **No DB-vs-token divergence for agencies** — the RCCF-72.6 class of bug does not apply here because agencies bypass the DB lifecycle entirely. ✓
- **Session re-validation:** `auth.ts` session callback re-checks agency role + ACTIVE `WorkspaceMember` on every refresh (L130-145) — revoked staff lose access immediately. ✓
- **Social/OAuth login:** NOT implemented. `auth.ts` uses only `CredentialsProvider` (email+password). OAuth references in the codebase are social-API integration (Twitch/Instagram), not platform login. **NOT_APPLICABLE.**

---

## 5. Partner Signup

- **Entry path:** marketing `/signup?persona=partner` → `/api/auth/register` (persona "agency"). Creates `User(AGENCY_ADMIN)`, `WebsiteAgency`, `BillingAccount(agency)`, `BillingSubscription(TRIALING partner_free 15d)`. Plan is hardcoded `partner_free` (registration is FREE-only, RCCF-LAUNCH-01) — correct; paid plans come through checkout.
- **Workspace:** created lazily on first login via `resolveWorkspace` (create + OWNER member + RCCF-40 subscription link). ✓
- **Validation:** email uniqueness (P2002→409), min 8-char password, rate-limited, `enableNewRegistrations` kill-switch. ✓
- **Signup plan selection:** the pricing-page "Become a Partner" + `signup?persona=partner` only offers the free trial; paid plan selection is post-account via `AgencyPlanManager`. ✓
- **Classification:** READY.

---

## 6. Partner Onboarding

- **Agency onboarding:** no multi-step onboarding — agency users land directly on `/agency` (lifecycle READY). The agency can immediately provision clients. No agency-name/branding onboarding step (branding optional at `/agency/branding`). ✓
- **requireTenant()** redirects agency roles to `/agency` (require-tenant.ts:34-44) — agencies never enter creator onboarding. ✓
- **Verified fresh:** Free (TRIALING), Solo (ACTIVE), Growth (ACTIVE), Scale (ACTIVE) all log in and reach `/agency` with correct plan + capacity shown. ✓
- **Classification:** READY.

---

## 7. Agency Dashboard (Route Matrix)

16 routes under `/agency`. All render for the fresh partner accounts (empty state). The **dashboard revenue section 500s** (see Findings RCCF-73.1-F1).

| Route | Status | Notes |
|---|---|---|
| `/agency` (dashboard) | **PARTIAL** | Renders metrics/clients/activity, but "Recurring Revenue" section 500s (P1) |
| `/agency/dashboard` | REDIRECT | Stub → `/agency` |
| `/agency/clients` | READY | List + search + status filter |
| `/agency/clients/new` | BROKEN (stub) | Immediate redirect → `/agency/clients` (dead CTA) |
| `/agency/clients/[id]` | READY | IDOR-guarded `assertAgencyOwnsTenant` |
| `/agency/websites` | READY | Managed sites via getAgencyClients |
| `/agency/domains` | READY | Read-only domain inventory |
| `/agency/team` | READY | Members, invite, audit (admin-gated) |
| `/agency/team/accept` | READY | Invitation accept |
| `/agency/billing` | READY | Admin-only; plan + capacity manager |
| `/agency/portal/[tenantId]` | READY | Branded portal, IDOR-guarded |
| `/agency/analytics` | READY | Earnings/payouts/settlements (works — different code path) |
| `/agency/work` | READY | Assigned clients |
| `/agency/templates` | READY | Blueprint/theme catalog |
| `/agency/branding` | READY | White-label form (server-gated) |
| `/agency/generate` | READY | Creator import (admin-only nav) |

Hard refresh + soft nav + direct URL all verified for the major routes. **Route count: 16 audited → 13 READY, 1 PARTIAL (dashboard), 1 BROKEN (clients/new stub), 1 redirect-stub (dashboard).**

---

## 8. Client Provisioning

**Verified end-to-end via real form (Partner Free):**
- Create client → `importCreatorViaAgency` → `confirmProvision` → provisioning-service creates Tenant, Website, Brand, PublishStatus(draft), Settings, User(ADMIN), Workspace(TENANT), WorkspaceMember(OWNER) → `AgencyTenant.linkCreator` (atomic capacity gate, revShare 20/10) → passwordless invitation → claim → creator OWNER.
- **Verified in DB:** tenant, workspace, OWNER member, AgencyTenant link, 10 settings, auto-published v1. ✓
- **Capacity:** atomic `linkCreator` `SELECT FOR UPDATE` gate. Second provision while at 1/1 → "Client capacity reached (1/1)" — **no orphan created**. ✓
- **Re-provisioning guard:** existing tenant link throws "Creator already linked to another agency". ✓
- **Isolation:** cross-agency client/portal reads → 404/NEXT_NOT_FOUND. ✓
- **Deletion/offboard:** `offboardAgencyClient` → REVOKED (preserves creator data, reclaims capacity). Not browser-tested (destructive); code-verified.

**P1 gap (F2):** provisioned client gets **no BillingSubscription** → resolves as phantom Launch + unlimited publish.

---

## 9. Client Workspace

- **Dashboard:** provisioned client (Agency A) logs in → `/admin/dashboard` → "Live", "Publish allowance: Unlimited", onboarding checklist. But plan shows **Creator Launch** (phantom) not the selected Growth. See F2.
- **Builder/publish/storefront:** storefront `/audit-client-one` renders hero, nav (Home/Contact), social links, footer. Builder/publish path is the frozen Creator surface (RCCF-72.x verified) — not re-audited.
- **Client cannot escape tenant:** `/agency` from client session → redirect to login. ✓
- **Agency cannot gain creator-owner privileges:** creator remains OWNER of their TENANT workspace; agency is not a member of the creator's workspace (owns only the AGENCY workspace + AgencyTenant link). ✓
- **Classification:** PARTIAL (due to F2 plan/entitlement).

---

## 10. Partner Plan Matrix (Capabilities + Enforcement)

| Capability | partner_free | partner_solo | partner_growth | partner_scale | Registry src | Server enforce | UI enforce |
|---|---|---|---|---|---|---|---|
| max_clients | 1 (trial) | 5 | **0 (bug F3)** | 15 | plans.ts featureOverrides | ✓ atomic linkCreator | ✓ billing UI |
| max_team_members | 1 | 3 | (base 1) | 10 | plans.ts | ✓ team-membership | ✓ team |
| premium_themes | ✗ | ✓ | ✓ | ✓ | capabilities | ✓ | ✓ |
| advanced_builder | ✗ | ✓ | ✓ | ✓ | capabilities | ✓ | ✓ |
| custom_domain | ✗ | ✓ | ✓ | ✓ | capabilities | ✓ (creator domain.actions) | ✓ |
| white_label | ✗ | ✗ | ✗ | ✓ | capabilities | ✓ updateAgencyBranding (verified) | ✓ |
| background solid | ✓ | ✓ | ✓ | ✓ | capabilities | ✓ | ✓ |
| bg gradient/image/anim | ✗ | ✓ | ✓ | ✓ | capabilities | ✓ | ✓ |
| bg video | ✗ | ✗ | ✗ | ✓ | capabilities | ✓ | ✓ |
| theme effects (particles/glow/noise/blur) | ✗ | ✓ | ✓ | ✓ | capabilities | ✓ | ✓ |
| theme effects custom | ✗ | ✗ | ✗ | ✓ | capabilities | ✓ | ✓ |
| api_access | ✗ | ✗ | ✓ | ✓ | capabilities | — | — |
| advanced_analytics | ✗ | ✗ | ✓ | ✓ | capabilities | — | — |
| publish quota | (n/a agency-level) | — | — | — | runtime publishing | ✓ | ✓ |

**Verification:** white-label server gate confirmed (Solo denied "requires Partner Scale or Enterprise"; Scale allowed "Branding saved"). Client capacity confirmed per plan (Free=1, Solo=5, Growth=0, Scale=15). Custom domain capability granted on Solo/Scale but **no agency-level custom-domain provisioning UI** (see Phase 14).

---

## 11. Capabilities

Canonical registry is `src/config/commerce/plans.ts` → `lib/capabilities` derived map → runtime `BillingPlan.runtimeConfig` overlay. Enforcement is server-authoritative for the audited capabilities (white_label, max_clients, max_team_members, theme entitlements). Publish quota for **creator** plans is enforced via `resolvePublishPolicy` (RCCF-72.13).

**Gaps:** `partner_growth` max_clients=0 (F3); `api_access`/`webhooks`/`advanced_analytics` are granted in the registry but no agency-facing API/webhook console exists (surfaced capability, unenforced surface) — **PRODUCT GAP**.

---

## 12. Billing / Subscriptions

- **Model:** `BillingSubscription` (per workspace) is canonical for agencies. Legacy `Subscription` is creator-legacy only and untouched by agency billing. Verified: agency plan resolution is `resolveActivePlan(workspaceId)` → BillingSubscription. ✓
- **Effective plan:** `plan-source.ts` resolves v2-first, legacy fallback only for creator tenants; `resolveRestrictedPlanCode` clamps Launch→Grow for agency-managed creators (works only when a subscription exists — see F2).
- **Trial semantics:** partner_free is TRIALING with 15d trialEndsAt; `access-lock` derives PLATFORM_LOCKED after expiry (server-gated, verified). ✓
- **Upgrade/downgrade/cancel:** `changeAgencyPlanAction` → `billingService.changePlan` → Razorpay checkout → webhook → `BillingSubscription`. Payment guard requires positive captured amount (RCCF-71.4.5). ✓
- **Plan resolution mismatch:** **F4** — DB scalar price vs registry price diverge for `partner_solo` (₹2,999 vs ₹4,999) and `partner_enterprise` (₹0 vs ₹14,999). The runtime resolves the DB scalar, so checkout/pricing use ₹2,999, but the static registry + `rccf60-partner-pricing-truth.test.ts` + marketing meta assert ₹4,999. **DIVERGENT AUTHORITY.**
- **Annual pricing logic:** **F5** — annual prices were set for the old monthly price. `partner_solo` annual ₹49,990 vs 12×₹2,999=₹35,988 → **−39%**; `creator_grow` annual ₹9,990 vs ₹8,388 → **−19%**. The "Save ~17%" marketing claim is false on 2 of 4 shown tiers.

---

## 13. Capacity & Limits

Enforcement verified at **UI + server-action + DB (atomic)** for `max_clients`:
- Fail-fast pre-check `getAgencyClientCapacity` + atomic `linkCreator` (`SELECT FOR UPDATE` + count). ✓
- `max_team_members` enforced atomically at invite/accept. ✓
- Add-on capacity (`AgencyCapacityAddon` ₹1,499/qty) summed into effective limit; idempotent upsert. ✓
- **Gap:** `partner_growth` = 0 clients (F3); legacy pre-BillingSubscription agency = 0 limit but 1 existing client (over capacity, F7).

---

## 14. Roles & Authorization

- **Roles:** AGENCY_ADMIN (mutate), AGENCY_STAFF (read, some ops), SUPER_ADMIN, SUPPORT/READ_ONLY (view).
- **Guards:** `requireAgencyMember`/`requireAgencyActive` (role + active agency + ACTIVE membership + PLATFORM_LOCK), `assertAgencyOwnsTenant` (IDOR), `canMutate` (admin-only mutations). All agency actions server-derive the agencyId from the session (no client-supplied id). ✓
- **Verified:** staff cannot provision (admin-only), white-label mutation admin+Scale-gated, cross-agency reads 404.
- **Dead permission layer:** `workspace/domain/authorization.ts` (`authorizationService`) is fully implemented but **never imported** in `src` (dead code). If ever wired with the workspace cookie as role source it would be an auth risk; today it is inert. **LOW (deferred)** — noted historically (H4).

---

## 15. Tenant Isolation / IDOR

**Verified via browser (read-only probes with legitimate accounts):**
- Agency A (Free) client list contains its own client only.
- Agency B (Scale) client list is empty — no leakage from Agency A. ✓
- Agency B accessing Agency A's client `/agency/clients/{A-client}` → `NEXT_NOT_FOUND`. ✓
- Agency B accessing Agency A's portal `/agency/portal/{A-client}` → `NEXT_NOT_FOUND`. ✓
- Client (Agency A) accessing `/agency` → redirect to login. ✓
- **No cross-tenant write attempts performed** (read-only per ticket rules).

**Positive verdict:** tenant isolation for the audited surfaces is enforced server-side via AgencyTenant ownership + membership; hidden-UI-is-not-auth is satisfied (direct URL probes blocked).

---

## 16. Publishing

- **Snapshot ownership:** `PublishSnapshot` is scoped to `websiteId` (tenant-owned); publish metering is tenant-scoped (`planUsage`). Agency-managed clients publish through the frozen Creator pipeline.
- **Publish authorization:** agency staff cannot publish client sites directly (no tenantId session; `/builder` admits AGENCY_ADMIN only, not AGENCY_STAFF — see F6). The client (OWNER) publishes from their own workspace.
- **Publish quota:** **F2** — provisioned clients with no subscription resolve `resolvePublishPolicy(null)` → **unlimited**, so the intended Growth 10/month quota is NOT enforced on agency-provisioned clients.

---

## 17. Storefront

- Provisioned client storefront (`/audit-client-one`) renders: hero ("Audit Client One"), nav (Home/Contact), social links, footer with Terms/Privacy. Live status, v1 snapshot. ✓
- **Niche consumption:** the manual provisioning path sets `influencer_data.niche` to the source/personalization niche; the storefront renderer reads it. Niche-specific navigation was not exercised for the generated client (basic Home/Contact nav present). The niche-finding from the Creator audit was not assumed — the manual path is niche-truthful (RCCF-18 guard: manual provisioning does not assert an unknown niche). **PARTIAL/NOT_FULLY_VERIFIED** for niche-specific nav on an agency-managed storefront.
- Responsive/mobile/SEO: covered by the frozen Creator storefront audit (RCCF-72.2/72.3); not re-audited here.

---

## 18. Custom Domains

- **Capability:** `custom_domain` granted on partner_solo/growth/scale. Creator-side enforcement exists (`domain.actions.ts` entitlement check).
- **Agency surfaces:** `/agency/domains` is **read-only inventory** of managed-creator domains. There is **no agency-level UI/server action to attach or configure a custom domain for a managed creator or the agency's own subdomain**. The agency's `WebsiteAgency.customDomain` field has no writer/action. **PRODUCT GAP** — the Partner differentiation "custom domain" is advertised but not operationally provisionable from the agency console (the creator must do it themselves, gated on their own plan, not the agency's).

---

## 19. Super Admin

- **Agencies panel:** `/super-admin/agencies` lists agencies + `_count.tenants`. **F8** — `_count.tenants` counts **all** AgencyTenant rows (incl. REVOKED), while the agency-side capacity counts only ACTIVE → super-admin "Total Clients" can disagree with the agency's own count after offboarding.
- **Agency detail:** name, managed creators, subdomain, status. ✓
- **Impersonation:** `generateLoginAsAgencyToken` (SUPER_ADMIN only, 5-min audited JWT). ✓
- **Billing ops:** `adminSetPlan` on the workspace (agency-managed clamp applied). ✓
- **Shared authority:** both use `resolveActivePlan`/`BillingSubscription` — consistent. **F8** is the only count mismatch.

---

## 20. Marketing Claim Cross-Check

| Claim | Source | Runtime truth | Verdict |
|---|---|---|---|
| "Partner plans from ₹4,999/month" | `/pricing` meta description | Solo is ₹2,999 | **F4 — MISLEADING** |
| "Save ~17%" yearly | `/pricing` toggle | Solo −39%, Grow −19% | **F5 — MISLEADING** (Scale/Enterprise correct) |
| "1 client website" free trial | registry + runtime | Free=1 (trial) | ✓ |
| "Every paid Partner plan includes at least 5 client websites" | `/pricing` partner copy | **FALSE** for `partner_growth` (0) | **F3** |
| "White-label on Scale and above" | marketing + registry | Solo denied, Scale allowed | ✓ |
| "recurring commission" | marketing + runtime | pipeline live (DB ledger) | ✓ |

---

## 21. Database / Runtime Consistency

| Item | Status |
|---|---|
| `BillingPlan` registry vs DB scalar price (partner_solo) | **DIVERGENT** (₹4,999 vs ₹2,999) — F4 |
| `partner_enterprise` price (registry ₹14,999 vs DB ₹0) | **DIVERGENT** (hidden; low impact) |
| Legacy `Subscription` table | 3 rows (creator legacy only); not used by agency billing — LEGACY |
| `Partner`/`PartnerMember`/`PartnerWorkspaceAssignment`/`PartnerInvite` models | 0 rows, unused by agency actions (parallel scaffolding) — LEGACY/DUPLICATE |
| Pre-existing "Test Agency" (agency_90672bc1) | **0 BillingSubscriptions** → platform-locked, capacity 0, 1 existing client over-capacity — F7 (INCONSISTENT) |
| `partner_growth` max_clients | 0 — F3 (INCONSISTENT) |
| `_count.tenants` vs ACTIVE count | Diverges after offboarding — F8 |

---

## 22. Browser QA

Per `.agents/skills/dev-server-lifecycle/SKILL.md`: dev server on port 3000 confirmed healthy (HTTP 200). Playwright MCP used with legitimate QA accounts (credentials NOT exposed). 4 fresh partner agencies created via the real signup API and plan-provisioned through `billingService.adminSetPlan` (read-only audit fixture, no fake payment/webhook events). One client provisioned via the real Creator Import form + invitation claim. Fixtures are QA rows in the dev DB (no production data touched). Temp audit scripts removed afterward.

| Scenario | Result |
|---|---|
| Partner Free signup → /agency | ✓ (TRIALING, 1 client, revenue section 500) |
| Partner Solo signup → /agency | ✓ (ACTIVE, 0/5, revenue 500) |
| Partner Growth signup → /agency | ✓ (ACTIVE, 0/0 clients — F3) |
| Partner Scale signup → /agency | ✓ (ACTIVE, 0/15) |
| All 16 agency routes direct-nav + hard-refresh | ✓ render (empty state) |
| Client provisioning (Free) | ✓ tenant/workspace/link/invite created |
| Client capacity 1/1 → 2nd provision | ✓ denied, no orphan |
| White-label: Solo save | ✓ denied (server) |
| White-label: Scale save | ✓ allowed |
| Cross-agency client IDOR (Scale→Free's client) | ✓ 404 |
| Cross-agency portal IDOR | ✓ 404 |
| Client → /agency | ✓ redirect to login |
| Client storefront | ✓ renders hero/nav/social/footer |
| `/pricing` For Partners tab | Solo ₹2,999, Scale ₹7,999, "1 client", "from ₹4,999" meta |

**QA totals:** 4 partner plans tested · 4 signup/login flows · 1 full provision+claim workflow · 16 routes · 3 IDOR probes · 2 white-label gates · 1 storefront · 1 pricing page.

---

## 23. Findings Register

| ID | Sev | Surface | Plan | Role | Category | Summary |
|---|---|---|---|---|---|---|
| RCCF-73.1-F1 | P1 | /agency dashboard revenue section | all | AGENCY_ADMIN | REVENUE / UX / ENVIRONMENT | `uuid = text` 500; revenue never renders |
| RCCF-73.1-F2 | P1 | client provisioning → billing | all | AGENCY_ADMIN | REVENUE / PRODUCT GAP | provisioned client gets no subscription → phantom Launch + unlimited publish |
| RCCF-73.1-F3 | P1 | partner_growth plan | partner_growth | AGENCY_ADMIN | LEGACY / REVENUE | max_clients=0; "5 clients" claim false |
| RCCF-73.1-F4 | P2 | pricing/checkout | partner_solo | all | REVENUE / DUPLICATE | registry ₹4,999 vs DB ₹2,999; meta "from ₹4,999" |
| RCCF-73.1-F5 | P2 | pricing annual | solo/grow | all | REVENUE / UX | annual negative savings; "Save 17%" false |
| RCCF-73.1-F6 | P3 | builder access | all | AGENCY_STAFF | UX / AUTHZ | clients/[id] + portal render "Open Builder" but staff blocked by /builder guard |
| RCCF-73.1-F7 | P2 | legacy agency | partner_free fallback | AGENCY_ADMIN | LEGACY / DATA | pre-BillingSubscription agency locked w/ over-capacity existing client |
| RCCF-73.1-F8 | P3 | super-admin agencies | all | SUPER_ADMIN | LEGACY / UX | `_count.tenants` counts REVOKED → count mismatch |
| RCCF-73.1-F9 | P3 | /agency/clients/new | all | AGENCY_ADMIN | PRODUCT GAP / UX | dead stub redirects to /agency/clients (dead CTA) |
| RCCF-73.1-F10 | P3 | custom domain | solo/scale | AGENCY_ADMIN | PRODUCT GAP | advertised but no agency provisioning UI/action |
| RCCF-73.1-F11 | P3 | API/webhooks/advanced analytics | solo/growth/scale | AGENCY_ADMIN | PRODUCT GAP | granted capability, no agency surface |
| RCCF-73.1-F12 | P3 | workspace auth | all | — | ARCHITECTURE / DEAD | `authorizationService` dead code (workspace cookie role source if wired) |
| RCCF-73.1-F13 | P3 | enterprise price | enterprise | SUPER_ADMIN | LEGACY / REVENUE | DB price ₹0 vs registry ₹14,999 (hidden; low impact) |

---

## 24. Security Findings

No confirmed exploitable security vulnerability in the audited surfaces.
- **Tenant isolation:** verified (F-clients/A-clients cross reads 404; client→/agency blocked; no cross-tenant writes attempted — read-only per ticket). **Positive.**
- **Hidden-UI-is-not-auth:** satisfied — direct URL probes denied at server/action layer (assertAgencyOwnsTenant + membership).
- **Session revocation:** agency membership re-validated per refresh; revoked staff lose access. **Positive.**
- **P1-adjacent note:** F2 (no subscription) does not grant cross-tenant access — the phantom-Lanch client is scoped to its own tenant — but it does break entitlement/billing boundaries (see Revenue). Not a security boundary breach.

---

## 25. Revenue Findings

- **F1** — the agency's primary revenue dashboard section is broken (500) for all agencies → agency revenue blindness; commission/ledger data is real but unshown on the main dashboard. Revenue impact: high (agency trust + conversion).
- **F2** — agency-provisioned clients are NOT on a paid plan (no subscription) → **no recurring creator subscription, no commission to the agency** (the revenue engine is live, but the model is never triggered by provisioning). Revenue impact: **critical for the Partner model** — an agency's "client" never generates the recurring ₹699/mo + 20% agency share. This is the single most revenue-critical finding.
- **F4/F5** — price drift + negative annual savings → pricing errors, potential chargeback/trust issues, mis-stated marketing.
- **F3** — legacy growth tier can't provision (0 clients) → can't generate revenue.

---

## 26. Product Gaps

- **F2** — provisioning does not persist/attach the chosen plan as a BillingSubscription (no plan at all, no trial, no agency commission trigger).
- **F9** — `/agency/clients/new` is a dead stub (misleading "+ New Client" CTA).
- **F10** — no agency-side custom-domain provisioning.
- **F11** — API/webhooks/advanced analytics granted but no agency surface.
- **F6** — agency staff builder access inconsistency ("Open Builder" visible but staff blocked).

---

## 27. Legacy / Duplicate Findings

- Legacy `Subscription` table: creator-only, not used by agency billing — LEGACY (safe, documented).
- `Partner`/`PartnerMember`/`PartnerWorkspaceAssignment`/`PartnerInvite` models: unused parallel scaffolding — DUPLICATE authority (inert, but a maintenance hazard).
- `partner_growth`: hidden legacy tier — LEGACY mapping with a **functional defect** (F3).
- Pre-existing "Test Agency": pre-BillingSubscription legacy row — INCONSISTENT (F7).
- `authorizationService`: dead permission layer — DEAD (F12).

---

## 28. Environment Findings

- Dev-only jsdom test flakiness (`rccf68-retry-catalog-timeout`) unrelated to Agency — pre-existing, not re-evaluated here.
- The `uuid = text` error is a Prisma driver/adapter relation-filter bug triggered on the dev Postgres; would affect any Postgres runtime, not dev-specific (F1).

---

## 29. Recommended RCCF Ticket Sequence

1. **RCCF-73.2** — Fix `getPartnerRevenueSummary` uuid/text relation query (F1) + restore the agency dashboard revenue section. [P1, REVENUE]
2. **RCCF-73.3** — Persist/attach a BillingSubscription (selected Creator plan, TRIALING or ACTIVE) during agency client provisioning so entitlements + publish quota + agency commission trigger (F2). [P1, REVENUE, requires product policy on who pays/trials]
3. **RCCF-73.4** — Resolve `partner_growth` max_clients (grant an override or explicitly block provisioning with a clear message) (F3). [P1, LEGACY]
4. **RCCF-73.5** — Reconcile DB runtime prices vs static registry + marketing (partner_solo ₹4,999/₹2,999; enterprise) and fix annual pricing so yearly is cheaper than monthly (F4, F5, F13). [P2, REVENUE]
5. **RCCF-73.6** — Handle pre-BillingSubscription legacy agencies (backfill or explicit locked state) + super-admin count consistency (F7, F8). [P2, LEGACY]
6. **RCCF-73.7** — Agency staff builder access + `/agency/clients/new` real flow or removal + agency custom-domain/API surfaces (F6, F9, F10, F11). [P3, PRODUCT]
7. **RCCF-73.8** — Remove/flag dead `authorizationService` + unused Partner scaffolding (F12, duplicate). [P3, ARCH]

---

## 30. Final Readiness Verdict

The Agency / Partner platform has a **solid, secure, real foundation**: signup, auth, lifecycle, agency console, atomic client capacity, tenant isolation, white-label gating, the DB-backed recurring-commission runtime, and storefronts all verified working. It is **not yet production-ready for a self-serve Partner launch** because the two most revenue-critical flows are broken or incomplete: the agency revenue dashboard 500s, and agency-provisioned clients are created with no subscription (no paid entitlement, unlimited publish, no agency commission). Three P1 defects must be resolved before GA.

**VERDICT: B — READY WITH FINDINGS**

AUDIT ONLY — no code modified, no commit.
