# RECOVERY-11: Creator Workspace State Audit

**Date:** 2026-07-30  
**Status:** ROOT CAUSE VERIFIED  

---

## Root Cause

**The Super Admin import provisioning flow (`import.actions.ts`) never creates the `onboarding_completed` setting, causing the creator's lifecycle state to always report `hasOnboardingCompleted = false`, which redirects them to the onboarding flow instead of the dashboard.**

---

## Lifecycle State Resolution

The `lifecycleService.resolve()` at `lib/lifecycle/service.ts:42-59` queries the database:

```ts
const onboardingSetting = await prisma.setting.findUnique({
    where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
});
const hasOnboardingCompleted = !!onboardingSetting;
```

This `onboarding_completed` setting is created ONLY in the self-onboarding flow:

| Flow | Creates `onboarding_completed`? |
|------|-------------------------------|
| Self-onboarding (`onboarding.actions.ts`) | ✅ Yes — `markOnboardingComplete()` at line 203 |
| Super Admin import (`import.actions.ts`) | **❌ No — never called** |

---

## Symptom Trace

| Symptom | Root Cause |
|---------|-----------|
| Dashboard continuously refreshes | `requireTenant()` checks `lifecycle.state === AUTHENTICATED` (false) then `!hasOnboardingCompleted` (true) → redirects to `/onboarding` → which redirects back → loop |
| "Create Website" still shown | Onboarding page renders welcome/import step instead of dashboard |
| "Not Published" badge shown | No active session reaching the dashboard |
| View Site opens marketing homepage | No dashboard context, redirects to root |
| Dashboard mostly blank | Never finishes loading — redirected before render |
| Testimonials redirects incorrectly | Sidebar items rendered in wrong context |

---

## State Query Comparison

| Query | Self-Onboarding | Super Admin Import | After `markOnboardingComplete` |
|-------|----------------|-------------------|-------------------------------|
| `setting(key: "onboarding_completed")` | ✅ Created | ❌ Missing | ✅ Created |
| `lifecycleService.resolve()` | `READY`/`PUBLISHED` | `ONBOARDING` | `READY`/`PUBLISHED` |
| `requireTenant()` | Passes | Redirects to `/onboarding` | Passes |

---

## Evidence Files

| File | Lines | Role |
|------|-------|------|
| `src/actions/import.actions.ts` | 55-134 | Import flow — no call to `markOnboardingComplete` |
| `src/actions/onboarding.actions.ts` | 203, 433-443 | Self-onboarding flow — calls `markOnboardingComplete` |
| `src/lib/lifecycle/service.ts` | 42-59 | Lifecycle resolver — checks `onboarding_completed` setting |
| `src/lib/auth/require-tenant.ts` | 33-45 | Dashboard guard — redirects if `!hasOnboardingCompleted` |
| `src/features/dashboard/actions.ts` | 8-35 | Dashboard data fetcher — requires tenant context |

---

## Priority

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | `onboarding_completed` not created in import flow | Critical | Add `markOnboardingComplete(tenantId)` after successful provisioning in `import.actions.ts` |
