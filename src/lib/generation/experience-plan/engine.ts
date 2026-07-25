import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import { PlannerRegistry } from "./registry";
import { createDefaultPlanners } from "./planners";
import { ExperiencePlanAssembler } from "./assembler";
import { PlanningContextEngine } from "@/lib/generation/planning-context/engine";
import type { ExperiencePlan } from "./types";
import type { PlanValidationIssue } from "./assembler";
import type { ExecutionPlan } from "./planner-graph";

export type { PlanValidationIssue };
export type PlanValidationResult = {
  valid: boolean;
  issues: PlanValidationIssue[];
};

export class ExperiencePlanningEngine {
  private registry = new PlannerRegistry();
  private assembler = new ExperiencePlanAssembler();
  private contextEngine = new PlanningContextEngine();

  constructor() {
    const planners = createDefaultPlanners();
    for (const p of planners) {
      this.registry.register(p);
    }
  }

  plan(graph: KnowledgeGraph, profile: ExperienceProfile): ExperiencePlan {
    const context = this.contextEngine.build(graph, profile);
    const executionPlan = this.registry.buildExecutionPlan();
    const partials = executionPlan.order.map((p) => p.plan(graph, profile, context));
    return this.assembler.assemble(partials);
  }

  getRegistry(): PlannerRegistry {
    return this.registry;
  }

  getExecutionPlan(): ExecutionPlan {
    return this.registry.buildExecutionPlan();
  }

  validate(plan: ExperiencePlan): PlanValidationIssue[] {
    return this.assembler.validate(plan);
  }
}
