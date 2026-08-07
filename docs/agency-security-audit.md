# Agency Security Audit

RCCF-VALIDATION-02 · Agency/Freelancer Launch.

A focused security + permissions audit of the agency journey. Every finding is
evidence-based; **fixed** items are verified (tsc, build, full suite).

## Cross-tenant / cross-workspace

| # | Sev | Issue | Status |
| --- | --- | --- | --- |
| F12 | Critical | `claimInvitation` email-keyed upsert resets an existing user's password/tenant/role/agency → account takeover. | **Fixed** — reject claims for existing accounts; emails normalized. |
| C1 | Critical | `acquireAndProvision` server action had no auth → anonymous mass tenant/site creation. | **Fixed** — authenticated session required. |
| C2 | Critical | Billing actions never bound `workspaceId` to the caller's tenant → read/cancel/change another workspace's subscription. | **Fixed** — `authorizeWorkspace(workspaceId, tenantId)` verifies ownership. |
| A1/H3 | Critical/High | `verifyTenantAccess` allowed any null-tenantId user (agency/support/read-only) to read any tenant's analytics. | **Fixed** — agency/support must own the tenant via `AgencyTenant`. |
| H1 | High | `/agency/portal/[tenantId]` no ownership guard → any agency member views any tenant's portal. | **Fixed** — `assertAgencyOwnsTenant`. |
| M2 | High | `/agency/clients/[id]` ownership check skipped when `agencyId` absent. | **Fixed** — `agencyId` required + ownership asserted. |
| M4 | Medium | Self-serve agency signup accepted an arbitrary paid `planCode`. | **Fixed** — locked to `agency_free`. |
| M3/M5 | Medium | `__workspace` cookie not user-bound; role trusted 7 days; tenant resolution trusts the cookie. | Documented — follow-up. |
| H2 | High | `?preview=true` exposes unpublished draft content to anonymous visitors. | Documented — product decision. |

## Role escalation / dead permission matrix

- The `authorizationService` Permission matrix (`src/modules/workspace/domain/authorization.ts`) is **never imported by any server action** — it is dead code. Agency actions gate only on role + membership.
- **H4:** AGENCY_STAFF (workspace MEMBER) can provision creators, view revenue/payouts/billing — actions the OWNER/ADMIN-only permissions should gate. Fix: wire `authorizationService.require(...)` and distinguish AGENCY_ADMIN vs AGENCY_STAFF.
- **M1:** `confirmProvision`/`analyzeUrl` check role only, not agency membership/status.

## What is solid (verified)

- `partner.actions.ts` ownership checks (`assertAgencyOwnsTenant`) on invitations + branding.
- `agency.actions.ts` derives agencyId from the session (client-supplied id ignored).
- SUPER_ADMIN-gated super-admin/subscription/impersonation paths.
- Media/API route scoping; the session callback re-validates role + agency membership.
- READ_ONLY routing limited to `/admin` + `/support`; `canMutate` excludes READ_ONLY/SUPPORT.

## Recommended follow-ups (priority)

1. Wire the Permission matrix into agency server actions (close H4/M1).
2. Bind the `__workspace` cookie to `userId` + re-verify membership/role per read (M3/M5).
3. Gate `?preview=true` behind an authenticated session or signed token (H2).
4. Add agency-managed domain + billing self-serve actions (D2/B1).
