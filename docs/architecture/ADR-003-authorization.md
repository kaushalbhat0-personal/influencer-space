# ADR-003: AuthorizationService

## Status

Accepted (v1.1 Roadmap)

## Context

Authorization checks were scattered across the codebase as role comparisons (`role === "OWNER"`, `role === "ADMIN"`). Adding custom roles later would require touching every check.

Also, the API only answered "can this user edit content?" but not "can this user edit THIS product?" — resource-level authorization was missing from the design.

## Decision

Introduce `AuthorizationService` that maps `WorkspaceRole` → set of `Permission` strings.

```typescript
auth.can("billing:manage")
auth.can("content:publish", { resourceType: "website", resourceId: "..." }) // future
```

The role → permission mapping is a single source of truth:

```typescript
const ROLE_PERMISSIONS = {
  OWNER:  new Set(["workspace:manage", "billing:manage", "members:invite", ...]),
  ADMIN:  new Set(["clients:create", "content:edit", ...]),
  MEMBER: new Set(["content:edit", "analytics:view"]),
  VIEWER: new Set(["analytics:view"]),
};
```

## API Design (Future-Proof)

The `can()` method accepts an optional resource context:

```typescript
can(permission: Permission): boolean
can(permission: Permission, resource: { resourceType: string; resourceId?: string }): boolean
```

Initially the resource parameter is ignored (role-based). When resource-level authorization is needed, the implementation checks ownership without changing the call sites.

## Consequences

- **Positive**: No scattered role checks. Custom roles are just new entries in the permission map.
- **Positive**: Call sites don't need rewriting when resource-level auth is added.
- **Negative**: Slightly more verbose than direct role checks (`auth.can("billing:manage")` vs `role === "OWNER"`).
- **Rule**: No code should check `workspace.role` directly. Always go through `AuthorizationService`.
