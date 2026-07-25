import type { Planner } from "./planners/base";

export interface ExecutionPlan {
  readonly waves: ReadonlyArray<ReadonlyArray<Planner>>;
  readonly order: ReadonlyArray<Planner>;
}

export interface GraphValidationIssue {
  readonly message: string;
  readonly severity: "error" | "warning";
}

export class PlannerGraph {
  private planners: Planner[];

  constructor(planners: Planner[]) {
    this.planners = planners;
  }

  validate(): GraphValidationIssue[] {
    const issues: GraphValidationIssue[] = [];
    const ids = new Set<string>();
    const producedSlices = new Map<string, string>();

    for (const p of this.planners) {
      if (ids.has(p.id)) {
        issues.push({ message: `Duplicate planner ID: ${p.id}`, severity: "error" });
      }
      ids.add(p.id);

      for (const slice of p.produces) {
        const existing = producedSlices.get(slice);
        if (existing) {
          issues.push({ message: `Plan slice "${slice}" produced by both "${existing}" and "${p.id}"`, severity: "warning" });
        } else {
          producedSlices.set(slice, p.id);
        }
      }

      for (const depId of p.dependsOn) {
        if (!this.planners.some((other) => other.id === depId)) {
          issues.push({ message: `Planner "${p.id}" depends on unknown planner "${depId}"`, severity: "error" });
        }
      }
    }

    return issues;
  }

  build(): ExecutionPlan {
    const issues = this.validate();
    const errors = issues.filter((i) => i.severity === "error");
    if (errors.length > 0) {
      throw new Error(`PlannerGraph validation failed: ${errors.map((i) => i.message).join("; ")}`);
    }

    const waves = this.topologicalSort();
    const order = waves.flat();
    return Object.freeze({
      waves: Object.freeze(waves.map((w) => Object.freeze(w))),
      order: Object.freeze(order),
    });
  }

  private topologicalSort(): Planner[][] {
    const idToPlanner = new Map<string, Planner>();
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const p of this.planners) {
      idToPlanner.set(p.id, p);
      inDegree.set(p.id, 0);
      adjacency.set(p.id, []);
    }

    for (const p of this.planners) {
      for (const depId of p.dependsOn) {
        adjacency.get(depId)!.push(p.id);
        inDegree.set(p.id, (inDegree.get(p.id) ?? 0) + 1);
      }
    }

    const waves: Planner[][] = [];
    const remaining = new Set(idToPlanner.keys());

    while (remaining.size > 0) {
      const wave: string[] = [];
      for (const id of Array.from(remaining)) {
        if (inDegree.get(id) === 0) {
          wave.push(id);
        }
      }

      if (wave.length === 0) {
        const cycle = Array.from(remaining);
        throw new Error(
          `Circular dependency detected among planners: ${cycle.join(", ")}`
        );
      }

      for (const id of wave) {
        remaining.delete(id);
        for (const depId of adjacency.get(id)!) {
          inDegree.set(depId, inDegree.get(depId)! - 1);
        }
      }

      wave.sort();
      waves.push(wave.map((id) => idToPlanner.get(id)!));
    }

    return waves;
  }
}
