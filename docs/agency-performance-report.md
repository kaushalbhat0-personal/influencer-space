# Agency Performance Report

RCCF-VALIDATION-02 · Agency/Freelancer Launch.

Performance observations across the agency journey. Evidence-based.

## Findings

| # | Sev | Area | Issue |
| --- | --- | --- | --- |
| P1 | High | Client list | `client/service.ts:14-54` loads all `agencyTenant` rows then runs a **per-client `websiteHealthEngine.evaluate` (N+1)**. Used by the dashboard, clients page and search → O(clients) health evaluations per request. |
| P2 | Medium | Client list | No server-side pagination; `clients` page filters/sorts the full list in memory and recomputes stats over it. |
| P3 | Medium | Work page | `/agency/work` loads the full client list and filters in memory after `getMemberAssignments` already returned the set. |
| P4 | Low | Analytics | `getAgencyPartnerStats` mixes a DB client count with the in-memory (uninitialized) partner engine → workspaceUsage/clientUsage disagree with reality. |
| P5 | Low | Generation | `generateWebsite.action.ts` is a dead stub; no concern, but misleading. |

## Scaling test (100 clients)

| Path | Current behaviour | Projection at 100 clients |
| --- | --- | --- |
| Agency dashboard | N+1 health eval (1 query + 1 eval/client) | ~100 health engine runs + 100+ queries |
| Client list | Full list + client-side filter/sort | Full payload + N+1 eval |
| Builder | Resolves `session.user.tenantId` (null for agency) | Broken for agency (see validation-02 F24) |
| Generation | `confirmProvision` creates a new tenant per call | Duplicate tenants if run concurrently (see G1) |
| Publishing | Standard publish | OK (single tenant) |

## Recommended fixes

1. **Batch health evaluation** — evaluate health in a single aggregate query (or a limited parallel set) instead of N+1.
2. **Paginate** `agencyTenant` listing (server-side `take`/`skip` + cursor) and index `(agencyId, status)`.
3. **Deduplicate** `work` page loads (reuse the assignment client set).
4. **Remove in-memory ledgers from the read path** — compute agency revenue/payouts directly from Prisma (`CommissionEntry`, `PayoutBatch`), and await commission persistence.
5. **Make generation idempotent** — resolve an existing tenant before `confirmProvision`; add a DB unique constraint on the import key.

## Verified wins

- Snapshot duplication eliminated platform-wide by RCCF-INTEGRATION-01 (single Runtime Context build per request).
- The intelligence runtimes on the dashboard (Knowledge/Goals/Recommendations/Business Health/Evolution) share one context — no duplicate score computation.
