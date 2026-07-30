# RECOVERY-09: Public Route & Middleware Architecture Fix

**Date:** 2026-07-30  
**Status:** Complete  
**TypeScript:** 0 errors ✅  
**Build:** passes ✅  

---

## Root Cause

The middleware performed authentication checks BEFORE classifying whether a route was a public storefront. The `lifecycleService.redirectTo()` redirected SUPER_ADMIN and AGENCY users away from ALL non-admin paths — including public storefront URLs like `/owais`.

---

## Architecture

### New Middleware Flow

```
Request → classifyRoute()
              │
              ├── PublicMarketing  → NextResponse.next()  (no auth)
              ├── PublicStorefront → NextResponse.next()  (no auth)
              ├── Api/api          → NextResponse.next()  (route-level auth)
              ├── Static/_next     → NextResponse.next()
              │
              └── Protected routes:
                  ├── Admin        → getToken() → lifecycle → redirect/canAccess
                  ├── SuperAdmin   → getToken() → lifecycle → redirect/canAccess
                  ├── Agency       → getToken() → lifecycle → redirect/canAccess
                  ├── Builder      → getToken() → lifecycle → redirect/canAccess
                  └── Onboarding   → getToken() → lifecycle → redirect/canAccess
```

### Route Classification

Single canonical classifier at `src/lib/platform/routes.ts`:

| Category | Examples | Auth Required |
|----------|----------|---------------|
| `PublicMarketing` | `/`, `/pricing`, `/features`, `/showcase`, `/about`, `/blog` | No |
| `PublicStorefront` | `/owais`, `/any-creator-slug` | No |
| `Admin` | `/admin/*` | Yes |
| `SuperAdmin` | `/super-admin/*` | Yes |
| `Agency` | `/agency/*`, `/workspace/*` | Yes |
| `Builder` | `/builder` | Yes |
| `Onboarding` | `/onboarding` | Yes |
| `Api` | `/api/*` | Route-level |
| `NextInternal` | `/_next/*` | No |
| `Unknown` | Fallback | No |

### Reserved Paths

The `RESERVED_PATHS` set defines all known top-level paths. Any single-segment path NOT in this set is classified as a `PublicStorefront`. This means new creators automatically get storefront access without middleware changes.

Current reserved paths: `(empty-string)`, `pricing`, `features`, `showcase`, `about`, `blog`, `contact`, `faq`, `signup`, `privacy`, `terms`, `refund`, `admin`, `super-admin`, `agency`, `workspace`, `builder`, `onboarding`, `api`, `_next`

---

## Files Changed

### Created: `src/lib/platform/routes.ts`

Route classification system with:
- `RESERVED_PATHS` — canonical set of reserved top-level paths
- `RouteCategory` enum — 10 route categories
- `classifyRoute()` — single function that classifies any pathname
- `requiresAuthentication()` — boolean check per category

### Modified: `src/middleware.ts`

Complete rewrite of the request flow:

**Before (buggy):**
```
1. Check PUBLIC_PATHS list (hardcoded array)
2. If on platform domain → lifecycle redirectTo (catches ALL paths, including storefronts)
3. If on tenant subdomain → handle tenant
4. Check admin/super-admin/builder paths
5. Fallthrough → NextResponse.next()
```

**After (fixed):**
```
1. classifyRoute() → determines route category immediately
2. If non-auth route → NextResponse.next() (NO lifecycle checks)
3. If auth route → getToken() → lifecycle → redirectTo → canAccess
```

Key improvements:
- No lifecycle checks for public storefronts
- SUPER_ADMIN and AGENCY users can view public storefronts
- All security for protected routes preserved
- Tenant subdomain rewrite happens before storefront rendering

---

## Route Matrix

| Route | Public | Auth Required | Behavior |
|-------|--------|---------------|----------|
| `/` | ✅ | No | Renders |
| `/pricing` | ✅ | No | Renders |
| `/showcase` | ✅ | No | Renders |
| `/owais` | ✅ | No | Renders storefront |
| `/any-creator` | ✅ | No | Renders storefront |
| `/admin/login` | ✅ | No | Renders |
| `/admin/*` | ❌ | ✅ | Middleware → lifecycle → allow/redirect |
| `/super-admin/*` | ❌ | ✅ | Middleware → lifecycle → allow/redirect |
| `/agency/*` | ❌ | ✅ | Middleware → lifecycle → allow/redirect |
| `/builder` | ❌ | ✅ | Middleware → lifecycle → allow/redirect |
| `/onboarding` | ❌ | ✅ | Middleware → lifecycle → allow/redirect |
| `/api/*` | ⚠️ | Route-level | Individual route auth |

---

## Verification

| Check | Expected | Result |
|-------|----------|--------|
| `npx tsc --noEmit` | 0 errors | ✅ |
| `npm run build` | Passes | ✅ |
| Anonymous → `/owais` | Storefront renders | ✅ |
| SUPER_ADMIN → `/owais` | Storefront renders | ✅ |
| ADMIN → `/owais` | Storefront renders | ✅ |
| AGENCY → `/owais` | Storefront renders | ✅ |
| Anonymous → `/super-admin` | Redirect to login | ✅ |
| SUPER_ADMIN → `/admin/dashboard` | Redirect to /super-admin | ✅ |
| AGENCY → `/admin/dashboard` | Redirect to /agency | ✅ |
| Anonymous → `/admin/dashboard` | Redirect to login | ✅ |
| Tenant subdomain rewrites | Rewrite to /[slug] | ✅ |
| `/agency/*` redirect | 308 to /workspace/* | ✅ |
