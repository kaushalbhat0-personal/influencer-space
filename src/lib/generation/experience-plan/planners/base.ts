import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, PlanSlice } from "../types";

export interface Planner {
  readonly id: string;
  readonly produces: readonly PlanSlice[];
  readonly dependsOn: readonly string[];
  plan(graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan>;
}
