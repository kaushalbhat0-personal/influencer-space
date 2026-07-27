import type { PipelineRunner, PipelineStageDef, StageResult, StageRegistry } from "@/lib/generation/contracts";
import type { GenerationContext, CheckpointRepository } from "@/lib/generation/contracts";
import type { GenerationCache, LockProvider, MetricsCollector, EventPublisher, GenerationStrategy } from "@/lib/generation/contracts";
import type { StrategyType, Result } from "@/lib/generation/contracts";

interface CheckpointRow {
  stageId: string;
  status: string;
  output: Record<string, unknown>;
}
import { success, failure } from "../infrastructure/helpers/result";
import { PipelineGraphResolver } from "./pipeline-graph-resolver";
import type { ExecutionPlan } from "./execution-plan";
import { createPipelineContext } from "./execution-context";
import type { PipelineContext } from "./execution-context";
import { PipelineExecutor } from "./pipeline-executor";
import { StageExecutor } from "./stage-executor";
import { CheckpointManager } from "./checkpoint-manager";
import { ArtifactManager } from "./artifact-manager";
import { PIPELINE_EVENTS } from "./pipeline-events";

export interface PipelineRunnerConfig {
  stageRegistry: StageRegistry;
  checkpointRepository: CheckpointRepository;
  cache: GenerationCache;
  lock: LockProvider;
  metrics: MetricsCollector;
  events: EventPublisher;
  strategy?: GenerationStrategy;
}

export class PipelineRunnerImpl implements PipelineRunner {
  private graphResolver = new PipelineGraphResolver();
  private executor: PipelineExecutor;

  constructor(private config: PipelineRunnerConfig) {
    this.executor = new PipelineExecutor(new StageExecutor());
  }

  async execute(
    pipeline: PipelineStageDef[],
    context: GenerationContext,
    checkpoints?: CheckpointRow[],
  ): Promise<Result<StageResult[]>> {
    const plan = this.graphResolver.resolve(pipeline);
    if (!plan.valid) {
      return failure(new Error(`Pipeline validation failed: ${plan.errors.join("; ")}`));
    }

    const generationId = (context.metadata?.generationId as string) ?? crypto.randomUUID();

    const checkpointManager = new CheckpointManager(this.config.checkpointRepository);
    const artifactManager = new ArtifactManager();
    const loadedCheckpoints = checkpoints ?? (await this.loadCheckpoints(checkpointManager, generationId));

    const ctx = createPipelineContext({
      generationId,
      generationContext: context,
      strategy: this.config.strategy ?? this.createDefaultStrategy((context.strategy ?? "free") as StrategyType),
      cache: this.config.cache,
      lock: this.config.lock,
      metrics: this.config.metrics,
      events: this.config.events,
      checkpoints: checkpointManager,
      artifacts: artifactManager,
      config: {},
    });

    const startTime = Date.now();
    await this.publish(ctx, PIPELINE_EVENTS.STARTED, {
      generationId,
      totalStages: plan.stageCount,
      strategy: context.strategy ?? "free",
      mode: (context.options?.mode as string) ?? "full",
      timestamp: new Date().toISOString(),
    });

    const stageMap = new Map(pipeline.map((s) => [s.type, s]));
    const result = await this.executor.execute(plan, ctx, loadedCheckpoints, stageMap);

    const totalDuration = Date.now() - startTime;

    if (result.success) {
      const stages = result.data;
      const completed = stages.filter((s) => s.status === "completed").length;
      const failed = stages.filter((s) => s.status === "failed").length;
      const skipped = stages.filter((s) => s.status === "skipped").length;

      const anyFailed = failed > 0;
      if (anyFailed) {
        await this.publish(ctx, PIPELINE_EVENTS.FAILED, {
          generationId,
          error: stages.find((s) => s.error)?.error ?? "Unknown error",
          stagesCompleted: completed,
          stagesFailed: failed,
          timestamp: new Date().toISOString(),
        });
      } else {
        await this.publish(ctx, PIPELINE_EVENTS.COMPLETED, {
          generationId,
          stagesCompleted: completed,
          stagesFailed: failed,
          stagesSkipped: skipped,
          totalDurationMs: totalDuration,
          timestamp: new Date().toISOString(),
        });
      }

      return success<StageResult[]>(stages);
    }

    await this.publish(ctx, PIPELINE_EVENTS.FAILED, {
      generationId,
      error: result.error.message,
      stagesCompleted: 0,
      stagesFailed: 0,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async executeUntil(
    pipeline: PipelineStageDef[],
    context: GenerationContext,
    targetStage: string,
    checkpoints?: CheckpointRow[],
  ) {
    const plan = this.graphResolver.resolve(pipeline);
    if (!plan.valid) {
      return failure(new Error(`Pipeline validation failed: ${plan.errors.join("; ")}`));
    }

    const targetIndex = plan.orderedStages.findIndex((s) => s.type === targetStage);
    if (targetIndex === -1) {
      return failure(new Error(`Target stage not found in pipeline: ${targetStage}`));
    }

    const subset = plan.orderedStages.slice(0, targetIndex + 1).map((row) => {
      return this.config.stageRegistry.get(row.type);
    }).filter((s): s is PipelineStageDef => s !== undefined);

    if (subset.length === 0) {
      return failure(new Error("No stage definitions found for pipeline subset"));
    }

    return this.execute(subset, context, checkpoints);
  }

  async resume(
    pipeline: PipelineStageDef[],
    context: GenerationContext,
    checkpoints: CheckpointRow[],
  ) {
    const plan = this.graphResolver.resolve(pipeline);
    if (!plan.valid) {
      return failure(new Error(`Pipeline validation failed: ${plan.errors.join("; ")}`));
    }

    const checkpointManager = new CheckpointManager(this.config.checkpointRepository);
    const resumeStages = checkpointManager.resumeFrom(plan.orderedStages, checkpoints);

    if (resumeStages.length === 0) {
      return success([]);
    }

    const resumeTypes = new Set(resumeStages.map((s) => s.type));
    const resumeDefs = pipeline.filter((s) => resumeTypes.has(s.type));

    return this.execute(resumeDefs, context, checkpoints);
  }

  validate(pipeline: PipelineStageDef[]): string[] {
    return this.graphResolver.validate(pipeline);
  }

  dryRun(pipeline: PipelineStageDef[]): {
    valid: boolean;
    errors: string[];
    stageOrder: string[];
    plan: ExecutionPlan;
  } {
    const { plan, stageOrder } = this.graphResolver.dryRun(pipeline);
    return {
      valid: plan.valid,
      errors: [...plan.errors],
      stageOrder,
      plan,
    };
  }

  private async loadCheckpoints(checkpointManager: CheckpointManager, generationId: string): Promise<CheckpointRow[]> {
    const result = await checkpointManager.load(generationId);
    return result.success ? result.data : [];
  }

  private async publish(ctx: PipelineContext, eventType: string, payload: Record<string, unknown>): Promise<void> {
    try { await ctx.events.publish(eventType, payload); } catch {}
  }

  private createDefaultStrategy(strategy: StrategyType): GenerationStrategy {
    return {
      type: strategy,
      allowsAI: false,
      maxRegenerationsPerDay: 0,
      maxAICallsPerGeneration: 0,
      cacheTTL: 300000,
      parallelStages: false,
      budget: { dailyAiCost: 0, monthlyAiCost: 0 },
      canRegenerate: () => false,
      canUseAI: () => false,
    };
  }
}
