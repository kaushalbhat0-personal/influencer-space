# RECOVERY-05: Provisioning Transaction Integrity Audit

**Date:** 2026-07-30  
**Status:** Root Cause Identified  

---

## Phase 1 — Provisioning Sequence Diagram

```
ProvisioningService.provision(input)
  │
  ├── Pre-transaction:
  │   ├── websitePersonalizer.personalize()       [in-memory]
  │   ├── bcrypt.hash()                            [crypto]
  │   ├── tenantSlugService.generate()             [prisma.tenant.findUnique]
  │   ├── prisma.creatorProvisionRun.update()      [global prisma]
  │   └── logEvent() x4                            [global prisma]
  │
  ├── prisma.$transaction(async (tx) => {          ← INTERACTIVE TRANSACTION
  │   ├── tenantRepository.create()                [tx] → Tenant
  │   ├── websiteRepository.create()               [tx] → Website
  │   ├── brandRepository.create()                 [tx] → Brand
  │   ├── publishRepository.createStatus()          [tx] → PublishStatus
  │   ├── websiteSettingsRepository.createBatch()  [tx] → Setting ×5
  │   ├── userRepository.create()                  [tx] → User ←
  │   ├── workspaceRepository.create()             [tx] → Workspace
  │   ├── workspaceRepository.addMember()           [tx] → WorkspaceMember
  │   └── seedStarterData():
  │       ├── productRepository.create() ×N        [tx] → Product
  │       ├── galleryRepository.create() ×N        [tx] → GalleryImage
  │       ├── prisma.timelineEvent.create() ×N     [GLOBAL prisma] ← BUG
  │       └── linkRepository.create() ×N           [tx] → AffiliateLink
  │   └── return { tenantId, user, website }
  │
  ├── Post-transaction:
  │   ├── templateService.apply()                  [global prisma] → Pages, Sections, Blocks
  │   ├── themeService.apply()                     [global prisma] → Website.themePackageId
  │   └── websiteRepository.updateThemeColors()    [global prisma] → Website.themeColors
  │
  └── logEvent() + prisma.creatorProvisionRun.update()
```

**Key finding: ALL writes are in a SINGLE `$transaction`, EXCEPT `prisma.timelineEvent.create()` on line 95 of `seeder.ts`.**

---

## Phase 2 — Transaction Boundary Audit

| Write | Inside `$transaction` | Uses `tx` | Status |
|-------|----------------------|-----------|--------|
| Tenant.create | ✅ | `tx` | ✅ |
| Website.create | ✅ | `tx` | ✅ |
| Brand.create | ✅ | `tx` | ✅ |
| PublishStatus.create | ✅ | `tx` | ✅ |
| Setting.create ×5 | ✅ | `tx` | ✅ |
| User.create | ✅ | `tx` | ✅ |
| Workspace.create | ✅ | `tx` | ✅ |
| WorkspaceMember.create | ✅ | `tx` | ✅ |
| Product.create ×N | ✅ | `db` (= `tx`) | ✅ |
| GalleryImage.create ×N | ✅ | `db` (= `tx`) | ✅ |
| **TimelineEvent.create ×N** | ✅ | **`prisma` (GLOBAL)** | **❌ BUG** |
| AffiliateLink.create ×N | ✅ | `db` (= `tx`) | ✅ |

**All writes use `tx` through every repository's `this.client(tx ?? prisma)` pattern, EXCEPT the `prisma.timelineEvent.create()` call at `seeder.ts:95`.**

---

## Phase 3 — User Creation Audit

**Code path** (`provisioning-service.ts:181-192`):
```ts
const user = input.authenticatedUserId
    ? await userRepository.update(input.authenticatedUserId, ..., tx)
    : await userRepository.create({ ... }, tx);
```

**`UserRepository.create()`** (`user-repository.ts:17-27`):
```ts
async create(data: CreateUserData, tx?: Prisma.TransactionClient) {
    return this.client(tx).user.create({ ... });
}
```

- **Called?** Yes, inside `$transaction` with `tx`
- **Awaited?** Yes, `await userRepository.create(..., tx)`
- **Throws?** Yes, on constraint violation (P2002) — propagates to `$transaction`
- **Catches?** No — no try/catch around user creation
- **Returns?** Created User object with `id`, `email`, `role`
- **Uses tx?** Yes — `this.client(tx)` returns the transaction client

---

## Phase 4 — Repository Consistency

| Repository | Pattern | Status |
|-----------|---------|--------|
| UserRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| TenantRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| WebsiteRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| BrandRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| PublishRepository | `tx ?? prisma` → `tx` used | ✅ |
| WebsiteSettingsRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| WorkspaceRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| ProductRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| GalleryRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| LinkRepository | `this.client(tx ?? prisma)` → `tx` used | ✅ |
| **seedStarterData** (timeline block) | **`prisma.timelineEvent.create()`** — **global** | **❌** |

---

## Phase 5 — Foreign Key Integrity

```prisma
WorkspaceMember.userId  →  User.id  (onDelete: Cascade)
Workspace.tenantId      →  Tenant.id
Website.tenantId        →  Tenant.id
User.tenantId           →  Tenant.id  (onDelete: Cascade)
```

The FK from `WorkspaceMember.userId → User.id` means:
- If User doesn't exist, WorkspaceMember creation FAILS (FK violation)
- WorkspaceMember can NEVER exist without a valid User
- If User IS created then DELETED, WorkspaceMember is cascade-deleted

**Conclusion:** The FK constraint MAKES "User ❌ + WorkspaceMember ✅" impossible.

---

## Phase 6 — Exception Audit

No `.catch()` or `try/catch` exists inside the `$transaction` callback for any of the repository calls. All exceptions propagate directly to the `$transaction` handler.

However, `prisma.timelineEvent.create()` at `seeder.ts:95` uses the **global** `prisma` client. If this call fails:
- The error propagates to `seedStarterData()`
- Which propagates to the `$transaction` callback
- The callback throws → Prisma rolls back ALL `tx` writes
- BUT the global `prisma.timelineEvent.create()` write is **NOT rolled back**

Result: Orphan `TimelineEvent` records with a `tenantId` referencing a non-existent tenant.

---

## Phase 7 — SeedStarterData Audit

`seedStarterData()` at `seeder.ts:53-109`:
- Creates Products (via `db` = `tx`) ✅
- Creates Gallery images (via `db` = `tx`) ✅
- **Creates TimelineEvents (via global `prisma`) — BUG** ❌
- Creates Affiliate Links (via `db` = `tx`) ✅

Does NOT delete, overwrite, or modify any User, Workspace, or Owner records.

---

## Phase 8 — Publishing Audit

`templateService.apply()` (post-transaction):
- Creates Pages, Sections, Blocks via global `prisma`
- Updates Website configuration
- Does NOT touch User, WorkspaceMember, or Workspace owner

`themeService.apply()` (post-transaction):
- Updates Website `themePackageId`
- Does NOT touch User or identity records

---

## Phase 9 — Transaction Atomicity

**With a single atomic `$transaction`, "User ❌ + everything else ✅" is IMPOSSIBLE.**

If `$transaction` commits → ALL writes persist (including User)
If `$transaction` rolls back → NO writes persist

The FK constraint `WorkspaceMember.userId → User.id` further enforces this — WorkspaceMember cannot exist without User.

---

## Phase 10 — Root Cause Report

### Root Cause (Primary)

> **`seedStarterData()` at `seeder.ts:95` uses the global `prisma` client instead of the transaction `db` for `timelineEvent.create()`, bypassing the interactive transaction.**

```ts
// seeder.ts:95 — BUG
await prisma.timelineEvent.create({
    data: { tenantId, year: event.year, title: event.title, description: event.description },
});
```

Fix:
```ts
// Should use db (= tx):
await db.timelineEvent.create({
    data: { tenantId, year: event.year, title: event.title, description: event.description },
});
```

### Impact

- If the timeline write succeeds: creates an orphan timeline event outside the transaction
- If the timeline write fails: the global write is NOT rolled back when the parent transaction rolls back, leaving orphan records with dangling `tenantId` references

### Why "User ❌" Seems to Happen

Given the FK constraint (`WorkspaceMember.userId → User.id`), "User ❌ + WorkspaceMember ✅" is structurally impossible. The "User ❌" symptom most likely occurs because:
1. User IS created inside the transaction
2. A LATER operation (outside the transaction) references or modifies the User incorrectly
3. OR the User record exists but has incorrect properties (wrong role, wrong password hash)

### Evidence

- **`seeder.ts:95`**: `prisma.timelineEvent.create()` — global prisma, NOT `db`
- **`seeder.ts:60`**: `const db = tx ?? prisma` — shows intent to use `tx`, but line 95 ignores it
- **All other repositories**: All use `this.client(tx ?? prisma)` correctly

### Fix Plan

1. **`src/modules/tenant/application/seeder.ts:95-97`**: Change `prisma.timelineEvent.create()` to `db.timelineEvent.create()`

### Validation

| Check | Expected |
|-------|----------|
| User exists after provisioning | ✅ |
| WorkspaceMember references valid User | ✅ |
| Transaction fully rolls back on failure | ✅ |
| No orphan TimelineEvent records | ✅ |
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | Passes |
