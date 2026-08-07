# VALIDATION-02 — Agency / Freelancer Launch Validation

RCCF-VALIDATION-02 · Launch Readiness Initiative.

**Type:** Read-only audit + validated blocker fixes. No new features, no
refactor, no architecture change.

**Persona:** Agency Owner / Manager / Member / Read-only Member / Client /
Former / Suspended / Deleted / Pending / Expired. Agencies: digital marketing,
web design, branding, freelancer, social media, SEO, content.

## Journey map

```
Landing → Agency Signup → Workspace Creation → Subscription → Agency Dashboard
→ Branding → Client Creation → Client Invitation → Client Import
→ Website Generation → Builder → Publishing → Domain → Commerce
→ Analytics → Billing → Logout/Login
```

Each step was traced to its server action + module; the map below records what
works, what is missing, and where the journey breaks.

## Issue log

Every issue: ID · Severity · Journey step · Expected → Actual · Root cause ·
Suggested fix.

### Agency registration / workspace

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| F4 | High | Subscription | Agency signup creates the subscription on a `BillingAccount` with `workspaceId: null`; the agency billing page resolves plans **by workspace id** → the chosen plan is never seen; billing always shows "Partner Free" and the client limit is 1. |
| F1 | High | Registration | Agency/creator display name is unvalidated (whitespace, emoji, >1000 chars). |
| F6 | Medium | Registration | Anonymous `persona:"agency"` creates an ACTIVE agency; capacity is never enforced at creation. |
| F8 | High | Workspace | No workspace create/rename/delete actions or UI exist; the lifecycle machine is dead. |
| F7 | Medium | Workspace | `__workspace` cookie role is trusted for 7 days without DB revalidation; demoted/removed members keep their old role. |
| F9 | Medium | Workspace | No last-OWNER protection in member remove/demote/transfer (dead code today). |
| M3 | Medium | Workspace | Cookie is not user-bound; shared browsers inherit the previous user's workspace + role. |

### Team management / invitations

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| F12 | **Critical** | Invite | `claimInvitation` email-keyed upsert **overwrites an existing user's password, tenantId, role and agencyId** — an agency can reset a known email's account. **FIXED** (reject claims for existing accounts). |
| F11 | High | Team | Agency team management (invite/role/remove) is completely unimplemented; the team page is read-only. |
| F16 | Medium | Invite | Invite email not normalized → case-variant duplicate users. **FIXED** (normalized on create + claim). |
| F15 | Low | Invite | No explicit resend; re-issue silently invalidates the prior token. |
| F18 | Medium | Invite | Claim tokens are shown to agency staff in the UI (no emailed link). |

### Client management

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| F19 | High | Clients | No client create/edit/archive/restore/delete/duplicate actions exist; the console is view-only. |
| F23 | High | Clients | Every agency import creates an orphaned privileged synthetic ADMIN (`admin-<slug>@<host>`) with an unknown password. |
| F24 | High | Builder | Agency users can't open a client's builder — builder actions resolve `session.user.tenantId` (null for agencies); "Open Builder" links are broken. |
| F20 | Medium | Clients | Client list does an N+1 health evaluation per client; search/filter/sort are client-side, no pagination. |
| F21 | Medium | Clients | `AgencyTenant.status` is never mutated; no archive/transfer/detach lifecycle. |
| F22 | Medium | Clients | Duplicate creator imports aren't prevented (slug auto-suffix `-2`/`-3`). |

### Website generation

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| G1 | **Critical** | Generate | No concurrency/idempotency — two agency users importing the same client create duplicate tenants (`confirmProvision` never checks existing). |
| G2 | High | Generate | Partial failure (provision OK, agency link fails) leaves an orphaned tenant; no retry/resume by runId. |
| G3 | High | Generate | Agency plan client limits are never enforced (`max_clients` = 0 for all plans). |
| G4 | Medium | Generate | `generateWebsite` action is a non-functional stub. |

### White-label

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| F27 | High | Branding | Agency branding is stored but never applied to the storefront/builder — the CSS vars are unconsumed; `/agency/branding` is missing from the nav. |
| F28 | Medium | Branding | Branding inputs unvalidated; global to all clients (no per-client override). |
| F29 | Low | Branding | Branded portal falls back to "Powered by Creatos". |

### Billing / domains / analytics / commerce

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| C2 | **Critical** | Billing | Billing actions never bind `workspaceId` to the caller's `tenantId` — a tenant admin can read/cancel/change another workspace's subscription. **FIXED**. |
| B1 | High | Billing | No agency self-serve billing actions (upgrade/downgrade/cancel/trial) — agency users have `tenantId: null`, so all creator billing actions reject them. |
| B2 | High | Billing | Commission/payout ledgers are in-memory and never initialized at runtime → agency revenue/payouts read zeros. |
| D1 | High | Domains | `customDomain` isn't unique; no server-side duplicate-domain guard. |
| D2 | High | Domains | No agency domain actions (attach/verify/detach/reconnect); agency domains page is read-only. |
| A1 | **Critical** | Analytics | `verifyTenantAccess` bypassed for agency users (tenantId null) → any agency member can read ANY tenant's analytics. **FIXED**. |
| A2 | High | Analytics | No agency aggregated analytics across clients. |
| C1 | **Critical** | Commerce/generate | `acquireAndProvision` server action was unauthenticated → anonymous mass-creation of tenants/sites. **FIXED**. |

### Permissions / security

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| H1 | High | Security | `/agency/portal/[tenantId]` had no ownership guard → any agency member could view any tenant's portal by URL. **FIXED**. |
| M2 | High | Security | `/agency/clients/[id]` ownership check was skipped when the session had no `agencyId`. **FIXED**. |
| H3 | High | Security | Cross-tenant analytics reads via null tenantId (see A1). **FIXED**. |
| H4 | High | Permissions | AGENCY_STAFF can provision creators, view revenue/payouts/billing — the declared Permission matrix is never enforced (dead code). |
| M1 | Medium | Permissions | `confirmProvision`/`analyzeUrl` only check role, not agency membership/status. |
| M4 | Medium | Registration | Self-serve agency signup could request an arbitrary paid `planCode` from the request body. **FIXED** (forced to `agency_free`). |
| M3/M5 | Medium | Permissions | Workspace cookie drives tenant resolution without membership revalidation. |
| H2 | High | Security | `?preview=true` on a storefront exposes unpublished draft content to anonymous visitors (product decision — documented). |

## Explicit fix status

Fixed and committed (each verified: `tsc --noEmit`, `next build`, full
101-file / 1983-test suite):

| ID | Fix |
| --- | --- |
| F12 (Critical) | `claimInvitation` rejects claims for emails that already have an account (no password/tenant reset); invite emails normalized (F16). |
| C1 (Critical) | `acquireAndProvision` + `executeStrategy` require an authenticated session. |
| C2 (Critical) | `authorizeWorkspace` now verifies the workspace belongs to the caller's tenant. |
| A1/H3 (Critical/High) | `verifyTenantAccess` is async; agency/support members must own the tenant via `AgencyTenant`. |
| H1 (High) | `/agency/portal/[tenantId]` requires agency ownership (`assertAgencyOwnsTenant`). |
| M2 (High) | `/agency/clients/[id]` requires `agencyId` + ownership (no bypass). |
| M4 (Medium) | Self-serve agency signup is locked to the `agency_free` plan. |

Remaining items are documented as follow-ups in `docs/agency-launch-readiness.md`.
