import type { PipelineStage } from "@/lib/generation/contracts";
import type { StageDefRow } from "@/lib/generation/contracts";

export interface ExecutionPlan {
  readonly orderedStages: readonly StageDefRow[];
  readonly dependencies: ReadonlyMap<PipelineStage, readonly PipelineStage[]>;
  readonly optionalStages: readonly PipelineStage[];
  readonly stageMap: ReadonlyMap<PipelineStage, StageDefRow>;
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly stageCount: number;
  readonly hasOptionalStages: boolean;
}

export class ExecutionPlanBuilder {
  private orderedStages: StageDefRow[] = [];
  private dependencies = new Map<PipelineStage, PipelineStage[]>();
  private errors: string[] = [];

  addStage(stage: StageDefRow, deps: PipelineStage[]): void {
    this.orderedStages.push(stage);
    this.dependencies.set(stage.type, deps);
  }

  addError(error: string): void {
    this.errors.push(error);
  }

  build(): ExecutionPlan {
    const stageMap = new Map<PipelineStage, StageDefRow>();
    for (const s of this.orderedStages) stageMap.set(s.type, s);

    const deps = new Map<PipelineStage, readonly PipelineStage[]>();
    for (const [k, v] of Array.from(this.dependencies)) deps.set(k, Object.freeze([...v]));

    const optional = Object.freeze(
      this.orderedStages.filter((s) => s.optional).map((s) => s.type),
    );

    return Object.freeze({
      orderedStages: Object.freeze([...this.orderedStages]),
      dependencies: deps,
      optionalStages: optional,
      stageMap,
      valid: this.errors.length === 0,
      errors: Object.freeze([...this.errors]),
      stageCount: this.orderedStages.length,
      hasOptionalStages: optional.length > 0,
    });
  }
}
