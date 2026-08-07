# Agency Client Security Audit

RCCF-VALIDATION-03 · Agency Client Launch.

Security + permissions audit of the client side of the agency journey.
**Fixed** items are verified (tsc, build, full suite).

## Cross-tenant access (verified safe)

- **Client → another tenant**: blocked. All admin actions resolve
  `session.user.tenantId`; media/orders/analytics/bookings are tenant-scoped
  (V-01/V-02 fixes). `/super-admin` and `/agency` are role-gated at the
  middleware + layout.
- **Client → another client's builder**: blocked. `getWebsiteId()` derives the
  website from the session tenant; no builder action accepts a client-supplied
  websiteId.
- **Agency → client store**: agency users have `tenantId: null`, so every
  content action rejects them (secure by construction — but it also means the
  agency can't operate the client store at all; see C-7).

## IDORs found and fixed

| ID | Sev | Issue | Status |
| --- | --- | --- | --- |
| C-14 | High | `deleteAsset` soft-deleted any asset by id with no tenant check. | **Fixed** — `findOwnedById` before delete. |
| C-14b | Medium | `createAssetReference` could attach a reference to another tenant's asset (referenceCount pollution). | **Fixed** — ownership verified. |

## Lifecycle / revocation

- **C-12 (Critical)** — No revocation for suspended/archived clients. `AgencyTenant.status`
  / `Workspace.status` are written by nothing and read by the client path never;
  a suspended client keeps a valid 7-day JWT.
  Fix (follow-up): check `AgencyTenant.status` in `auth.authorize`/session
  callback for tenant clients; add an agency suspend/unlink action that sets
  the status + clears workspace membership.
- Tenant deletion (the only working revocation) is SUPER_ADMIN-only and cascades
  to the user — a deleted client's session is invalidated on the next request.

## Shared-editing data-loss risk

- Builder `save()` was deleteMany + recreate with **no transaction and no
  optimistic concurrency** — an interleaved save could corrupt the draft and
  concurrent users silently overwrote each other. **Atomicity fixed**; a version
  / conflict-detection layer is the recommended follow-up so the "no silent data
  loss" success criterion is fully met when agency editing is enabled.

## What is solid

- Client cross-tenant reads/writes blocked across commerce, media, analytics,
  builder, orders, bookings.
- Media library fully tenant-scoped (V-01) plus the two newly fixed actions.
- Claim flow is idempotent (unique email) and now returns clean errors on races.
- `assertAgencyOwnsTenant` guards agency client pages; the agency analytics gate
  is now status-consistent.

## Recommended follow-ups (priority)

1. Enforce `AgencyTenant.status`/`Workspace.status` on the client session path (C-12).
2. Add optimistic concurrency / conflict detection to builder saves (C-8).
3. Remove or fix the broken agency "Open Builder" links (C-7).
4. Bind the `__workspace` cookie to the user + clear on logout (C-16).
