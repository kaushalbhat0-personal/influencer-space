import type {
  ModuleId,
  ModuleDefinition,
} from "@/lib/module/types";
import type { ModuleRegistry } from "@/lib/module/registry";
import type { SurfaceRegistry } from "@/lib/module/surface-registry";
import { compareSemVer } from "@/lib/module/dependency-resolver";

export interface DiagnosticIssue {
  code: string;
  severity: "error" | "warning" | "info";
  category: "health" | "compatibility" | "dependency" | "surface" | "lifecycle" | "version" | "configuration" | "security";
  message: string;
  detail?: string;
  suggestion?: string;
}

export interface DiagnosticReport {
  moduleId: ModuleId;
  moduleName: string;
  domain: string;
  version: string;
  timestamp: string;
  score: number;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  issues: DiagnosticIssue[];
  warnings: DiagnosticIssue[];
  suggestions: string[];
  metrics: {
    dependencyCount: number;
    deepDependencyCount: number;
    surfaceCount: number;
    tokenCount: number;
    configFieldCount: number;
    aiCapabilityCount: number;
    eventCount: number;
  };
}

export class DiagnosticEngine {
  private moduleRegistry: ModuleRegistry;
  private surfaceRegistry: SurfaceRegistry;

  constructor(moduleRegistry: ModuleRegistry, surfaceRegistry: SurfaceRegistry) {
    this.moduleRegistry = moduleRegistry;
    this.surfaceRegistry = surfaceRegistry;
  }

  diagnose(moduleId: ModuleId): DiagnosticReport {
    const entry = this.moduleRegistry.get(moduleId);

    if (!entry) {
      return {
        moduleId,
        moduleName: "UNKNOWN",
        domain: "unknown",
        version: "0.0.0",
        timestamp: new Date().toISOString(),
        score: 0,
        status: "unknown",
        issues: [{
          code: "DIAG-001",
          severity: "error",
          category: "health",
          message: `Module "${moduleId}" is not registered`,
        }],
        warnings: [],
        suggestions: ["Register the module before running diagnostics"],
        metrics: { dependencyCount: 0, deepDependencyCount: 0, surfaceCount: 0, tokenCount: 0, configFieldCount: 0, aiCapabilityCount: 0, eventCount: 0 },
      };
    }

    const def = entry.definition;
    const lifecycleState = this.moduleRegistry.lifecycleManager.getState(moduleId);
    const issues: DiagnosticIssue[] = [];
    const warnings: DiagnosticIssue[] = [];
    const suggestions: string[] = [];

    this.checkHealth(def, lifecycleState, issues, warnings, suggestions);
    this.checkDependencies(def, moduleId, issues, warnings, suggestions);
    this.checkCompatibility(def, issues, warnings, suggestions);
    this.checkSurfaces(def, issues, warnings, suggestions);
    this.checkLifecycle(def, lifecycleState, issues, warnings, suggestions);
    this.checkVersion(def, issues, warnings, suggestions);
    this.checkConfiguration(def, issues, warnings, suggestions);

    const issueWeights = issues.reduce((sum, i) => sum + (i.severity === "error" ? 10 : i.severity === "warning" ? 5 : 2), 0);
    const warningWeights = warnings.reduce((sum, w) => sum + (w.severity === "error" ? 10 : w.severity === "warning" ? 5 : 2), 0);
    const baseScore = 100;
    const score = Math.max(0, Math.round(baseScore - issueWeights - warningWeights * 0.5));

    let status: DiagnosticReport["status"] = "healthy";
    if (score >= 80) status = "healthy";
    else if (score >= 50) status = "degraded";
    else status = "unhealthy";

    return {
      moduleId,
      moduleName: def.identity.name,
      domain: def.identity.domain,
      version: def.identity.version,
      timestamp: new Date().toISOString(),
      score,
      status,
      issues,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : ["Module appears healthy — no suggestions"],
      metrics: {
        dependencyCount: def.composition.dependencies.length,
        deepDependencyCount: this.countDeepDependencies(moduleId),
        surfaceCount: def.surfaces.supported.length,
        tokenCount: def.theme.tokensConsumed.length,
        configFieldCount: Object.keys(def.configuration.defaults).length,
        aiCapabilityCount: def.ai.aiCapabilities.length,
        eventCount: def.events.published.length + def.events.subscribed.length,
      },
    };
  }

  diagnoseAll(): DiagnosticReport[] {
    return this.moduleRegistry.listIds().map((id) => this.diagnose(id));
  }

  getSummary(): { total: number; healthy: number; degraded: number; unhealthy: number; unknown: number; averageScore: number } {
    const reports = this.diagnoseAll();
    let healthy = 0, degraded = 0, unhealthy = 0, unknown = 0, totalScore = 0;

    for (const report of reports) {
      totalScore += report.score;
      if (report.status === "healthy") healthy++;
      else if (report.status === "degraded") degraded++;
      else if (report.status === "unhealthy") unhealthy++;
      else unknown++;
    }

    return {
      total: reports.length,
      healthy,
      degraded,
      unhealthy,
      unknown,
      averageScore: reports.length > 0 ? Math.round(totalScore / reports.length) : 0,
    };
  }

  private checkHealth(
    def: ModuleDefinition,
    lifecycleState: string,
    issues: DiagnosticIssue[],
    _warnings: DiagnosticIssue[],
    _suggestions: string[]
  ): void {
    void _warnings;
    void _suggestions;

    if (lifecycleState === "draft") {
      issues.push({
        code: "DIAG-HEALTH-001",
        severity: "warning",
        category: "lifecycle",
        message: "Module is in DRAFT state — not yet published",
        suggestion: "Publish the module to make it available",
      });
    }

    if (lifecycleState === "suspended") {
      issues.push({
        code: "DIAG-HEALTH-002",
        severity: "warning",
        category: "health",
        message: "Module is SUSPENDED — not rendering on any surface",
        suggestion: "Re-enable the module to resume rendering",
      });
    }

    if (lifecycleState === "archived") {
      issues.push({
        code: "DIAG-HEALTH-003",
        severity: "error",
        category: "health",
        message: "Module is ARCHIVED — no longer available",
        suggestion: "Create a new module version to replace it",
      });
    }
  }

  private checkDependencies(
    def: ModuleDefinition,
    moduleId: ModuleId,
    issues: DiagnosticIssue[],
    _warnings: DiagnosticIssue[],
    suggestions: string[]
  ): void {
    void _warnings;

    for (const dep of def.composition.dependencies) {
      const depEntry = this.moduleRegistry.get(dep.moduleId);
      if (!depEntry) {
        if (dep.required) {
          issues.push({
            code: "DIAG-DEP-001",
            severity: "error",
            category: "dependency",
            message: `Required dependency "${dep.moduleId}" is not registered`,
            suggestion: `Register module "${dep.moduleId}" before enabling this module`,
          });
        } else {
          issues.push({
            code: "DIAG-DEP-002",
            severity: "warning",
            category: "dependency",
            message: `Optional dependency "${dep.moduleId}" is not registered`,
          });
        }
      } else if (dep.minVersion) {
        const depVersion = depEntry.definition.identity.version;
        if (compareSemVer(depVersion, dep.minVersion) < 0) {
          issues.push({
            code: "DIAG-DEP-003",
            severity: "error",
            category: "dependency",
            message: `Dependency "${dep.moduleId}" version ${depVersion} does not satisfy minimum ${dep.minVersion}`,
            suggestion: `Upgrade "${dep.moduleId}" to version >= ${dep.minVersion}`,
          });
        }
      }
    }

    const graph = this.moduleRegistry.buildDependencyGraph([moduleId]);
    if (graph.cycles.length > 0) {
      for (const cycle of graph.cycles) {
        issues.push({
          code: "DIAG-DEP-004",
          severity: "error",
          category: "dependency",
          message: `Circular dependency detected: ${cycle.join(" → ")}`,
          suggestion: "Break the circular dependency by extracting shared logic into a capability",
        });
      }
    }

    if (def.composition.dependencies.length === 0 && def.composition.capabilities.length === 0) {
      suggestions.push("Module has zero dependencies — consider whether it should consume shared capabilities");
    }
  }

  private checkCompatibility(
    def: ModuleDefinition,
    issues: DiagnosticIssue[],
    _warnings: DiagnosticIssue[],
    _suggestions: string[]
  ): void {
    void _warnings;
    void _suggestions;

    const deps = this.moduleRegistry.getDependents(def.identity.id);
    for (const depId of deps) {
      const depEntry = this.moduleRegistry.get(depId);
      if (!depEntry) continue;

      const depDep = depEntry.definition.composition.dependencies.find(
        (d) => d.moduleId === def.identity.id
      );

      if (depDep?.minVersion && compareSemVer(def.identity.version, depDep.minVersion) < 0) {
        issues.push({
          code: "DIAG-COMPAT-001",
          severity: "error",
          category: "compatibility",
          message: `Module "${depId}" requires this module >= ${depDep.minVersion}, but version is ${def.identity.version}`,
          suggestion: `Upgrade this module to >= ${depDep.minVersion} or update "${depId}" dependency range`,
        });
      }
    }
  }

  private checkSurfaces(
    def: ModuleDefinition,
    issues: DiagnosticIssue[],
    warnings: DiagnosticIssue[],
    suggestions: string[]
  ): void {
    for (const surface of def.surfaces.supported) {
      if (!this.surfaceRegistry.has(surface.surfaceId)) {
        issues.push({
          code: "DIAG-SURFACE-001",
          severity: "error",
          category: "surface",
          message: `Surface "${surface.surfaceId}" is not registered in SurfaceRegistry`,
          suggestion: `Register surface "${surface.surfaceId}" or remove it from module's supported surfaces`,
        });
      }

      const surfaceDef = this.surfaceRegistry.get(surface.surfaceId);
      if (surfaceDef && surfaceDef.interactive !== surface.interactive) {
        warnings.push({
          code: "DIAG-SURFACE-002",
          severity: "warning",
          category: "surface",
          message: `Surface "${surface.surfaceId}" interactivity mismatch: surface=${surfaceDef.interactive}, module declares=${surface.interactive}`,
          suggestion: `Align module's interactive flag with surface "${surfaceDef.name}" definition`,
        });
      }
    }

    if (def.surfaces.supported.length <= 1) {
      suggestions.push(`Module only supports ${def.surfaces.supported.length} surface — consider supporting more surfaces for broader reach`);
    }
  }

  private checkLifecycle(
    _def: ModuleDefinition,
    lifecycleState: string,
    issues: DiagnosticIssue[],
    _warnings: DiagnosticIssue[],
    _suggestions: string[]
  ): void {
    void _def;
    void _warnings;
    void _suggestions;

    if (lifecycleState === "draft") {
      issues.push({
        code: "DIAG-LC-001",
        severity: "info",
        category: "lifecycle",
        message: "Module is in DRAFT — needs review and publishing",
      });
    }
  }

  private checkVersion(
    def: ModuleDefinition,
    issues: DiagnosticIssue[],
    _warnings: DiagnosticIssue[],
    _suggestions: string[]
  ): void {
    void _warnings;
    void _suggestions;

    const versionParts = def.identity.version.split(".").map(Number);
    if (versionParts.length !== 3 || versionParts.some((p) => isNaN(p ?? 0))) {
      issues.push({
        code: "DIAG-VER-001",
        severity: "error",
        category: "version",
        message: `Invalid SemVer format: "${def.identity.version}"`,
        suggestion: "Use MAJOR.MINOR.PATCH format (e.g., 1.0.0)",
      });
    }

    const existing = this.moduleRegistry.get(def.identity.id);
    if (existing && existing.definition.identity.version !== def.identity.version) {
      issues.push({
        code: "DIAG-VER-002",
        severity: "info",
        category: "version",
        message: `Registered version ${existing.definition.identity.version} differs from definition version ${def.identity.version}`,
      });
    }
  }

  private checkConfiguration(
    def: ModuleDefinition,
    issues: DiagnosticIssue[],
    _warnings: DiagnosticIssue[],
    _suggestions: string[]
  ): void {
    void _warnings;
    void _suggestions;

    if (Object.keys(def.configuration.defaults).length === 0) {
      issues.push({
        code: "DIAG-CONFIG-001",
        severity: "warning",
        category: "configuration",
        message: "Module has no default configuration values",
        suggestion: "Define sensible defaults for all configurable fields",
      });
    }

    if (def.configuration.overridableByCreator.length === 0 && Object.keys(def.configuration.defaults).length > 0) {
      issues.push({
        code: "DIAG-CONFIG-002",
        severity: "info",
        category: "configuration",
        message: "Module has config fields but none are editable by the creator",
        suggestion: "Allow creators to override some configuration fields for customization",
      });
    }
  }

  private countDeepDependencies(moduleId: ModuleId, visited = new Set<ModuleId>()): number {
    if (visited.has(moduleId)) return 0;
    visited.add(moduleId);

    const entry = this.moduleRegistry.get(moduleId);
    if (!entry) return 0;

    let count = entry.definition.composition.dependencies.length;
    for (const dep of entry.definition.composition.dependencies) {
      count += this.countDeepDependencies(dep.moduleId, visited);
    }
    return count;
  }
}
