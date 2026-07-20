# ADR-0003: Middleware Pipeline Pattern

## Status
Accepted

## Context
Multiple platform subsystems need ordered, pluggable execution of steps. The rendering engine needs theme resolution → surface validation → module resolution → layout → data loading → diagnostics. The configuration engine needs platform → theme → agency → creator → module → runtime resolution. Without a consistent pattern, each subsystem would implement ad-hoc execution chains.

## Decision
All ordered, pluggable execution chains use the middleware pipeline pattern:
- **`MiddlewareInterface`** with `handler(ctx)` and `meta` (name, priority, phase, enabled)
- **`Pipeline`** class with `register()`, `unregister()`, `execute(phase, ctx)`, `getDiagnostics()`
- **Priority-based ordering** — lower priority executes first
- **Error isolation** — one middleware failure doesn't block others (in after/error phases)
- **Timing collection** — per-middleware duration tracking
- **Default middleware factory functions** — `createDefault*Middleware()` and `registerDefault*Middleware()`

Implementations:
- `RenderingEngine` middleware pipeline (6 default middleware)
- `ConfigurationEngine` resolution pipeline (9 default middleware)

## Consequences
- **Positive:** Consistent, testable, composable execution. New middleware drops in without modifying core logic. Diagnostics provide visibility into execution chains.
- **Negative:** Increased complexity for simple flows. Priority conflicts possible.
- **Mitigations:** Default middleware covers 95% of use cases. Priority ranges are generously spaced (10, 20, 30...) for easy insertion.
