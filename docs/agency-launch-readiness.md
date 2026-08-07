# Agency Launch Readiness

RCCF-VALIDATION-02 · Agency/Freelancer Launch.

## Scores

| Area | Score | Notes |
| --- | --- | --- |
| **Agency launch readiness** | **64 / 100** | The critical security holes are fixed; core workflows are missing. |
| Registration | 82 | Fixed plan tampering (M4); name validation (F1) remains. |
| Workspace | 40 | No create/rename/delete; cookie trust (M3) documented. |
| Team management | 25 | Invite/role/remove actions absent (F11); takeover fixed (F12). |
| Client management | 30 | View-only; no CRUD/archive/restore (F19/F21). |
| Invitation | 75 | Takeover + email normalization fixed; no emailed link (F18). |
| Website generation | 45 | Not idempotent (G1); plan limits unenforced (G3); orphaned admin (F23). |
| Builder (agency) | 25 | Agency can't open client builder (F24). |
| White-label | 30 | Branding stored but never applied (F27). |
| Commerce | 60 | Client commerce works; no agency roll-up; no product commission (B2). |
| Domains | 40 | No agency domain actions (D2); duplicate-domain risk (D1). |
| Analytics | 55 | Cross-tenant leak fixed (A1); no agency aggregate (A2). |
| Billing | 35 | Cross-tenant fix (C2); no agency self-serve billing (B1). |
| **Security** | **85** | All critical/high IDORs fixed; permission matrix unenforced (H4). |
| **Performance** | 55 | N+1 client health eval (P1); no pagination (P2). |

## Fixed in this validation (verified)

| ID | Sev | Fix |
| --- | --- | --- |
| F12 | Critical | `claimInvitation` no longer resets existing accounts (rejects claims for existing emails). |
| C1 | Critical | `acquireAndProvision` / `executeStrategy` now require an authenticated session. |
| C2 | Critical | Billing actions bind `workspaceId` to the caller's tenant. |
| A1 / H3 | Critical / High | `verifyTenantAccess` now requires agency ownership for tenant-less agency/support members. |
| H1 | High | `/agency/portal/[tenantId]` enforces agency ownership. |
| M2 | High | `/agency/clients/[id]` requires `agencyId` + ownership (no bypass). |
| M4 | Medium | Self-serve agency signup locked to `agency_free`. |
| F16 | Medium | Invite emails normalized on create + claim. |

## Release-blocking follow-ups (High)

1. **Generation idempotency** (G1) — resolve existing tenant before `confirmProvision`; unique import key.
2. **Agency plan enforcement** (G3/B1) — resolve the agency plan by workspace; enforce `max_clients` server-side; add self-serve upgrade/downgrade/cancel actions.
3. **Agency builder access** (F24) — resolve the website by `AgencyTenant.canEdit*` ownership instead of `session.user.tenantId`.
4. **Client lifecycle** (F19/F21) — archive/restore/delete + status transitions.
5. **Team management** (F11) — invite/accept/reject/expire/role-change/remove with last-owner protection.
6. **White-label** (F27) — apply agency brand CSS vars to storefront/builder.
7. **Remove orphaned synthetic admins** (F23) — delete `admin-<slug>@<host>` at claim time.

## Verdict

The agency journey's **security posture is sound after this validation** (all
critical/high IDOR + takeover vectors closed). The product is **not yet
launch-ready for agencies**: core management workflows (team, client lifecycle,
agency builder, self-serve billing, white-label application) are absent or
incomplete. These are feature gaps rather than defects — schedule them before
opening the agency channel, while the creator (individual) path remains
launchable.
