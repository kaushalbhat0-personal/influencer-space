# Platform Governance Audit — RCCF-VALIDATION-04

Audit of platform governance across tenant, user, agency, commerce, billing,
commission, domains, publishing, feature flags, and registry surfaces. Fixes
verified this validation are marked **FIXED**.

## Tenant Lifecycle

| ID | Sev | Step | Expected | Actual | Root cause | Fix | Regression risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G-01 | CRITICAL | Delete tenant | No orphan rows | `prisma.tenant.delete()` leaves Workspace(+Members), GenerationSession, CreatorProvisionRun, BillingAccount, AlertRecord, AnalyticsEvent orphaned (no FK/cascade); no audit entry | delete was a bare single statement | **FIXED** — transactional explicit cleanup + `logAction` before delete | Low; delete becomes slower (transaction) but atomic |
| G-02 | HIGH | Suspend/Resume tenant | Operator can pause a tenant | No `Tenant.status` column, no suspend/resume actions, storefront has no status gate | suspend was never implemented | Roadmap: add `Tenant.status` + actions + gate in `[domain]/page.tsx:33` | — |
| G-03 | MEDIUM | Create/provision tenant | Complete tenant | `provisionNewCreator` creates no Workspace/Website/Brand → `updateSubscriptionPlan` returns "Workspace not found" | legacy helper path, unused by UI | Delete or route through `provisioningService.provision` | — |
| G-04 | LOW | Provision audit | Audit trail | `provisionNewCreator`/`magicProvisionFromYoutube` never call `logAction` (modern `confirmProvision` does) | inconsistent audit | Add `logAction` | Low |

## User Lifecycle

| ID | Sev | Step | Expected | Actual | Root cause | Fix | Regression risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G-05 | HIGH | Disable/Enable/Delete/Change role | Lifecycle actions | None exist (no actions, no `User.status`). Users page is read-only, `take: 200` with wrong role counts | never implemented | Roadmap; counts fixed via `groupBy` (FIXED G-10) | — |
| G-06 | MEDIUM | Reset password | Audit + session invalidation | `updateMany` over all `ADMIN` users, no `logAction`, existing JWT sessions stay valid | JWT session only re-checks role | Add per-user reset, audit, invalidate on next read | Medium |
| G-07 | MEDIUM | Login As | Audited, non-exposed | Token in URL query string (browser history/referrer), generation not audited, route audit actor is literal `"superadmin"` | haste | Audit generation, use POST, record actual actor | Medium |
| G-08 | GOOD | Role change → session | Revoked | `auth.ts:116-125` re-reads DB role each `getServerSession`; mismatch expires session | — | — | — |

## Agency Lifecycle

| ID | Sev | Step | Expected | Actual | Root cause | Fix | Regression risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G-09 | HIGH | Suspend/Archive/Delete agency | Cleanup + client handling | No lifecycle actions; deleting an agency would orphan its workspace/users (`SetNull`) and destroy client links (`AgencyTenant` cascade) while client tenants survive unlinked | never implemented | Roadmap: lifecycle actions with transfer/reassign policy | — |
| G-10 | MEDIUM | Agency status enforcement | Suspended agency can't operate | `auth.ts:53-57` never checks `WebsiteAgency.status` | missing gate | Add status check in `authorize`/agency guard | Low |

## Commerce Governance

| ID | Sev | Finding |
| --- | --- | --- |
| G-11 | GOOD | Canonical registry `src/config/commerce/plans.ts` is the single price/feature source; marketing, capabilities, and BillingPlan seed all derive from it. |
| G-12 | CRITICAL | **Three parallel limit catalogs** disagree for the same plan (`max_products`: 5 in `capabilities/plans.ts`, 10 in `entitlements/runtime.ts`, 10/100 in `usage-engine.ts`). One resolver must win. |
| G-13 | HIGH | Billing dashboard hardcoded limits 5/10 — **FIXED** (derived from `capabilityService.limit`). |
| G-14 | HIGH | Register agency used legacy `agency_free` → no BillingSubscription — **FIXED** (canonical `partner_free`). |
| G-15 | MEDIUM | `CommercialPricing` table is dormant and seeded with non-canonical `agency-scale`@4999. |
| G-16 | HIGH | No bulk plan change / bulk suspend / bulk cancel. |
| G-17 | MEDIUM | Subscriptions UI only lists the 4 creator plans (partner/agency tenants can't be changed there). |

## Billing / Finance

| ID | Sev | Finding |
| --- | --- | --- |
| G-18 | GOOD | Billing v2 (events → subscription → invoice) is well-built: idempotent webhooks, append-only events, lifecycle state machine, SUPER_ADMIN-gated plan actions. |
| G-19 | HIGH | No refund path: no `adminRefundInvoice`, no Razorpay `refunds.create`, no invoice `REFUNDED` transition. |
| G-20 | HIGH | Settlements are write-disconnected: `createSettlement`/`updateStatus` have zero callers; pages read-only. |
| G-21 | MEDIUM | Failed payment → `PAST_DUE`, but no dunning/grace job; retry just opens a new checkout. |
| G-22 | HIGH | Audit gaps: no `logAction` on settlement mutations, commission creation, customer cancel/resume. |
| G-23 | MEDIUM | GST is schema-only: invoices created with `taxAmount` 0; `calculateTax` unused. |
| G-24 | MEDIUM | Revenue windowed via `findMany(take: 1000/5000)` → silently understated beyond the cap; commission/subscription windows are inconsistent (30d vs >30d). |
| G-25 | LOW | Webhook signature edge (empty sig → throw) — **FIXED** (401 guard). |

## Commission Governance

| ID | Sev | Finding |
| --- | --- | --- |
| G-26 | CRITICAL | In-memory commission/payout/partner engines are never initialized at runtime → all commission/payout stats read zeros, `ruleEngine` is empty. |
| G-27 | CRITICAL | Commission Center sync failed validation (platform+agency ≠ 100) → rules never created — **FIXED** (normalized to 100). Rule is still process-local; DB hydration is roadmap. |
| G-28 | CRITICAL | `processCommission` resolves against the empty engine → throws → no `CommissionEntry` ever written → commission revenue is 0. |
| G-29 | HIGH | Commission writes are fire-and-forget (`.catch(...)`, no await) with no transaction across invoice+entry+ledger. |
| G-30 | HIGH | UI model (5-way split) ≠ runtime model (2-way platform+partner per rule); no creator-level override exists despite the audit premise. |
| G-31 | HIGH | Settlement flow is chicken-and-egg: entries become `cleared` only when a settlement is paid, but `createSettlement` selects only `cleared` entries → always zero. |

## Feature Flags

| ID | Sev | Finding |
| --- | --- | --- |
| G-32 | CRITICAL | Flags were write-only (zero consumers). **FIXED** — `getPlatformConfig()` + `maintenanceMode` storefront gate + `enableNewRegistrations` registration kill-switch. More gates = roadmap. |
| G-33 | LOW | No schema validation on flag keys — a typo silently stores a dead flag. |

## Domains / Publishing

| ID | Sev | Finding |
| --- | --- | --- |
| G-34 | HIGH | Super-admin domains page is read-only (no attach/verify/detach for arbitrary tenants from the list). |
| G-35 | MEDIUM | Domains page fires up to 100 Vercel `GET`s per render; no scheduled re-verify/caching. |
| G-36 | MEDIUM | Tenant delete removes the Vercel domain best-effort; failures are swallowed (pending-removal reconciliation is roadmap). |
| G-37 | HIGH | `triggerTenantContentSync` only bumps `updatedAt` — "Sync triggered" toast is misleading. |
| G-38 | HIGH | `/super-admin/demo-publishing` is an in-memory `Map` mock, not real publishing; no bulk publish/rollback/retry in super-admin. |
| G-39 | MEDIUM | No stale-storefront drift indicator (published snapshot vs current content). |
| G-40 | GOOD | Registry Sync is real, dry-run-first, SUPER_ADMIN-gated. |

## Operational Excellence (governance)

| Criterion | Verdict |
| --- | --- |
| Confirmation dialogs | Only `window.confirm` on purge/delete-tenant; registry-sync apply (can DELETE plans) and plan changes have none |
| Undo | None; publish rollback not exposed in super-admin |
| Preview before apply | Registry-sync dry-run (good); generate wizard preview is a stub |
| Bulk operations | None (no multi-select publish/delete/plan/sync) |
| Search/filter/sort/pagination | `DataTable` is client-side over unbounded server loads (tenants/users/payments); websites page is the only server-paginated list |
| Exports | None (CSV absent everywhere) |
| Audit trail | Present for admin subscription/plan/settings/webhook actions; gaps on settlement/commission/cancel/resume |
