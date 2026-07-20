export type {
  ModuleId,
  DomainId,
  ModuleLifecycleState,
  ModuleIdentity,
  ModuleCapabilityDependency,
  ModuleServiceDependency,
  ModuleDependency,
  ModuleComposition,
  ModuleSurfaceConfig,
  ModuleDataLoader,
  ModuleSurfaces,
  ModuleConfiguration,
  ModuleTheme,
  AiModuleCapability,
  ModuleAI,
  ModulePermissions,
  ModuleMarketplaceMetadata,
  ModuleEvents,
  ModuleManifest,
  ModuleDefinition,
  ModuleMetadata,
  PropertyType,
  PropertyOption,
  PropertySchema,
  ModuleCapabilities,
  ModuleValidationError,
  ModuleValidationResult,
  DependencyNode,
  DependencyGraph,
  RegistryEntry,
  ModuleDiscoverySource,
  ModuleQuery,
  LifecycleTransition,
} from "./types";

export {
  isValidModuleId,
  validateModuleId,
  MODULE_ID_REVERSE_DNS_PATTERN,
  MODULE_LIFECYCLE_TRANSITIONS,
  isValidLifecycleTransition,
} from "./types";

export {
  SurfaceRegistry,
  surfaceRegistry,
  SURFACE_DEFINITIONS,
} from "./surface-registry";
export type {
  SurfaceDefinition,
  SurfaceValidationError,
  SurfaceValidationResult,
} from "./surface-registry";

export { ModuleLifecycleManager, moduleLifecycleManager } from "./lifecycle";

export {
  DependencyResolver,
  dependencyResolver,
  compareSemVer,
  satisfiesRange,
} from "./dependency-resolver";

export { ModuleValidator } from "./validator";

export { ModuleRegistry } from "./registry";
