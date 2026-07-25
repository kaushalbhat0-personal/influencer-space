import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import { ContextStrategyRegistry } from "./registry";
import { createDefaultContextStrategies } from "./strategies";
import type { PlanningContext } from "./types";
import { DEFAULTS } from "./defaults";

export type ContextValidationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

export class PlanningContextEngine {
  private registry = new ContextStrategyRegistry();

  constructor() {
    const strategies = createDefaultContextStrategies();
    for (const s of strategies) {
      this.registry.register(s);
    }
  }

  build(graph: KnowledgeGraph, profile: ExperienceProfile): PlanningContext {
    const slices = this.registry.getAll().map((s) => s.compute(graph, profile));
    const merged = this.merge(slices);
    const validated = this.applyDefaults(merged);
    const issues = this.validate(validated);
    if (issues.some((i) => i.severity === "error")) {
      throw new Error(`PlanningContext validation failed: ${issues.map((i) => i.message).join("; ")}`);
    }
    return this.deepFreeze(validated);
  }

  getRegistry(): ContextStrategyRegistry {
    return this.registry;
  }

  validate(ctx: PlanningContext): ContextValidationIssue[] {
    const issues: ContextValidationIssue[] = [];
    const required: (keyof PlanningContext)[] = [
      "authorityLevel", "trustLevel", "commerceReadiness", "marketingMaturity",
      "audienceEngagement", "visualComplexity", "contentAuthority", "conversionIntent",
      "monetizationFocus", "communityStrength", "productConfidence", "socialPresence",
      "growthPotential", "recommendationReadiness", "brandingConsistency",
      "pageComplexity", "seoMaturity", "expansionPotential",
    ];
    for (const field of required) {
      if (!ctx[field]) {
        issues.push({ field, message: `Missing context value: ${field}`, severity: "error" });
      }
    }
    return issues;
  }

  private merge(slices: Partial<PlanningContext>[]): Partial<PlanningContext> {
    const result: Partial<PlanningContext> = {};
    for (const s of slices) {
      for (const [key, value] of Object.entries(s)) {
        if (value !== undefined) {
          (result as Record<string, unknown>)[key] = value;
        }
      }
    }
    return result;
  }

  private applyDefaults(partial: Partial<PlanningContext>): PlanningContext {
    const result = {} as Record<string, unknown>;
    for (const key of Object.keys(DEFAULTS)) {
      const k = key as keyof PlanningContext;
      result[k] = partial[k] ?? DEFAULTS[k];
    }
    return result as unknown as PlanningContext;
  }

  private deepFreeze<T>(obj: T): T {
    if (obj === null || obj === undefined || typeof obj !== "object") return obj;
    const props = Object.getOwnPropertyNames(obj);
    for (const prop of props) {
      const val = (obj as Record<string, unknown>)[prop];
      if (val && typeof val === "object" && !Object.isFrozen(val)) {
        this.deepFreeze(val);
      }
    }
    return Object.freeze(obj);
  }
}
