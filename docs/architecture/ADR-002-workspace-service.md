# ADR-002: WorkspaceService

## Status

Accepted (v1.1 Roadmap)

## Context

The active workspace context was implicitly derived from the URL pathname and session token. Middleware, server components, and client components each had different ways of determining "which workspace is the user acting in." This made workspace switching brittle and required duplicating resolution logic.

## Decision

Introduce `WorkspaceService` as the single source of truth for active workspace state across server and client.

```
Server (middleware, server components, server actions):
  WorkspaceService.getCurrent() → reads encrypted cookie

Client (React components, client actions):
  useWorkspace() → reads same cookie via SWR sync
```

The workspace identity is persisted in an encrypted, versioned cookie:

```json
{
  "v": 1,
  "wid": "uuid",
  "role": "OWNER",
  "type": "AGENCY",
  "iat": 1700000000,
  "exp": 1700600000
}
```

## Cookie Design

- **Name**: `__workspace`
- **Encryption**: AES-256-GCM using `NEXTAUTH_SECRET`
- **TTL**: 7 days (extends on each request)
- **Version**: `v` field allows format evolution without breaking sessions

## Consequences

- **Positive**: Single resolution path. Middleware, server components, and client components all read from the same source. Workspace switching is a cookie write.
- **Positive**: Cookie versioning prevents breaking changes during format updates.
- **Negative**: Encrypted cookie adds ~2KB to each request. Payload is minimal (5 fields, ~200 bytes encrypted).
- **Migration**: Old sessions without the cookie fall through to existing session-based resolution (backward compatible).
