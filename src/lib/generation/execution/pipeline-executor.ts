import type { PipelineStageDef } from "@/lib/generation/contracts";
import type { StageResult, PipelineStage } from "@/lib/generation/contracts";
import type { PipelineContext } from "./execution-context";
import type { ExecutionPlan } from "./execution-plan";
import type { StageExecutor } from "./stage-executor";
import { success } from "../infrastructure/helpers/result";
import { PIPELINE_EVENTS } from "./pipeline-events";

interface CheckpointRow {
  stageId: string;
  status: string;
  output: Record<string, unknown>;
}

export class PipelineExecutor {
  constructor(
    private stageExecutor: StageExecutor,
  ) {}

  async execute(
    plan: ExecutionPlan,
    ctx: PipelineContext,
    checkpoints: CheckpointRow[],
    stageMap?: Map<PipelineStage, PipelineStageDef>,
  ) {
    const completed = new Set(
      (checkpoints ?? []).filter((c) => c.status === "completed").map((c) => c.stageId as PipelineStage),
    );
    const results: StageResult[] = [];

    for (const stageRow of plan.orderedStages) {
      const stageDef = stageMap?.get(stageRow.type) ?? this.stubStageDef(stageRow.type, plan);
      if (!stageDef) {
        results.push({
          stage: stageRow.type,
          status: "failed",
          progress: 0,
          startedAt: null,
          completedAt: null,
          error: `Stage definition not found: ${stageRow.type}`,
          retryCount: 0,
        });
        continue;
      }

      if (completed.has(stageRow.type)) {
        results.push({
          stage: stageRow.type,
          status: "completed",
          progress: 100,
          startedAt: null,
          completedAt: null,
          error: null,
          retryCount: 0,
        });
        continue;
      }

      if (ctx.partial && ctx.targetStages.length > 0 && !ctx.targetStages.includes(stageRow.type)) {
        results.push({
          stage: stageRow.type,
          status: "skipped",
          progress: 0,
          startedAt: null,
          completedAt: null,
          error: `Skipped by partial execution`,
          retryCount: 0,
        });
        await this.publishSkippedEvent(ctx, stageRow.type, "Skipped by partial execution");
        continue;
      }

      const resolvedInputs = ctx.artifacts.resolve(stageDef.inputs ?? []);

      const cacheKey = stageDef.supportsCache ? `stage:${ctx.generationId}:${stageDef.type}` : null;
      if (cacheKey) {
        const cached = await ctx.cache.get<Record<string, unknown>>(cacheKey);
        if (cached.success && cached.data) {
          ctx.metrics.increment("cache.hit", 1, { stage: stageDef.type });
          results.push({
            stage: stageDef.type,
            status: "completed",
            progress: 100,
            startedAt: null,
            completedAt: null,
            error: null,
            retryCount: 0,
          });
          await this.publishEvent(ctx, PIPELINE_EVENTS.STAGE_COMPLETED, {
            generationId: ctx.generationId,
            stage: stageDef.type,
            durationMs: 0,
            cached: true,
            timestamp: new Date().toISOString(),
          });
          continue;
        }
        ctx.metrics.increment("cache.miss", 1, { stage: stageDef.type });
      }

      const execResult = await this.stageExecutor.execute(stageDef, resolvedInputs, ctx);
      if (!execResult.success) {
        results.push({
          stage: stageDef.type,
          status: "failed",
          progress: 0,
          startedAt: null,
          completedAt: null,
          error: execResult.error.message,
          retryCount: 0,
        });
        continue;
      }

      const { result, outputs } = execResult.data;

      if (result.status === "completed" && outputs) {
        for (const [key, value] of Object.entries(outputs)) {
          ctx.artifacts.create(stageDef.type, key, value as Record<string, unknown>);
        }

        await ctx.checkpoints.save(ctx.generationId, stageDef.type, "completed", outputs);

        if (cacheKey) {
          await ctx.cache.set(cacheKey, outputs, ctx.strategy.cacheTTL || 300000);
        }
      }

      if (result.status === "failed") {
        await ctx.checkpoints.save(ctx.generationId, stageDef.type, "failed", { error: result.error ?? "Unknown error" });
      }

      results.push(result);

      if (result.status === "failed") break;
    }

    return success<StageResult[]>(results);
  }

  private stubStageDef(type: PipelineStage, plan: ExecutionPlan): PipelineStageDef | null {
    const row = plan.stageMap.get(type);
    if (!row) return null;
    return {
      type: row.type,
      supportsDeterministic: row.supportsDeterministic,
      supportsAI: row.supportsAI,
      supportsCache: row.supportsCache,
      inputs: row.inputs,
      outputs: row.outputs,
      execute: async () => success({}),
      canExecute: () => true,
    };
  }

  private async publishEvent(ctx: PipelineContext, eventType: string, payload: Record<string, unknown>): Promise<void> {
    try { await ctx.events.publish(eventType, { ...payload }); } catch {}
  }

  private async publishSkippedEvent(ctx: PipelineContext, stage: PipelineStage, reason: string): Promise<void> {
    try {
      await ctx.events.publish(PIPELINE_EVENTS.STAGE_SKIPPED, {
        generationId: ctx.generationId,
        stage,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  }
}
