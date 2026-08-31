# RCCF-73.3 — Creator Client Subscription Provisioning Audit

**Status:** COMPLETE — AUDIT + IMPLEMENTATION DESIGN ONLY. No application code, DB/Prisma, migration, billing, commission logic, plan-registry, or test modified. No commit.
**Date:** 2026-08-19
**Mode:** Read-only. Evidence from current source (`file:line`) and prior RCCF-73.1/73.2 reports.
**Reads:** `docs/rccf-73.1-agency-partner-exhaustive-audit.md`, `docs/rccf-73.2-partner-commercial-architecture-audit.md`, and the current source they reference.

---

## 1. Executive Summary

The F2 defect is **confirmed exactly as the prior audits described**, and — critically — the existing architecture **already contains a canonical Creator signup billing primitive that the fix should reuse**. This makes the fix architecture-preserving and low-risk.

**Root cause (verified):** `provisioning-service.ts:284` calls `billingRepository.linkSubscriptionToWorkspace({ accountType: "creator", accountId: user.id, workspaceId })`. That helper (repository.ts:32-51) only backfills a `workspaceId` onto a subscription that **already exists** (created earlier with `accountId` only). During agency provisioning the user/tenant/workspace are all created **fresh inside** the provisioning transaction — no `BillingAccount`/`BillingSubscription` ever exists for the client, so `linkSubscriptionToWorkspace` returns `null` (silent no-op). The selected Creator plan is never persisted as a subscription; it only lands in an `onboarding_source` Setting, which `resolveActivePlan` never reads.

**Consequences confirmed:** client resolves to phantom Launch (`resolveActivePlan` → `origin: "none"`), `resolvePublishPolicy(null)` → **unlimited** publishing, no client subscription revenue, and the commission runtime never triggers.

**Why the fix is safe and reuse-friendly:** The **normal Creator signup** already creates a `BillingAccount(accountType="creator", accountId=user.id)` + `BillingSubscription(status=TRIALING, trialEndsAt=+15d)` at registration time (`api/auth/register/route.ts:126-144`), **before** provisioning, and then `linkSubscriptionToWorkspace` links it to the workspace. The approved 15-day TRIALING semantics are **exactly** the existing Creator signup semantics. The agency-provisioned path simply needs to create the same account+subscription during provisioning (the workspace is already created inside the same `$transaction`), using the canonical `billingRepository.upsertSubscription` / a small existing-pattern helper — **no new billing subsystem, no schema change, no new trial implementation.**

**VERDICT: A — READY FOR IMPLEMENTATION** (with a small, explicit idempotency guard; no architectural or schema blocker).

---

## 2. Current Provisioning Trace

Complete live path (each step: FILE · FUNCTION · INPUT → OUTPUT · DB mutation · transaction · error):

**Step 1 — Agency UI → partner action**
- `src/actions/partner.actions.ts` · `importCreatorViaAgency(input: { creatorName, email, sourceUrl?, sourcePlatform?, planCode })`
- Input: agency session + client-provided `planCode` (the selected Creator plan).
- Guards: `requireAgencyActive` (line 24), admin-only `canMutate` (line 30), `isAgencyRestrictedPlan(input.planCode)` rejects `creator_launch` (line 38-40), fail-fast capacity check (line 45-52).
- Output: on success returns `{ success, tenantId, workspaceId, inviteToken }`.
- DB mutation: none at this layer (delegates downstream).
- Error: returns `{ success:false, error }`; no side effects on guard failure.

**Step 2 — planCode → confirmProvision**
- `partner.actions.ts:59-66` calls `confirmProvision({ sourceUrl, creatorName, planCode: input.planCode, sourcePlatform, strategyId: "fast" })`.
- The client-selected `planCode` is passed through **unmodified**.

**Step 3 — confirmProvision (provisioning actor gate + pipeline)**
- `src/actions/super-admin-provision.actions.ts` · `confirmProvision(params: { sourceUrl, creatorName, planCode, ... })`
- `requireProvisioningActor()` (line 128) — SUPER_ADMIN or active AGENCY_ADMIN.
- Runs generation pipeline, then `provisioningService.provision(provisioningInput)` (line 158).
- **Validates plan** via `capabilityService.planSummary(params.planCode)` (line 198) — only checks the plan exists; does **not** restrict family/enterprise (see §3, §14).
- Persists `planCode` only into the `onboarding_source` Setting (lines 166-170) — **metadata, not authoritative**.
- After provision: `publishingService.publish(tenantId)` (line 183), `markOnboardingComplete` (line 190), `AgencyTenant.linkCreator` (line 210, agency-admin branch).
- DB mutations: Setting upserts, publish snapshot, AgencyTenant link, audit.

**Step 4 — provisioningService.provision (core creation)**
- `src/modules/provisioning/application/provisioning-service.ts` · `provision(input)`.
- Within `prisma.$transaction` (line 231-300), in order:
  - `tenantRepository.create` → **Tenant** (line 232)
  - `websiteRepository.create` → **Website** (line 233)
  - `brandRepository.create`, `publishRepository.createStatus` (draft), settings batch (244-252)
  - user create/safeUpdate → **User(ADMIN)** (254-265)
  - `workspaceRepository.create` → **Workspace(TENANT, tenantId)** (267-272)
  - `workspaceRepository.addMember` → **WorkspaceMember(OWNER)** (274-278)
  - `billingRepository.linkSubscriptionToWorkspace({ workspaceId: ws.id, accountType: "creator", accountId: user.id })` (284-287) → **NO-OP (returns null)** — no account/subscription exists.
  - seedStarterData if template (289-297)
- Output: `{ tenantId, workspaceId, websiteId, ... }`.
- **Transaction boundary:** the entire tenant→workspace→member→link block is ONE `prisma.$transaction`. If it throws, all roll back.
- **Error behavior:** on throw, `completeRun(FAILED)` + rethrow (407-416); no partial tenant/workspace persists.

**Step 5 — AgencyTenant link**
- `super-admin-provision.actions.ts:208-220` → `agencyTenantRelationship.linkCreator` (partner-relationship.ts) — atomic capacity gate (SELECT FOR UPDATE + count ACTIVE).

**Step 6 — invitation → claim**
- `partner.actions.ts:82-89` → `creatorInvitationService.createInvitation` (stored as Setting).
- `claimCreatorInvitation` → `creatorInvitationService.claimInvitation` (invitation.ts:91-161): creates `User(tenantId=invite.tenantId, ADMIN)` + upserts OWNER membership; **NOT part of the provisioning transaction** (separate).

**Step 7 — Creator billing dashboard + resolveActivePlan**
- Client (now OWNER, `session.user.tenantId` set) opens `/billing` → `getBillingDashboard`/`changePlanAction` (`billing.actions.ts:44,79`) → `billingService.getBillingInfo`/`changePlan` → `resolveActivePlan(workspaceId)`.
- Today: no subscription → phantom Launch.

**Key structural fact:** Steps 1-6 create the client; Step 7 is where the client would pay. The fix inserts the subscription creation into Step 4's transaction (before Step 7), so the client's billing surface immediately shows a real TRIALING subscription they can activate/pay.

---

## 3. Creator Plan Selection

1. **Who selects the Creator plan?** The AGENCY_ADMIN, via the client-provisioning UI → `importCreatorViaAgency(input.planCode)` → `confirmProvision(planCode)`.
2. **Which plan codes are accepted?** Any code for which `capabilityService.planSummary(code)` returns non-null — i.e. any known plan in the registry, **including `partner_*` and `creator_enterprise`** (see security §14). The only rejections at the entry layer are `creator_launch` (via `isAgencyRestrictedPlan`, partner.actions.ts:38) and the agency-managed Grow-minimum intent.
3. **Where is validation performed?**
   - Entry: `isAgencyRestrictedPlan(input.planCode)` rejects `creator_launch` (partner.actions.ts:38).
   - Provisioning: `capabilityService.planSummary(params.planCode)` existence check (super-admin-provision.actions.ts:198) — **no family/enterprise restriction**.
4. **Is Launch rejected for Agency-managed clients?** Yes — `isAgencyRestrictedPlan` returns true for `creator_launch` (plans.ts:738-747), and partner.actions.ts:38 rejects it with a clear error. Confirmed.
5. **Is the selected plan stored anywhere?** Only in the `onboarding_source` Setting (super-admin-provision.actions.ts:166-170) and in `platformEventBus`/audit logs. **Not** as a `BillingSubscription`.
6. **Is that storage authoritative or metadata?** **Metadata only.** `resolveActivePlan`/`capabilityService` never read `onboarding_source`.
7. **What happens on an invalid plan code?** `capabilityService.planSummary(unknown)` returns null → `confirmProvision` returns `{ success:false, error:"Invalid plan..." }` (line 199-201). However, a **valid-but-wrong-family** code (`partner_solo`, `creator_enterprise`) passes validation (see §14).

**Design requirement:** the fix MUST validate the plan as a **canonical, non-enterprise, non-manual Creator plan** server-side (e.g. look up `getCommercePlan(code)` and require `family === "creator"`, `!manual`, `!enterprise`, and reject `isAgencyRestrictedPlan`), then resolve the canonical `BillingPlan` row by code for the subscription `planId`. It must never trust the raw client string for entitlement.

---

## 4. Normal Creator Signup Billing Flow (Phase 3 — CRITICAL)

The canonical Creator signup path is the **model the fix must mirror**:

**Registration (before provisioning):**
- `src/app/api/auth/register/route.ts` · `POST` (persona=creator, line 106-150)
  - Creates `User(ADMIN, tenantId: null)`.
  - Creates `BillingAccount({ accountType: "creator", accountId: user.id })` (line 126-131).
  - Creates `BillingSubscription({ accountId, planId: creator_launch, status: "TRIALING", trialEndsAt: getTrialEndDate(now, 15) })` (line 133-144).
  - **The account+subscription exist BEFORE the workspace.**

**Onboarding (after registration):**
- `src/actions/onboarding.actions.ts` · `mode: "attach_existing_user"`, `authenticatedUserId: userId` (line 55-56, 502).
- `provisioningService.provision(...)` reuses the existing user (safeUpdate to set tenantId) and creates the workspace.
- Inside provisioning, `linkSubscriptionToWorkspace({ workspaceId, accountType: "creator", accountId: user.id })` (provisioning-service.ts:284) **finds the pre-existing unlinked subscription and backfills `workspaceId`** (repository.ts:42-50). **This is the canonical link that makes the plan resolvable.**

**Post-provisioning:**
- `resolveActivePlan(workspaceId)` → `billingRepository.findSubscriptionWithPlan(workspaceId)` → `creator_launch`, TRIALING → entitlement eligible while trial open (plan-source.ts:39-53).
- Creator billing dashboard (`getBillingDashboard`/`changePlanAction`, billing.actions.ts) → `billingService.changePlan` → Razorpay checkout → webhook → subscription ACTIVE.
- `resolvePublishPolicy("creator_launch")` → lifetime 3; after upgrade to Grow → monthly 10.

**Reusable billing primitive:** `billingRepository.upsertSubscription(workspaceId, { planId, status, trialEndsAt })` (repository.ts:105-133) is the canonical create-or-update subscription service. It lazily creates a `BillingAccount(accountType="tenant", accountId=workspaceId)` if none exists (line 118-125) and creates/updates the `BillingSubscription` scoped by the **unique `workspaceId`** (line 108, 126-128). This is idempotent-per-workspace by construction.

**Conclusion (Phase 3):** There **is** an existing canonical service (`billingRepository.upsertSubscription`) and an established trial pattern (`getTrialEndDate` + TRIALING). The fix should reuse `upsertSubscription` (or a thin wrapper) rather than build a second subscription-creation system. The `linkSubscriptionToWorkspace` helper exists precisely for the "account-first, workspace-later" signup flow — it is **not** the right tool for the agency path (where the account doesn't pre-exist).

---

## 5. BillingAccount Lifecycle

- **Created:** for creators at registration (`register/route.ts:126`, `accountType="creator", accountId=user.id`) and lazily by `upsertSubscription` (`repository.ts:118-125`, `accountType="tenant", accountId=workspaceId`) and by `subscription-governance.actions.ts:30-33` (`accountType="creator", accountId=ws.id`).
- **accountType:** "tenant" | "agency" (schema:941). Creator accounts use "creator" or "tenant" depending on the writer — see inconsistency note.
- **accountId:** differs by writer: `user.id` (register), `workspaceId` (upsertSubscription, subscription-governance). **Inconsistent identity convention.**
- **Uniqueness:** `@@unique([accountType, accountId])` (schema:948). Prevents duplicate accounts for the same (type, id).
- **Workspace association:** BillingAccount has no workspace FK; association is via `BillingSubscription.workspaceId`.
- **Subscription association:** `BillingAccount.subscriptions` one-to-many; `BillingSubscription.accountId` → account.
- **Existing account reuse:** `upsertSubscription` reuses an account matching `(tenant, workspaceId)` or creates it.
- **Duplicate handling:** the unique `(accountType, accountId)` + unique `BillingSubscription.workspaceId` make duplicate account/subscription creation collide on constraints (see §12).

**Design implication:** For the agency-provisioned client, the simplest **canonical and idempotent** approach is to call `billingRepository.upsertSubscription(workspaceId, { planId, status: "TRIALING", trialEndsAt })` **inside the provisioning transaction**. That reuses the existing lazy-account + per-workspace-subscription behavior, avoids a new account-creation path, and is idempotent per workspace. (The `accountId=user.id` convention from register is NOT required for resolution — `resolveActivePlan` reads by `workspaceId`.)

---

## 6. BillingSubscription Lifecycle

- **States:** DRAFT / TRIALING / ACTIVE / PAST_DUE / CANCELLED / EXPIRED (schema:1063; lifecycle.ts:18-25).
- **Create path (canonical):** `billingRepository.upsertSubscription` (repository.ts:105-133) — create-or-update by unique `workspaceId`.
- **Update path:** webhook (`billingService.handleSubscriptionWebhook`, service.ts:73-270) transitions TRIALING→ACTIVE on `subscription.activated`/`payment.captured`, guarded by a **positive captured amount** (RCCF-71.4.5, service.ts:129-152). No zero/absent payment ever activates.
- **Resolve path:** `resolveActivePlan` → `billingRepository.findSubscriptionWithPlan(workspaceId)` (plan-source.ts:79-100); `isSubscriptionEntitlementEligible` (plan-source.ts:39-53): TRIALING eligible only while trial open; ACTIVE eligible until renewsAt; PAST_DUE/CANCELLED/EXPIRED not eligible.
- **Client pay path (after claim):** `changePlanAction`/`changePlan` → Razorpay checkout → webhook → ACTIVE (billing.actions.ts:79, service.ts:601-620).

**Design:** creating a TRIALING subscription via `upsertSubscription` fits perfectly. It does not activate payment, create an invoice, or touch Razorpay. The client later activates through the existing webhook path with a real payment.

---

## 7. Subscription Trial Semantics (Phase 5)

- **Approved working decision for THIS ticket:** 15-day TRIALING Creator subscription.
- **Existing Creator signup already uses exactly these semantics:** `register/route.ts:142` creates `status: "TRIALING"`, `trialEndsAt: getTrialEndDate(now, 15)`. `getTrialEndDate(start, trialDays=14)` defaults 14 but register passes 15 (subscription-engine.ts:74-78).
- **No mismatch.** The proposed state `BillingSubscription { plan=creator_* , status=TRIALING, trialEndsAt=+15d, workspaceId=clientWorkspace, accountId=creatorAccount }` is byte-for-byte the shape the normal Creator signup produces. **Reuse `getTrialEndDate(new Date(), 15)` and `billingRepository.upsertSubscription`.** No new trial implementation is needed; no STOP condition triggered.

---

## 8. Publishing Entitlement Impact (Phase 7)

- `resolveActivePlan(undefined, tenantId)` (publishing/service.ts:277) → `.code` → `resolvePublishPolicy(code)`.
- `resolvePublishPolicy` (publish-policy.ts:56-78): known plan → its policy; **unknown/null → `{ mode: "unlimited", limit: null }`** (the F2 bug).
- **Expected publish policy for the new TRIALING client:**
  - `creator_grow` (recommended) → `{ mode: "monthly", limit: 10 }` (publish-policy.ts:23).
  - `creator_scale` → `{ mode: "unlimited", limit: null }` (publish-policy.ts:24).
  - `creator_launch` → lifetime 3 (but agency clients are rejected at Launch anyway).
- Because `isSubscriptionEntitlementEligible` treats TRIALING (while open) as eligible, `resolveActivePlan` returns the real plan code during the 15-day trial → the **unlimited fallback disappears** automatically. **No publish-policy change needed.**
- **Post-trial** (TRIALING expired): `isSubscriptionEntitlementEligible` → false → `resolveActivePlan` returns `origin:"v2"` with code null → `resolvePublishPolicy(null)` → **unlimited again** for an expired/unpaid trial. This mirrors normal Creator behavior (an expired Launch trial yields unlimited via the same fallback — RCCF-73.1 noted this as the existing design). This is a **known existing behavior**, not introduced by this fix; a future ticket may tighten post-trial gating, but it is **out of scope** here and should not be silently changed. Documented for the regression matrix.
- **Verification:** the immediate `publishingService.publish` in `confirmProvision` (super-admin-provision.actions.ts:183) will now resolve the real plan and meter quota correctly from the first publish.

---

## 9. Commission Impact (Phase 8)

- Commission is recorded ONLY inside `billingService.handleSubscriptionWebhook` for a **paid** activate/renew (`service.ts:171-241`), which requires a **positive captured amount** (service.ts:129-152). It calls `recordSubscriptionCommission` (commission/runtime.ts) → attribution via workspace→tenant→AgencyTenant (runtime.ts:43-54).
- **Creating a TRIALING subscription does NOT create any commission:** no `BillingInvoice` (invoice is created only on paid activate/renew, service.ts:188-211), no `CommissionEntry`, no `PartnerLedger`. The webhook path is never entered by provisioning. Commission stays driven by the paid subscription/invoice lifecycle. **INV-13 / the "no commission during trial" expectation are satisfied.**
- After the client later pays/activates, the existing webhook fires → invoice → commission to the agency — **exactly the approved model** (INV-06/07/16). No commission logic changes.

---

## 10. Invitation and Claim Impact (Phase 9)

- Creating the TRIALING `BillingSubscription` on the **Creator workspace** before invitation claim does **not** touch auth/lifecycle/onboarding:
  - Auth: invitation claim creates the user with `tenantId` (invitation.ts:124-137); session/re-auth is role+membership driven (RCCF-73.1 §4/8), independent of subscription.
  - Lifecycle/onboarding: `markOnboardingComplete` runs at provisioning (super-admin-provision.actions.ts:190); subscription state does not gate onboarding.
  - Claim: creates OWNER membership (invitation.ts:139-145); subscription ownership is by workspace, not by the claiming user.
  - Workspace resolution: `resolveActivePlan(workspaceId)` reads by workspace — works with or without claim.
  - Billing dashboard: after claim, the client's `/billing` (`getBillingDashboard`, billing.actions.ts:44) resolves the TRIALING plan and offers upgrade/pay — **exactly the intended post-claim flow (INV-10).**
- The subscription is tied to the **Creator workspace** (`workspaceId = ws.id` of type TENANT), **never** the Partner workspace (type AGENCY). **INV-01/INV-04 satisfied.**
- **No break found** in auth, lifecycle, onboarding, claim, workspace resolution, or billing dashboard.

---

## 11. Idempotency Analysis (Phase 10)

**Desired:** retrying the same logical provisioning request must not duplicate BillingAccount / BillingSubscription / AgencyTenant / Workspace.

**Current guarantees:**
- `AgencyTenant.tenantId` is `@unique` (schema:221) → `linkCreator` upserts by tenantId (partner-relationship.ts:120-144); a second link on the same tenant updates, not duplicates. ✅
- `BillingSubscription.workspaceId` is `@unique` (schema:1061) → if the fix uses `upsertSubscription`, a retry updates the existing row for that workspace, not a duplicate. ✅ (once the fix reuses `upsertSubscription`).
- `BillingAccount` `@@unique([accountType, accountId])` → duplicate account collides. ✅
- **Workspace / Tenant / Website / User:** `provisioningService.provision` has **NO idempotency key**. A retry of the same logical request creates a **new Tenant, Workspace, Website, and User** each time (fresh `tenantSlugService.generate` could also collide on the unique `slug`/`subdomain`, throwing P2002). This is a **pre-existing** non-idempotency (also affects normal Creator onboarding, mitigated by the onboarding "reuse existing workspace" guard at onboarding.actions.ts:449-498 — which the **agency path does not have**).

**Smallest idempotency boundary required:** the fix should add a **provisioning idempotency key** scoped to the logical provisioning request (e.g. an `idempotencyKey`/`requestId` on `CreatorProvisionRun`, or reuse `runId` as a unique request token) so that retrying the same run reuses the created tenant/workspace/subscription instead of recreating them. This is an explicit gap to document; **do not implement here.** Without it, the subscription/account uniqueness holds (via `upsertSubscription` + unique constraints), but tenant/workspace duplication remains possible on a retry of a **failed** run that already committed.

---

## 12. Failure / Rollback Analysis (Phase 11)

Transaction boundaries today:
- **T1 (provisioning core):** `prisma.$transaction` covering Tenant → Website → Brand → Settings → User → Workspace → Member → `linkSubscriptionToWorkspace` → seed (provisioning-service.ts:231-300). **Atomic.**
- **T2 (post-T1):** publish, markOnboardingComplete, AgencyTenant.linkCreator, invitation, audit — **NOT in T1** (separate operations).

Failure-by-step:

| Step | If fails | Rollback | Orphan risk |
|---|---|---|---|
| 1 Tenant | in T1 | T1 rolls back | none (T1 atomic) |
| 2 Workspace | in T1 | T1 rolls back | none |
| 3 BillingAccount (new fix) | in T1 | T1 rolls back | none — if subscription+account are created in T1, no orphan account/subscription |
| 4 BillingSubscription (new fix) | in T1 | T1 rolls back | none |
| 5 AgencyTenant.linkCreator | after T1 (T2) | **not atomic with T1** | **client exists WITHOUT AgencyTenant** (orphan relationship); capacity already consumed? No — link never created, so capacity not consumed; but a tenant/workspace exists unlinked (existing risk, RCCF-73.1 noted capacity denial prevents over-provision, but a mid-flow failure after T1 before link can orphan the tenant). |
| 6 Invitation | after T1 | not atomic | client exists without invite (creator can't claim) — existing risk |
| 7 Publish | after T1 | not atomic | client exists, unpublished |
| 8 Client claims | separate | n/a | n/a |
| 9 Client never claims | n/a | n/a | TRIALING subscription remains on an unclaimed client; **not a paid entitlement**, no invoice, no commission — acceptable; trial simply expires. |

**Key design recommendation:** create the `BillingAccount` + TRIALING `BillingSubscription` **inside T1** (the provisioning transaction). This guarantees:
- **No billing entitlement without the client** (INV-16: no orphaned paid entitlement — and it's TRIALING, not paid, so no paid entitlement exists anyway).
- **No client without a billing entitlement** (INV-04).
- Atomic rollback — if Tenant/Workspace creation fails, the subscription rolls back too (no orphan subscription).
- `AgencyTenant` can exist without a subscription only transiently (the AgencyTenant link is created after T1), but since the subscription is created in T1, by the time the AgencyTenant link runs the client **already has** its subscription.

**Documented gap:** the AgencyTenant link, invitation, and publish are outside T1; a failure there leaves a fully-provisioned (and now correctly subscribed) client without an agency link/invite. This is pre-existing and unchanged by the fix.

---

## 13. Database Constraint Analysis (Phase 12)

Relevant constraints (schema.prisma):
- `BillingAccount`: `@@unique([accountType, accountId])` (schema:948); `accountType`/`accountId` non-null; `subscriptions` relation.
- `BillingSubscription`: `workspaceId String? @unique` (schema:1061); `accountId` non-null FK→BillingAccount; `planId` non-null FK→BillingPlan; `status` non-null default ACTIVE; `trialEndsAt`/`renewsAt`/`cancelledAt` nullable; `account`/`plan`/`workspace` relations.
- `Workspace`: `tenantId String? @unique` (schema:288), `agencyId String? @unique` (schema:289); `billingSubscription BillingSubscription?` (schema:298); `type`/`status` enums.
- `Tenant`: (via `workspace.tenantId`) one TENANT workspace.
- `AgencyTenant`: `tenantId @unique` (schema:221), `agencyId` FK, `status` default ACTIVE, `workspaceId` nullable.
- `User`: `email` unique; `tenantId` nullable.
- `WorkspaceMember`: `@@unique([workspaceId, userId])` (schema:319).

**Representability:** the desired state — a client Workspace (type TENANT) with a single `BillingSubscription` (TRIALING, planId=creator_plan, trialEndsAt, accountId=creator account) and an `AgencyTenant` link — is **fully representable with the existing schema. NO schema change required.** The `workspaceId @unique` on `BillingSubscription` guarantees one subscription per client workspace (INV-03), and `accountType_accountId @unique` prevents duplicate accounts. **No STOP condition on schema.**

---

## 14. Security Analysis (Phase 13)

Server-side protections and gaps:

| Threat | Current | Post-fix requirement |
|---|---|---|
| Arbitrary Creator plan code | `capabilityService.planSummary(code)` existence check only (super-admin-provision.actions.ts:198) | Resolve via canonical `getCommercePlan(code)`; require `family==="creator"`, `!manual`, `!enterprise`; reject `isAgencyRestrictedPlan` (Launch). **Not trust raw string for entitlement.** |
| Partner plan injection (`partner_solo` etc.) | **Passes** `planSummary` today (it's a known plan) → could be stored as metadata; today it's not used for entitlement, but the fix MUST reject it | Reject non-creator-family codes. |
| Enterprise plan injection (`creator_enterprise`/`partner_enterprise`) | **Passes** `planSummary` | Reject `enterprise`/`manual` plans. |
| Free/unlimited subscription creation | n/a (no subscription created) | Fix must create TRIALING with a real plan, never an implicit ACTIVE/free/unlimited subscription (INV-08). |
| Client changing planCode after server validation | planCode is client-supplied at `importCreatorViaAgency` input | Server re-validates in `confirmProvision`/provisioning; the stored subscription uses the **server-resolved BillingPlan**, not a re-read of the client string. |
| Cross-agency workspace association | agencyId session-derived; `assertAgencyOwnsTenant` for reads | Subscription created against the **newly-created** creator workspace (server-owned), never a Partner/other-agency workspace. |
| Subscription attached to wrong workspace | n/a | Tie to `ws.id` (TENANT workspace) created in T1. |
| Subscription attached to Partner BillingAccount | n/a | Use the creator account path (`upsertSubscription` → accountType "tenant" keyed to workspace, or a creator account), never the agency account. |

**Design requirement:** the server must derive agency (session), partner workspace (session agencyId → workspace), creator tenant + creator workspace (created in T1), and creator account (created/upserted in T1) from server-side relationships — never from client-supplied ids for entitlement.

---

## 15. Exact F2 Root Cause

**`provisioning-service.ts:284` → `billingRepository.linkSubscriptionToWorkspace` (repository.ts:32-51).**

That helper only backfills `workspaceId` onto a subscription that **already exists** (created earlier with `accountId` only, `workspaceId: null`). In the agency-provisioning path the user/tenant/workspace are all created **fresh inside** `provisioningService.provision`, and **no `BillingAccount`/`BillingSubscription` is ever created for the client**. Therefore `linkSubscriptionToWorkspace` finds no account (returns null at repository.ts:41) and no unlinked subscription (returns null at repository.ts:46) → **silent no-op**.

The selected `planCode` survives only in the `onboarding_source` Setting (super-admin-provision.actions.ts:166-170), which `resolveActivePlan` never reads. `resolveActivePlan(workspaceId)` → no `BillingSubscription` → `origin:"none"` → phantom Launch → `resolvePublishPolicy(null)` → **unlimited**.

This is the exact mechanism described in RCCF-73.1-F2 and RCCF-73.2 §18. **Confirmed independently from current source.**

---

## 16. Minimal Implementation Design (Phase 14 — no code written)

**Goal:** during agency client provisioning, create a real 15-day TRIALING Creator `BillingSubscription` on the client workspace, reusing the canonical billing primitives, inside the existing provisioning transaction, with server-side plan validation and idempotency.

**Design:**

1. **Validate the selected Creator plan server-side** before/at provisioning:
   - In `confirmProvision` (or a shared helper), require the `planCode` to resolve to a canonical `getCommercePlan(code)` with `family==="creator"`, `!manual`, `!enterprise`, and reject `isAgencyRestrictedPlan(code)` (Launch). Resolve the canonical `BillingPlan` row by code (`billingRepository.findPlanByCode`, seeding the catalog if needed).
   - Reject Partner-plan, Enterprise, and invalid codes with a clear error. Do not trust the raw string for entitlement.

2. **Create the subscription inside the provisioning transaction (T1):**
   - In `provisioningService.provision`, after the Workspace + OWNER member are created (around line 278), call `billingRepository.upsertSubscription(ws.id, { planId, status: "TRIALING", trialEndsAt: getTrialEndDate(new Date(), 15) }, tx)`.
   - `upsertSubscription` lazily creates the creator `BillingAccount` (accountType "tenant", accountId=workspaceId) if absent, and is idempotent per unique `workspaceId`. This reuses the canonical primitive (Phase 3 finding) — **no new billing subsystem.**
   - Replace the existing no-op `linkSubscriptionToWorkspace` call for the agency path with this direct creation (the `linkSubscriptionToWorkspace` helper remains for the normal signup flow, untouched).

3. **Plan source plumbing:** thread the **validated** `planCode` from `importCreatorViaAgency` → `confirmProvision` → `provisioningService.provision` so the subscription uses the server-resolved `BillingPlan`. The client-visible `planCode` becomes authoritative only after server validation.

4. **Idempotency (documented, not implemented):** add a provisioning request idempotency key (`CreatorProvisionRun.idempotencyKey` or reuse `runId`) so a retried run reuses the created tenant/workspace/subscription. The `BillingSubscription.workspaceId` unique + `BillingAccount` unique + `upsertSubscription` prevent duplicate subscriptions/accounts even without it, but tenant/workspace duplication on retry remains a pre-existing gap.

5. **No other changes:** do not modify billing webhooks, commission runtime, plan registry, publish policy, or normal Creator/Partner signup.

**Files/objects touched (design):**
- `src/modules/provisioning/application/provisioning-service.ts` — create subscription in T1; accept validated plan.
- `src/actions/super-admin-provision.actions.ts` — validate plan (family/enterprise/manual/Launch) and pass validated code into provisioning.
- `src/actions/partner.actions.ts` — (already rejects Launch; ensure validation is centralized, no per-layer divergence).
- `src/modules/billing/infrastructure/repository.ts` — reuse `upsertSubscription` (no change needed) and/or add a small helper `ensureCreatorSubscription(workspaceId, planId, trialDays, tx)` if desired for clarity.
- (Optional) an idempotency key on `CreatorProvisionRun`.

**Transaction boundary:** the account + subscription creation MUST be inside T1 so a provisioning failure rolls it back (no orphan subscription, no paid entitlement on failure — INV-16).

**Error handling:** a validation failure or subscription-creation failure rolls back T1 and surfaces a clear error; no silent fallback to Launch/unlimited.

**Tests required:** see §18. **Browser QA:** see §19.

---

## 17. Exact Files Expected to Change (implementation ticket scope)

1. `src/modules/provisioning/application/provisioning-service.ts` — create TRIALING subscription in T1; thread validated plan.
2. `src/actions/super-admin-provision.actions.ts` — server-side plan validation (creator family, non-enterprise, non-manual, non-Launch).
3. `src/actions/partner.actions.ts` — confirm centralized validation (Launch rejection already present).
4. `src/modules/billing/infrastructure/repository.ts` — reuse `upsertSubscription`; optional small helper; **no behavior change to existing methods.**
5. `src/modules/provisioning/domain/provisioning-state.ts` (or `CreatorProvisionRun`) — optional idempotency key field (data-only, no schema change if a `metadata`/`correlationId` column is reused; otherwise a data-only Prisma field — deferred to implementation).

No changes to: `prisma/schema.prisma`, migrations, `src/config/commerce/plans.ts`, `src/lib/commission/**`, `src/modules/billing/application/service.ts`, `src/app/api/webhooks/**`, normal Creator signup (`register/route.ts`), or Partner signup.

---

## 18. Regression Test Matrix (Phase 15)

| Scenario | Expected |
|---|---|
| NORMAL CREATOR — Launch signup | BillingAccount + TRIALING subscription exist; `resolveActivePlan` → creator_launch; billing dashboard works; upgrade/pay works. **Unchanged.** |
| NORMAL CREATOR — upgrade to Grow via checkout/webhook | TRIALING→ACTIVE with positive payment guard; publish quota monthly 10. **Unchanged.** |
| AGENCY provision — Creator Grow | Client has exactly one TRIALING `creator_grow` BillingSubscription on the client workspace; `resolveActivePlan` → creator_grow; publish quota monthly 10 (not unlimited). |
| AGENCY provision — Creator Scale | Client has one TRIALING `creator_scale` subscription; `resolveActivePlan` → creator_scale; publish unlimited (by plan, not by missing-subscription fallback). |
| Security — Partner plan injection (`partner_solo`) | Rejected (family != creator). |
| Security — Enterprise injection (`creator_enterprise`) | Rejected (enterprise/manual). |
| Security — Launch agency client | Rejected (`isAgencyRestrictedPlan`). |
| Security — invalid plan | Rejected ("Invalid plan"). |
| Duplicate provisioning (same logical request) | No duplicate subscription/account (unique constraints + `upsertSubscription`); document tenant/workspace idempotency gap. |
| Commission — TRIALING | NO `CommissionEntry`/`PartnerLedger`/invoice created merely by subscription existing. |
| Commission — ACTIVE paid invoice | Existing runtime records commission to the agency (unchanged). |
| Publishing — no null subscription | `resolveActivePlan` returns real plan; `resolvePublishPolicy` never hits the unlimited fallback during trial. |

---

## 19. Browser QA Matrix

1. Agency Admin provisions a Creator client (Grow) → invitation → client claims → client `/billing` shows "Creator Growth · TRIALING" with a trial end date.
2. Client publishes → quota meter shows 10/month (not "Unlimited"); dashboard plan chip = Growth (not phantom Launch).
3. Client upgrades to a paid plan via the billing surface → Razorpay checkout → webhook → ACTIVE; agency revenue dashboard eventually shows commission.
4. Agency tries to provision with a Partner plan / Enterprise plan / Launch → rejected with clear error.
5. Normal Creator signup → onboarding → billing → upgrade still works (no regression).
6. Cross-check: client workspace resolution, claim login, no cross-agency leakage, agency capacity still enforced.

---

## 20. Product Decisions

- **Established by architecture / prior policy:** who pays (client pays after claim); Partner plan ≠ Creator plan; active-client capacity semantics; commission off active paid subscriptions; 15-day TRIALING decision (approved for THIS ticket, and it matches the existing Creator signup — no mismatch).
- **Established by this approved trial decision:** TRIALING 15-day client subscription, no payment/invoice during provisioning.
- **Requires implementation:** the minimal design in §16.
- **Open (deferred, NOT blocking, NOT silently resolved):**
  - **D-A — Post-trial expired/unpaid client publishing.** After the 15-day TRIALING expires unpaid, `resolveActivePlan` yields code null → `resolvePublishPolicy(null)` → **unlimited** (mirrors normal Creator expired-trial behavior). Whether an expired-trial provisioned client should be locked/limited is a separate policy decision, **out of scope** here. The fix does not change it.
  - **D-B — Provisioning idempotency.** Adding a request idempotency key to `CreatorProvisionRun` (data-only) to prevent tenant/workspace duplication on retry. Recommended but scoped separately.
  - **D-C — BillingAccount accountId convention.** The existing writers use different `accountId` values (`user.id` vs `workspaceId`). The fix uses `upsertSubscription`'s convention (workspaceId-keyed) which is sufficient for resolution; unifying conventions is a hygiene item, not a blocker.

No unavoidable product decision beyond the approved 15-day TRIALING is required.

---

## 21. Acceptance Invariants (this ticket)

- **INV-01** Partner subscription remains completely separate from the Creator client subscription. ✅ by design (different workspaces/accounts).
- **INV-02** The Creator client's plan is persisted independently. ✅ via a real BillingSubscription.
- **INV-03** Every successfully provisioned Creator client has exactly one Creator BillingSubscription. ✅ via unique `workspaceId` + `upsertSubscription`.
- **INV-04** The subscription is associated with the correct Creator workspace. ✅ tied to the TENANT workspace created in T1.
- **INV-05** The selected Creator plan survives provisioning. ✅ persisted as `planId`.
- **INV-06** The selected plan resolves through `resolveActivePlan`. ✅ (reads BillingSubscription by workspace).
- **INV-07** No Partner plan determines the Creator client's capabilities. ✅ creator subscription only.
- **INV-08** No provisioned client receives an implicit ACTIVE/free subscription. ✅ TRIALING only, no payment/invoice.
- **INV-09** No client receives unlimited publishing because a subscription is missing. ✅ real plan resolves; no null fallback during trial.
- **INV-10** Client can claim and pay/activate through the existing Creator billing surface. ✅ unchanged path.
- **INV-11** Normal Creator signup/billing unchanged. ✅ (only the agency path is touched).
- **INV-12** Normal Partner signup/billing unchanged. ✅.
- **INV-13** Commission architecture unchanged. ✅ (trial creates no commission).
- **INV-14** Razorpay webhook semantics unchanged. ✅ (no shared primitive change required — subscription creation is a direct DB write in provisioning, not a webhook).
- **INV-15** No duplicate BillingAccounts/Subscriptions on retry. ✅ via unique constraints + `upsertSubscription` (note: tenant/workspace idempotency is a separate pre-existing gap, D-B).
- **INV-16** Provisioning failure must not leave an orphaned paid entitlement. ✅ subscription created in T1 (atomic rollback) and is TRIALING (never paid).

---

## 22. Final Verdict

**A — READY FOR IMPLEMENTATION**

The existing architecture clearly supports the fix: the canonical Creator signup already produces the exact 15-day TRIALING `BillingSubscription` shape required, `billingRepository.upsertSubscription` is a ready-to-reuse canonical primitive, the `BillingSubscription.workspaceId` unique constraint guarantees one-subscription-per-client, and creating the account+subscription inside the existing provisioning transaction gives atomicity and no orphan paid entitlements. No schema change, no new billing subsystem, no new trial implementation, no commission/webhook/plan-registry change is required.

The only clarifications (post-trial expired-client publishing behavior D-A, provisioning idempotency D-B, accountId convention D-C) are **deferred product/hygiene items** that do not block the fix and were explicitly flagged rather than silently resolved.

**AUDIT + DESIGN ONLY — no code, DB, migration, billing, commission, plan-registry, or test modified; no commit. STOP after this report.**
