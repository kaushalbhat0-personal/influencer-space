# Agency Client Launch Readiness

RCCF-VALIDATION-03 · Agency Client Launch.

## Scores

| Area | Score | Notes |
| --- | --- | --- |
| **Agency client readiness** | **74 / 100** | The critical claim-loop blocker is fixed; collaboration + lifecycle gaps remain. |
| Invitation | 80 | Expiry/duplicate/claimed/wrong-email handled; race fixed (C-2); no email (C-5). |
| Claim account | 88 | Create + OWNER + idempotent + race-safe (C-1/C-2 fixed). |
| First login | **Fixed** | `onboarding_completed` now written by the agency path (C-1). |
| Dashboard (all runtimes) | 95 | Knowledge/Goals/Recommendations/Health/Evolution verified present, shared context. |
| Builder (client) | 85 | Works for the client; atomic save fix (C-8); no conflict UI (follow-up). |
| Agency edits | 25 | Agency can't open the client builder (C-7) — feature gap. |
| Commerce / Media / Publish | 85 | Tenant-scoped + safe; media IDORs fixed (C-14); publish atomic. |
| Ownership transitions | 60 | Ownership is correct after claim; no lifecycle/status enforcement (C-12). |
| Conflict resolution | 40 | No optimistic concurrency / conflict detection (C-8/C-9). |
| Security | 90 | Cross-tenant safe; media IDORs + analytics status fixed; revocation absent (C-12). |
| Performance | 70 | Dashboard dedup fixed; products unpaginated; publish rebuilds aggregate. |
| Notifications | 15 | None (invite/claim/publish/order/health/evolution). |

## Fixed in this validation (verified)

| ID | Sev | Fix |
| --- | --- | --- |
| C-1 | Critical | `confirmProvision` now marks onboarding complete — the claimed client reaches their dashboard (was an infinite redirect loop). |
| C-2 | High | `claimInvitation` handles the concurrent-claim P2002 race with a clean error. |
| C-8 | High | `BuilderService.save()` is atomic (transactional deleteMany + recreate) — no more partial-draft corruption on interleaved saves. |
| C-14 | High/Med | `deleteAsset` + `createAssetReference` verify asset ownership. |
| C-15 | Med | Agency analytics gate filters `AgencyTenant.status: "ACTIVE"`. |
| C-17 | Med | Dashboard dedup: removed the duplicate order count + the duplicate profile/success reads (2 fewer queries per load). |

## Release-blocking follow-ups

1. **Enforce tenant status on the client session** (C-12) — check
   `AgencyTenant.status`/`Workspace.status` in `auth`/session; add a suspend
   action. Currently a suspended client keeps full access for 7 days.
2. **Agency editing of client stores** (C-7) — decide the story: implement a
   tenant-scoped agency edit path gated by `assertAgencyOwnsTenant` +
   `AgencyTenant.canEdit*`, or remove the broken "Open Builder" links.
3. **Optimistic concurrency for the builder** (C-8) — a draft version /
   conflict banner so concurrent edits never silently overwrite (the success
   criterion "no silent data loss").
4. **Draft history** beyond publish boundaries (C-10) + publish snapshot
   taken at commit time (C-9).
5. **Notifications / email** (C-5) — at minimum: invitation link to the client
   and a claim/publish notification to the agency.

## Verdict

After this validation the **core agency-client journey works end-to-end**: an
agency can invite a client, the client claims and reaches their dashboard, and
all six intelligence runtimes function under the client's ownership with no
cross-tenant access. The remaining high-severity items are collaboration and
lifecycle features (agency editing, conflict resolution, revocation,
notifications) rather than defects — schedule them with the agency channel
(see `docs/agency-launch-readiness.md`) before opening agencies publicly.
