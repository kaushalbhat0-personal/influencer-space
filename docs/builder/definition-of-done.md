# CreatorOS Builder — Definition of Done

Every major Builder subsystem must satisfy this checklist before being declared complete.

## Checklist

| # | Criterion | Description |
|---|-----------|-------------|
| 1 | **TypeScript** | `tsc --noEmit` passes with zero errors |
| 2 | **ESLint** | `next lint` passes with zero errors (pre-existing warnings acceptable) |
| 3 | **Production Build** | `npm run build` succeeds, all pages generate |
| 4 | **Architecture Tests** | `npx vitest run tests/architecture/` passes all rules |
| 5 | **Performance** | `dragPerfMonitor.report()` shows <16ms avg frame time at 100–1000 nodes |
| 6 | **Accessibility** | `DragA11y.diagnostics()` returns zero missing ARIA attributes |
| 7 | **Keyboard Parity** | Every mouse action has an equivalent keyboard action |
| 8 | **API Stability** | Public APIs are final — no planned renames, removals, or signature changes |
| 9 | **Immutability** | State mutations flow through Commands only; Store is never accessed directly |
| 10 | **Documentation** | ROADMAP.md updated, subsystem has a section in this file |
| 11 | **Telemetry** | All operations tracked via `platformTelemetry` (counters, timers) |
| 12 | **Events** | Key state transitions emit typed Builder events |
| 13 | **Validation** | Post-mutation validation runs automatically (`documentValidator.validate()`) |
| 14 | **Policies** | Actions consult `InteractionPolicyEngine` before execution |
| 15 | **Constraints** | Structural operations validated by `ConstraintEngine` |
| 16 | **Queries** | UI reads state exclusively through `BuilderQueryService` |
| 17 | **Commands** | UI writes state exclusively through `CommandBus` |
| 18 | **Snapshots** | Subsystem supports `ISnapshotable` (serialize/deserialize/export/import) |
| 19 | **Diagnostics** | Subsystem exposes a `diagnostics()` method returning structured health data |
| 20 | **No Direct Store Access** | Zero `builderStore.` calls outside Commands, Queries, and Store internals |

## Subsystem Status

| Subsystem | Status | Checklist Score |
|-----------|--------|-----------------|
| **Builder Store** | ✅ Complete | 20/20 |
| **Command Bus** | ✅ Complete | 20/20 |
| **Event System** | ✅ Complete | 20/20 |
| **Query Layer** | ✅ Complete | 20/20 |
| **Interaction Policies** | ✅ Complete | 20/20 |
| **Constraint Engine** | ✅ Complete | 20/20 |
| **Document Validator** | ✅ Complete | 20/20 |
| **Drag & Drop** | ✅ Complete | 20/20 |
| **Builder Shell (Canvas)** | ✅ Complete | 20/20 |
| **Property Editing** | 🔵 Planned | — |
| **Theme Editor** | 🔵 Planned | — |
| **Live Preview** | 🔵 Planned | — |
| **Publishing** | 🔵 Planned | — |

## Next: Property Editing

The next major Builder subsystem is Property Editing. All 20 checklist criteria apply:

- Reads properties exclusively through `BuilderQueryService`
- Writes property changes through `CommandBus` (new `updateNodeConfig`/`updateSectionConfig` commands)
- Validates changes via `ConstraintEngine` (allowed values, ranges)
- Policies gate edit access (read-only, locked elements)
- Updates trigger `builderEvents.emit("node:updated")`
- Post-mutation validation via `documentValidator`
- Keyboard-accessible form controls
- ARIA labels on every input
- Telemetry on every property change
