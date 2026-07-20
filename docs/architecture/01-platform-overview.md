# CreatorOS — Platform Overview

## Architecture

CreatorOS is a multi-tenant SaaS platform for the creator economy. Its architecture follows Clean Architecture with Domain-Driven Design boundaries, organized as a Modular Monolith.

```
┌──────────────────────────────────────────┐
│         PRESENTATION LAYER               │
│  Next.js App Router, React Components    │
├──────────────────────────────────────────┤
│         APPLICATION LAYER                │
│  Server Actions, RenderingEngine, SDK    │
├──────────────────────────────────────────┤
│         DOMAIN LAYER                     │
│  Services, Capabilities, Modules, Config │
├──────────────────────────────────────────┤
│         INFRASTRUCTURE LAYER             │
│  Prisma, Supabase, Razorpay, Providers   │
└──────────────────────────────────────────┘
```

## Key Subsystems

| Subsystem | Location | Purpose |
|-----------|----------|---------|
| Theme Engine | `src/lib/theme/` | Design tokens, theme registry, compiler, validation |
| Module System | `src/lib/module/` | Module registry, lifecycle, dependency resolution |
| Rendering Engine | `src/lib/rendering/` | Render pipeline, adapters, cache, middleware |
| Configuration Engine | `src/lib/config/` | Hierarchical config store, diff engine, pipeline |
| Registry Layer | `src/lib/registry/` | Facade, events, snapshots, cache, diagnostics |
| Capability Layer | `src/lib/capability/` | Capability registry, dependency resolution |
| Provider Layer | `src/lib/provider/` | Provider registry, health checks, failover |
| Domain Contracts | `src/lib/domain/` | Domain registry, bounded context validation |
| Plugin Sandbox | `src/lib/plugin/` | Plugin manifest, sandbox execution, permissions |
| Telemetry | `src/lib/telemetry/` | Counters, timers, histograms, span tracing |
| Platform Bootstrap | `src/lib/platform/` | Startup lifecycle, phase tracking |
| Builder Engine | `src/lib/builder/` | Canvas state, history, selection, drag, clipboard |
| Developer SDK | `src/sdk/` | Code generators for all artifact types |
| Modules | `src/modules/` | Registered module definitions and data loaders |

## Design Principles

1. **Modules own business logic. Themes own presentation.** Never mix.
2. **The Event Bus decouples everything.** Services publish events, subscribers react.
3. **Service Contracts power every surface.** REST, Mobile, CLI — all adapters of the same contract.
4. **Configuration cascades.** Platform → Theme → Agency → Creator → Module → Runtime.
5. **Every visual property is a Design Token.** No hardcoded colors, spacing, or typography.
6. **Append-only database.** Add tables and columns, never drop. Deprecate before archive.
7. **Feature flags gate everything.** No feature ships without a flag.
8. **Provider adapters abstract external dependencies.** Swap vendors without code changes.
