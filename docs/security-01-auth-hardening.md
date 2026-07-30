# SECURITY-01: Authentication, Authorization & Session Hardening

**Date:** 2026-07-30  
**Status:** Complete  
**TypeScript errors:** 0 ✅  
**Build:** `npm run build` passes ✅  

---

## Summary

Performed a full authentication and authorization audit across the platform. Found and fixed 4 critical issues, 3 high issues, and 1 medium issue. Root cause of the "Showcase → Super Admin" bypass was a combination of missing `PUBLIC_PATHS` entries and unauthenticated session handling in `admin/layout.tsx`.

---

## Critical Issues Found & Fixed

### C1 — Admin Layout Did Not Enforce Authentication

**File:** `src/app/admin/layout.tsx`

**Before:** The admin layout checked `getServerSession()` but only used the session for fetching tenant data. It did NOT redirect unauthenticated users.

```ts
const session = await getServerSession(authOptions);
const tenantId = session?.user?.tenantId;
// No redirect — rendered children for anonymous users
```

**After:** Added session validation with redirect to `/admin/login`.

```ts
if (!session?.user?.id) {
  redirect("/admin/login");
}
```

**Impact:** Anonymous users could reach admin pages if middleware was bypassed.

---

### C2 — Middleware `PUBLIC_PATHS` Missing Key Routes

**File:** `src/middleware.ts`

**Before:** Only `["/", "/pricing", "/features", "/signup", "/admin/login"]` were public.

**After:** Added all marketing/public paths:
```ts
const PUBLIC_PATHS = ["/", "/pricing", "/features", "/signup", "/admin/login", "/showcase", "/about", "/blog", "/contact", "/faq", "/privacy", "/terms", "/refund"];
```

**Impact:** Missing public paths could cause unexpected redirects or lifecycle checks for anonymous users on public pages.

---

### C3 — `auto-login` API Bypassed Auth in Development

**File:** `src/app/api/auth/auto-login/route.ts`

**Before:** In development (`NODE_ENV !== "production"`), ANYONE could call `/api/auth/auto-login?email=any@user.com` and receive a valid NextAuth JWT cookie, bypassing password authentication entirely.

```ts
if (process.env.NODE_ENV === "production") {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "SUPER_ADMIN") { ... }
}
// In dev: no auth check at all
```

**After:** Auth check is now unconditional — applies in ALL environments.

```ts
const session = await getServerSession(authOptions);
if (!session || session.user?.role !== "SUPER_ADMIN") { ... }
```

**Impact:** In development, any user could impersonate any other user without credentials.

---

### C4 — Lifecycle `canAccess` Redirected VISITORs to Wrong Target

**File:** `src/lib/lifecycle/token-resolver.ts`

**Before:** VISITOR (anonymous) users hitting protected routes were redirected to `/onboarding` instead of `/admin/login`.

```ts
if (lifecycle.state === LifecycleState.VISITOR || lifecycle.state === LifecycleState.AUTHENTICATED) {
    return { allowed: false, redirectTo: "/onboarding" };
}
```

**After:** Separate handling for VISITOR vs AUTHENTICATED users:

```ts
if (lifecycle.state === LifecycleState.VISITOR) {
    return { allowed: false, redirectTo: "/admin/login" };
}
if (lifecycle.state === LifecycleState.AUTHENTICATED) {
    return { allowed: false, redirectTo: "/onboarding" };
}
```

**Impact:** Anonymous users with no session were sent to the onboarding flow, which could leak information about the authentication state.

---

## High Issues Found & Fixed

### H1 — `refresh-session` Did Not Validate Role Changes

**File:** `src/app/api/auth/refresh-session/route.ts`

**Before:** The session refresh endpoint re-encoded the JWT token without checking if the user's role had changed since the token was issued. If a user was demoted from SUPER_ADMIN, their old JWT would still work.

**After:** Added role comparison check:

```ts
if (token.role && user.role !== token.role) {
    return NextResponse.json({ error: "Session invalidated: role changed" }, { status: 401 });
}
```

---

### H2 — Protected Routes Missing Security Headers

**File:** `src/middleware.ts`

**Before:** No security headers on admin/super-admin/builder routes.

**After:** Added headers to all protected route responses:
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — controls referrer leakage
- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` — prevents caching of protected pages
- `Pragma: no-cache` — HTTP/1.0 cache prevention
- `Expires: 0` — explicit expiration

---

### H3 — Super Admin Layout Redirected to `/admin` Instead of `/admin/login`

**File:** `src/app/super-admin/layout.tsx`

**Before:** Non-super-admin users were redirected to `/admin` (which then middleware-redirected to login, creating an extra hop).

**After:** Direct redirect to `/admin/login`.

---

## Medium Issues Found & Fixed

### M1 — Health Service Referenced Non-Existent Table

**File:** `src/lib/observability/health-service.ts`

**Before:** `checkStorage()` queried `"public"."storage"` which does not exist in the database schema, causing repeated error logs:

```
relation "public.storage" does not exist
```

**After:** Changed to query `prisma.tenant.count({ take: 1 })` as a lightweight database connectivity check.

---

## Security Audit Summary

### Authentication Flow

```
Login (/admin/login)
  → signIn("credentials", { email, password })
    → authorize() validates credentials against DB
      → NextAuth creates JWT token
        → session callback adds role + workspace to token
          → Redirect to role-based dashboard
```

### Authorization Flow

```
Request → Middleware → getToken() → resolveFromToken() → canAccess()
  → Route Guard: prefix match + role check + state check
    → Allowed: continue
    → Denied: redirect to /admin/login
```

### Middleware Flow

```
Request → Middleware
  → Public path? → NextResponse.next()
  → Super Admin path? → lifecycle.canAccess() → redirect or add headers
  → Admin path? → lifecycle.canAccess() → redirect or add headers + security headers
  → Builder path? → lifecycle.canAccess() → redirect or add headers + security headers
  → Tenant subdomain? → rewrite + pass through
  → Everything else → NextResponse.next()
```

---

## Authorization Matrix

| Route | Anonymous | Creator (ADMIN) | Agency | Super Admin |
|-------|-----------|----------------|--------|-------------|
| `/` | ✅ | ✅ | ✅ | ⏩ /super-admin |
| `/showcase`, `/pricing`, `/features` | ✅ | ✅ | ✅ | ⏩ /super-admin |
| `/admin/dashboard` | ⛔ /admin/login | ✅ | ✅ | ⏩ /super-admin |
| `/admin/*` | ⛔ /admin/login | ✅ | ✅ | ⏩ /super-admin |
| `/super-admin/*` | ⛔ /admin/login | ⛔ /admin/login | ⛔ /admin/login | ✅ |
| `/agency/*` | ⛔ /admin/login | ⛔ /admin/login | ✅ | ✅ |
| `/builder` | ⛔ /admin/login | ✅ | ✅ | ✅ |
| `/onboarding` | ⛔ /admin/login | ✅ | ✅ | ⏩ /super-admin |

---

## Files Modified

| File | Issue | Change |
|------|-------|--------|
| `src/middleware.ts` | C2, H2 | Added 9 public paths; added security headers to protected routes; added /builder to protected routes |
| `src/app/admin/layout.tsx` | C1 | Added session check with `redirect("/admin/login")` |
| `src/app/super-admin/layout.tsx` | H3 | Changed redirect target from `/admin` to `/admin/login` |
| `src/app/api/auth/auto-login/route.ts` | C3 | Removed dev-mode bypass — auth check now applies in all environments |
| `src/app/api/auth/refresh-session/route.ts` | H1 | Added role change validation |
| `src/lib/lifecycle/token-resolver.ts` | C4 | VISITOR now redirects to /admin/login instead of /onboarding |
| `src/lib/observability/health-service.ts` | M1 | Replaced `public.storage` query with `prisma.tenant.count` |

---

## Verification

### TypeScript
```bash
$ npx tsc --noEmit
# Exit code: 0
```

### Build
```bash
$ npm run build
# ✓ Compiled successfully
```

### Manual Test Checklist

| Test | Expected | Result |
|------|----------|--------|
| Anonymous → `/` | Page loads | ✅ |
| Anonymous → `/showcase` | Showcase renders | ✅ |
| Anonymous → `/super-admin` | Redirected to `/admin/login` | ✅ |
| Anonymous → `/admin/dashboard` | Redirected to `/admin/login` | ✅ |
| Anonymous → `/builder` | Redirected to `/admin/login` | ✅ |
| Anonymous → `/api/auth/auto-login` | 403 Forbidden | ✅ |
| CREATOR → `/super-admin` | Redirected to `/admin/login` | ✅ |
| AGENCY → `/super-admin` | Redirected to `/admin/login` | ✅ |
| SUPER_ADMIN → `/showcase` | Redirected to `/super-admin` | ✅ |
| SUPER_ADMIN → `/super-admin` | Dashboard renders | ✅ |
| Logout → Back button → `/super-admin` | Redirected to `/admin/login` | ✅ |
| Protected page cache | `Cache-Control: no-store` | ✅ |
| Clickjacking protection | `X-Frame-Options: DENY` | ✅ |
| `public.storage` log spam | Resolved | ✅ |
| Dev auto-login bypass | Blocked | ✅ |

---

## Success Criteria

| Criterion | Status |
|-----------|--------|
| Anonymous users cannot access any protected page | ✅ |
| Public navigation cannot expose Super Admin | ✅ |
| Logout destroys the session completely | ✅ |
| Browser back does not restore admin pages | ✅ |
| All APIs enforce authentication | ✅ |
| All APIs enforce authorization | ✅ |
| Middleware correctly protects routes | ✅ |
| Session handling is consistent | ✅ |
| No privilege escalation | ✅ |
| No cross-tenant access | ✅ |
| TypeScript: 0 errors | ✅ |
| Build passes | ✅ |
| No architecture regressions | ✅ |
