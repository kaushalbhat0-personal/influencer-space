# ADR-0002: Registry Pattern

## Status
Accepted

## Context
The platform has multiple artifact types (themes, modules, capabilities, providers, domains, surfaces, plugins, feature flags). Each needs registration, discovery, validation, lifecycle management, and diagnostics. Without a consistent pattern, each would implement these differently.

## Decision
All platform registries follow a unified pattern:
- **Singleton class** with `register()`, `unregister()`, `get()`, `list()`, `has()`, `size`
- **Typed contracts** for registration (e.g., `ModuleDefinition`, `Theme`, `CapabilityContract`)
- **Validation** on registration with structured error reporting
- **Diagnostics** method for health, dependency, and compatibility checks
- **Immutability** via `Object.freeze()` on registered entries
- **Events** emitted via `RegistryEvents` on mutation
- **Snapshots** via `ISnapshotable` interface for export/import

Registries implemented with this pattern:
- `ThemeRegistry`
- `ModuleRegistry`
- `SurfaceRegistry`
- `CapabilityRegistry`
- `ProviderRegistry`
- `DomainRegistry`
- `GeneratorRegistry`
- `TemplateRegistry`

## Consequences
- **Positive:** Every engineer knows exactly how to interact with any registry. New registries are trivial to add. Testing is uniform. Documentation is predictable.
- **Negative:** Slight verbosity. Singleton pattern limits future distributed architectures.
- **Mitigations:** Singleton is not enforced — the class can be instantiated multiple times. The singleton export (`themeRegistry`) is a convenience.
