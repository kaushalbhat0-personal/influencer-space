# ADR-007: Authenticated Tenant Resolution Policy

**Date:** 2026-07
**Status:** Accepted

## Context

The billing page at `/admin/billing` used `getTenantContext()` to resolve the tenant. This function reads the `x-tenant-host` request header — set by middleware from the HTTP `Host` header — and queries the database for a matching subdomain or custom domain.

This worked locally when developers accessed the app via `testcreator.localhost:3000` (a subdomain-based host). It failed on the Vercel preview deployment because the preview URL (`influencer-space-ajpkttjl9-kaushal-bhats-projects.vercel.app`) did not match any platform domain pattern in middleware, so `x-tenant-host` was set to the full unresolvable hostname. It also failed when accessing via the bare platform domain (`localhost:3000`) because middleware skips `x-tenant-host` injection for platform domains entirely.

Every other admin page (dashboard, orders, products, customers, analytics) resolved the tenant from `getServerSession()` + `session.user.tenantId` — and worked correctly in all environments.

## Decision

**Authenticated portals resolve tenant from the authenticated session.**
**Public storefronts resolve tenant from the request host.**

### Implemented Rules

1. Admin routes (`/admin/*`, `/super-admin/*`, `/agency/*`, `/builder/*`) must use `getServerSession(authOptions)` → `session.user.tenantId` to resolve the tenant.
2. Public storefront routes (`/[domain]/*`) and domain-resolution middleware may use `getTenantContext()`.
3. This rule is enforced by an Architecture Fitness Function that fails the build if `getTenantContext()` is imported in any admin/agency/super-admin/builder route.

## Alternatives Considered

1. **Fix `getTenantContext()` to fall back to session** — Would work but mixes concerns. The host header represents the visitor's routing context; the session represents the user's authorization context. Combining them creates confusing failure modes.
2. **Set `x-tenant-host` in middleware for all platform domain requests** — Would require middleware to know the tenant from the session, creating a circular dependency (session depends on `NEXTAUTH_SECRET` in middleware for `getToken()`, but tenant resolution shouldn't be coupled to authentication).
3. **Use `DEFAULT_TENANT` env var as fallback** — Environment-specific behavior that would still fail on preview deployments where the env var isn't set.

## Consequences

- **Positive:** Admin pages work identically in all environments (localhost, preview, production). No host-header dependency.
- **Positive:** The fitness function prevents accidental reintroduction of `getTenantContext()` in admin routes.
- **Positive:** Clear separation: session = "who is logged in", host = "which storefront is being visited".
- **Negative:** None. All admin pages already followed this pattern except billing. The fix was a one-line replacement.

## Fitness Function

```ts
// tests/architecture/fitness.test.ts
// "Fitness: Tenant Resolution Policy (ADR-007)"
// Scans src/app/admin, src/app/super-admin, src/app/agency, src/app/builder
// Fails if any file imports getTenantContext
```
