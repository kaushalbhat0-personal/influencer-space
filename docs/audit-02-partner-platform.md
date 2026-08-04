# AUDIT-02 — Agency Platform & Partner Architecture Audit

Read-only audit. No code changed. Every finding verified by file/line inspection
+ production probes + `tsc`. Purpose: determine how the existing Agency Platform
becomes the canonical Partner Platform.

---

## 1. Architecture Summary

CreatorStore has a **real, DB-backed Agency console** (`/agency/**`, 14 pages)
that was previously unreachable — IMPLEMENTATION-40 (CRITICAL-02) removed the
`/agency → /workspace` 308 that redirected every agency route into a nonexistent
namespace. The console now serves AGENCY_ADMIN/AGENCY_STAFF via the middleware
guard + per-page session checks.

However the Agency Platform is **architecturally incomplete** in ways that matter
for the Partner Platform:

- **The agency↔creator relationship is never written.** `AgencyTenant` (the
  link table with rev-share + capability flags) has **zero writers** in `src/`.
  No `agencyTenant.create/upsert`, no `tenant.agencyId` assignment. Agency
  dashboards therefore always show 0 clients, and provisioning by
  `AGENCY_ADMIN` (allowed in `confirmProvision`) produces an unlinked tenant.
- **Two of the three partner/commission/payout engines are in-memory-only.** The
  commission ledger (`CommissionEntry`) has a **dead write path**
  (`commissionRepository.saveEntry` has no callers); payout providers are stubs
  (`RazorpayRouteProvider` fabricates references, no Razorpay Route API).
- **Authorization gaps**: unguarded agency server actions (IDOR), missing
  per-tenant membership checks on `clients/[id]` and `portal/[tenantId]`, and a
  session callback that never re-validates `agencyId`.
- **Real, canonical foundations exist** to build on: `WebsiteAgency`,
  `AgencyTenant`, `Workspace` (`type: TENANT|AGENCY`), `WorkspaceMember`
  (with a real `transferOwnership`), `ClientAssignment`, Billing v2 with
  `BillingPlan.family` (`creator|agency`), `CommissionPolicy`, `PayoutBatch`
  persistence, `razorpayAccountId` fields (dormant), and super-admin agency
  pages.

**Conclusion:** the Agency platform is the natural substrate for the Partner
Platform. No new architecture is needed — the audit-gap work is: (a) wire the
agency↔creator link, (b) guard agency actions/pages, (c) persist commission, and
(d) add the settlement layer (Smart Collect / Razorpay Route) on the existing
`PayoutBatch` + dormant `razorpayAccountId` foundations.

## 2. Navigation Matrix

| Nav item | Route | Status |
|---|---|---|
| Dashboard | `/agency` | ✅ real |
| Clients | `/agency/clients` | ✅ real |
| Websites | `/agency/websites` | ✅ real |
| Creator Import | `/agency/generate` | 🔴 **no route** (nav points nowhere) |
| Templates | `/agency/templates` | 🔴 placeholder ("coming soon") |
| Analytics | `/agency/analytics` | 🟡 semi-real (in-memory ledgers → zeros until `rehydrateEngine`) |
| Domains | `/agency/domains` | 🔴 placeholder ("coming soon") |
| Team | `/agency/team` | ✅ real |
| Billing | `/agency/billing` (AGENCY_ADMIN only) | ✅ real |

- **Current nav**: `src/lib/navigation/config.ts` `AGENCY_NAV` (142–174).
- **Legacy/duplicate nav**: `src/lib/lifecycle/navigation.ts` `AGENCY_NAV`
  (59–71) points to nonexistent `/agency/creators`, `/agency/workspaces` —
  unused by the Sidebar.
- **Routes not in nav**: `/agency/branding` (real, read-only), `/agency/work`
  (real), `/agency/portal/[tenantId]` (real, public), `/agency/clients/[id]`
  (real), `/agency/dashboard` (redirect), `/agency/[agencyId]` (hardcoded
  placeholder + the **only** page with a Sidebar layout).
- **Layout problem**: **no `/agency/layout.tsx`** — the `AGENCY_NAV` Sidebar
  renders only under the orphan `/agency/[agencyId]/layout.tsx`. All real agency
  pages render without the sidebar shell.
- **Production**: every `/agency/*` probe → 307 (guard works; no 404 loop).

## 3. Page Matrix

| Page | Data source | Status |
|---|---|---|
| `/agency` dashboard | `clientService.getSummary` + `getRecentActivity` (Prisma, real) | 🟢 real; `subdomain: null`/`products: 0` hardcoded in rows |
| `/agency/dashboard` | redirect → `/agency` | 🟢 |
| `/agency/clients` | `clientService.listByAgency` | 🟢 real |
| `/agency/clients/new` | always redirect → `/agency/clients` | 🔴 placeholder (no form) |
| `/agency/clients/[id]` | direct prisma + `clientHealthEngine` + activity | 🟢 real; 🔴 **no auth guard (IDOR)** |
| `/agency/websites` | `getAgencyClients` (adapters) | 🟢 real |
| `/agency/domains` | none | 🔴 placeholder |
| `/agency/billing` | workspaces → billingRepository invoices+subs | 🟢 real |
| `/agency/analytics` | `agency.actions` (in-memory ledgers + some real counts) | 🟡 zeros until engine rehydrate |
| `/agency/branding` | `agencyBranding.getBrand` (Setting) | 🟢 real, read-only (white-label "future") |
| `/agency/templates` | none | 🔴 placeholder |
| `/agency/work` | `assignmentService.getMemberAssignments` | 🟢 real |
| `/agency/team` | workspaceMember + team summary | 🟢 real |
| `/agency/portal/[tenantId]` | tenant/agencyTenant/website + branding | 🟢 real, intentionally public |
| `/agency/[agencyId]` | none | 🔴 hardcoded placeholder |

## 4. Role Matrix

| Role | Guard surfaces | Notes |
|---|---|---|
| `SUPER_ADMIN` | `/super-admin` only; always-allowed in `canAccess`; forced to `/super-admin` | cannot stay on `/agency` |
| `AGENCY_ADMIN` | `/agency/*`, `/admin/*`, `/builder`, `/onboarding`, Billing nav | `tenantId: null`, `agencyId` in token |
| `AGENCY_STAFF` | `/agency/*`, `/admin/*`, `/onboarding` (**not** `/builder`) | same `agencyId` scope |
| `ADMIN` (creator) | `/admin/*`, `/builder`, `/onboarding` | `tenantId` in token |
| `WorkspaceRole` (`OWNER/ADMIN/MEMBER/VIEWER`) | per-workspace (`workspace-permissions.ts`) | separate from global role |
| `PartnerType`/`PartnerStatus` | partner-domain models, not login roles | dormant-ish |

**Overlaps:** `/admin/*` shared by all 4; `/builder` by ADMIN + AGENCY_ADMIN;
`/onboarding` by ADMIN + agency roles.
**Gaps:**
- Agency pages trust JWT `agencyId` with **no live membership re-check**.
- **IDOR**: `agency/clients/[id]` and `agency/portal/[tenantId]` fetch by URL
  param without asserting agency ownership.
- `agency.actions.ts` (`getAgencyRevenue/Payouts/PartnerStats`) — **no session
  check at all**; any authenticated caller can read any agency's data.
- Creator mutating actions (`settings`, `milestone`, `link`, `content-feed`) are
  tenant-scoped only → agency staff **cannot** operate a client's content without
  impersonation.
- Session callback re-validates only `role`, not `agencyId`/membership → revoked
  staff retains access up to 7 days.

## 5. Workspace Relationship Matrix

| Concept | Implementation | Status |
|---|---|---|
| Workspace type | `Workspace.type` `TENANT\|AGENCY` (`DOMAIN FROZEN`) | ✅ canonical |
| Creator workspace | one per tenant (`Workspace.tenantId` unique) | ✅ |
| Agency workspace | one per agency (`Workspace.agencyId` unique) | ✅ |
| Members | `WorkspaceMember` (role, status) | ✅ canonical |
| Ownership transfer | `WorkspaceMemberService.transferOwnership` (OWNER→ADMIN, transactional) | ✅ real (per-workspace) |
| Tenant ownership transfer | ❌ none at Tenant level | missing |
| Agency↔creator link | `AgencyTenant` (unique tenantId, rev-share, can-edit flags) | 🔴 **never written** |
| Multi-agency per creator | `AgencyTenant.tenantId` unique → one agency only | ❌ not supported (by design, single-partner model) |
| Staff↔client assignments | `ClientAssignment` (workspaceId+tenantId+userId+role) | ✅ real (within agency) |
| Lazy workspace creation | `resolve-workspace.ts` creates TENANT/AGENCY workspace on login | ✅ |
| Dead parallel auth | `src/lib/identity/**` (WorkspaceType "creator"\|"agency"\|"super_admin") | 🔴 dead |

## 6. Agency Capability Matrix

| Capability | Status |
|---|---|
| Client acquisition (list clients) | ✅ real (`ClientService`) |
| Website setup / creation | 🔴 gap — `confirmProvision` (AGENCY_ADMIN-allowed) does **not** link the new tenant to the agency |
| Customization | 🟡 partial — `ClientAssignment` roles exist; content actions are tenant-scoped (agency cannot edit) |
| Branding / white-label | 🟡 `agencyBranding` read-only; "future release" banner |
| Migration | 🔴 none |
| Training / support | 🔴 none (super-admin support search exists, not agency-facing) |
| Marketing | 🔴 none |
| Domains | 🔴 agency placeholder (Vercel service is creator-scoped) |
| Templates | 🔴 placeholder |
| Analytics | 🟡 in-memory ledgers → zeros |

## 7. Service Dependency Map

```
agency pages ──► clientService (AgencyTenant reads)
              ├─► workspace adapters (getAgencyClients — DUPLICATES clientService)
              ├─► assignmentService / assignment-repository (ClientAssignment)
              ├─► workspaceRepository / WorkspaceService / WorkspaceMemberService
              ├─► agency.actions ─► commissionService ─► commissionLedger (IN-MEMORY)
              │                  ├► payoutService ─► payoutLedger ─► payoutRepository (persisted) ─► STUB providers
              │                  └► partnerService ─► partnerEngine (in-memory + best-effort DB)
              └─► billingRepository (v2 invoices/subs via workspace ids)
provisioning ─► confirmProvision (SUPER_ADMIN | AGENCY_ADMIN) ─► provisioning-service ─► creates tenant+workspace (NO agency link)
super-admin  ─► getPlatformStats, agencies pages, generateLoginAsToken → /api/auth/login-as (tenant impersonation)
```

**Duplication:** `clientService.listByAgency` vs `getAgencyClients` (adapters)
both read `AgencyTenant` and return near-identical client lists — both read-only,
**neither has a writer**.

## 8. Database Relationship Map

- **Canonical/used:** `WebsiteAgency`, `AgencyTenant`, `Workspace`,
  `WorkspaceMember`, `ClientAssignment`, `User(role,agencyId,tenantId)`,
  Billing v2 (`BillingAccount`, `BillingPlan.family`, `BillingSubscription`,
  `BillingEvent`, `BillingInvoice`), `CommissionPolicy`, `PayoutBatch`/
  `PayoutReservation`, `Offering`/`Purchase`, `Partner*`, `CommissionRule`,
  `CommissionEntry`.
- **Dead/dormant:** `AgencySubscription` (orphan table — in migrations, not in
  schema.prisma); `WebsiteAgency.razorpayAccountId`/`razorpaySetupComplete`,
  `Tenant.razorpayAccountId`, `ProductOrder.routeTransferId` (schema-only, never
  read/written); `Subscription` (@deprecated).
- **Commission fields:** `CommissionEntry` has `partnerId, platformShare,
  partnerShare, platformPercent, partnerPercent` but **no `agencyId` and no
  `commissionPercentage`** — the agency split lives on `AgencyTenant`
  (`revSharePercent` 20, `productRevSharePercent` 10) and `CommissionPolicy`
  (`agencyClientPercent` 20, `platformPercent` 10, `referralPercent` 5).
- **Settlement:** no `Settlement` table — settlement state lives on
  `PayoutReservation` (`reserved/settled`, `settledAt`, `releasedAt`).
- **Migration debt:** `RevenueConfiguration`, `CommercialPricing`,
  `CommissionPolicy`, `BillingConfiguration`, `AlertRecord`, `JobRecord` exist
  only via runtime SQL (not Prisma migrations); `GenerationSession*` has no
  CREATE migration; `prisma migrate deploy` is **manual-only** (no CI, no
  workflow files — `.github/workflows/` is empty).

## 9. Legacy Matrix

| Item | Status |
|---|---|
| `src/lib/identity/**` (org/membership/session/authorization/roles) | 🔴 dead — zero imports |
| `src/modules/workspace/domain/authorization.ts` (`authorizationService`) | 🔴 near-dead — `Permission` type only |
| `/api/live-status` | 🔴 dead |
| `/api/instagram` + `InstagramFeed` | 🔴 dead chain |
| `/api/checkout` | 🔴 dead (checkout now via `checkout.actions` + billing providers) |
| `/api/test-storage` | 🔴 no refs (now SUPER_ADMIN-guarded) |
| `/api/auth/auto-login` | 🔴 no refs |
| `agency/[agencyId]/` (page + layout) | 🔴 hardcoded placeholder; the only Sidebar layout |
| `lib/lifecycle/navigation.ts` AGENCY_NAV (dead links) | 🔴 legacy duplicate |
| `lib/navigation/config.ts` AGENCY_NAV | ✅ current |
| `src/config/admin-nav.ts` vs `lib/navigation/config.ts` CREATOR_NAV | 🟡 creator nav duplicated |
| `Subscription` (legacy per-tenant) | 🟡 read-only migration compatibility |
| `AgencySubscription` orphan table | 🔴 orphan |

## 10. Duplicate Matrix

| Concern | Duplicates |
|---|---|
| Agency client listing | `clientService.listByAgency` vs `workspace/adapters.getAgencyClients` |
| Agency nav | `navigation/config.ts` AGENCY_NAV vs `lifecycle/navigation.ts` AGENCY_NAV (dead links) |
| Creator nav | `config/admin-nav.ts` vs `navigation/config.ts` CREATOR_NAV |
| Workspace membership | `components/workspace/WorkspaceMembers.tsx` + `workspace-membership.ts` vs dead `lib/identity/membership/**` |
| Domains | Vercel service (real) vs `features/domains/service.ts` (simple CNAME stub with fake `sslStatus`) |
| Workspace types | `WorkspaceType` (TENANT/AGENCY) vs dead `lib/identity/types.ts` ("creator"\|"agency"\|"super_admin") |

## 11. Partner Readiness Assessment

The existing Agency platform **can** evolve into a Partner Platform without
architectural change, because the canonical primitives already exist:

- **Partner (agency tier)** → `WebsiteAgency` (+ `PartnerType`/`PartnerStatus`
  models) — readiness: ✅
- **Agency** → `WebsiteAgency` — ✅
- **Freelancer** → `Workspace.isFreelancer` + `ClientAssignment` role —
  ✅ partial (field exists, not exercised)
- **Creator workspace** → `Workspace.type=TENANT` + `WorkspaceMember` — ✅
- **Commission on subscriptions** → `CommissionEntry` (partner-level) +
  `CommissionPolicy` + `AgencyTenant.revSharePercent` — 🟡 model exists, write
  path dead
- **Settlement (Smart Collect / Razorpay Route)** → `PayoutBatch` +
  `PayoutReservation` + dormant `razorpayAccountId` — 🔴 stubs only

**Gaps that must close before Partner launch** (all additive, none architectural):
1. `AgencyTenant` writer (agency↔creator link) at provisioning + agency-managed
   creator creation.
2. Guard `agency.actions.ts` + add membership checks (fix IDORs).
3. Persist `CommissionEntry` (wire `commissionRepository.saveEntry` into the
   billing capture path).
4. Implement the settlement engine on `PayoutBatch` + `razorpayAccountId`
   (real Razorpay Route API, replacing the stub provider).

## 12. Missing Features (genuinely absent)

- **Agency↔creator link writer** (`AgencyTenant` has zero writers; provisioning
  doesn't scope the new tenant to the agency).
- **Agency workspace sidebar shell** (no `/agency/layout.tsx`).
- **Agency-scoped content editing** (creator actions are tenant-only; no
  agency-as-manager write path).
- **Agency domain management** (placeholder; Vercel service is creator-scoped).
- **Agency templates + creator import route** (`/agency/generate`).
- **Tenant ownership transfer** (only per-workspace member OWNER transfer).
- **Agency impersonation** (login-as is tenant-ADMIN only).
- **Persisted commission** (`CommissionEntry` write path dead).
- **Real settlement** (Smart Collect / Razorpay Route; all payout providers stubs).
- **SUPPORT/read-only roles** (only the 4-role enum).
- **Multi-agency / multi-partner per creator** (not supported; `AgencyTenant.tenantId` unique).

## 13. Future Partner Architecture (recommendation)

Keep the single `Partner → Agency → Freelancer → Creator Workspace` hierarchy on
existing tables — **no new runtimes**:

```
Partner/Agency (WebsiteAgency + PartnerType)
  │  owns: Client acquisition, branding, domains, templates, support
  ▼
AgencyTenant (link + revSharePercent + capability flags)   ← add writer
  │
  ▼
Creator Workspace (Workspace.type=TENANT) + WorkspaceMember
  │  creator pays CreatorStore
  ▼
BillingSubscription (creator) ──► BillingEvent/Invoice (creator account)
  │
  ▼
CommissionEntry (partner share; agency split from AgencyTenant)   ← persist write path
  ▼
PayoutBatch/PayoutReservation ──► Settlement (Smart Collect / Razorpay Route)   ← replace stub
```

Commission should attach at **BillingSubscription** (source amount + plan family)
and **BillingEvent** (PAYMENT_SUCCEEDED as the trigger), resolving the partner via
`AgencyTenant`/`Partner*`; settlement attaches at `PayoutReservation` using the
partner's dormant `razorpayAccountId`. Capability flags per client already exist
(`AgencyTenant.canEdit*`).

## 14. Future Implementations (prioritized)

### Implementation-41 — Permissions & Agency Platform (Phase 2 of Platform Ops)
- Objective: close authorization + relationship gaps.
- Scope: guard `agency.actions.ts` (session + agency scoping); add membership
  checks to `clients/[id]`/`portal/[tenantId]`; add `/agency/layout.tsx` sidebar
  shell + fix dead nav (`/agency/generate`); wire the `AgencyTenant` writer into
  provisioning (`confirmProvision` for AGENCY_ADMIN links the new tenant);
  session callback re-validates `agencyId`/membership; add SUPPORT/read-only
  roles; remove dead `lib/identity` + `agency/[agencyId]`.
- Priority: **Critical**. Complexity: Medium-High.

### Implementation-42 — Commission & Settlement Engine
- Objective: make commission real + settlement ready.
- Scope: persist `CommissionEntry` (wire `commissionRepository.saveEntry` into
  billing capture); resolve partner/agency splits via `CommissionPolicy` +
  `AgencyTenant.revSharePercent`; implement the real Razorpay Route settlement
  on `PayoutBatch` + `razorpayAccountId` (replace stub provider); agency revenue
  page reads persisted ledger; super-admin agencies detail shows revenue/commission.
- Priority: **High** (pre-revenue). Complexity: High.

### Implementation-43 — Agency Operations Activation
- Objective: finish agency capabilities.
- Scope: agency domain management (reuse Vercel service scoped by agency's
  `AgencyTenant`); agency templates; `/agency/generate` (creator import →
  provision → **link**); agency impersonation (extend login-as to agency users);
  tenant ownership transfer; remove placeholders; cleanup dead code + migrate
  runtime-SQL tables under Prisma Migrate; consolidate duplicate navs/services.
- Priority: **Medium**. Complexity: Medium-High.

## 15. Risks

**Architecture:** `Workspace` DOMAIN FROZEN (any schema change needs review);
6 models only via runtime SQL; `migrate deploy` manual-only → drift risk;
commission engine in-memory (loses history on restart).
**Security:** unguarded `agency.actions.ts` (IDOR); `clients/[id]`/`portal` no
membership check; session callback never re-validates `agencyId`; `/api/checkout`
guest email (dead route, still exposed).
**Billing:** fragmented agency billing identity (register route sets
`BillingAccount.accountId = agency.id`, but billing v2 sets
`BillingInvoice.accountId = workspaceId`) — agency revenue queries must handle both.
**Workspace:** `AgencyTenant` never written → dashboards empty; no tenant
ownership transfer; `transferWorkspace` (partner engine) only reassigns, doesn't
move real ownership.
**Permissions:** no SUPPORT/read-only roles; agency staff can't edit client
content without impersonation.
**Scaling:** in-memory ledgers won't survive multi-instance/serverless; no
durable queue for settlement.

## 16. Production Verification

- **Build/typecheck**: `npx tsc --noEmit` ✅ clean.
- **Routes (production, unauthenticated)**: `/agency`, `/agency/clients`,
  `/agency/analytics`, `/agency/billing`, `/agency/domains`, `/agency/templates`,
  `/agency/creators`, `/agency/generate`, `/super-admin/agencies` → **307** (guard
  works; no `/workspace` 404 loop — CRITICAL-02 holds).
- **Agency console** is DB-backed and renders (verified via file/line + the
  prior R13/R14 Playwright suites); agency pages share the shared Supabase
  tenant, so a real AGENCY_ADMIN session would surface the current (empty-
  unless-linked) client data — no agency user exists in the shared DB to
  exercise live (documented limitation).
- **Super-admin agencies**: `/super-admin/agencies` + `[id]` show real
  `WebsiteAgency` + `AgencyTenant` counts (source-verified), with **no**
  revenue/commission/impersonation tooling (gap).
- Full interactive browser verification of the agency flow requires an
  AGENCY_ADMIN account — not present in the shared DB (no agency was ever
  provisioned); flagged as a prerequisite for IMPLEMENTATION-41 verification.

---

**Bottom line:** the Agency Platform is a real, DB-backed, previously-hidden
console whose canonical primitives (`WebsiteAgency`, `AgencyTenant`, `Workspace`,
`WorkspaceMember`, `ClientAssignment`, Billing v2 with plan `family`,
`CommissionPolicy`, `PayoutBatch`) are exactly what a Partner Platform needs. The
audit's critical findings — un-wired `AgencyTenant`, unguarded agency actions,
dead commission write path, stub settlement, missing sidebar shell, dead/legacy
duplicates — are all additive fixes that extend (never replace) the architecture,
roadmapped as IMPLEMENTATION-41 (Permissions & Agency Platform), -42 (Commission
& Settlement), and -43 (Agency Operations Activation).
