# RECOVERY-04: Authentication Pipeline Root Cause Analysis

**Date:** 2026-07-30  
**Status:** Root Cause Identified  

---

## Authentication Sequence Diagram

```
Browser                         Server (NextAuth)
  │                                  │
  │  POST /api/auth/callback/credentials
  │  ──────────────────────────────→  │
  │                                  │  authorize(credentials)
  │                                  │    → prisma.user.findFirst({ email })
  │                                  │    → bcrypt.compare(password, hash)
  │                                  │    → return user object
  │                                  │
  │                                  │  jwt({ token, user })
  │                                  │    → token.id = user.id  (NEW user UUID)
  │                                  │    → token.role = user.role
  │                                  │    → return token
  │                                  │
  │  ← Set-Cookie: session-token=<NEW_JWT>
  │  ← 302 Location: /super-admin
  │  ──────────────────────────────  │
  │                                  │
  │  GET /api/auth/session          │
  │  (Browser: sends NEW cookie)     │
  │  ──────────────────────────────→  │
  │                                  │  session({ session, token })
  │                                  │    → token.id = NEW user UUID
  │                                  │    → prisma.user.findUnique({ id })
  │                                  │    → user EXISTS → return valid session
  │                                  │
  │  ← { user: { id, role, ... } }  │
  │  ──────────────────────────────  │
  │                                  │
  │  router.push("/super-admin")     │
  │  ──────────────────────────────→  │
  │                                  │  Middleware: getToken() → new JWT
  │                                  │  → role === SUPER_ADMIN → allow
  │                                  │
  │  GET /super-admin               │
  │  (Browser: sends NEW cookie)     │
  │  ──────────────────────────────→  │
  │                                  │  SuperAdminLayout: getServerSession()
  │                                  │    → session() callback → DB lookup
  │                                  │    → user EXISTS → render dashboard
  │                                  │
  │  ← Dashboard renders             │
  │  ──────────────────────────────  │
```

**Execution stops at:** Stage 3 (race condition in client-side cookie propagation)

---

## Root Cause

`LoginForm` calls `getSession()` immediately after `signIn()`, before the browser's cookie jar has fully processed the new `Set-Cookie` header. When `getSession()` fires, it either:
1. Sends the OLD (deleted user) cookie because the new cookie hasn't been stored yet
2. Sends both cookies, and NextAuth picks the first/old one

The `session()` callback then queries the DB with the old user ID, finds no user, and returns an expired session → `getSession()` returns `null` → no redirect occurs → user stays on login page.

---

## Evidence

### LoginForm.tsx (line 20-42)
```ts
const result = await signIn("credentials", {
    email, password, tenantId, redirect: false,
});
if (result?.error) { router.push("/admin/login?error=CredentialsSignin"); return; }

const session = await getSession();  // ← RACE CONDITION: old cookie might still be sent
const role = session?.user?.role;
if (role === "SUPER_ADMIN") { router.push("/super-admin"); }
```

### Session callback (auth.ts lines 106-117)
```ts
async session({ session, token }) {
    if (session.user && token.id) {
        const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, role: true },
        });
        if (!dbUser || dbUser.role !== token.role) {
            return { ...session, expires: new Date(0).toISOString() };
        }
        // ... set session.user fields
    }
    return session;
},
```

When the old cookie is sent, `token.id` is the deleted user's UUID. The DB query returns `null`. Session is invalidated.

### Production logs confirm
```
Session invalidated: user deleted or role changed
userId: 9e93c433-5d1c-42f7-9c7e-db0f41ee9756  ← deleted user UUID
role: SUPER_ADMIN
```

---

## Fix Plan

**Minimal change — no architecture changes.**

### Option A (Preferred): Remove `getSession()` call, use `signIn` result

The `signIn()` response with `redirect: false` includes the callback URL. Instead of calling `getSession()` (which is racy), use the callback URL directly or pass a `redirect: true` behavior.

```ts
const result = await signIn("credentials", {
    email, password, tenantId: tenantId ?? "",
    redirect: false,
});

if (result?.error) {
    router.push("/admin/login?error=CredentialsSignin");
    return;
}

// Use the callback URL from signIn result directly
if (result?.url) {
    router.push(result.url);
} else {
    router.push("/admin/dashboard");
}
```

### Option B: Add user existence check before session check

Instead of querying the DB in the `session()` callback (which executes on EVERY request), only validate the user once during token creation. This restores the pre-RECOVERY-02 behavior while keeping the auth integrity check in the `jwt()` callback.

**This option is NOT recommended** as it removes the deleted-user protection.

### Why Option A works

The `signIn()` function with `redirect: false` returns:
```json
{ "url": "/super-admin", "status": 200, "ok": true }
```

The `url` field contains the callback URL that would have been redirected to. Using `router.push(result.url)` avoids the `getSession()` call entirely, bypassing the race condition. The new JWT cookie is already set in the browser by the `signIn()` response. When the page loads at `/super-admin`, the middleware and layout will receive the NEW cookie with the valid user ID.

---

## Validation Plan

| Test | Expected | Status |
|------|----------|--------|
| Login with valid credentials | Redirect to /super-admin | Pending |
| Logout → back button → /super-admin | Redirect to /admin/login | Pending |
| Anonymous → /super-admin | Redirect to /admin/login | Pending |
| Deleted user session | Session invalidated immediately | Pending |
| Role change (ADMIN → SUPER_ADMIN) | New token with new role | Pending |
| `npx tsc --noEmit` | 0 errors | Pending |
| `npm run build` | Passes | Pending |
