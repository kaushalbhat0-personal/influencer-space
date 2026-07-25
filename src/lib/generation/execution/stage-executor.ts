import type { PipelineStageDef, StageResult, StageStatus } from "@/lib/generation/contracts";
import type { PipelineContext } from "./execution-context";
import { success } from "../infrastructure/helpers/result";
import { PIPELINE_EVENTS } from "./pipeline-events";
import { RetryPolicy } from "@/lib/generation/domain";

export interface StageExecutorResult {
  result: StageResult;
  outputs: Record<string, unknown>;
}

export class StageExecutor {
  private retryPolicy: RetryPolicy;

  constructor(retryPolicy?: RetryPolicy) {
    this.retryPolicy = retryPolicy ?? new RetryPolicy(3, 100, 1000);
  }

  async execute(
    stageDef: PipelineStageDef,
    resolvedInputs: Record<string, unknown>,
    ctx: PipelineContext,
  ) {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: string | null = null;
    let lastOutputs: Record<string, unknown> = {};

    if (!stageDef.canExecute(resolvedInputs)) {
      return success({
        result: {
          stage: stageDef.type,
          status: "skipped" as StageStatus,
          progress: 0,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          error: "Stage prerequisites not met",
          retryCount: 0,
        },
        outputs: {},
      });
    }

    await this.publishEvent(ctx, PIPELINE_EVENTS.STAGE_STARTED, {
      generationId: ctx.generationId,
      stage: stageDef.type,
      attempt: 1,
      timestamp: new Date().toISOString(),
    });

    while (attempt < this.retryPolicy.maxAttempts) {
      attempt++;
      const attemptStart = Date.now();

      try {
        const execResult = await stageDef.execute(resolvedInputs, ctx.generationContext);

        if (execResult.success) {
          lastOutputs = execResult.data;
          const durationMs = Date.now() - attemptStart;

          ctx.metrics.increment("stage.completed", 1, { stage: stageDef.type });
          ctx.metrics.histogram("stage.duration", durationMs, { stage: stageDef.type });

          await this.publishEvent(ctx, PIPELINE_EVENTS.STAGE_COMPLETED, {
            generationId: ctx.generationId,
            stage: stageDef.type,
            durationMs,
            cached: false,
            timestamp: new Date().toISOString(),
          });

          return success({
            result: {
              stage: stageDef.type,
              status: "completed" as StageStatus,
              progress: 100,
              startedAt: new Date(startTime).toISOString(),
              completedAt: new Date().toISOString(),
              error: null,
              retryCount: attempt - 1,
            },
            outputs: lastOutputs,
          });
        }

        lastError = execResult.error.message;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < this.retryPolicy.maxAttempts) {
        const delay = this.retryPolicy.getDelay(attempt);
        await this.sleep(delay);
      }
    }

    ctx.metrics.increment("stage.failed", 1, { stage: stageDef.type });
    ctx.metrics.increment("stage.retries", attempt - 1, { stage: stageDef.type });

    await this.publishEvent(ctx, PIPELINE_EVENTS.STAGE_FAILED, {
      generationId: ctx.generationId,
      stage: stageDef.type,
      error: lastError!,
      attempt,
      willRetry: false,
      timestamp: new Date().toISOString(),
    });

    return success({
      result: {
        stage: stageDef.type,
        status: "failed" as StageStatus,
        progress: 0,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        error: lastError,
        retryCount: attempt - 1,
      },
      outputs: {},
    });
  }

  private async publishEvent(ctx: PipelineContext, eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await ctx.events.publish(eventType, { ...payload, generationId: ctx.generationId });
    } catch {}
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
