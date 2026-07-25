import type { Planner } from "./planners/base";
import { PlannerGraph } from "./planner-graph";
import type { ExecutionPlan } from "./planner-graph";

export class PlannerRegistry {
  private planners = new Map<string, Planner>();

  register(planner: Planner): void {
    if (this.planners.has(planner.id)) {
      throw new Error(`Planner already registered: ${planner.id}`);
    }
    this.planners.set(planner.id, planner);
  }

  get(id: string): Planner | undefined {
    return this.planners.get(id);
  }

  getAll(): Planner[] {
    return Array.from(this.planners.values());
  }

  listIds(): string[] {
    return Array.from(this.planners.keys());
  }

  remove(id: string): boolean {
    return this.planners.delete(id);
  }

  buildExecutionPlan(): ExecutionPlan {
    const graph = new PlannerGraph(this.getAll());
    return graph.build();
  }
}
