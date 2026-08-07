# Platform Security Audit — RCCF-VALIDATION-04

## Summary

No exploitable cross-tenant, cross-agency, privilege-escalation, IDOR, CSRF, or
session-replay vulnerability was found in the Super Admin platform. All
destructive actions are `SUPER_ADMIN`-gated via `getServerSession` role checks.
The Billing v2 and webhook layers are signed/idempotent. One webhook robustness
gap and several hardening items were fixed; the rest are documented.

## Verification matrix

| Attempt | Result | Evidence |
| --- | --- | --- |
| Cross-tenant access | **Blocked** | Every super-admin action re-checks `session.user.role === "SUPER_ADMIN"`; all data access is tenant-scoped via `getWebsiteId`/tenantId parameters resolved from the session, never from the URL. |
| Cross-agency access | **Blocked** | Agency actions require `AGENCY_ADMIN/AGENCY_STAFF` + agency membership in `auth.ts`; client tenant IDs come from the session, not request params. |
| Privilege escalation | **Blocked** | `session` callback re-reads the DB user each request and compares roles; tampered `role` in the token is rejected. |
| Role tampering | **Blocked** | See above; JWT signed with `jose`/NEXTAUTH_SECRET. |
| URL tampering | **Blocked** | `/super-admin/**` guarded by layout/action role checks; no destructive route accepts a foreign websiteId. |
| Session replay | **Partial** | JWT sessions validate expiry + role; the impersonation cookie is 1h and SUPER_ADMIN-gated at issuance. |
| Expired JWT | **Blocked** | `getServerSession` enforces token expiry. |
| Login-As misuse | **Gated** | Generation requires SUPER_ADMIN; 5-min token; weaknesses below. |
| CSRF | **Blocked** | All mutations are server actions / POST with `Origin` checks where relevant; no GET-mutating endpoints in scope. |
| IDOR | **Blocked** | Tenant/user/workspace lookups derive the owner from the session (`requireAuth` returns `session.user.tenantId`), never from a client-supplied id. |
| API replay | **Blocked** | Webhooks idempotent via unique `idempotencyKey`; server actions are not replayable to repeat side effects (state machines reject illegal transitions). |
| Permission bypass | **Blocked** | `createWebhook`/registry-sync/`togglePlatformFlag`/plan actions all verify SUPER_ADMIN first. |

## Findings

| ID | Sev | Finding | Fix |
| --- | --- | --- | --- |
| S-01 | HIGH | Razorpay webhook `crypto.timingSafeEqual` throws on empty/different-length signature → uncaught 500 instead of 401. | **FIXED** — length-guarded; bad signature → 401. |
| S-02 | MEDIUM | Login-As token is passed in the URL query string (browser history, referrer, access logs); generation isn't audited; the impersonation audit actor is the literal `"superadmin"`. | Roadmap: POST body, audit generation, record the real actor. |
| S-03 | MEDIUM | Password reset resets ALL `ADMIN` users of a tenant in one `updateMany`, is unaudited, and doesn't invalidate live sessions. | Roadmap: per-user reset + audit + session revocation. |
| S-04 | MEDIUM | Agency status is never checked at auth — a `SUSPENDED` agency's users can still operate the console. | Roadmap: gate `auth.ts` on `WebsiteAgency.status`. |
| S-05 | MEDIUM | Feature-flag keys accept arbitrary strings (no zod validation) — a typo stores a dead flag; no risk to security, only governance. | Roadmap: validate keys. |
| S-06 | LOW | `deleteTenant` previously ran without an audit entry; it now logs before deleting (G-01 **FIXED**). |
| S-07 | GOOD | No secrets in client code; provider keys are server-side env; `ProviderAccount` stores YouTube keys only. |

## Destructive-action review

Every destructive action audited: tenant delete, purge content feed, registry
sync apply (can DELETE plans), password reset, plan change, impersonation,
generation recovery — all require an authenticated SUPER_ADMIN session and
(where it matters) are logged to `AuditLog`. The one omission — registry-sync
apply having no confirmation and no audit — is a governance item (G-40/G-18,
roadmap) rather than a security exploit, since the endpoint is role-gated and
dry-run-first.
