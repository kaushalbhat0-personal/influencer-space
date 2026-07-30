# RECOVERY-01: Platform Recovery & Authentication Audit

**Date:** 2026-07-30  
**Status:** Assessment Complete — Awaiting Approval for Fixes  

---

## 1. Authentication Flow Diagram

```
Browser → /admin/login
  → LoginForm.tsx (client)
    → signIn("credentials", { email, password })
      → POST /api/auth/callback/credentials
        → NextAuth authorize() [lib/auth.ts:25]
          → prisma.user.findFirst({ where: { email } })
            └── DATABASE_URL from .env.local (locally) or Vercel Dashboard (deployed)
          → bcrypt.compare(password, user.password)
          → RETURN user object (id, email, role, tenantId)
      → JWT callback [lib/auth.ts:87]
        → resolveWorkspace(user)
        → RETURN token with role + workspace
      → Session callback [lib/auth.ts:106]
        → RETURN session.user with id, role, workspaceId
    → Router.push based on role:
      SUPER_ADMIN → /super-admin
      ADMIN → /admin/dashboard
      AGENCY → /agency
```

**Middleware verification chain:**
```
Request → middleware.ts
  → getToken({ req }) ← reads JWT from cookie
    └── Decrypts with NEXTAUTH_SECRET — NO database lookup
  → resolveFromToken(token) → LifecycleData
  → canAccess(pathname, lifecycle) → allowed/denied
```

**Layout verification chain:**
```
/admin/* → AdminLayout → getServerSession(authOptions)
  └── Reads JWT from cookie — NO database lookup
/super-admin/* → SuperAdminLayout → getServerSession(authOptions)
  └── Reads JWT from cookie — NO database lookup
```

---

## 2. Session Flow Diagram

```
LOGIN:
  Credentials → authorize() → DB lookup (User exists?) → bcrypt → JWT created → Cookie set
  ├── JWT signed with NEXTAUTH_SECRET
  ├── Stored in: next-auth.session-token (dev) / __Secure-next-auth.session-token (prod)
  ├── MaxAge: 7 days
  └── Contains: { id, role, tenantId, workspaceId, workspaceRole, ... }

VERIFY (every request):
  Middleware → getToken() → decrypts JWT from cookie
  ├── Uses NEXTAUTH_SECRET to decrypt
  ├── NO database query
  ├── If valid → user is "authenticated"
  └── If invalid/expired → null → VISITOR

LOGOUT:
  signOut() → deletes cookie client-side
  └── JWT is NOT invalidated server-side (JWT strategy)
      → Cookie deletion relies on browser compliance

REFRESH:
  POST /api/auth/refresh-session
  → getToken() → decrypts JWT
  → prisma.user.findUnique()
  → re-encodes JWT
```

---

## 3. Environment Audit

| Variable | `.env` | `.env.local` | `.env.vercel` | Vercel Dashboard |
|----------|--------|-------------|---------------|------------------|
| DATABASE_URL | ✅ Supabase pooler | ✅ Supabase pooler | ❌ empty | Unknown |
| DIRECT_URL | ✅ Supabase direct | ✅ Supabase direct | ❌ empty | Unknown |
| NEXTAUTH_SECRET | ✅ `d7f8e9...` | ✅ `wBaNlk...` **(DIFFERS)** | ❌ empty | Unknown |
| NEXTAUTH_URL | ✅ localhost:3000 | ✅ localhost:3000 | ❌ empty | Unknown |

**CRITICAL FINDING:** `.env` and `.env.local` have **different** `NEXTAUTH_SECRET` values:
- `.env`: `d7f8e9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8`
- `.env.local`: `wBaNlk0ybJtoKsOT/tM9bMWJDGbpPVkQvkxhCpQDY9Y=`

In Next.js, `.env.local` takes precedence over `.env`. The app uses `.env.local` values.

**BOTH DATABASE_URLs point to the same Supabase project:** `flhllvzzbtkfrcrajicq`

---

## 4. Root Cause Analysis

### RCA-1: Deleted Users Can Still Authenticate (CRITICAL)

**Root cause:** NextAuth JWT strategy with no server-side session validation.

**Trace:**
1. User logs in → JWT cookie created (7-day expiry)
2. Database is cleaned → User row DELETED
3. User visits site → middleware calls `getToken()` → reads JWT from cookie → decrypts successfully → user appears authenticated
4. NO database lookup occurs during JWT decryption
5. `getServerSession()` (used in layouts) ALSO just decrypts the JWT cookie — no DB query

**Proof:**
- `middleware.ts:48` → `getToken({ req, secret })` — decrypts JWT, no DB call
- `auth.ts:87-104` → `jwt()` callback only runs on LOGIN, not on every request
- `auth.ts:106-117` → `session()` callback only runs when `getServerSession()` is called, but it only reads from the decoded token — no DB call

**Impact:** Any user deleted from the database remains authenticated until their JWT cookie expires (7 days) or the cookie is manually cleared.

### RCA-2: Creator Provisioning Fails (CRITICAL)

**Root cause:** Multiple possible failure points after database cleanup.

**Trace of `provision()` execution:**
```
1. createRun() → prisma.creatorProvisionRun.create() ✓
2. provision() →
   2a. websitePersonalizer.personalize() — in-memory ✓
   2b. tenantSlugService.generate() → prisma.tenant.findUnique() ✓
   2c. prisma.creatorProvisionRun.update(status=RUNNING) ✓
   2d. TRANSACTION START:
       2d1. tenantRepository.create() → prisma.tenant.create()
            └── UNIQUE constraint on subdomain → FAILS if slug already taken
       2d2. websiteRepository.create() → prisma.website.create()
       2d3. brandRepository.create() → prisma.brand.create()
       2d4. publishRepository.createStatus() → prisma.publishStatus.create()
       2d5. websiteSettingsRepository.createBatch() → prisma.setting.createMany()
       2d6. userRepository.create() → prisma.user.create()
       2d7. workspaceRepository.create() → prisma.workspace.create()
       2d8. workspaceRepository.addMember() → prisma.workspaceMember.create()
       2d9. seedStarterData() → productRepository.create(), galleryRepository.create(), linkRepository.create()
            └── EACH call passes { tenantId, ...data } and tx as 2nd arg ✓
   2e. templateService.apply() → prisma.page.create(), section.create(), block.createMany() ✓
   2f. themeService.apply() → prisma.website.update() ✓
```

**Likely failure point: Step 2d1 — `tenantRepository.create()` fails with duplicate `subdomain`.**

The slug service (step 2b) checks for existing subdomain and appends a counter. But if a PREVIOUS provisioning attempt partially succeeded (creating a tenant before failing at a later step), the slug would be taken. The counter ensures uniqueness, so this shouldn't normally fail.

**Alternative failure point: Missing billing/registry data.**

If billing plans, pricing, or commercial pricing tables were reset, but the provisioning itself doesn't use billing tables. The provisioning only creates: Tenant, Website, Brand, PublishStatus, Settings, User, Workspace, WorkspaceMember, Products, Gallery, Links, Pages, Sections, Blocks.

**MOST LIKELY ROOT CAUSE: The `.env.local` DATABASE_URL points to the CLEANED database where User/Workspace/Tenant tables are empty, but the provisioning attempts to create records that violate foreign key constraints OR the slug is already taken from a previous partial provision.**

**SECONDARY ROOT CAUSE:** The `seedStarterData` function, after ENGINEERING-01 fixes, passes `{ tenantId, ...data, tx }` — but wait, let me check: the fix was to merge `tenantId` into the data object AND pass `db` (the tx) as the second argument. Let me verify the current state of these calls is correct.

### RCA-3: Platform State Inconsistent (HIGH)

**Root cause:** Database cleanup emptied billing/configuration tables that are required by `platformBootstrap` and `dashboardMetricsService`.

**Missing after cleanup:**
- BillingPlan records (required for subscription/revenue features)
- RevenueConfiguration records
- CommissionPolicy records
- BillingConfiguration records
- CommercialPricing records
- SocialStats records (stale sync detection)

---

## 5. Database Health Report

| Table | Expected State | Actual State (post-cleanup) | Status |
|-------|---------------|---------------------------|--------|
| User | Has Super Admin + creators | **Empty** | ❌ |
| Tenant | Has tenants | **Empty** | ❌ |
| Workspace | Has workspaces | **Empty** | ❌ |
| Website | Has websites | **Empty** | ❌ |
| Brand | Has brands | **Empty** | ❌ |
| PublishSnapshot | Has snapshots | **Empty** | ❌ |
| BillingPlan | Has plans seeded | **Empty** | ❌ |
| RevenueConfiguration | Has config | **Empty** | ❌ |
| CommissionPolicy | Has policy | **Empty** | ❌ |
| BillingConfiguration | Has config | **Empty** | ❌ |
| CommercialPricing | Has pricing | **Empty** | ❌ |
| Page / Section / Block | Has website content | **Empty** | ❌ |

All tables exist in the schema but contain ZERO rows after cleanup.

---

## 6. Super Admin Verification

**No Super Admin exists in the database.** The User table is empty.

However, if a browser has a JWT cookie created BEFORE the cleanup, the JWT is still valid (7-day expiry, signed with NEXTAUTH_SECRET). The middleware decrypts the JWT and treats the user as SUPER_ADMIN without checking the database.

---

## 7. Recovery Plan

### Step 1: Fix Auth — Add server-side session validation (EST: 15 min)

**Files to modify:**
- `src/lib/auth.ts` (jwt callback)

**Change:** In the `session()` callback, verify the user still exists in the database before returning the session. If the user was deleted, invalidate the session.

```ts
async session({ session, token }) {
  if (session.user) {
    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { id: true, role: true },
    });
    if (!user || user.role !== token.role) {
      return { ...session, user: { ...session.user, id: undefined, role: undefined } };
    }
    // ... existing code
  }
  return session;
}
```

**Risk:** Low — adds one DB query per session check. No behavioral change for valid sessions.

### Step 2: Re-seed Super Admin (EST: 10 min)

**Action:** Create a Super Admin user in the database with known credentials.

```sql
-- INSERT INTO "User" (id, email, name, password, role, "createdAt", "updatedAt")
-- VALUES (gen_random_uuid(), 'admin@creatorspace.app', 'Super Admin',
--   '$2b$12$...hashed_password...', 'SUPER_ADMIN', NOW(), NOW());
```

**Alternative:** Use the existing `prisma/seed.ts` script or create a new seed script.

### Step 3: Run Platform Bootstrap (EST: 10 min)

**Action:** Execute `platform:bootstrap` script (`scripts/platform-bootstrap.ts`) to seed billing plans, pricing, revenue config, commission policy, and billing configuration.

```bash
npx tsx scripts/platform-bootstrap.ts
```

### Step 4: Run Platform Registry Sync (EST: 5 min)

**Action:** Navigate to `/super-admin/platform/sync` or run the sync logic to ensure billing plans match the source registry.

### Step 5: Restore Super Admin JWT (EST: 5 min)

**Action:** After creating the Super Admin, log out and log back in with the new credentials. The existing JWT cookie (from the "deleted" user) will expire on its own, but logging in with the new credentials creates a fresh JWT.

### Step 6: Fix NEXTAUTH_SECRET mismatch (EST: 5 min)

**Action:** Ensure `.env` and `.env.local` use the same `NEXTAUTH_SECRET`. The Vercel Dashboard also needs the same secret. If they differ, JWTs created with one secret will be invalid when the other is used.

**Recommendation:** Use a SINGLE `NEXTAUTH_SECRET` across all environments. Remove the duplicate from `.env.local` and use `.env` as the single source of truth.

### Step 7: Test Provisioning (EST: 15 min)

**Action:** After Super Admin exists and billing registry is seeded, create a provision run and execute it. Monitor the logs for any failures.

---

## 8. Files Requiring Changes

| File | Change | Risk | Priority |
|------|--------|------|----------|
| `src/lib/auth.ts` | Add DB lookup in `session()` callback to verify user still exists | Low | P0 |
| `.env.local` | Align `NEXTAUTH_SECRET` with `.env` (or remove from `.env.local`) | Low | P1 |
| `scripts/platform-bootstrap.ts` | Verify seed completeness for all required tables | Low | P1 |

---

## 9. SQL (if required)

If the platform bootstrap script doesn't cover Super Admin creation:

```sql
-- Requires a bcrypt hash of the desired password
-- Generate with: node -e "require('bcryptjs').hash('your-password', 12).then(console.log)"
INSERT INTO "User" (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'admin@creatorspace.app', 'Super Admin',
  '$2b$12$...hash...', 'SUPER_ADMIN', NOW(), NOW());
```

---

## 10. Verification

```bash
npx tsc --noEmit
npm run build
```

Both pass currently — no changes have been made yet.

---

## Recovery Order

```
1. FIX auth session validation (prevents phantom sessions) — P0
2. SEED Super Admin user in database — P0
3. RUN platform bootstrap (billing plans, pricing, config) — P1
4. TEST provisioning — P1
5. FIX NEXTAUTH_SECRET mismatch — P1
6. TEST everything — P0
```

**Estimated total recovery time:** ~1 hour

---

*Awaiting approval to begin implementing fixes.*
