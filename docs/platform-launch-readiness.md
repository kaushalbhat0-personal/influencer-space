# Platform Launch Readiness — RCCF-VALIDATION-04

## Scores

| Area | Score | Notes |
| --- | --- | --- |
| **Super Admin readiness** | **74 / 100** | Governance sound; scale tooling + runtime-active analytics are the gap. |
| Platform Dashboard | 65 | Hardcoded health badges, unbounded ledger, static service grid. |
| Tenant Lifecycle | 70 | Create/provision/delete (now clean + audited); no suspend/resume/restore. |
| User Lifecycle | 55 | No disable/enable/delete/role actions; login-as hardened, not yet ideal. |
| Agency Lifecycle | 55 | Read-only; no suspend/archive/delete with client handling. |
| Commerce Governance | 78 | Canonical registry respected; limits not enforced; no bulk ops. |
| Billing / Finance | 80 | Billing v2 state machine + idempotent webhooks are strong; no refunds/dunning. |
| Settlements / Commission | 55 | Architecturally present but runtime-inert (engines never initialized, no accrual). |
| Integrity Runtime | 72 | Safe-delete/preview now functional + atomic; scan is noisy/heavy. |
| AI Operations | 50 | Cost monitor disconnected, generation wizard is a stub, queue test-only. |
| Runtime Analytics (Rec/HH/EI/Evolution) | 90 | Canonical runtimes, persisted, no duplicated calculation. |
| Feature Flags | 62 | Two real consumers now (maintenance, registrations); rest cosmetic. |
| Domain Operations | 60 | Attach works; list is read-only, per-render Vercel calls. |
| Publishing | 75 | Real service; super-admin surface lacks bulk/rollback/retry. |
| Event Runtime | 70 | Durable inserts, indexed; zero subscribers (by design, pending). |
| Security | 92 | No exploit found; webhook guard fixed; login-as/hardening items remain. |
| Performance | 68 | Websites pattern is right; tenants/users/revenue need server pagination/aggregates. |
| Operational Excellence | 62 | Confirmations, bulk ops, exports, undo are the gaps. |

## Top 25 Critical Findings

1. G-26 — Commission/payout engines never initialized → commission stats read zeros (no accrual ever).
2. G-28 — `processCommission` throws on the empty engine → no `CommissionEntry` ever written.
3. G-01 — Tenant delete left orphan rows (7+ tables) — **FIXED**.
4. O-07 — Safe-delete had a hardcoded `tenantId: ""` (dead path) — **FIXED**.
5. G-12 — Three conflicting limit catalogs for the same plan codes.
6. G-05 — No user lifecycle actions / no user disable.
7. G-02 — No tenant suspend/resume (no status column, no gate).
8. G-09 — No agency lifecycle; delete would orphan workspaces/users + unlink clients.
9. O-02 — `generateWebsite` is a stub; the Generate wizard fabricates results.
10. O-03 — Generation queue/worker pool is test-only; production is fire-and-forget sync.
11. G-32 — Feature flags had zero consumers — **FIXED (2 gates)**; more gates pending.
12. O-01 — AI cost monitor never records; AI Ops page shows fabricated/empty data.
13. G-05b — `User` has no status; reset-password is unaudited, all-admins, no session invalidation.
14. G-19 — No refund capability end-to-end.
15. G-20 — Settlements write-disconnected (zero callers; read-only UI).
16. G-27 — Commission rule sync failed validation (40≠100) — **FIXED**; DB hydration pending.
17. G-31 — Settlement selection chicken-and-egg → always zero eligible.
18. G-29 — Commission writes fire-and-forget, no transaction across invoice/entry/ledger.
19. G-05c — Login-as token in URL + unaudited generation.
20. G-16 — No bulk plan/suspend/cancel for SUPER_ADMIN.
21. P-01 — Unbounded tenant list + dashboard ledger (O(n) per request).
22. P-03 — Revenue understated past 1000/5000 `take` caps.
23. O-09 — Integrity scan false-positives (agency rows) + cleanup doesn't repair reported orphans.
24. G-34/G-37 — Domains read-only; `triggerTenantContentSync` is a no-op.
25. G-38 — `/super-admin/demo-publishing` is an in-memory mock, not real publishing.

## Top 25 Quick Wins

1. Delete the dead `handlePaymentCaptured` self-transition bug (would throw if wired).
2. Remove the dormant `CommercialPricing` seed (non-canonical `agency-scale`@4999).
3. `deleteTenant` Vercel-domain removal: queue pending removals (already best-effort).
4. Add `logAction` to customer cancel/resume + settlement mutations.
5. Add a confirm dialog to registry-sync apply (it can DELETE plans).
6. Derive revenue/commission/invoice totals via Prisma `aggregate`.
7. Add `@@index([status, updatedAt])` to `GenerationSession`.
8. Point Event Explorer at the durable `AnalyticsEvent` table.
9. Server-generate `occurredAt` + a `dedupeKey` on `AnalyticsEvent`.
10. Validate feature-flag keys with a zod schema.
11. Make the AI Ops page read `ProviderFetchLog` counts (real numbers, no new table).
12. Fix integrity-scan false positives (exclude agency workspaces/users).
13. Weight the integrity health score by severity/category.
14. Add `domainVerifiedAt` cache + nightly re-verify cron.
15. Exclude agency subscriptions from MRR (workspace-type scoping).
16. `resolvePlan` uses `LEGACY_TO_CANONICAL` everywhere (already at resolution; enforce at lookup too).
17. Add `tenantId` to the register creator path — verified present; keep canonical plan codes.
18. Audit the `login-as` impersonation route actor (real email, not `"superadmin"`).
19. Cap the integrity page scan behind a manual trigger instead of per-load.
20. Add server-side `skip/take` to the tenants list (reuse websites page).
21. Show `published vN vs current` drift on the websites table (content hash).
22. Add SUPER_ADMIN publish/rollback per-row actions on the websites page.
23. Add a "scheduled jobs" runner that actually starts timers on startup (or label as manual).
24. Move `platform_config` off the "first tenant" into a dedicated platform settings row.
25. Label `/super-admin/demo-publishing` as a mock/sandbox or persist its state.

## Implementation roadmap

**Now (blockers fixed this validation — done):** tenant-delete orphan cleanup +
audit · integrity safe-delete/preview + atomicity · agency register plan code ·
webhook signature guard · websites status filter · maintenance + registration
feature-flag gates · stuck-generation recovery · commission rule normalization ·
canonical billing limits · users counts · reconciliation display.

**Phase 1 — Revenue integrity (the single biggest trust gap):** hydrate the
commission rule engine from `CommissionRule`; compute commission from DB
(`CommissionEntry`) instead of in-memory ledgers; make `processCommission`
awaited/transactional; wire settlement create→approve→pay actions; add refund
action; dunning job for `PAST_DUE`.

**Phase 2 — Enforcement & governance:** single capability resolver (delete the
two parallel catalogs); enforce limits at the write paths (product, gallery,
client assign, team invite, AI calls, pages); tenant `status` + suspend/resume +
storefront gate; user disable/enable + session revocation; agency lifecycle with
client reassignment.

**Phase 3 — Scale tooling:** server-side pagination/search (tenants, users,
payments, invoices); Prisma aggregates for revenue; bulk plan/suspend/publish
actions; CSV exports; AI cost telemetry table; persisted integrity scans;
real-time health probes; Event-Runtime subscribers (Business Health recompute on
domain events).

## Verdict

Super Admin can **operate** CreatorStore as a production SaaS today: tenant
destruction is now clean and audited, safe-delete works, agency signups bill
correctly, webhooks are robust, feature flags govern real behavior, stuck
generations are recoverable, and billing/finance are built on a solid, idempotent
state machine with no security exploits found. The 26-point gap to a fully
confident 5,000-creator operation is concentrated in three areas — **commission
runtime activation, limit enforcement, and scale tooling (bulk/exports/
pagination)** — each of which is a bounded, well-specified follow-up in the
roadmap above.
