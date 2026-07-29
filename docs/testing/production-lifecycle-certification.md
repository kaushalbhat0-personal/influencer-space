# Production Lifecycle Certification

> **Date:** 2026-07-30
> **Type:** Real-account E2E certification
> **Status:** Ready

---

## Architecture

Every certification run creates real accounts through the platform's own registration flows. No pre-seeded accounts (except Super Admin). No database inserts. No mocked authentication.

```
Environment Validation
  ↓
Creator Signup → Onboarding → Website → Publish → Storefront
  ↓
Agency Signup → Clients → Team → Billing → Portal
  ↓
Team Member Invite → Accept → My Work → Builder
  ↓
Client Portal → Health → Support → Website
  ↓
Super Admin → Dashboard → Revenue → Billing → Marketplace → Audit
  ↓
Public → Storefront → SEO → 404 → Responsive
```

---

## Account Strategy

| Account | Created | By | Lifetime |
|---------|---------|----|----------|
| Super Admin | Pre-existing | Bootstrap | Permanent |
| Creator | Runtime | Registration flow | Test run |
| Agency Owner | Runtime | Registration flow | Test run |
| Team Member | Runtime | Invitation flow | Test run |
| Client | Runtime | Agency creates | Test run |

All runtime accounts use unique timestamped emails (`prefix-timestamp@certify.creatos.test`) to prevent collisions.

---

## Lifecycle Coverage

### Phase 1 — Environment Validation
- Application reachable
- API health endpoint responds
- Required env vars present
- Super Admin account exists

### Phase 2 — Creator
- Registration via `/signup`
- Onboarding flow
- Industry/template/theme selection
- Website generation
- Builder loads
- Publish
- Storefront renders

### Phase 3 — Agency
- Registration via `/signup`
- Dashboard loads
- Clients page
- Team page
- Billing page
- My Work page

### Phase 4 — Team Member
- Invitation from Agency Owner
- Accept invitation
- Login
- My Work shows assigned clients
- Builder access
- No billing/revenue access

### Phase 5 — Client
- Created by Agency
- Portal access
- Health visible
- Publishing status visible
- Support info visible
- No admin pages

### Phase 6 — Super Admin
- All routes operational
- Metrics render
- Navigation intact
- Revenue/Billing data visible

---

## Test Files

| File | Scope |
|------|-------|
| `release/environment.spec.ts` | Environment validation |
| `release/lifecycle-creator.spec.ts` | Full creator lifecycle |
| `release/lifecycle-agency.spec.ts` | Full agency lifecycle |
| `smoke/login.spec.ts` | Login + dashboard smoke |
| `security/unauthorized.spec.ts` | Route protection |

## Page Objects

| Page | File |
|------|------|
| `LoginPage` | `shared/pages/login.ts` |
| `DashboardPage` | `shared/pages/dashboard.ts` |
| `RegistrationPage` | `shared/pages/registration.ts` |

## Utilities

| Utility | File | Purpose |
|---------|------|---------|
| `createTestEmail()` | `shared/accounts.ts` | Unique email per test run |
| `createTestPassword()` | `shared/accounts.ts` | Secure random password |
| `createCreatorAccount()` | `shared/accounts.ts` | Full creator account object |
| `createAgencyAccount()` | `shared/accounts.ts` | Full agency account object |

---

## Running

```bash
# Full release certification
npm run test:e2e:release

# Full platform certify (all levels)
npm run test:e2e:certify
```

---

## Release Gate

Before tagging any release:

1. `npm run build`
2. `npx tsc --noEmit`
3. `npm run test`
4. `npm run test:e2e:certify`
5. Release candidate audit signed off
6. `git tag -a v*.*.*`
