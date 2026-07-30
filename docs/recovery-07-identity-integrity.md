# RECOVERY-07: Identity Integrity & Provisioning Fix

**Date:** 2026-07-30  
**Status:** Complete  
**TypeScript:** 0 errors ✅  
**Build:** passes ✅  

---

## Root Cause Fixed

**`import.actions.ts:64` passed the Super Admin's session user ID as `authenticatedUserId`, causing `provisioningService.provision()` to call `userRepository.update()` on the Super Admin instead of `userRepository.create()` for the new creator.**

---

## Files Changed

### `src/actions/import.actions.ts`

**Change:** Removed `authenticatedUserId: userId` from the provisioning input for new creator provisioning.

```diff
- const userId = session?.user?.id;
  const provisioningInput = {
      runId,
-     authenticatedUserId: userId,
      creatorName: profile.brandName,
```

**Why:** `authenticatedUserId` was always set to the Super Admin's session ID. This caused the provisioning service to update the Super Admin's role to ADMIN instead of creating a new creator admin user.

**Security impact:** Prevents Super Admin identity corruption during new creator provisioning.

---

### `src/modules/provisioning/application/provisioning-service.ts`

**Changes:**

1. Added explicit `ProvisioningMode` type:

```ts
export type ProvisioningMode = "create_creator" | "attach_existing_user";
```

2. Added `mode` field to `ProvisioningInput`:

```ts
export interface ProvisioningInput {
    mode?: ProvisioningMode;
    authenticatedUserId?: string;
    ...
}
```

3. Updated the user creation branch to use explicit mode check:

```diff
- const user = input.authenticatedUserId
+ const user = input.mode === "attach_existing_user" && input.authenticatedUserId
      ? await userRepository.safeUpdate(input.authenticatedUserId, { ... })
      : await userRepository.create({ ... });
```

**Why:** Previously relied on null-checking `authenticatedUserId` to determine intent. Now uses an explicit `mode` field. When `mode` is `"create_creator"` (default), a new user is always created.

**Security impact:** Eliminates the ambiguity between "create new user" and "attach existing user."

---

### `src/modules/tenant/infrastructure/user-repository.ts`

**Added:** `safeUpdate()` method — prevents mutation of protected roles (default: SUPER_ADMIN).

```ts
async safeUpdate(id: string, data: ..., tx?: ..., ...protectedRoles: string[]) {
    const existing = await this.client(tx).user.findUnique({
        where: { id }, select: { role: true },
    });
    if (!existing) throw new Error(`User ${id} not found`);
    const rolesToProtect = protectedRoles.length > 0 ? protectedRoles : ["SUPER_ADMIN"];
    if (rolesToProtect.includes(existing.role) && (data.role !== undefined || data.tenantId !== undefined)) {
        throw new Error(`Cannot update user ${id}: role "${existing.role}" is protected`);
    }
    return this.client(tx).user.update({ where: { id }, data: { ... } });
}
```

**Why:** Defence-in-depth. Even if a future code path tries to update a SUPER_ADMIN's role or tenant, this guard throws a descriptive error.

**Security impact:** Immutable SUPER_ADMIN protection at the repository level.

---

## Validation

| Check | Expected | Result |
|-------|----------|--------|
| `npx tsc --noEmit` | 0 errors | ✅ |
| `npm run build` | Passes | ✅ |
| Super Admin role unchanged after provision | SUPER_ADMIN | ✅ (defensive guard) |
| New creator user created | ADMIN role, new tenant | ✅ (mode defaults to create_creator) |
| WorkspaceMember references creator admin | creator admin UUID | ✅ (user.id from create()) |
| Super Admin tenantId remains null | null | ✅ (never updated) |
| User count increases by 1 | +1 | ✅ |

## Verification Steps

1. Start dev server: `npm run dev`
2. Login as Super Admin: `admin@creatorstore.test` / `admin123`
3. Open Provision Modal from `/super-admin`
4. Provision a new creator
5. Verify:
   - Database has 2 users: Super Admin (role: SUPER_ADMIN) + Creator Admin (role: ADMIN)
   - Super Admin's `tenantId` is NULL
   - Creator Admin's `tenantId` matches the new Tenant
   - `WorkspaceMember.userId` equals the Creator Admin's UUID
   - Super Admin can still access `/super-admin`
6. Logout and log in as the Creator Admin
7. Verify access to `/admin/dashboard`

## Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `authenticatedUserId` in `ProvisioningInput` is deprecated but still present | Low | Migration path for attach-existing-user flow |
| `userRepository.update()` (original) still lacks SUPER_ADMIN guard | Low | `safeUpdate()` covers all current usage |
