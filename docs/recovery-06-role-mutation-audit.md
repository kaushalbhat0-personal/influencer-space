# RECOVERY-06: Provisioning Transaction & Role Mutation Audit

**Date:** 2026-07-30  
**Status:** ROOT CAUSE VERIFIED  

---

## Root Cause

> **`importCreator()` passes the Super Admin's own session user ID as `authenticatedUserId`, causing `provisioningService.provision()` to UPDATE the Super Admin's role to ADMIN instead of CREATING a new creator admin user.**

---

## Evidence

### File 1: `src/actions/import.actions.ts` — Lines 44, 62-64

```ts
const userId = session?.user?.id;   // ← Line 44: Captures Super Admin's UUID

const provisioningInput = {
    runId,
    authenticatedUserId: userId,    // ← Line 64: Passes Super Admin's UUID as authenticatedUserId
    creatorName: profile.brandName,
    ...
};
```

When the Super Admin runs a provision, `getServerSession(authOptions)` returns the Super Admin's session. `session.user.id` is the Super Admin's UUID (`a9618330-b620-4910-a1c2-c2fa7d3861db`).

This UUID is passed into `provisioningInput.authenticatedUserId`.

### File 2: `src/modules/provisioning/application/provisioning-service.ts` — Lines 181-192

```ts
const user = input.authenticatedUserId                          // ← truthy (Super Admin's UUID)
    ? await userRepository.update(input.authenticatedUserId, {   // ← UPDATES Super Admin!
        tenantId: tenant.id,
        role: "ADMIN",                                            // ← Changes role from SUPER_ADMIN to ADMIN
    }, tx as Prisma.TransactionClient)
    : await userRepository.create({                               // ← NEVER REACHED!
        tenantId: tenant.id,
        name: creatorName,
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
    }, tx as Prisma.TransactionClient);
```

Since `input.authenticatedUserId` is truthy (set to Super Admin's UUID), the code:
1. Calls `userRepository.update()` on the Super Admin's record
2. Sets `role: "ADMIN"` — **mutating the Super Admin**
3. **Never calls `userRepository.create()`** — so no creator admin user is created

### File 3: `src/modules/tenant/infrastructure/user-repository.ts` — Lines 29-36

```ts
async update(id: string, data: { tenantId?: string; role?: string }, tx?: Prisma.TransactionClient) {
    return this.client(tx).user.update({
        where: { id },             // ← Matches Super Admin's UUID
        data: {
            ...(data.tenantId !== undefined && { tenantId: data.tenantId }),
            ...(data.role !== undefined && { role: data.role as never }),  // ← Sets role to "ADMIN"
        },
    });
}
```

Combined with the `$transaction` committing successfully, the mutation persists.

---

## Execution Sequence

```
importCreator()
  ├── Line 44: userId = session.user.id  [Super Admin's UUID: a9618330-...]
  ├── Line 64: authenticatedUserId = userId  [Super Admin's UUID]
  └── provisioningService.provision(input)
        └── $transaction(tx => {
              ├── tenantRepository.create()     → Tenant ✅
              ├── websiteRepository.create()    → Website ✅
              ├── brandRepository.create()       → Brand ✅
              ├── publishRepository.createStatus() → PublishStatus ✅
              ├── websiteSettingsRepository.createBatch() → Settings ✅
              ├── userRepository.update(        → Super Admin ❌ (mutated to ADMIN)
              │       Super Admin UUID,
              │       { role: "ADMIN" }
              │   )
              ├── userRepository.create()       → SKIPPED (authenticatedUserId was truthy)
              ├── workspaceRepository.create()  → Workspace ✅
              ├── workspaceRepository.addMember() → WorkspaceMember ✅
              └── seedStarterData()             → Products / Gallery ✅
            })
            → commit
```

---

## Database State After Bug

```
User table:
  id: a9618330-b620-4910-a1c2-c2fa7d3861db
  email: admin@creatorstore.test
  role: ADMIN                      ← WAS SUPER_ADMIN, NOW MUTATED TO ADMIN

  [No second user exists]           ← Creator admin was never created
```

---

## Every User Write in Codebase

| File | Line | Operation | Condition | Fields Written | Relevant? |
|------|------|-----------|-----------|---------------|-----------|
| `import.actions.ts` | 64 | Sets `authenticatedUserId` | Always | Sets request param | **YES — root cause** |
| `provisioning-service.ts` | 182 | `userRepository.update()` | `input.authenticatedUserId` truthy | `role: "ADMIN"`, `tenantId` | **YES — mutates Super Admin** |
| `provisioning-service.ts` | 186 | `userRepository.create()` | `input.authenticatedUserId` falsy | `tenantId, name, email, password, role` | **YES — skipped** |
| `user-repository.ts` | 17 | `create()` | Called directly | `tenantId, name, email, password, role` | Normal create |
| `user-repository.ts` | 29 | `update()` | Called with id | `tenantId, role` | **BUG vector** |
| `auth.ts` | — | `prisma.user.findFirst()` | Login | Read only | Not a write |

---

## Every Role Mutation

| File | Line | Code | Sets Role To | Safe? |
|------|------|------|-------------|-------|
| `provisioning-service.ts` | 184 | `role: "ADMIN"` | ADMIN | **NO — mutates existing user** |
| `provisioning-service.ts` | 191 | `role: "ADMIN"` | ADMIN | ✅ — on newly created user |
| `auth.ts` | 50 | `return { role: user.role }` | As-is from DB | ✅ Read-only |

---

## Root Cause Verification Checklist

| Hypothesis | Evidence | Status |
|-----------|----------|--------|
| Super Admin role mutated by `userRepository.update()` | `provisioning-service.ts:182` + `import.actions.ts:64` | **VERIFIED** |
| Creator admin `create()` not called because of truthy `authenticatedUserId` | `provisioning-service.ts:181-186` | **VERIFIED** |
| `authenticatedUserId` is Super Admin's session ID | `import.actions.ts:44,64` | **VERIFIED** |
| SQL transaction commits the mutation | `provisioning-service.ts:159` — `$transaction` has no error handling that would prevent commit | **VERIFIED** |
| No other code path mutates the role | Full codebase search for `update` on `User`/`user` with `role` | **VERIFIED** — only this one path |

**ROOT CAUSE VERIFIED**

---

## Fix (no code change — investigation only)

The fix is to remove `authenticatedUserId` from the provisioning input in `import.actions.ts:64`. For new creator provisioning, `authenticatedUserId` should NOT be set — a new admin user should always be created. The `authenticatedUserId` field is designed for support/impersonation flows where an existing user needs to be attached, not for new creator provisioning.
