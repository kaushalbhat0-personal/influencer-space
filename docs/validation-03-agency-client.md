# VALIDATION-03 — Agency Client Launch Validation

RCCF-VALIDATION-03 · Launch Readiness Initiative.

**Type:** Read-only audit + validated blocker fixes. No new features, no
refactor, no UX redesign.

**Persona:** Agency Client — a non-technical creator/business invited by an
agency. They only want their website.

## Journey map

```
Agency creates client → Invitation sent → Invitation received → Claim account
→ First login → Onboarding state → Dashboard → Knowledge → Goals →
Recommendations → Business Health → Builder → Commerce → Media → Publish →
Storefront → Agency edits → Client edits → Ownership transitions →
Subscription lifecycle → Logout/Login
```

## Issue log

Every issue: ID · Severity · Journey step · Finding.

### Invitation / claim

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| C-1 | **Critical** | First login | The claimed client hits an **infinite redirect loop** between `/admin/dashboard` and `/onboarding`: the agency provisioning path (`confirmProvision`) publishes and writes settings but **never calls `markOnboardingComplete`**, so the DB-backed `requireTenant` bounces the client while the token-based middleware lets them back. The client cannot use their store. **FIXED**. |
| C-2 | High | Claim | Concurrent claim (double-click / second browser) races the existing-account check and surfaces an unhandled P2002 (raw failure, no message). **FIXED** (clean error). |
| C-3 | High | Claim/import | Concurrent imports of the same creator create duplicate tenants (no dedupe by source URL/email in `confirmProvision`). |
| C-4 | Medium | Claim | The synthetic `admin-<slug>@<host>` ADMIN (unknown password, workspace OWNER) persists after claim — a dormant full-tenant backdoor. |
| C-5 | Medium | Invitation | No email/notification at any step — the claim link is only shown on the agency's screen; no claim/publish/order notifications exist. |
| C-6 | Medium | Invitation | Invitation expiry/duplicate/claimed/wrong-email handling is correct; resend silently invalidates the prior token. |

### Ownership / collaboration

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| C-7 | High | Agency edits | Agency cannot edit any client store — every content action resolves `session.user.tenantId` (null for agencies). The "Open Builder" links on agency pages error "Unauthorized". `AgencyTenant.canEdit*` flags are dead config. |
| C-8 | High | Conflict | Builder `save()` is deleteMany + recreate with **no transaction and no conflict detection** — interleaved saves corrupt the draft; concurrent users get silent last-write-wins. **FIXED** (atomic transaction); optimistic concurrency remains a follow-up. |
| C-9 | Medium | Publish | Publish reads the draft at read-time (not commit-time) — a save landing between read and snapshot can be omitted (TOCTOU). Concurrent publish versions are safely distinct. |
| C-10 | Medium | Draft recovery | Snapshots exist only at publish boundaries; an unsaved draft overwritten by a concurrent save is unrecoverable. |
| C-11 | Low | Builder | No builder action accepts a client-supplied websiteId — tenant isolation is safe (session-scoped). |

### Tenant lifecycle / permissions

| ID | Sev | Step | Finding |
| --- | --- | --- | --- |
| C-12 | **Critical** | Suspended client | No revocation exists: `AgencyTenant.status` / `Workspace.status` are written by nothing and read by the client path never. A suspended/unlinked client keeps a valid 7-day JWT and full access. |
| C-13 | High | Cross-client | Client cross-tenant access is blocked (tenantId-scoped actions, fixed in V-01/02). Verified safe. |
| C-14 | Medium | Media | `deleteAsset` (media.actions.ts) soft-deleted any asset by id without a tenant check (IDOR). **FIXED**. `createAssetReference` could attach a reference to another tenant's asset. **FIXED**. |
| C-15 | Medium | Analytics | Agency analytics gate now filters `AgencyTenant.status: "ACTIVE"` (consistent with `assertAgencyOwnsTenant`). **FIXED**. |
| C-16 | Low | Workspace | `__workspace` cookie not user-bound, never cleared on logout (carried from V-01/V-02). |

### Runtimes under shared ownership

| Runtime | Verified |
| --- | --- |
| Knowledge | Score, questions, completion, builder hints, recommendations, health updates — all work for a client with a valid session. |
| Goals | Persist; homepage/nav ordering, CTA, commerce ordering, health — work. |
| Recommendations | Detect/dismiss/complete/refresh/history + health lift — work. |
| Business Health | Updates after edits, trend/history/events, next milestone — work. |
| Website Evolution | Detect/preview/apply/reject/history + storefront stability — work. |

### Performance

| ID | Sev | Finding |
| --- | --- | --- |
| C-17 | Medium | Dashboard loads ~85–110 queries: duplicated counts across `getMetrics` / health engine / quick-start / success; `getCreatorSuccess` + `getProfile` read twice. **FIXED** (deduped the second reads + duplicate order count). |
| C-18 | Medium | Product list unpaginated; testimonials/FAQ JSON arrays unbounded. |
| C-19 | Medium | Publish rebuilds the full content aggregate (~16 queries) although the snapshot stores an empty aggregate. |
| C-20 | Low | `mediaService.resolveUrls` is N+1 per asset; storefront rebuilds the aggregate on every request (by design). |

## Fix status

Fixed and committed (each verified: `tsc --noEmit`, `next build`, full
101-file / 1983-test suite):

| ID | Fix |
| --- | --- |
| C-1 (Critical) | `confirmProvision` now calls `markOnboardingComplete(tenantId)` after a successful publish — the claimed client lands on their dashboard. |
| C-2 (High) | `claimInvitation` catches the concurrent-claim P2002 race and returns a clean error. |
| C-14 (Medium) | `deleteAsset` and `createAssetReference` verify asset ownership (`findOwnedById`). |
| C-8 (High) | `BuilderService.save()` is now atomic (transactional deleteMany + recreate) — interleaved saves can no longer corrupt the draft. |
| C-15 (Medium) | Analytics agency gate filters `AgencyTenant.status: "ACTIVE"`. |
| C-17 (Medium) | Dashboard dedup: removed the duplicate `productOrder.count`; the Runtime Context passes pre-read profile/success to the recommendation context (2 fewer queries). |

Remaining items are documented as follow-ups in `docs/agency-client-launch-readiness.md`.
