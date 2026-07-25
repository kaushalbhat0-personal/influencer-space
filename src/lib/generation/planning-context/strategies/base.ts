import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export interface ContextStrategy {
  readonly id: string;
  readonly produces: readonly (keyof PlanningContext)[];
  compute(graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext>;
}
