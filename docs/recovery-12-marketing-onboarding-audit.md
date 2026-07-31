# RECOVERY-12: Marketing Onboarding vs Super Admin Provisioning Audit

**Date:** 2026-07-31  
**Status:** Root Cause Verified + Fixed  

---

## Root Cause

**`buildProvisioningInput()` in `provision-pipeline.ts:86` passes `authenticatedUserId` but does NOT set `mode: "attach_existing_user"`. The provisioning service at `provisioning-service.ts:186` checks `input.mode === "attach_existing_user"` — which is always false — so it falls through to `userRepository.create()`, creating a duplicate admin user instead of attaching the existing signed-in user.**

---

## Evidence

### Flow Comparison

| Step | Super Admin Import ✅ | Marketing Onboarding ❌ |
|------|----------------------|------------------------|
| User exists before provision? | No | **Yes** (signed up via marketing) |
| `authenticatedUserId` passed? | No | **Yes** (`userId` from session) |
| `mode` set to `attach_existing_user`? | N/A | **No** (missing) |
| Provisioning decision | `create()` new user ✅ | `create()` **duplicate** user ❌ |
| Result | One creator admin | Two users: original + duplicate admin |

### Code Trace

**File:** `src/lib/generation/integration/provision-pipeline.ts:72-108`
```ts
export function buildProvisioningInput(params) {
    return {
        runId: params.runId,
        authenticatedUserId: params.authenticatedUserId,  // ← Passed through
        // mode: "attach_existing_user"  ← NEVER SET
        creatorName: params.creatorName,
        ...
    };
}
```

**File:** `src/actions/onboarding.actions.ts:178-186`
```ts
const provisioningInput = buildProvisioningInput({
    runId,
    authenticatedUserId: userId,   // ← Signed-in user's ID
    creatorName,
    ...
});
```

**File:** `src/modules/provisioning/application/provisioning-service.ts:186-192`
```ts
const user = input.mode === "attach_existing_user" && input.authenticatedUserId  // ← FALSE
    ? await userRepository.safeUpdate(...)   // ← Never reached
    : await userRepository.create(...);       // ← Always creates duplicate
```

---

## Fix

**File:** `src/lib/generation/integration/provision-pipeline.ts`

Add `mode: "attach_existing_user"` when `authenticatedUserId` is provided:

```ts
return {
    runId: params.runId,
    authenticatedUserId: params.authenticatedUserId,
    mode: params.authenticatedUserId ? "attach_existing_user" as const : undefined,
    creatorName: params.creatorName,
    ...
};
```

This tells the provisioning service to call `userRepository.safeUpdate()` (attaching the existing user to the new tenant) instead of `userRepository.create()` (creating a duplicate).

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/generation/integration/provision-pipeline.ts` | Added `mode: "attach_existing_user"` when `authenticatedUserId` is present |
| `docs/recovery-12-marketing-onboarding-audit.md` | This report |

---

## Verification

| Check | Expected | Result |
|-------|----------|--------|
| `npx tsc --noEmit` | 0 errors | ✅ |
| `npm run build` | Passes | ✅ |
| Marketing signup creates exactly ONE user | User with tenantId set | ✅ |
| Duplicate admin user not created | No `admin-test-creator-*` user | ✅ |
| Super Admin import still creates new admin | New user with ADMIN role | ✅ |
| Super Admin role unchanged | SUPER_ADMIN | ✅ |
| Session refresh happens | JWT updated with tenantId | ✅ |
