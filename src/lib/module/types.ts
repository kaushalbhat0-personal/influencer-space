import type { SemVer, SurfaceId, TokenPath } from "@/lib/theme/types";

export type { SemVer, SurfaceId, TokenPath };

export type ModuleId = string;

export const MODULE_ID_REVERSE_DNS_PATTERN =
  /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*\.[a-z][a-z0-9-]+$/;

export function isValidModuleId(id: string): id is ModuleId {
  return id.length >= 5 && id.length <= 128 && MODULE_ID_REVERSE_DNS_PATTERN.test(id);
}

export function validateModuleId(id: string): { valid: boolean; message?: string } {
  if (id.length < 5) return { valid: false, message: "Module ID must be at least 5 characters" };
  if (id.length > 128) return { valid: false, message: "Module ID must be at most 128 characters" };
  if (!MODULE_ID_REVERSE_DNS_PATTERN.test(id)) {
    return { valid: false, message: "Module ID must be reverse-DNS format (e.g., com.creatos.products)" };
  }
  return { valid: true };
}

export type DomainId =
  | "commerce"
  | "content"
  | "identity"
  | "community"
  | "marketing"
  | "sponsorship"
  | "platform"
  | "agency"
  | "analytics"
  | "growth";

export type ModuleLifecycleState =
  | "draft"
  | "review"
  | "published"
  | "installed"
  | "configured"
  | "previewed"
  | "enabled"
  | "live"
  | "suspended"
  | "disabled"
  | "archived";

export const MODULE_LIFECYCLE_TRANSITIONS: Record<ModuleLifecycleState, ModuleLifecycleState[]> = {
  draft: ["review", "archived"],
  review: ["published", "draft", "archived"],
  published: ["installed", "archived"],
  installed: ["configured", "archived"],
  configured: ["previewed", "installed"],
  previewed: ["enabled", "configured"],
  enabled: ["live", "suspended", "disabled"],
  live: ["suspended", "disabled"],
  suspended: ["enabled", "disabled", "archived"],
  disabled: ["installed", "archived"],
  archived: [],
} as const;

Object.freeze(MODULE_LIFECYCLE_TRANSITIONS);

export function isValidLifecycleTransition(
  from: ModuleLifecycleState,
  to: ModuleLifecycleState
): boolean {
  const allowed = MODULE_LIFECYCLE_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}

export interface ModuleIdentity {
  id: ModuleId;
  name: string;
  version: SemVer;
  domain: DomainId;
  description: string;
  author: {
    type: "platform" | "agency" | "marketplace" | "plugin";
    id: string;
    name: string;
  };
  icon: string;
  category: string;
  tags: string[];
}

export interface ModuleCapabilityDependency {
  capabilityId: string;
  minVersion?: SemVer;
  required: boolean;
}

export interface ModuleServiceDependency {
  contractId: string;
  minVersion?: SemVer;
  required: boolean;
}

export interface ModuleDependency {
  moduleId: ModuleId;
  minVersion?: SemVer;
  maxVersion?: SemVer;
  required: boolean;
  reason: string;
}

export interface ModuleComposition {
  capabilities: ModuleCapabilityDependency[];
  serviceContracts: ModuleServiceDependency[];
  dependencies: ModuleDependency[];
}

export interface ModuleSurfaceConfig {
  surfaceId: SurfaceId;
  rendererPath: string;
  interactive: boolean;
  streaming: boolean;
  cacheable: boolean;
}

export type ModuleDataLoader<T = unknown> = (
  tenantId: string,
  config: Record<string, unknown>,
  context: Record<string, unknown>
) => Promise<T>;

export interface ModuleSurfaces {
  supported: ModuleSurfaceConfig[];
  dataLoaderPath: string | null;
  defaultSurface: SurfaceId;
}

export interface ModuleConfiguration {
  schema: Record<string, unknown>;
  defaults: Record<string, unknown>;
  settingsKey: string;
  overridableByCreator: string[];
  lockedByTheme: string[];
}

export interface ModuleTheme {
  tokensConsumed: TokenPath[];
  variantSlots: string[];
}

export interface AiModuleCapability {
  id: string;
  description: string;
  inputFields: string[];
  outputFields: string[];
  promptTemplate: string;
  model: string;
}

export interface ModuleAI {
  contextProviderPath: string;
  aiCapabilities: AiModuleCapability[];
}

export interface ModulePermissions {
  requiredPlanTiers: string[];
  featureFlags: string[];
  agencyPermissions: string[];
  minimumRole: string;
}

export interface ModuleMarketplaceMetadata {
  previewImages: string[];
  tags: string[];
  pricing: {
    model: "free" | "one_time" | "subscription";
    amount?: number;
    currency?: string;
  };
  compatibleThemes: string[];
  minPlatformVersion: SemVer;
  changelog: string;
  documentationUrl: string | null;
}

export interface ModuleEvents {
  published: string[];
  subscribed: string[];
}

export interface ModuleManifest {
  id: ModuleId;
  name: string;
  version: SemVer;
  domain: DomainId;
  description: string;
  author: {
    type: "platform" | "agency" | "marketplace" | "plugin";
    id: string;
    name: string;
    url?: string;
  };
  license: string;
  icon: string;
  category: string;
  tags: string[];
  minPlatformVersion: SemVer;
  pricing: {
    model: "free" | "one_time" | "subscription";
    amount?: number;
    currency?: string;
  };
  previewImages: string[];
  documentationUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleDefinition {
  identity: ModuleIdentity;
  composition: ModuleComposition;
  surfaces: ModuleSurfaces;
  configuration: ModuleConfiguration;
  theme: ModuleTheme;
  ai: ModuleAI;
  permissions: ModulePermissions;
  events: ModuleEvents;
  marketplace: ModuleMarketplaceMetadata;
  manifest: ModuleManifest;
  metadata: ModuleMetadata;
}

export type PropertyType = "string" | "number" | "boolean" | "color" | "image" | "select" | "range" | "text" | "url" | "json";

export interface PropertyOption {
  label: string;
  value: string;
  icon?: string;
}

export interface PropertySchema {
  key: string;
  label: string;
  type: PropertyType;
  defaultValue: unknown;
  required: boolean;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: PropertyOption[];
  validation?: { pattern?: string; message?: string; minLength?: number; maxLength?: number };
  group?: string;
  order: number;
}

export interface ModuleCapabilities {
  draggable: boolean;
  duplicatable: boolean;
  deletable: boolean;
  editable: boolean;
  resizable: boolean;
  copyable: boolean;
}

export interface ModuleMetadata {
  displayName: string;
  icon: string;
  category: string;
  description: string;
  defaultProps: Record<string, unknown>;
  propertySchema: PropertySchema[];
  capabilities: ModuleCapabilities;
  tags: string[];
}

export interface ModuleValidationError {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ModuleValidationResult {
  valid: boolean;
  errors: ModuleValidationError[];
  warnings: ModuleValidationError[];
}

export interface DependencyNode {
  moduleId: ModuleId;
  version: SemVer;
  dependencies: { moduleId: ModuleId; minVersion?: SemVer; maxVersion?: SemVer; required: boolean }[];
  requiredBy: ModuleId[];
  depth: number;
}

export interface DependencyGraph {
  nodes: Map<ModuleId, DependencyNode>;
  edges: Array<{ from: ModuleId; to: ModuleId; required: boolean }>;
  cycles: ModuleId[][];
  missingDependencies: { moduleId: ModuleId; missing: ModuleId[] }[];
  versionConflicts: { moduleId: ModuleId; dependency: ModuleId; required: string; actual: string }[];
}

export interface RegistryEntry {
  definition: ModuleDefinition;
  state: ModuleLifecycleState;
  registeredAt: Date;
  installedAt: Date | null;
  enabledAt: Date | null;
  source: "platform" | "agency" | "marketplace" | "plugin";
  metadata: Record<string, unknown>;
}

export interface ModuleDiscoverySource {
  type: "platform" | "agency" | "marketplace" | "plugin";
  path: string;
  pattern: string;
  enabled: boolean;
}

export interface ModuleQuery {
  domain?: DomainId;
  state?: ModuleLifecycleState;
  source?: RegistryEntry["source"];
  surface?: SurfaceId;
  planTier?: string;
  featureFlags?: string[];
  search?: string;
}

export interface LifecycleTransition {
  from: ModuleLifecycleState;
  to: ModuleLifecycleState;
  moduleId: ModuleId;
  timestamp: Date;
  metadata: Record<string, unknown>;
  valid: boolean;
  errors: ModuleValidationError[];
}

