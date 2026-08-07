# Partner Revenue — Audit 07

## The intended model

Agency earns recurring passive revenue **only from creator subscriptions**
(never from creator product sales). Example: Creator Growth ₹699 → CreatorStore
receives the payment → subscription revenue shared → agency receives a
configurable % → creator keeps 100% of product revenue.

## Current state: the pipeline is dead at 4 chokepoints

### Choke 1 — Attribution reads the wrong column
- `billing/service.ts:104,250` guards commission on `Workspace.agencyId`.
- Creator workspaces are created with `type:"TENANT", tenantId` and **no
  `agencyId`** (`provisioning-service.ts:217-222`); `Workspace.agencyId` is
  `@unique` and only set on the agency's OWN workspace.
- The creator↔agency link lives in `AgencyTenant` (`linkCreator` never touches
  `Workspace.agencyId`, `partner-relationship.ts:29-74`).
- **Result:** the commission block is never entered for a creator subscription.

| Finding | Status | Severity | Complexity | Reuse | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Attribution guard uses `Workspace.agencyId` (null on creator workspaces) | ❌ Critical | Low | YES | Attribute via `BillingSubscription.workspaceId → Workspace.tenantId → AgencyTenant.agencyId` (or add `partnerId` to `BillingSubscription`) |

### Choke 2 — Partner engine never initialized
- `partnerService.get(agencyId)` reads an **in-memory Map** (`partners/engine.ts:73-75`).
- `initialize()` is only called by `platformBootstrap.initialize()` — **never
  invoked at runtime** (`bootstrap.ts:359-364` documents this). Manual
  `rehydrateEngine` is the only other path.

### Choke 3 — Rule engine empty → `processCommission` always throws
- `processCommission` calls `resolveRule` → throws `No active commission rule`
  (`commission/service.ts:58-59`); callers swallow it (try/catch, `service.ts:116-118,263-265`).
- `ruleEngine` is an in-memory array (`rules.ts:4`); `CommissionRule` DB rows are
  **never loaded**; `commissionRepository.saveRule` has zero callers.
- Only an in-memory default rule is created when Super Admin saves Commission
  Center settings (`revenue-service.ts:235-244`), and it's lost on serverless
  restarts. It also maps only `platformPercent` vs `100−platformPercent`,
  ignoring `agencyClientPercent/creatorDefaultShare/agencyDefaultShare`.

### Choke 4 — In-memory ledger never hydrated
- Agency-facing balances read the in-memory `commissionLedger`
  (`agency.actions.ts:31-32`) → zeros unless manually rehydrated.
- The DB-backed `PartnerLedgerService` (`ledger/partner-ledger.ts:40-87`) works,
  but nothing writes `COMMISSION_EARNED` rows (commission never fires).

## Settlement — dead loop

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| `createSettlement` selects only `status:"cleared"` entries | ❌ | High | Low | YES | `settlement/service.ts:81-84,92-95` |
| Entries become `cleared` only inside `updateStatus(...,"PAID")` | ❌ | High | Low | YES | `settlement/service.ts:179-186` |
| → chicken-and-egg: no settlement can ever be created | ❌ | High | Low | YES | — |
| `createSettlement`/`updateStatus` have **zero callers** (read-only pages only) | ❌ | High | Medium | YES | `super-admin/settlements/page.tsx` |
| `totalAmount` NaN bug (selects `amount`, casts `.partnerShare`) | ❌ | Medium | Low | YES | `settlement/service.ts:83,101,120` |
| Settlement ledger rows written with `amount: 0` | ❌ | High | Low | YES | `settlement/service.ts:133-141` |

## Payouts — stubbed

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| `createPayout` persists batches in-memory + fire-and-forget DB | ⚠️ | High | Medium | YES | `payouts/service.ts:16-27` |
| All three providers are **stubs** (`ManualPayoutProvider`, `RazorpayRouteProvider` fabricates `rzp_route_...`, `BankTransferProvider`) — **no money moves** | ❌ | Critical | High | NO | `payouts/providers.ts:35-94` |
| `createPayout`/`processPayout` have zero callers | ❌ | High | Medium | YES | grep |
| Units bug: `calculateCommission` expects minor units; webhook passes rupees | ❌ | Medium | Low | YES | `calculator.ts`; `route.ts:85` |

## Commission rules

| Finding | Status | Severity | Complexity | Reuse | Evidence |
| --- | --- | --- | --- | --- | --- |
| Rule cascade **partner → plan (`metadata.planCode`) → default** exists | ✅ | — | — | YES | `rules.ts:38-57` |
| `CommissionRule` schema supports partner/plan/default + priority + effective dates | ✅ | — | — | YES | `schema.prisma:1540-1557` |
| `CommissionEntry` can hold `partnerId/planCode/subscriptionId` | ✅ | — | — | YES | `schema.prisma:1562-1564` |
| No DB → engine hydration; `saveRule` never called | ❌ | Critical | Medium | YES | `commission-repository.ts:11` |

## Can recurring subscription revenue sharing be supported?

**Not without fixes.** The schema supports it; the runtime is dead. Required
(full detail in `docs/subscription-sharing.md`):
1. Attribute the subscription to the agency (join or `partnerId` column).
2. Hydrate rules + partner engine from the DB (or replace with direct Prisma reads).
3. Use `AgencyTenant.revSharePercent`/`CommissionPolicy` in the split.
4. Fix settlement (allow pending entries, select `partnerShare`, write real amounts).
5. Real payout provider (Razorpay transfers/Payouts) + callers.
6. Fix the unit (paise/rupees) bug.
