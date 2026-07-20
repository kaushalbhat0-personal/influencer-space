export type {
  ConfigLayer,
  ConfigKey,
  ConfigValue,
  ConfigEntry,
  ConfigSchema,
  ConfigPatch,
  ConfigPatchResult,
  ConfigSnapshot,
  ConfigDiff,
  ConfigDiffResult,
  ConfigHistoryEntry,
  ConfigAuditEntry,
  ConfigStoreOptions,
  ConfigValidationResult,
  ConfigResolutionResult,
  IConfigStore,
  IConfigHistory,
} from "./types";

export { MemoryConfigStore } from "./store";
export { MemoryConfigHistory } from "./history";
export { DiffEngine } from "./diff";
export { ConfigValidator } from "./validator";
export { ConfigurationEngine, configEngine } from "./engine";
export type { ConfigurationEngineOptions } from "./engine";

export {
  SchemaRegistry,
  schemaRegistry,
} from "./schema";
export type {
  SchemaCategory,
  SchemaEntry,
  SchemaQuery,
  SchemaValidationResult,
  SchemaCompatibilityResult,
} from "./schema/types";

export {
  ResolutionPipeline,
  createDefaultResolutionMiddleware,
  registerDefaultResolutionMiddleware,
  createPlatformResolutionMiddleware,
  createThemeResolutionMiddleware,
  createAgencyResolutionMiddleware,
  createCreatorResolutionMiddleware,
  createModuleResolutionMiddleware,
  createRuntimeResolutionMiddleware,
  createFeatureFlagResolutionMiddleware,
  createSecretsResolutionMiddleware,
  createEnvironmentResolutionMiddleware,
} from "./pipeline";
export type {
  ResolutionContext,
  ResolutionMeta,
  ResolutionMiddleware,
  ResolutionTiming,
  ResolutionDiagnostics,
} from "./pipeline/types";
