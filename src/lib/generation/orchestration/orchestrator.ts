import type {
  GenerationOrchestrator, GenerationRequest, GenerationResult,
  GenerationId, GenerationContext,
  PipelineStageDef, StageResult,
  GenerationRepository, JobRepository, CheckpointRepository,
  PipelineRunner, StageRegistry, GenerationCache,
  BudgetManager, CostTracker, MetricsCollector,
  EventPublisher, LockProvider, StrategyFactory,
  AIProviderFactory, PromptRegistry, QueueAdapter,
  Generation, PipelineStage, StageResultRow,
} from "@/lib/generation/contracts";
import type { GenerationProgress, Result } from "@/lib/generation/domain";
import { success, failure } from "../infrastructure/helpers/result";
import { GenerationValidator } from "./generation-validator";
import { GenerationLock } from "./generation-lock";
import { GenerationIdempotency } from "./generation-idempotency";
import { GenerationBudget } from "./generation-budget";
import { GenerationEngine } from "./generation-engine";
import { GenerationEstimator } from "./generation-estimator";
import type { CostEstimate } from "./generation-estimator";
import { GenerationProgressTracker } from "./generation-progress";
import { GenerationRetry } from "./generation-retry";
import { GenerationCancellation } from "./generation-cancellation";
import { ORCHESTRATION_EVENTS } from "./generation-events";

interface CheckpointRow {
  stageId: string;
  status: string;
  output: Record<string, unknown>;
}

export interface OrchestratorConfig {
  generationRepository: GenerationRepository;
  jobRepository: JobRepository;
  checkpointRepository: CheckpointRepository;
  pipelineRunner: PipelineRunner;
  stageRegistry: StageRegistry;
  cache: GenerationCache;
  budgetManager: BudgetManager;
  costTracker: CostTracker;
  metrics: MetricsCollector;
  events: EventPublisher;
  lockProvider: LockProvider;
  strategyFactory: StrategyFactory;
  aiProviderFactory: AIProviderFactory;
  promptRegistry: PromptRegistry;
  queueAdapter: QueueAdapter;
}

export class GenerationOrchestratorImpl
  extends GenerationProgressTracker
  implements GenerationOrchestrator
{
  private validator: GenerationValidator;
  private genLock: GenerationLock;
  private idempotency: GenerationIdempotency;
  private budget: GenerationBudget;
  private engine: GenerationEngine;
  private estimator: GenerationEstimator;
  private retryService: GenerationRetry;
  private cancelService: GenerationCancellation;

  constructor(private config: OrchestratorConfig) {
    super();
    this.validator = new GenerationValidator();
    this.genLock = new GenerationLock(config.lockProvider);
    this.idempotency = new GenerationIdempotency(config.generationRepository);
    this.budget = new GenerationBudget(config.budgetManager);
    this.engine = new GenerationEngine(config.generationRepository, config.jobRepository);
    this.estimator = new GenerationEstimator(config.stageRegistry);
    this.retryService = new GenerationRetry(
      config.generationRepository,
      config.checkpointRepository,
      config.cache,
    );
    this.cancelService = new GenerationCancellation(config.generationRepository);
  }

  async generate(request: GenerationRequest): Promise<Result<GenerationResult>> {
    try {
      this.validator.validateRequest(request);

      const existing = await this.idempotency.check(request);
      if (!existing.success) return existing;
      if (existing.data) {
        const gen = await this.engine.getExistingByKey(request.idempotencyKey);
        if (gen.success && gen.data?.result) return success(gen.data.result);
      }

      const lockMsg = await this.genLock.acquire(request.creatorId);
      if (!lockMsg.success) return lockMsg;
      if (lockMsg.data) return failure(new Error("Generation already in progress"));

      try {
        const estimate = await this.estimator.estimateCost(request);

        const budgetOk = await this.budget.check(request.creatorId, estimate.estimatedCost.total);
        if (!budgetOk.success) return budgetOk;

        const stages = this.buildStages(request);
        const gen = await this.engine.createGeneration({ request, stages });
        if (!gen.success) return gen;
        if (!gen.data) return failure(new Error("Failed to create generation"));

        await this.publishEvent(ORCHESTRATION_EVENTS.CREATED, {
          generationId: gen.data.id,
          creatorId: gen.data.creatorId,
          strategy: gen.data.strategy,
          mode: gen.data.mode,
          sourceUrl: gen.data.sourceUrl,
          timestamp: new Date().toISOString(),
        });

        await this.engine.updateGenerationStatus(gen.data, "queued");

        const jobResult = await this.engine.createJob(gen.data.id);
        if (!jobResult.success) return jobResult;

        const pipelineStages = this.buildPipelineStages(stages);
        const ctx = this.buildContext(request, gen.data);

        await this.engine.updateGenerationStatus(gen.data, "running");
        await this.publishEvent(ORCHESTRATION_EVENTS.STARTED, {
          generationId: gen.data.id,
          creatorId: gen.data.creatorId,
          timestamp: new Date().toISOString(),
        });

        const runResult = await this.config.pipelineRunner.execute(pipelineStages as PipelineStageDef[], ctx);

        let result: GenerationResult;
        const elapsedMs = Date.now() - gen.data.createdAt.getTime();

        if (runResult.success) {
          const stageResults = runResult.data;
          const failed = stageResults.filter((s) => s.status === "failed").length;
          const completed = stageResults.filter((s) => s.status === "completed").length;
          const finalStatus: string = failed > 0 ? "failed" : "completed";

          result = this.buildResult(gen.data, finalStatus, stageResults, estimate, elapsedMs);

          await this.engine.updateGenerationStatus(gen.data, finalStatus, result);

          await this.publishEvent(
            finalStatus === "completed" ? ORCHESTRATION_EVENTS.COMPLETED : ORCHESTRATION_EVENTS.FAILED,
            {
              generationId: gen.data.id,
              status: finalStatus,
              durationMs: elapsedMs,
              stagesCompleted: completed,
              timestamp: new Date().toISOString(),
              ...(failed > 0 ? { error: stageResults.find((s) => s.error)?.error ?? "Unknown error" } : {}),
            },
          );
        } else {
          result = this.buildResult(gen.data, "failed", [], estimate, elapsedMs);
          result.error = runResult.error.message;

          await this.engine.updateGenerationStatus(gen.data, "failed", result);
          await this.publishEvent(ORCHESTRATION_EVENTS.FAILED, {
            generationId: gen.data.id,
            error: runResult.error.message,
            durationMs: elapsedMs,
            stagesCompleted: 0,
            timestamp: new Date().toISOString(),
          });
        }

        return success(result);
      } finally {
        await this.genLock.release(request.creatorId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return failure(new Error(msg));
    }
  }

  async regenerate(generationId: GenerationId) {
    const gen = await this.engine.getGeneration(generationId);
    if (!gen.success) return gen;
    if (!gen.data) return failure(new Error(`Generation not found: ${generationId}`));

    const request: GenerationRequest = {
      sourceUrl: gen.data.sourceUrl,
      creatorId: gen.data.creatorId,
      idempotencyKey: `regenerate_${generationId}_${Date.now()}`,
      strategy: gen.data.strategy,
      mode: "regenerate" as GenerationRequest["mode"],
      options: gen.data.context?.options as GenerationRequest["options"],
    };

    return this.generate(request);
  }

  async resume(generationId: GenerationId, checkpoints?: CheckpointRow[]) {
    const gen = await this.engine.getGeneration(generationId);
    if (!gen.success) return gen;
    if (!gen.data) return failure(new Error(`Generation not found: ${generationId}`));

    const existingCheckpoints: CheckpointRow[] = checkpoints ? [...checkpoints] : [];
    if (existingCheckpoints.length === 0) {
      const cpResult = await this.config.checkpointRepository.findByGenerationId(generationId);
      if (cpResult.success && cpResult.data) existingCheckpoints.push(...cpResult.data);
    }

    const stages = this.buildStagesFromGeneration(gen.data);
    const pipelineStages = this.buildPipelineStages(stages);
    const ctx = this.buildContext(
      {
        sourceUrl: gen.data.sourceUrl,
        creatorId: gen.data.creatorId,
        idempotencyKey: `resume_${generationId}`,
        strategy: gen.data.strategy,
        mode: gen.data.mode,
      },
      gen.data,
    );

    const lockMsg = await this.genLock.acquire(gen.data.creatorId);
    if (!lockMsg.success) return lockMsg;

    try {
      await this.engine.updateGenerationStatus(gen.data, "running");
      await this.publishEvent(ORCHESTRATION_EVENTS.RESUMED, {
        generationId,
        resumedFrom: null,
        timestamp: new Date().toISOString(),
      });

      const runResult = await this.config.pipelineRunner.execute(
        pipelineStages as PipelineStageDef[],
        ctx,
        existingCheckpoints,
      );
      const elapsedMs = Date.now() - gen.data.createdAt.getTime();
      const estimate = await this.estimator.estimateCost({
        sourceUrl: gen.data.sourceUrl,
        creatorId: gen.data.creatorId,
        idempotencyKey: (gen.data.context?.idempotencyKey as string) ?? "",
        strategy: gen.data.strategy,
        mode: gen.data.mode,
      });

      let result: GenerationResult;
      if (runResult.success) {
        const stageResults = runResult.data;
        const failed = stageResults.filter((s) => s.status === "failed").length;
        const completed = stageResults.filter((s) => s.status === "completed").length;
        const finalStatus = failed > 0 ? "failed" : "completed";

        result = this.buildResult(gen.data, finalStatus, stageResults, estimate, elapsedMs);
        await this.engine.updateGenerationStatus(gen.data, finalStatus, result);

        await this.publishEvent(
          finalStatus === "completed" ? ORCHESTRATION_EVENTS.COMPLETED : ORCHESTRATION_EVENTS.FAILED,
          { generationId, status: finalStatus, durationMs: elapsedMs, stagesCompleted: completed, timestamp: new Date().toISOString() },
        );
      } else {
        result = this.buildResult(gen.data, "failed", [], estimate, elapsedMs);
        result.error = runResult.error.message;
        await this.engine.updateGenerationStatus(gen.data, "failed", result);
      }

      return success(result);
    } finally {
      await this.genLock.release(gen.data.creatorId);
    }
  }

  async retry(generationId: GenerationId) {
    const prepared = await this.retryService.prepareRetry(generationId);
    if (!prepared.success) return prepared;
    if (!prepared.data) return failure(new Error(`Generation not found: ${generationId}`));

    const { generation, checkpoints } = prepared.data;

    await this.publishEvent(ORCHESTRATION_EVENTS.RETRY, {
      generationId,
      attempt: ((generation.context?.retryAttempt as number) ?? 0) + 1,
      timestamp: new Date().toISOString(),
    });

    return this.resume(generationId, checkpoints);
  }

  async cancel(generationId: GenerationId): Promise<Result<void>> {
    const gen = await this.cancelService.cancel(generationId);
    if (!gen.success) return failure(gen.error);

    if (gen.data) {
      await this.publishEvent(ORCHESTRATION_EVENTS.CANCELLED, {
        generationId,
        reason: "User requested cancellation",
        timestamp: new Date().toISOString(),
      });
    }

    return success(undefined);
  }

  async getStatus(generationId: GenerationId) {
    const gen = await this.engine.getGeneration(generationId);
    if (!gen.success) return gen as Result<string>;
    if (!gen.data) return success("unknown");
    return success(gen.data.status);
  }

  async getResult(generationId: GenerationId) {
    const gen = await this.engine.getGeneration(generationId);
    if (!gen.success) return gen as Result<GenerationResult | null>;
    if (!gen.data) return success(null);
    return success(gen.data.result);
  }

  async getProgress(generationId: GenerationId): Promise<Result<GenerationProgress | null>> {
    const gen = await this.engine.getGeneration(generationId);
    if (!gen.success) return failure(gen.error);
    if (!gen.data) return success(null);

    const stages = (gen.data.result?.stages ?? []) as StageResultRow[];
    const startTime = gen.data.createdAt.getTime();
    const elapsedMs = Date.now() - startTime;
    const totalStages = gen.data.pipeline.stages.length;

    const info = this.track(generationId, gen.data.status, stages, elapsedMs, totalStages);
    return success(this.toGenerationProgress(info));
  }

  async dryRun(request: GenerationRequest) {
    try {
      this.validator.validateRequest(request);
    } catch (err) {
      return success({ valid: false, errors: [(err as Error).message], stageOrder: [] as string[], estimatedCost: await this.estimator.estimateCost(request) });
    }

    const stages = this.buildStages(request);
    const estimate = await this.estimator.estimateCost(request);
    return success({
      valid: true,
      errors: [] as string[],
      stageOrder: stages.map((s) => s.type),
      estimatedCost: estimate,
    });
  }

  async estimateCost(request: GenerationRequest) {
    try {
      this.validator.validateRequest(request);
    } catch (err) {
      return failure(new Error((err as Error).message));
    }
    return success(await this.estimator.estimateCost(request));
  }

  async estimateDuration(request: GenerationRequest) {
    try {
      this.validator.validateRequest(request);
    } catch (err) {
      return failure(new Error((err as Error).message));
    }
    return success(await this.estimator.estimateDuration(request));
  }

  validateRequest(request: GenerationRequest): string[] {
    try {
      this.validator.validateRequest(request);
      return [];
    } catch (err) {
      const ve = err as { fields?: Record<string, string> };
      if (ve.fields) return Object.values(ve.fields);
      return [(err as Error).message];
    }
  }

  private buildStages(request: GenerationRequest): Array<{
    type: PipelineStage;
    inputs: string[];
    outputs: string[];
    optional: boolean;
    supportsDeterministic: boolean;
    supportsAI: boolean;
    supportsCache: boolean;
  }> {
    const allStages = this.config.stageRegistry.getAll();
    const sections = request.options?.sections;

    if (sections && sections.length > 0) {
      return allStages
        .filter((s) => sections.includes(s.type))
        .map((s) => ({
          type: s.type,
          inputs: s.inputs,
          outputs: s.outputs,
          optional: s.inputs.length > 0,
          supportsDeterministic: s.supportsDeterministic,
          supportsAI: s.supportsAI,
          supportsCache: s.supportsCache,
        }));
    }

    return allStages.map((s) => ({
      type: s.type,
      inputs: s.inputs,
      outputs: s.outputs,
      optional: (request.options?.partial ?? false) ? s.inputs.length > 0 : false,
      supportsDeterministic: s.supportsDeterministic,
      supportsAI: s.supportsAI,
      supportsCache: s.supportsCache,
    }));
  }

  private buildStagesFromGeneration(gen: Generation): Array<{
    type: PipelineStage;
    inputs: string[];
    outputs: string[];
    optional: boolean;
    supportsDeterministic: boolean;
    supportsAI: boolean;
    supportsCache: boolean;
  }> {
    return gen.pipeline.stages.map((s) => ({
      type: s.type,
      inputs: s.inputs,
      outputs: s.outputs,
      optional: s.optional,
      supportsDeterministic: s.supportsDeterministic,
      supportsAI: s.supportsAI,
      supportsCache: s.supportsCache,
    }));
  }

  private buildPipelineStages(
    stages: Array<{
      type: PipelineStage;
      inputs: string[];
      outputs: string[];
      optional: boolean;
      supportsDeterministic: boolean;
      supportsAI: boolean;
      supportsCache: boolean;
    }>,
  ): PipelineStageDef[] {
    return stages.map((s) => {
      const def = this.config.stageRegistry.get(s.type);
      if (def) return def;

      return {
        type: s.type,
        supportsDeterministic: s.supportsDeterministic,
        supportsAI: s.supportsAI,
        supportsCache: s.supportsCache,
        inputs: s.inputs,
        outputs: s.outputs,
        execute: async () => success({}),
        canExecute: () => true,
      } as PipelineStageDef;
    });
  }

  private buildContext(request: GenerationRequest, generation: Generation): GenerationContext {
    return {
      source: { url: request.sourceUrl },
      profile: null,
      strategy: request.strategy,
      options: {
        mode: request.mode,
        partial: request.options?.partial ?? false,
        sections: request.options?.sections ?? [],
        forceAI: request.options?.forceAI ?? false,
        skipAI: request.options?.skipAI ?? false,
        forceTheme: request.options?.forceTheme,
        cacheTTL: request.options?.cacheTTL,
        generationId: generation.id,
        creatorId: request.creatorId,
      },
      metadata: {
        generationId: generation.id,
        creatorId: request.creatorId,
        idempotencyKey: request.idempotencyKey,
        version: generation.version,
      },
    };
  }

  private buildResult(
    generation: Generation,
    status: string,
    stageResults: StageResult[],
    estimate: CostEstimate,
    durationMs: number,
  ): GenerationResult {
    return {
      generationId: generation.id,
      status: status as GenerationResult["status"],
      version: generation.version,
      snapshotId: null,
      storefrontUrl: null,
      artifacts: [],
      cost: {
        total: estimate.estimatedCost.total,
        aiCalls: estimate.estimatedCost.aiCalls,
        tokensUsed: estimate.estimatedCost.tokensUsed,
      },
      durationMs,
      stages: stageResults.map((s) => ({
        stage: s.stage,
        status: s.status,
        progress: s.progress,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        error: s.error,
        retryCount: s.retryCount,
      })),
      error: status === "failed" ? (stageResults.find((s) => s.error)?.error ?? "Unknown error") : null,
    };
  }

  private async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.config.events.publish(eventType, payload);
    } catch {}
  }
}
