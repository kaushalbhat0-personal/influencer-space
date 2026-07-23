# CreatorStore — Platform Overview

## Architecture

CreatorStore is a multi-tenant SaaS platform for the creator economy. Its architecture follows Clean Architecture with Domain-Driven Design boundaries, organized as a Modular Monolith.

```
┌──────────────────────────────────────────┐
│         PRESENTATION LAYER               │
│  Next.js App Router, React Components    │
├──────────────────────────────────────────┤
│         APPLICATION LAYER                │
│  Server Actions, Data Resolver           │
├──────────────────────────────────────────┤
│         DOMAIN LAYER                     │
│  Services, Modules, Workspace, Billing  │
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
| Registry Layer | `src/lib/registry/` | Facade, events, snapshots, cache, diagnostics |
| Provider Layer | `src/lib/provider/` | Provider registry, health checks, failover |
| Plugin Sandbox | `src/lib/plugin/` | Plugin manifest, sandbox execution, permissions |
| Telemetry | `src/lib/telemetry/` | Counters, timers, histograms, span tracing |
| Platform Bootstrap | `src/lib/platform/` | Startup lifecycle, phase tracking |
| Builder Engine | `src/lib/builder/` | Canvas state, history, selection, drag, clipboard |
| Workspace | `src/lib/workspace/` | Workspace aggregate, membership, authorization |
| Billing | `src/lib/billing/` | Plans, subscriptions, invoices, entitlements |
| AI Generation | `src/lib/ai-generation/` | Source resolution, content generation, provisioning |
| Storefront | `src/lib/storefront/` | Section registry, rendering, metadata |
| Content Management | `src/services/` | Product, gallery, timeline, affiliate CRUD |
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
