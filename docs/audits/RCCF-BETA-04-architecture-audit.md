# RCCF-BETA-04 — Creator Lifecycle & Persistence Architecture Audit

**Date:** 2026-07-27
**Auditor:** Principal Architecture Review
**Scope:** Full production-grade audit of CreatorStore for Closed Beta readiness
**Status:** COMPLETE

---

## 1. Executive Summary

CreatorStore's architecture is **directionally correct** but contains **11 critical and 17 high-severity architectural violations** that make the system unreliable for a closed beta.

The most severe issues are:

1. **Two-User Problem** — The provisioning service creates a *second* ADMIN user (with a generated email) instead of linking the signing-up user to the provisioned tenant. The original user remains `tenantId: null` forever in the current code path.

2. **Dual-Workspace Creation** — `ensureWorkspace()` creates a workspace (without tenantId) before provisioning, while the provisioning transaction creates a second workspace (with tenantId). The first workspace becomes orphaned.

3. **Broken Event Correlation** — `CreatorProvisioned` and `WebsitePublished` events are published with `correlationId: undefined`, making session event listeners dead code.

4. **Fire-and-Forget Persistence** — Partner engine (9 locations), payout ledger (5 locations), and event repository use `.catch(() => {})` for DB writes. Failures are silently lost.

5. **15+ Empty Catch Blocks** — Generation runtime, providers, and execution layers silently swallow errors across the pipeline.

6. **Disconnected Publish Server Action** — `publish.actions.ts` calls a no-op service, hardcodes `version: 1`, and does not actually publish anything.

7. **No Repository Boundary for Admin Flows** — Products, gallery, links, and settings all use direct `prisma.*` calls, bypassing the repository layer entirely.

8. **`requireTenant` Is Not a Sufficient Lifecycle Gate** — It checks for `tenantId` presence but does not verify that provisioning actually completed (workspace, publish status, etc.).

9. **`onboarding_completed` Flag Is Decoupled from Actual Completion** — The flag is set immediately after provisioning and publish snapshot, before generation session completion or golden validation. If those subsequent steps fail, onboarding is still marked complete.

10. **Authentication Service Duplication** — `src/lib/identity/authentication/service.ts` defines a second `UserRepository` interface and `AuthenticationService`, but neither is connected to NextAuth or the actual signup flow.

11. **Multiple Publish Paths with Inconsistent Safety** — Three different code paths can publish, with different levels of transaction safety and version management.

**Architecture Score: 58/100** — Below the 80/100 threshold for closed beta.

---

## 2. Architecture Score (0-100)

| Category | Score | Assessment |
|---|---|---|
| Identity & Authentication | 45 | Two-user problem, duplicated identity service |
| Lifecycle State Machine | 50 | Missing gates, broken transitions |
| Repository Boundary | 65 | Good for provisioning, absent for admin |
| Transaction Boundary | 60 | Workspace outside tx, billing no tx support |
| Event System | 40 | Broken correlation, fire-and-forget, tryDb |
| Publishing | 45 | 3 paths, disconnected action, hardcoded version |
| Builder | 70 | Direct prisma but manageable, no repository |
| Storefront | 85 | Clean snapshot-first rendering |
| Dashboard | 75 | Good but reads incomplete state |
| Error Handling | 30 | Silent swallowing, fire-and-forget, tryDb |
| Routing & Middleware | 65 | Missing lifecycle gates, no subscription check |
| Database Invariants | 55 | Missing tenantId link, orphan workspaces |
| **Overall** | **58** | **Not beta-ready** |

---

## 3. Audit Methodology

- Static code analysis across all modules
- Trace every User, Tenant, Workspace, Website creation path
- Audit every `prisma.$transaction`, `$queryRaw`, `$executeRawUnsafe`
- Map every event publish with correlationId tracking
- Trace the creator lifecycle end-to-end against the canonical state machine
- Count every `catch {}` and `.catch(() => {})` in production code
- Validate every route guard and middleware redirect
- Check every database invariant against the Prisma schema

---

## 4. Domain-by-Domain Findings

### A1 — Identity Audit

**Finding 1-A: 15 distinct User creation paths** (CRITICAL)

| # | Path | File:Line | Creates With tenantId |
|---|---|---|---|
| 1 | Signup (Creator) | `src/app/api/auth/register/route.ts:100` | `null` |
| 2 | Signup (Agency) | `src/app/api/auth/register/route.ts:40` | `null` (agencyId set) |
| 3 | Team invite | `src/actions/team.actions.ts:23` | `null` |
| 4 | Provisioning service | `src/lib/provisioning/provisioning-service.ts:167` | `tenant.id` (NEW tenant) |
| 5 | Auth service (identity module) | `src/lib/identity/authentication/service.ts:75` | dynamic |
| 6-15 | Seed & test fixtures (10 paths) | Various | Various |

**Finding 1-B: The Two-User Problem** (CRITICAL)

The signup flow creates `User A` with `role: "ADMIN"`, `tenantId: null`. The provisioning flow creates `User B` with `role: "ADMIN"`, `tenantId: tenant.id`, email `admin@<slug>`. User A never gets their `tenantId` updated.

- Signup: `src/app/api/auth/register/route.ts:106` — `tenantId: null`
- Provisioning: `src/lib/provisioning/provisioning-service.ts:167-173` — creates separate user
- Onboarding action never updates original user: `src/actions/onboarding.actions.ts:88-92` reads `session.user.id` but never writes back to it

**Impact:** The user who signed up has `tenantId: null` in the database. The middleware redirects them to `/onboarding` on every visit (since `requireTenant` checks `token.tenantId`). The `jwt` callback resolves a workspace each time, but the user's own `tenantId` is never persisted.

**Finding 1-C: Duplicate identity service** (HIGH)

`src/lib/identity/authentication/service.ts` defines:
- Its own `UserRepository` interface (lines 7-20), different from `src/modules/tenant/infrastructure/user-repository.ts`
- `AuthenticationService.register()` (lines 61-88) — emits `identity:user:created` event
- `AuthenticationService.login()` (lines 90-107)

This service is **never called** from the actual signup route (`src/app/api/auth/register/route.ts`). It's a parallel identity system that is unused. It creates a maintenance burden and potential confusion.

**Finding 1-D: No `tenantId` propagation path** (HIGH)

There is no code path that sets `tenantId` on the original signing-up user after provisioning completes. The onboarding action (`runCreatorGeneration` in `src/actions/onboarding.actions.ts`) has access to `provisioned.tenantId` and `session.user.id`, but never writes `tenantId` to the user record.

- `src/actions/onboarding.actions.ts:88-92` — reads `session.user.id`
- `src/actions/onboarding.actions.ts:201-206` — provisioning returns `provisioned.tenantId`
- Never calls `prisma.user.update({ where: { id: userId }, data: { tenantId } })`

---

### A2 — Tenant Audit

**Finding 2-A: Single tenant creation path** (OK)

Tenants are created only by `tenantRepository.create()` inside `provisioning-service.ts:142`. The old `engine.ts:94` also creates tenants but is part of the legacy provisioning engine. Super-admin actions (`super-admin.actions.ts:64`) create tenants directly with `prisma.tenant.upsert`.

- `src/lib/provisioning/provisioning-service.ts:142` — primary (inside transaction)
- `src/lib/provisioning/engine.ts:94` — legacy (inside transaction)
- `src/actions/super-admin.actions.ts:64` — super-admin (inside transaction)

**Finding 2-B: Tenant ID is not linked to the creating user** (HIGH)

See Finding 1-B. The tenant is linked to `User B` (provisioned admin), not `User A` (the signing-up user).

---

### A3 — Workspace Audit

**Finding 3-A: Dual workspace creation** (CRITICAL)

Two code paths create workspaces for the same provisioning flow:

1. `ensureWorkspace()` in `src/actions/onboarding.actions.ts:62-67` — creates workspace WITHOUT `tenantId`, called BEFORE provisioning
2. `workspaceRepository.create()` in `src/lib/provisioning/provisioning-service.ts:175-180` — creates workspace WITH `tenantId`, INSIDE provisioning transaction

The first workspace (from `ensureWorkspace`) has no `tenantId` and becomes orphaned. The `resolveWorkspace()` function in `src/lib/auth.ts:23-56` may discover this orphan workspace and return it, bypassing the properly-provisioned workspace.

**Finding 3-B: Workspace creation outside transaction** (HIGH)

Five call sites create workspaces or add members without transaction protection:

| Location | File:Line | Risk |
|---|---|---|
| `resolveWorkspace()` | `src/lib/auth.ts:44-52` | Orphan workspace if addMember fails |
| `ensureWorkspace()` | `src/actions/onboarding.actions.ts:62-67` | Orphan workspace if addMember fails |
| Post-provision addMember | `src/actions/onboarding.actions.ts:305` | Orphan member if no transaction |
| Super-admin provision | `src/actions/super-admin-provision.actions.ts:202` | Orphan member |
| Team actions | `src/actions/team.actions.ts:31` | All unprotected |

---

### A4 — Website Audit

**Finding 4-A: Single website creation path** (OK)

Websites are created only by `websiteRepository.create()` inside the provisioning transaction at `src/lib/provisioning/provisioning-service.ts:143`. The old engine (`engine.ts`) also creates websites but is legacy.

**Finding 4-B: Website metadata ownership unclear** (MEDIUM)

Settings, SEO, theme, appearance, and content updates happen through:
- `settings-repository.ts` for provisioning settings
- `src/actions/settings.actions.ts` with direct `prisma.*` calls
- `src/services/settings.service.ts` with raw `$executeRawUnsafe` for JSONB merges
- `src/app/admin/appearance/page.tsx` with direct `prisma.*` calls

Website metadata does not have a clear single owner. Multiple services mutate the same settings.

---

### A5 — Provisioning Audit

**Finding 5-A: Provisioning sequence diagram**

```
Onboarding (runCreatorGeneration)
  │
  ├── ensureWorkspace()           ← OUTSIDE TX: creates orphan workspace
  │
  ├── sessionService.create()     ← Creates GenerationSession
  │
  ├── onboardingService.importProfile()
  │
  ├── onboardingService.generate()
  │
  ├── provisioningService.provision()
  │     │
  │     └── prisma.$transaction
  │           ├── tenantRepository.create()       ✓
  │           ├── websiteRepository.create()      ✓
  │           ├── brandRepository.create()        ✓
  │           ├── publishStatusRepository.create()✓
  │           ├── websiteSettingsRepository.createBatch() ✓
  │           ├── userRepository.create()         ← User B (separate user)
  │           ├── workspaceRepository.create()    ✓ (second workspace, with tenantId)
  │           └── workspaceRepository.addMember() ✓
  │
  ├── Post-TX: themeService.apply()               ← .catch(() => {})
  ├── Post-TX: updateThemeColors()                 ← .catch(() => {})
  ├── Post-TX: builder artifact (direct prisma)    ← no tx
  ├── Post-TX: publishSnapshotService.publish()    ← no tx
  ├── Post-TX: revalidatePath()                    ← catch {}
  ├── Post-TX: addMember (ensure owner)            ← no tx
  ├── Post-TX: logAction()                         ← raw SQL
  │
  ├── sessionService.updateStage("publishing")    ✓
  └── sessionService.complete()                    ✓
```

**Finding 5-B: No `tenantId` update for signing-up user** (CRITICAL)

See Finding 1-D. The provisioning creates an admin user for the tenant but never links the signing-up user.

**Finding 5-C: Theme application errors silently swallowed** (MEDIUM)

`src/lib/provisioning/provisioning-service.ts:210,222` — `.catch(() => {})` hides theme application failures.

---

### A6 — Publishing Audit

**Finding 6-A: Three publish paths with different safety levels** (CRITICAL)

| Path | Caller | Transaction | Version | Snapshot |
|---|---|---|---|---|
| Builder publish | `src/actions/builder.actions.ts:77` | YES (wraps save + publish) | Incremented | Created |
| Onboarding publish | `src/actions/onboarding.actions.ts:276` | NO | Incremented | Created via `publishFromArtifact` |
| Super-admin publish | `src/actions/super-admin-provision.actions.ts:183` | NO | Incremented | Created via `publishFromArtifact` |

**Finding 6-B: Disconnected publish server action** (HIGH)

`src/actions/publish.actions.ts:28` `publishWebsite()`:
- Calls `publishingService.publish()` which is a NO-OP (`src/lib/publishing/service.ts:48-61`)
- Publishes `WebsitePublished` event with hardcoded `version: 1`
- Does NOT call `PublishSnapshotService.publish()`

**Finding 6-C: Stub publish service returns hardcoded values** (MEDIUM)

`src/lib/publishing/service.ts:38-45` `getPublishStatus()` always returns `state: "published"`, `version: 1` without querying the database.

---

### A7 — Builder Audit

**Finding 7-A: Builder uses direct Prisma, not repositories** (MEDIUM)

`src/lib/builder/builder-service.ts` uses `prisma.page`, `prisma.section`, `prisma.block` directly instead of repository abstractions. The builder publish action wraps operations in `prisma.$transaction` at the action level.

**Finding 7-B: Builder owns layout and section order only** (OK)

Builder correctly owns: themes, layout, section order, templates, visibility, responsive settings. No violation of domain boundaries found beyond the direct Prisma usage.

---

### A8 — Storefront Audit

**Finding 8-A: Snapshot-first rendering** (OK)

The storefront at `src/app/[domain]/page.tsx` correctly reads from snapshots and renders read-only. No admin logic, dashboard logic, or builder logic found in the storefront.

---

### A9 — Dashboard Audit

**Finding 9-A: Dashboard can open before provisioning is complete** (HIGH)

The `requireTenant()` check in `src/app/admin/dashboard/page.tsx:8` verifies only that the user has a `tenantId`. It does not verify:
- That a workspace exists
- That publish status is healthy
- That the generation session completed
- That provisioning fully succeeded

A user with a stale `tenantId` (from a previous failed provisioning) would see a broken dashboard.

**Finding 9-B: Dashboard reads state but does not verify completeness** (MEDIUM)

`src/features/dashboard/service.ts` reads metrics, activity, health, and steps. If any of these return empty/null because provisioning was partial, the dashboard shows incorrect state.

---

### A10 — Event Audit

**Finding 10-A: `CreatorProvisioned` published with `undefined` correlationId** (CRITICAL)

`src/actions/super-admin-provision.actions.ts:206-214` — `correlationId: undefined`

**Finding 10-B: `WebsitePublished` published with `undefined` correlationId** (CRITICAL)

`src/actions/publish.actions.ts:42` — `correlationId: undefined`

**Finding 10-C: Session event listeners are dead code** (CRITICAL)

`src/lib/generation/session/events.ts:18-31` subscribes to `CreatorProvisioned` and checks `if (!correlationId) return;`. Since the event is published with `undefined`, this handler never fires. Same for `WebsitePublished` at line 33-44.

**Finding 10-D: 6 of 10 events are published without correlationId** (HIGH)

`PartnerAssigned`, `PaymentCaptured`, `SubscriptionActivated`, `SubscriptionCancelled`, `CommissionCreated`, `PayoutCreated`, `PayoutCompleted` — all lack correlationId.

**Finding 10-E: `WebsiteBeingGenerated` has empty tenantId** (MEDIUM)

`src/actions/onboarding.actions.ts:122` — `tenantId: ""` instead of a valid ID.

**Finding 10-F: Event repository uses `tryDb` which silently drops events** (MEDIUM)

`src/lib/events/repositories/event-repository.ts:7` — DB errors silently convert to fallback values. Events are lost without notification.

---

### A11 — Repository Audit

**Finding 11-A: Repository ownership matrix**

| Entity | Repository | Used By | Violations |
|---|---|---|---|
| Tenant | `tenant-repository.ts` | Provisioning only | Super-admin actions use direct `prisma.tenant.upsert` |
| Website | `website-repository.ts` | Provisioning only | Admin appearance/settings use direct prisma |
| Brand | `brand-repository.ts` | Provisioning only | None found |
| PublishStatus | `publish-status-repository.ts` | Provisioning only | Publishing uses direct `prisma.publishStatus.upsert` |
| Settings | `settings-repository.ts` | Provisioning only | Admin settings use direct prisma + raw SQL |
| User (tenant) | `user-repository.ts` | Provisioning, Identity auth service | Admin uses direct prisma |
| Workspace | `repository.ts` (under workspace) | Auth, Onboarding, Team, Provisioning | Some consumers use direct `prisma.workspaceMember` |
| Billing | `repository.ts` (under billing) | Billing service only | No tx support |
| Product | NONE | Admin actions use direct prisma | No repository exists |
| Gallery | NONE | Admin actions use direct prisma | No repository exists |
| AffiliateLink | NONE | Admin actions use direct prisma | No repository exists |
| Setting | NONE | Admin settings use direct prisma + raw SQL | No repository exists |

**Finding 11-B: Billing repository has no transaction support** (HIGH)

`src/modules/billing/infrastructure/repository.ts` — none of the 8 methods accept a `tx` parameter. The billing service (`src/modules/billing/application/service.ts`) performs multiple repository calls without transaction wrapping.

**Finding 11-C: No repositories exist for Product, Gallery, Link, or Setting** (MEDIUM)

These domains bypass the repository layer entirely. The data seeder (`src/lib/data/seeder.ts`) also uses direct `prisma.*.create()`.

---

### A12 — Transaction Audit

**Finding 12-A: Transaction matrix**

| Transaction | File:Line | Entities | Rollback | Post-commit work | Risk |
|---|---|---|---|---|---|
| Provisioning | `provisioning-service.ts:141` | Tenant, Website, Brand, PublishStatus, 5 Settings, User, Workspace, WorkspaceMember | YES (Prisma tx) | Theme apply, colors, builder artifact, snapshot publish, revalidate, events, audit log | Post-commit failures leave incomplete state |
| Register (Creator) | `register/route.ts:99` | User, Billing | YES | None | Low |
| Register (Agency) | `register/route.ts:39` | User, Agency, Subscription, Billing | YES | None | Low |
| Publish (Builder) | `builder.actions.ts:77` | Builder pages, Snapshot, PublishStatus | YES | Events, revalidation | Medium |
| Publish (Snapshot) | `snapshot.ts:73,116` | Snapshot, PublishStatus | YES | None | Low |
| Product CRUD | `service.ts:47` | Product, Audit log | YES | None | Low |
| Gallery CRUD | `service.ts:24` | Gallery item, Audit log | YES | None | Low |
| Link CRUD | `link.actions.ts:75` | Link, Audit log | YES | None | Low |
| Settings update | `settings.actions.ts:147` | Setting, Audit log | YES (via raw SQL tx) | None | Low |
| Super-admin provision | `super-admin.actions.ts:64` | Tenant upsert, User upsert, Settings | YES | Events | Medium |
| Workspace create | `onboarding.actions.ts:62` | Workspace | NO (no tx) | addMember (separate call) | Orphan workspace |
| resolveWorkspace | `auth.ts:44` | Workspace | NO (no tx) | addMember (separate call) | Orphan workspace |

**Finding 12-B: Post-commit work in provisioning has no rollback** (HIGH)

After the provisioning transaction commits at `provisioning-service.ts:189`, the following occur without atomicity:
- Template application (line 197)
- Theme application (line 210, `.catch(() => {})`)
- Theme color update (line 214, `.catch(() => {})`)
- Seed starter data (line 202)
- Builder artifact upsert (line 245, no tx)
- Snapshot publish (line 273, no tx)
- Revalidate path (line 290, `catch {}`)
- AddMember (line 302, no tx)

If any of these fail after the transaction committed, the tenant exists but is in an incomplete state.

---

### A13 — Database Invariants

**Finding 13-A: Invariant report**

| Invariant | Status | Evidence |
|---|---|---|
| User exists after signup | PASS | Register route creates user |
| User.tenantId == Tenant.id | **FAIL** | Signing-up user has `tenantId: null` (Finding 1-B) |
| Tenant exists after provisioning | PASS | Provisioning transaction creates tenant |
| Workspace.exists | PASS | Created in provisioning transaction |
| Workspace.tenantId == Tenant.id | PASS | Set in provisioning transaction |
| WorkspaceMember.userId == User.id | **FAIL** | Links the PROVISIONED admin user, not the signing-up user |
| Website.tenantId == Tenant.id | PASS | Set in provisioning transaction |
| Brand exists | PASS | Created in provisioning transaction |
| Settings exist (5) | PASS | Created in provisioning transaction |
| PublishStatus.websiteId == Website.id | PASS | Created in provisioning transaction |
| Snapshot.websiteId == Website.id | PASS | Created during publish |
| GenerationSession exists | PASS | Created at start of onboarding |
| GenerationSession.completedAt | **FAIL** | Only set if sessionService.complete() is called, which happens AFTER publish steps that may throw |
| PlatformEvent correlationId | **FAIL** | Multiple events published without correlationId (Finding 10-A through 10-D) |

**3 FAILURES, 10 PASSES**

---

### A14 — Routing Audit

**Finding 14-A: Router guard matrix**

| Route | Auth Required | Role Check | Lifecycle Gate | Result |
|---|---|---|---|---|
| `/` | No | None | None | OK |
| `/signup` | No | None | None | OK |
| `/onboarding` | No | None | None | **Missing**: Could be accessed without being in the signup flow |
| `/admin/dashboard` | Yes | ADMIN+ | `requireTenant` | **Insufficient**: Only checks tenantId presence, not complete provisioning |
| `/admin/*` | Yes | ADMIN+ | `requireTenant` | Same issue |
| `/builder` | Page-level only | None in middleware | None | **Missing**: No middleware check; page component checks session but no provisioning gate |
| `/super-admin/*` | Yes | SUPER_ADMIN | None | OK |
| `/agency/*` | Yes | AGENCY roles | None | OK |
| `/{domain}` | No | None | None | OK (public storefront) |

**Finding 14-B: Onboarding loop with `requireTenant`** (HIGH)

The middleware redirects ADMIN users without `tenantId` to `/onboarding` (line 76-79). But the onboarding flow also does NOT update the user's `tenantId` (Finding 1-D). So after onboarding completes:
1. User is redirected to `/admin/dashboard`
2. Middleware checks `token.tenantId`
3. Token tenantId is `null` (because DB user.tenantId is still null)
4. User is redirected BACK to `/onboarding`
5. The `jwt` callback's `resolveWorkspace()` creates a workspace each time (Finding 3-A)

**This creates an infinite onboarding loop.**

**Finding 14-C: Builder has no middleware lifecycle gate** (MEDIUM)

`/builder` is not matched by the middleware's `/admin/*` pattern. A user could access `/builder` without being provisioned. The page component checks for a session but does not verify tenant existence.

---

### A15 — Error Handling Audit

**Finding 15-A: Empty catch blocks** (HIGH)

At least 17 empty `catch {}` blocks in production code:

| File | Line | What's Swallowed |
|---|---|---|
| `src/services/settings.service.ts` | 62 | Failed setting lookup |
| `src/services/settings.service.ts` | 88 | Failed hero data lookup |
| `src/services/settings.service.ts` | 167 | Failed theme config lookup |
| `src/lib/generation/runtime/worker.ts` | 220 | Event publish failure |
| `src/lib/generation/runtime/job-dispatcher.ts` | 65 | Event publish failure |
| `src/lib/generation/providers/provider-router.ts` | 90,130,141 | Multiple provider failures |
| `src/lib/generation/execution/stage-executor.ts` | 127 | Stage execution error |
| `src/lib/generation/execution/pipeline-executor.ts` | 157,168 | Pipeline errors |
| `src/actions/onboarding.actions.ts` | 294 | `revalidatePath` failure |
| (5 more in generation runtime) | | Various |

**Finding 15-B: Fire-and-forget `.catch(() => {})`** (CRITICAL)

| File | Line count | What's Lost |
|---|---|---|
| `src/lib/partners/engine.ts` | 9 | All partner repo mutations |
| `src/lib/payouts/ledger.ts` | 5 | All payout ledger mutations |
| `src/lib/provisioning/provisioning-service.ts` | 2 | Theme apply and color update |
| `src/lib/events/repositories/event-repository.ts` | 2 | Event persistence |
| `src/modules/billing/application/service.ts` | 1 | Audit log |

**Finding 15-C: `tryDb` pattern silences DB errors** (MEDIUM)

`src/lib/events/repositories/event-repository.ts:3` — the `tryDb` helper converts all database errors to fallback values. Used for event persistence and retrieval. Extended to commission repository and payout repository.

**Finding 15-D: `success: true` after no-op** (MEDIUM)

`src/actions/publish.actions.ts:69` — returns `{ success: true, status: result.data }` even when the underlying service call does nothing.

---

## 5. Repository Ownership Matrix

```
Entity            Repository                    Module          Consumers                      Violations
──────            ──────────                    ──────          ─────────                      ─────────
Tenant            tenant-repository.ts           tenant          Provisioning (tx)              Super-admin actions bypass repo
Website           website-repository.ts          tenant          Provisioning (tx)              Admin direct prisma
Brand             brand-repository.ts            tenant          Provisioning (tx)              None
PublishStatus     publish-status-repository.ts   tenant          Provisioning (tx)              Publishing service direct prisma
Settings          settings-repository.ts         tenant          Provisioning (tx)              Admin direct prisma + raw SQL
User              user-repository.ts             tenant          Provisioning (tx)              Identity module has separate interface
                                                                 Identity auth service          
Workspace         repository.ts                  workspace       Auth, Onboarding, Team,        findMembershipsByUserId has no tx
                                                                 Provisioning (tx)              
Billing           repository.ts                  billing         Billing service                No tx support on any method
Product           NONE                            —              Admin actions                  No repository exists
Gallery           NONE                            —              Admin actions                  No repository exists
AffiliateLink     NONE                            —              Admin actions                  No repository exists
Setting           NONE                            —              Admin actions                  No repository exists
```

---

## 6. Transaction Matrix

| Transaction | Scope | Atomic | Post-Commit Work | Risk |
|---|---|---|---|---|
| Provisioning | 8 entities | YES | 7 non-atomic operations | Medium |
| Creator Signup | 2 entities | YES | None | Low |
| Agency Signup | 4 entities | YES | None | Low |
| Builder Publish | 3 entities | YES | Events | Low |
| Snapshot Publish | 2 entities | YES | None | Low |
| Product CRUD | 2 entities | YES | None | Low |
| Gallery CRUD | 2 entities | YES | None | Low |
| Link CRUD | 2 entities | YES | None | Low |
| Settings | 2 entities | YES | None | Low |
| Super-admin | 3 entities | YES | Events | Low |
| Workspace (ensure) | 1 entity | **NO** | addMember (no tx) | **HIGH** |
| Workspace (resolve) | 1 entity | **NO** | addMember (no tx) | **HIGH** |

---

## 7. Persistence Matrix

```
Operation             Repository  Direct Prisma  Raw SQL  Transaction  Outside Tx
───────               ──────────  ─────────────  ───────  ──────────  ──────────
User: Signup                      ✓                        ✓
User: Provisioning     ✓                                 ✓
User: Identity svc     ✓                                  
Tenant: Provisioning   ✓                                 ✓
Tenant: Super-admin               ✓                       ✓
Workspace: Provision   ✓                                 ✓
Workspace: ensure                 ✓                                 ✓
Workspace: resolve                ✓                                 ✓
Website: Provision     ✓                                 ✓
Brand: Provision       ✓                                 ✓
PublishStatus: Prov    ✓                                 ✓
PublishStatus: Pub                ✓                       ✓
Settings: Provision    ✓                                 ✓
Settings: Admin                   ✓             ✓         ✓
Product: CRUD                     ✓                       ✓
Gallery: CRUD                     ✓                       ✓
Link: CRUD                        ✓                       ✓
Builder: Save                     ✓                       ✓
Seed data                        ✓                                   ✓
Audit log                         ✓             ✓         ✓
```

---

## 8. Event Flow Diagram

```
WebsiteBeingGenerated (onboarding.actions.ts:121)
  correlationId: ✓ (from correlationService)
  tenantId: "" (EMPTY -- data quality issue)
  → session/events.ts:6 subscribes

CreatorProvisioned (super-admin-provision.actions.ts:206)
  correlationId: undefined (BROKEN)
  → session/events.ts:18 subscribes but NEVER FIRES

WebsitePublished (publish.actions.ts:36)
  correlationId: undefined (BROKEN)
  version: 1 (HARDCODED)
  → session/events.ts:33 subscribes but NEVER FIRES

PartnerAssigned (agency-provision.actions.ts:79)
  correlationId: MISSING entirely
  → No subscriber found

PaymentCaptured (billing/service.ts:95)
  correlationId: MISSING entirely
  → No subscriber found

SubscriptionActivated (billing/service.ts:104)
  correlationId: MISSING entirely
  → No subscriber found
```

---

## 9. Lifecycle Validation

**Canonical lifecycle vs actual behavior:**

```
State                     Actual                  Status
──────────────────────    ──────────────────────  ──────
Visitor                   Marketing website       ✓
Signup                    User created,           ✓
                          tenantId: null
Login                     Session created,        ✓
                          token.tenantId: null
Onboarding                Session created         ✓
Creator Import            Profile imported        ✓
Knowledge Graph           Built                   ✓
Persona Engine            Persona detected        ✓
Experience Planning       Planned                 ✓
Generation Engine         Generated               ✓
Provisioning              ⚠ Creates User B       FAIL
                          ⚠ Creates 2nd workspace
                          ✓ Creates Tenant
                          ✓ Creates Website
                          ✓ Creates Brand
                          ✓ Creates Settings
                          ✓ Creates PublishStatus
Publish                   ⚠ No transaction        WARN
                          ✓ Creates Snapshot
                          ✓ Updates PublishStatus
Session Complete          ✓ sessionService.complete()
Dashboard                 ⚠ requireTenant loops   FAIL
                          (tenantId still null)
Builder                   ⚠ No lifecycle gate     WARN
Storefront                ✓ Snapshot-first render OK
```

---

## 10. Database Invariant Report

| Invariant | Status | File of Record | Root Cause |
|---|---|---|---|
| User exists | PASS | register/route.ts | Created at signup |
| User.tenantId == Tenant.id | **FAIL** | provisioning-service.ts vs register/route.ts | Two-User Problem |
| Tenant exists after provisioning | PASS | provisioning-service.ts | Created in tx |
| Tenant has at least one Website | PASS | provisioning-service.ts | Created in tx |
| Website has PublishStatus | PASS | provisioning-service.ts | Created in tx |
| Workspace exists after provisioning | PASS | provisioning-service.ts | Created in tx |
| Workspace.tenantId == Tenant.id | **FAIL** (partial) | onboarding.actions.ts ensureWorkspace() | Orphan pre-provisioning workspace |
| WorkspaceMember.userId == signing user | **FAIL** | provisioning-service.ts | Links User B, not User A |
| PublishStatus.state is "live" | PASS | provisioning-service.ts | Set during provisioning |
| Snapshot exists for published website | PASS | publish actions | Created during publish |
| GenerationSession.completedAt is set | **FAIL** | onboarding.actions.ts | May not complete if post-tx steps fail |
| PlatformEvent has valid correlationId | **FAIL** | Multiple (Finding 10) | Hardcoded undefined values |
| User.role is valid enum value | PASS | register/route.ts | Set at signup |

**3 PASS, 5 FAIL**

---

## 11. Architecture Violations — Prioritized

### Critical (11)

| ID | Finding | Category | Root Cause |
|---|---|---|---|
| C1 | Two-User Problem — provisioning creates separate user, signing user never linked | Identity | `provisioning-service.ts` creates User B; `onboarding.actions.ts` never updates User A's tenantId |
| C2 | Dual-Workspace — `ensureWorkspace()` creates workspace before provisioning, second workspace created inside tx | Workspace | `onboarding.actions.ts:62-67` runs before `provisioning-service.ts:175-180` |
| C3 | Infinite onboarding loop — `requireTenant` redirects to onboarding because tenantId never set on signing user | Routing | C1 + middleware.ts:76-79 |
| C4 | `CreatorProvisioned` with `undefined` correlationId — session event listener dead | Events | `super-admin-provision.actions.ts:206-214` |
| C5 | `WebsitePublished` with `undefined` correlationId — session event listener dead | Events | `publish.actions.ts:36-42` |
| C6 | Fire-and-forget partner engine — 9 `.catch(() => {})` calls | Error Handling | `src/lib/partners/engine.ts` |
| C7 | Fire-and-forget payout ledger — 5 `.catch(() => {})` calls | Error Handling | `src/lib/payouts/ledger.ts` |
| C8 | Disconnected publish server action — no-op service, hardcoded version | Publishing | `src/actions/publish.actions.ts` calls `src/lib/publishing/service.ts` (no-op) |
| C9 | Missing tenantId propagation — no code path updates signing user's tenantId | Identity | `onboarding.actions.ts:88-206` has access to both IDs but never writes |
| C10 | Duplicate identity service — `AuthenticationService` never called | Identity | `src/lib/identity/authentication/service.ts` unused |
| C11 | 15+ empty catch blocks — errors silently lost in generation pipeline | Error Handling | Multiple files |

### High (17)

| ID | Finding | Category |
|---|---|---|
| H1 | 3 publish paths with inconsistent transaction safety | Publishing |
| H2 | Workspace creation outside transaction in 5 locations | Transactions |
| H3 | Billing repository has no tx support on any method | Repository |
| H4 | `requireTenant` does not verify complete provisioning | Routing |
| H5 | Dashboard can open before provisioning complete | Lifecycle |
| H6 | 6 of 10 events published without correlationId | Events |
| H7 | `tryDb` silences DB errors in event/commission/payout repos | Error Handling |
| H8 | No repositories for Product, Gallery, Link, Setting | Repository |
| H9 | Super-admin actions bypass repositories | Repository |
| H10 | Post-commit provisioning work has no rollback | Transactions |
| H11 | Builder has no middleware lifecycle gate | Routing |
| H12 | Theme errors silently swallowed during provisioning | Error Handling |
| H13 | `seedStarterData()` uses direct prisma without transaction | Persistence |
| H14 | Builder uses direct Prisma instead of repositories | Repository |
| H15 | `findMembershipsByUserId` never accepts transaction | Repository |
| H16 | Website settings updated through multiple inconsistent paths | Website |
| H17 | Hardcoded version in publish event and stub | Publishing |

### Medium (8)

| ID | Finding | Category |
|---|---|---|
| M1 | `WebsiteBeingGenerated` has empty tenantId | Events |
| M2 | In-memory snapshot counter resets on restart | Publishing |
| M3 | `success: true` after no-op publish call | Error Handling |
| M4 | Onboarding has no auth gate in middleware | Routing |
| M5 | `partner/engine.ts` uses fire-and-forget for ALL mutations | Partners |
| M6 | `payouts/ledger.ts` uses fire-and-forget for ALL mutations | Payouts |
| M7 | `settings-repository.ts createBatch()` non-atomic without tx | Repository |
| M8 | Onboarding completion flag set before full pipeline succeeds | Lifecycle |

---

## 12. Root Cause Analysis

### C1/C3/C9: Two-User Problem (Critical) — Root Cause

**Root cause:** The provisioning service and the signup flow were designed as separate concerns without a connecting link.

**Execution path:**
1. `src/app/api/auth/register/route.ts:106` — User created with `tenantId: null`
2. `src/actions/onboarding.actions.ts:88-92` — Reads session user (User A)
3. `src/lib/provisioning/provisioning-service.ts:126` — Generates `adminEmail = buildAdminEmail(slug)` (a DIFFERENT email)
4. `src/lib/provisioning/provisioning-service.ts:167-173` — Creates User B with this new email, linked to tenant
5. `src/actions/onboarding.actions.ts:225-226` — Resolves workspace by tenantId, never touches User A
6. `src/lib/auth.ts:76-79` — Middleware checks `token.tenantId`, which is null (User A's tenantId)
7. Redirects to onboarding → infinite loop

**Files involved:**
- `src/app/api/auth/register/route.ts` (lines 100-106)
- `src/lib/provisioning/provisioning-service.ts` (lines 126, 167-173)
- `src/actions/onboarding.actions.ts` (lines 88-92, 201-210, 225-226)
- `src/lib/auth.ts` (lines 76-79, 112-129)
- `src/middleware.ts` (lines 76-79)

**Downstream impact:** Every ADMIN creator who signs up is stuck in an onboarding loop. The platform is unusable for new creators.

### C2: Dual-Workspace (Critical) — Root Cause

**Root cause:** `ensureWorkspace()` was added as a prerequisite for the generation session (which requires a workspaceId), but the provisioning service also creates a workspace.

**Execution path:**
1. `src/actions/onboarding.actions.ts:94` — `ensureWorkspace(userId)` creates Workspace W1 without tenantId
2. `src/lib/provisioning/provisioning-service.ts:175-180` — Creates Workspace W2 with tenantId
3. `src/actions/onboarding.actions.ts:225` — `workspaceRepository.findByTenantId(tenantId)` finds W2
4. W1 remains orphaned — no tenantId, no meaningful purpose

**Files involved:**
- `src/actions/onboarding.actions.ts` (lines 56-69, 94, 225)
- `src/lib/provisioning/provisioning-service.ts` (lines 175-180)

### C4/C5: Broken Event Correlation (Critical) — Root Cause

**Root cause:** Event publishers did not receive or generate correlationIds, and the codebase has no centralized mechanism to enforce correlationId presence at publish time.

**Execution path:**
1. `src/actions/super-admin-provision.actions.ts:206-214` — `platformEventBus.publish("CreatorProvisioned", { ... correlationId: undefined })`
2. `src/lib/generation/session/events.ts:18-31` — Handler checks `if (!correlationId) return;` → exits immediately
3. The generation session is never updated with the provisioning result via event

**Files involved:**
- `src/actions/super-admin-provision.actions.ts` (lines 206-214)
- `src/actions/publish.actions.ts` (lines 36-42)
- `src/lib/generation/session/events.ts` (lines 6, 18, 33)
- `src/lib/events/types.ts` (correlationId typed as optional)

### C6/C7: Fire-and-Forget Persistence (Critical) — Root Cause

**Root cause:** The partner module and payout ledger were built with the assumption that in-memory success is sufficient and DB persistence is best-effort.

**Pattern:**
```typescript
this.repository.create(data).catch(() => {})
```

Every mutation in `src/lib/partners/engine.ts` (9 locations) and `src/lib/payouts/ledger.ts` (5 locations) uses this pattern. If the database write fails, the application continues as if it succeeded. The in-memory state diverges from the database permanently.

---

## 13. Prioritized Remediation Plan

### BETA-04A — Identity & Lifecycle Fixes

| Priority | Fix | Related Findings |
|---|---|---|
| P0 | Update `onboarding.actions.ts` to set `tenantId` on the signing-up user after provisioning completes | C1, C3, C9, H4 |
| P0 | Remove `ensureWorkspace()` workspace creation before provisioning; let provisioning be the single workspace creator | C2 |
| P0 | Add `user.tenantId` update inside the provisioning transaction (update the signing user, don't create a separate one) | C1, C9 |
| P1 | Remove or connect the duplicate `AuthenticationService` | C10 |
| P1 | Add `onboarding_completed` check to middleware to prevent onboarding loop | C3 |

### BETA-04B — Persistence & Transactions

| Priority | Fix | Related Findings |
|---|---|---|
| P0 | Wrap all workspace create+addMember pairs in `prisma.$transaction` | H2 |
| P0 | Remove `.catch(() => {})` from partner engine and payout ledger | C6, C7 |
| P1 | Add `tx` support to billing repository | H3 |
| P1 | Create repositories for Product, Gallery, AffiliateLink, Setting domains | H8 |
| P1 | Add transaction wrapper to `seedStarterData()` | H13 |
| P2 | Remove `tryDb` pattern or add error reporting | H7 |

### BETA-04C — Routing & State Machine

| Priority | Fix | Related Findings |
|---|---|---|
| P0 | Add provisioning completeness check in middleware (not just tenantId presence) | H4, H5 |
| P1 | Add lifecycle gate to `/builder` route | H11 |
| P1 | Add generation session completeness check to dashboard route | H5 |
| P2 | Add subscription status check to middleware | M4 |

### BETA-04D — Builder & Dashboard

| Priority | Fix | Related Findings |
|---|---|---|
| P1 | Add builder repository layer | H14 |
| P1 | Update dashboard to verify provisioning completeness before rendering | H5 |
| P2 | Add empty state verification for all dashboard data sources | H5 |

### BETA-04E — Storefront & Publishing

| Priority | Fix | Related Findings |
|---|---|---|
| P0 | Connect `publish.actions.ts` to `PublishSnapshotService` | C8 |
| P0 | Add `correlationId` to all event publishes | C4, C5, H6 |
| P1 | Unify publish paths into a single publishing service | H1 |
| P1 | Remove `version: 1` hardcoding; use actual version from snapshot service | H17 |
| P2 | Add transaction to onboarding publish path | H1 |

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Priority |
|---|---|---|---|
| Onboarding infinite loop | Certain | Users cannot use platform | **CRITICAL** |
| Event listeners never fire | Certain | Session progress never updates via events | **CRITICAL** |
| Partner data loss on DB failure | High | Permanent state inconsistency | **CRITICAL** |
| Payout data loss on DB failure | High | Financial data loss | **CRITICAL** |
| Publish action does nothing | High | Users think they published but nothing happens | **CRITICAL** |
| Orphan workspaces accumulate | High | Database bloat, confusing workspace resolution | **HIGH** |
| Dashboard shows incorrect state | Medium | User confusion | **HIGH** |
| Builder accessible pre-provisioning | Medium | User confusion | **HIGH** |
| Theme application silently fails | Medium | Broken storefront appearance | **MEDIUM** |
| Events lost without notification | Medium | Observability degradation | **MEDIUM** |

---

*End of RCCF-BETA-04 Architecture Audit*
