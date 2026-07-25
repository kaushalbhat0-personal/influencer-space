import type { PipelineStageDef } from "@/lib/generation/contracts";
import type { PipelineStage, StageDefRow } from "@/lib/generation/contracts";
import type { ExecutionPlan } from "./execution-plan";
import { ExecutionPlanBuilder } from "./execution-plan";

interface GraphNode {
  def: PipelineStageDef;
  inputs: Set<string>;
  outputs: Set<string>;
}

export class PipelineGraphResolver {
  resolve(stages: PipelineStageDef[]): ExecutionPlan {
    const builder = new ExecutionPlanBuilder();
    if (stages.length === 0) return builder.build();

    const nodes = this.buildNodes(stages);
    const deps = this.computeDependencies(nodes);

    const cycle = this.detectCycle(nodes, deps);
    if (cycle) {
      builder.addError(`Cycle detected: ${cycle.join(" -> ")}`);
    }

    const missingDeps = this.findMissingDependencies(nodes, deps);
    for (const md of missingDeps) {
      builder.addError(`Missing dependency for stage "${md.stage}": input "${md.input}" not produced by any stage`);
    }

    const ordered = this.topologicalSort(stages, deps);
    for (const stage of ordered) {
      const def = nodes.get(stage.type);
      if (def) builder.addStage(this.toStageDefRow(def), deps.get(stage.type) ?? []);
    }

    return builder.build();
  }

  validate(stages: PipelineStageDef[]): string[] {
    const errors: string[] = [];
    if (stages.length === 0) return errors;

    const nodes = this.buildNodes(stages);
    const deps = this.computeDependencies(nodes);

    const cycle = this.detectCycle(nodes, deps);
    if (cycle) errors.push(`Cycle detected: ${cycle.join(" -> ")}`);

    const missingDeps = this.findMissingDependencies(nodes, deps);
    for (const md of missingDeps) {
      errors.push(`Missing dependency for stage "${md.stage}": input "${md.input}" not produced by any stage`);
    }

    const typeCounts = new Map<PipelineStage, number>();
    for (const s of stages) {
      typeCounts.set(s.type, (typeCounts.get(s.type) ?? 0) + 1);
    }
    for (const [type, count] of Array.from(typeCounts)) {
      if (count > 1) errors.push(`Duplicate stage type: ${type}`);
    }

    return errors;
  }

  dryRun(stages: PipelineStageDef[]): { plan: ExecutionPlan; stageOrder: PipelineStage[] } {
    const plan = this.resolve(stages);
    const stageOrder = plan.orderedStages.map((s) => s.type);
    return { plan, stageOrder };
  }

  executionOrder(stages: PipelineStageDef[]): PipelineStage[] {
    const plan = this.resolve(stages);
    return plan.orderedStages.map((s) => s.type);
  }

  private buildNodes(stages: PipelineStageDef[]): Map<PipelineStage, GraphNode> {
    const nodes = new Map<PipelineStage, GraphNode>();
    for (const def of stages) {
      nodes.set(def.type, {
        def,
        inputs: new Set(def.inputs ?? []),
        outputs: new Set(def.outputs ?? []),
      });
    }
    return nodes;
  }

  private computeDependencies(nodes: Map<PipelineStage, GraphNode>): Map<PipelineStage, PipelineStage[]> {
    const deps = new Map<PipelineStage, PipelineStage[]>();
    for (const [type, node] of Array.from(nodes)) {
      const stageDeps: PipelineStage[] = [];
      for (const input of Array.from(node.inputs)) {
        for (const [otherType, otherNode] of Array.from(nodes)) {
          if (otherType === type) continue;
          if (Array.from(otherNode.outputs).includes(input)) {
            if (!stageDeps.includes(otherType)) stageDeps.push(otherType);
          }
        }
      }
      deps.set(type, stageDeps);
    }
    return deps;
  }

  private detectCycle(
    nodes: Map<PipelineStage, GraphNode>,
    deps: Map<PipelineStage, PipelineStage[]>,
  ): string[] | null {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<PipelineStage, number>();

    for (const type of Array.from(nodes.keys())) color.set(type, WHITE);

    const parent = new Map<PipelineStage, PipelineStage | null>();
    const cyclePath: PipelineStage[] = [];

    function dfs(u: PipelineStage): boolean {
      color.set(u, GRAY);
      const neighbors = deps.get(u) ?? [];
      for (const v of neighbors) {
        if (!nodes.has(v)) continue;
        if (color.get(v) === GRAY) {
          cyclePath.push(v, u);
          let cur = u;
          while (cur !== v && cur !== null) {
            cyclePath.push(cur);
            cur = parent.get(cur) as PipelineStage;
          }
          return true;
        }
        if (color.get(v) === WHITE) {
          parent.set(v, u);
          if (dfs(v)) return true;
        }
      }
      color.set(u, BLACK);
      return false;
    }

    for (const type of Array.from(nodes.keys())) {
      if (color.get(type) === WHITE) {
        if (dfs(type)) return Array.from(new Set(cyclePath));
      }
    }
    return null;
  }

  private findMissingDependencies(
    nodes: Map<PipelineStage, GraphNode>,
    deps: Map<PipelineStage, PipelineStage[]>,
  ): Array<{ stage: PipelineStage; input: string }> {
    const allOutputs = new Set<string>();
    for (const node of Array.from(nodes.values())) {
      for (const output of Array.from(node.outputs)) allOutputs.add(output);
    }

    const missing: Array<{ stage: PipelineStage; input: string }> = [];
    for (const [type, node] of Array.from(nodes)) {
      for (const input of Array.from(node.inputs)) {
        if (!allOutputs.has(input)) {
          const stageDeps = deps.get(type) ?? [];
          if (stageDeps.length === 0) {
            missing.push({ stage: type, input });
          }
        }
      }
    }
    return missing;
  }

  private topologicalSort(
    stages: PipelineStageDef[],
    deps: Map<PipelineStage, PipelineStage[]>,
  ): PipelineStageDef[] {
    const sorted: PipelineStageDef[] = [];
    const stageMap = new Map<PipelineStage, PipelineStageDef>();
    for (const s of stages) stageMap.set(s.type, s);

    const visited = new Set<PipelineStage>();
    const inProgress = new Set<PipelineStage>();

    function visit(type: PipelineStage): void {
      if (visited.has(type)) return;
      if (inProgress.has(type)) return;
      inProgress.add(type);

      const stageDeps = deps.get(type) ?? [];
      for (const dep of stageDeps) {
        if (stageMap.has(dep)) visit(dep);
      }

      inProgress.delete(type);
      visited.add(type);
      const def = stageMap.get(type);
      if (def) sorted.push(def);
    }

    for (const stage of stages) visit(stage.type);

    return sorted;
  }

  private toStageDefRow(node: GraphNode): StageDefRow {
    return {
      type: node.def.type,
      inputs: node.def.inputs ?? [],
      outputs: node.def.outputs ?? [],
      optional: false,
      supportsDeterministic: node.def.supportsDeterministic,
      supportsAI: node.def.supportsAI,
      supportsCache: node.def.supportsCache,
    };
  }
}
