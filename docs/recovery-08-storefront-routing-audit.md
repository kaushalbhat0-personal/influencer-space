# RECOVERY-08: Public Storefront Routing Audit

**Date:** 2026-07-30  
**Status:** ROOT CAUSE VERIFIED  

---

## Route Inventory

| Route | Public | Auth Required | Owner | File |
|-------|--------|---------------|-------|------|
| `/` | ✅ | No | Marketing | `app/page.tsx` |
| `/pricing` | ✅ | No | Marketing | `app/pricing/page.tsx` |
| `/features` | ✅ | No | Marketing | `app/features/page.tsx` |
| `/showcase` | ✅ | No | Marketing | `app/showcase/page.tsx` |
| `/about` | ✅ | No | Marketing | — |
| `/blog` | ✅ | No | Marketing | `app/blog/page.tsx` |
| `/contact` | ✅ | No | Marketing | — |
| `/admin/*` | ❌ | Session | Admin | `app/admin/` |
| `/super-admin/*` | ❌ | SUPER_ADMIN | Super Admin | `app/super-admin/` |
| `/builder` | ❌ | Session | Admin | `app/builder/` |
| `/agency/*` | ❌ | AGENCY | Agency | `app/agency/` |
| **`/[domain]`** | **✅** | **No** | **Storefront** | **`app/[domain]/page.tsx`** |
| `/showcase` | ✅ | No | Marketing | `app/showcase/page.tsx` |
| `/signup` | ✅ | No | Marketing | `app/signup/page.tsx` |
| `/faq` | ✅ | No | Marketing | — |
| `/privacy` | ✅ | No | Marketing | — |
| `/terms` | ✅ | No | Marketing | — |
| `/refund` | ✅ | No | Marketing | — |

---

## Request Trace: `GET /owais` on `influencer-space-alpha.vercel.app`

### Step 1: Enter middleware (`middleware.ts:44`)

```
host    = "influencer-space-alpha.vercel.app"
pathname = "/owais"
```

### Step 2: Check public paths (`middleware.ts:55`)

```
PUBLIC_PATHS.includes("/owais") → false
```

`/owais` is NOT in the PUBLIC_PATHS list. Storefront domain slugs are not listed.

### Step 3: Check platform domain (`middleware.ts:62`)

```
platformDomains.some(d => d === "influencer-space-alpha.vercel.app") → true
```

Request is on the main platform domain. Enters the platform root block.

### Step 4: Lifecycle redirectTo (`middleware.ts:63`, calls `token-resolver.ts:151`)

For a **SUPER_ADMIN** user with a valid JWT:

```
redirectTo("/owais", { role: "SUPER_ADMIN", state: READY })
```

At `token-resolver.ts:152-157`:
```ts
if (lifecycle.role === "SUPER_ADMIN") {
    if (!pathname.startsWith("/super-admin") && !pathname.startsWith("/admin/login")) {
        return "/super-admin";  // ← ALL non-admin paths redirect here
    }
    return null;
}
```

**Returns `"/super-admin"`**

For a **VISITOR** (no JWT):

```
redirectTo("/owais", { role: null, state: VISITOR })
```

At `token-resolver.ts:152` — role is null, not SUPER_ADMIN → skip
At `token-resolver.ts:159` — role is null, not AGENCY → skip
At `token-resolver.ts:166` — state is VISITOR, not AUTHENTICATED → skip
At `token-resolver.ts:173` — state is VISITOR, not in onboarding states → skip
At `token-resolver.ts:186` — state is VISITOR, not READY/EDITING/PUBLISHED → skip

**Returns `null`**

### Step 5: Middleware decision (`middleware.ts:64-67`)

For **SUPER_ADMIN**: `redirect` is truthy → **REDIRECT to `/super-admin`**

For **VISITOR**: `redirect` is null → falls through to `canAccess` → no guard matches `/owais` → `{ allowed: true }` → `NextResponse.next()` → passes to Next.js router

---

## Root Cause

**`lifecycleService.redirectTo()` at `token-resolver.ts:152-154` redirects SUPER_ADMIN and AGENCY users AWAY from public storefront URLs (`/[slug]`) to their respective admin dashboards.**

The middleware does NOT exempt public storefront routes (`/[domain]`) from the lifecycle redirect. Any authenticated SUPER_ADMIN or AGENCY user visiting any public storefront URL will be redirected to `/super-admin` or `/agency`.

### Evidence

| File | Line | Code | Impact |
|------|------|------|--------|
| `middleware.ts` | 63 | `lifecycleService.redirectTo(pathname, lifecycle)` | Called for ALL paths not in PUBLIC_PATHS |
| `middleware.ts` | 64-66 | Returns redirect for SUPER_ADMIN/AGENCY | Blocks storefront access |
| `token-resolver.ts` | 152-154 | `redirectTo()` for SUPER_ADMIN targets ALL non-admin paths | **Root cause** |
| `token-resolver.ts` | 159-161 | `redirectTo()` for AGENCY targets ALL non-agency/workspace paths | Same issue for AGENCY |
| `token-resolver.ts` | 166-170 | `redirectTo()` for AUTHENTICATED only redirects `/admin`/`/builder` | Correct — doesn't affect storefronts |
| `token-resolver.ts` | 186-192 | `redirectTo()` for READY/EDITING/PUBLISHED only redirects `/onboarding` | Correct — doesn't affect storefronts |

### Affected Users

| User Type | Visiting `/owais` | Result |
|-----------|-------------------|--------|
| Anonymous (no JWT) | ✅ | Storefront renders |
| Creator (ADMIN) | ✅ | Storefront renders |
| SUPER_ADMIN | ❌ | Redirected to `/super-admin` |
| AGENCY_ADMIN / AGENCY_STAFF | ❌ | Redirected to `/agency` |

### Secondary Issue

For anonymous users who pass the middleware, the storefront page at `[domain]/page.tsx:53-54` calls `getSnapshotData()` which queries for a published snapshot. If no snapshot exists (provisioning didn't complete the publish step), the page returns 404 not found. This is a separate issue from the redirect.

---

## Fix Guidance (no code changes in this phase)

The fix requires modifying the `redirectTo()` method in `token-resolver.ts` to EXEMPT public storefront paths (`/[domain]`) from the SUPER_ADMIN and AGENCY redirects.

Specifically, the conditions at lines 152-154 and 159-161 should also allow paths that match a storefront route pattern. Since the storefront routes are dynamic (`/[domain]`), the middleware cannot distinguish between a storefront slug and other single-segment paths at the redirect stage. The fix should check if the path corresponds to an existing tenant subdomain OR if the path is a known non-admin path that should be publicly accessible.
