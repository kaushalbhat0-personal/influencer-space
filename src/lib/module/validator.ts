import type {
  ModuleDefinition,
  ModuleValidationResult,
  ModuleValidationError,
} from "./types";
import { isValidModuleId, validateModuleId } from "./types";
import type { SurfaceRegistry } from "./surface-registry";

export class ModuleValidator {
  private surfaceRegistry: SurfaceRegistry;

  constructor(surfaceRegistry: SurfaceRegistry) {
    this.surfaceRegistry = surfaceRegistry;
  }

  validate(definition: ModuleDefinition): ModuleValidationResult {
    const errors: ModuleValidationError[] = [];
    const warnings: ModuleValidationError[] = [];

    this.validateIdentity(definition, errors, warnings);
    this.validateComposition(definition, errors, warnings);
    this.validateSurfaces(definition, errors, warnings);
    this.validateConfiguration(definition, errors, warnings);
    this.validateTheme(definition, errors, warnings);
    this.validateAI(definition, errors, warnings);
    this.validatePermissions(definition, errors, warnings);
    this.validateEvents(definition, errors, warnings);
    this.validateMarketplace(definition, errors, warnings);
    this.validateManifest(definition, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateIdentity(
    def: ModuleDefinition,
    errors: ModuleValidationError[],
    warnings: ModuleValidationError[]
  ): void {
    const idCheck = validateModuleId(def.identity.id);
    if (!idCheck.valid) {
      errors.push({
        path: "identity.id",
        message: idCheck.message ?? "Invalid module ID",
        severity: "error",
      });
    }

    if (!def.identity.name || def.identity.name.trim().length === 0) {
      errors.push({
        path: "identity.name",
        message: "Module name is required",
        severity: "error",
      });
    }

    if (!def.identity.version) {
      errors.push({
        path: "identity.version",
        message: "Module version is required",
        severity: "error",
      });
    }

    if (!def.identity.domain) {
      errors.push({
        path: "identity.domain",
        message: "Module domain is required",
        severity: "error",
      });
    }

    if (!def.identity.icon || def.identity.icon.trim().length === 0) {
      warnings.push({
        path: "identity.icon",
        message: "Module icon is empty",
        severity: "warning",
      });
    }

    if (def.identity.tags.length === 0) {
      warnings.push({
        path: "identity.tags",
        message: "Module has no tags for discovery",
        severity: "warning",
      });
    }
  }

  private validateComposition(
    def: ModuleDefinition,
    errors: ModuleValidationError[],
    _warnings: ModuleValidationError[]
  ): void {
    void _warnings;
    const depIds = new Set<string>();

    for (const dep of def.composition.dependencies) {
      if (depIds.has(dep.moduleId)) {
        errors.push({
          path: `composition.dependencies.${dep.moduleId}`,
          message: `Duplicate dependency: "${dep.moduleId}"`,
          severity: "error",
        });
      }
      depIds.add(dep.moduleId);

      if (!isValidModuleId(dep.moduleId)) {
        errors.push({
          path: `composition.dependencies.${dep.moduleId}`,
          message: `Invalid dependency module ID: "${dep.moduleId}"`,
          severity: "error",
        });
      }
    }

    for (const dep of def.composition.capabilities) {
      if (!dep.capabilityId || dep.capabilityId.trim().length === 0) {
        errors.push({
          path: "composition.capabilities",
          message: "Capability dependency has empty ID",
          severity: "error",
        });
      }
    }
  }

  private validateSurfaces(
    def: ModuleDefinition,
    errors: ModuleValidationError[],
    warnings: ModuleValidationError[]
  ): void {
    if (def.surfaces.supported.length === 0) {
      errors.push({
        path: "surfaces.supported",
        message: "Module must support at least one surface",
        severity: "error",
      });
    }

    const surfaceValidation = this.surfaceRegistry.validate(
      def.surfaces.supported.map((s) => s.surfaceId)
    );

    for (const err of surfaceValidation.errors) {
      errors.push({
        path: `surfaces.supported`,
        message: err.message,
        severity: "error",
      });
    }

    for (const surface of def.surfaces.supported) {
      if (!surface.rendererPath || surface.rendererPath.trim().length === 0) {
        errors.push({
          path: `surfaces.supported.${surface.surfaceId}`,
          message: `Renderer path is required for surface "${surface.surfaceId}"`,
          severity: "error",
        });
      }
    }

    if (
      !def.surfaces.supported.some(
        (s) => s.surfaceId === def.surfaces.defaultSurface
      )
    ) {
      errors.push({
        path: "surfaces.defaultSurface",
        message: `Default surface "${def.surfaces.defaultSurface}" is not in supported surfaces list`,
        severity: "error",
      });
    }

    if (def.surfaces.supported.length === 1 && !def.surfaces.supported[0]) {
      warnings.push({
        path: "surfaces",
        message: "Module only supports one surface; consider adding more for broader reach",
        severity: "warning",
      });
    }
  }

  private validateConfiguration(
    def: ModuleDefinition,
    errors: ModuleValidationError[],
    _warnings: ModuleValidationError[]
  ): void {
    void _warnings;
    if (
      !def.configuration.settingsKey ||
      def.configuration.settingsKey.trim().length === 0
    ) {
      errors.push({
        path: "configuration.settingsKey",
        message: "Settings key is required",
        severity: "error",
      });
    }

    if (
      !def.configuration.settingsKey.startsWith("module_config:")
    ) {
      errors.push({
        path: "configuration.settingsKey",
        message:
          'Settings key must start with "module_config:" (e.g., "module_config:com.creatos.products")',
        severity: "error",
      });
    }
  }

  private validateTheme(
    def: ModuleDefinition,
    _errors: ModuleValidationError[],
    warnings: ModuleValidationError[]
  ): void {
    if (def.theme.tokensConsumed.length === 0) {
      warnings.push({
        path: "theme.tokensConsumed",
        message:
          "Module does not consume any design tokens; it may not respond to theme changes",
        severity: "warning",
      });
    }

    if (def.theme.variantSlots.length === 0) {
      warnings.push({
        path: "theme.variantSlots",
        message:
          "Module has no variant slots; theme authors cannot customize its appearance",
        severity: "warning",
      });
    }
  }

  private validateAI(
    def: ModuleDefinition,
    _errors: ModuleValidationError[],
    warnings: ModuleValidationError[]
  ): void {
    if (!def.ai.contextProviderPath || def.ai.contextProviderPath.trim().length === 0) {
      warnings.push({
        path: "ai.contextProviderPath",
        message:
          "Module has no AI context provider; AI features will not include this module's data",
        severity: "warning",
      });
    }

    for (const cap of def.ai.aiCapabilities) {
      if (cap.inputFields.length === 0) {
        warnings.push({
          path: `ai.aiCapabilities.${cap.id}`,
          message: `AI capability "${cap.id}" has no input fields`,
          severity: "warning",
        });
      }
    }
  }

  private validatePermissions(
    def: ModuleDefinition,
    errors: ModuleValidationError[],
    _warnings: ModuleValidationError[]
  ): void {
    void _warnings;
    if (def.permissions.requiredPlanTiers.length === 0) {
      errors.push({
        path: "permissions.requiredPlanTiers",
        message:
          "Module must specify at least one plan tier (e.g., STARTER, PRO)",
        severity: "error",
      });
    }
  }

  private validateEvents(
    _def: ModuleDefinition,
    _errors: ModuleValidationError[],
    _warnings: ModuleValidationError[]
  ): void {
    void _def;
    void _errors;
    void _warnings;
    // Event validation is deferred until EventBus is implemented (Phase 6)
    // Module can declare events; validation checks that event types follow namespace convention
  }

  private validateMarketplace(
    def: ModuleDefinition,
    _errors: ModuleValidationError[],
    warnings: ModuleValidationError[]
  ): void {
    if (def.marketplace.tags.length === 0) {
      warnings.push({
        path: "marketplace.tags",
        message: "Module has no marketplace tags; discoverability will be limited",
        severity: "warning",
      });
    }
  }

  private validateManifest(
    def: ModuleDefinition,
    errors: ModuleValidationError[],
    warnings: ModuleValidationError[]
  ): void {
    if (def.manifest.id !== def.identity.id) {
      errors.push({
        path: "manifest.id",
        message:
          `Manifest ID "${def.manifest.id}" does not match identity ID "${def.identity.id}"`,
        severity: "error",
      });
    }

    if (!def.manifest.license || def.manifest.license.trim().length === 0) {
      warnings.push({
        path: "manifest.license",
        message: "Module manifest has no license specified",
        severity: "warning",
      });
    }
  }
}
