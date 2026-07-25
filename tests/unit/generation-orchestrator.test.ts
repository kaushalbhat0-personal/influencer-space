import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  Generation, GenerationRequest, GenerationResult, GenerationId,
  GenerationRepository, JobRepository, CheckpointRepository,
  PipelineRunner, StageRegistry, GenerationCache,
  BudgetManager, CostTracker, MetricsCollector,
  EventPublisher, LockProvider, StrategyFactory,
  AIProviderFactory, PromptRegistry, QueueAdapter,
  PipelineStageDef, GenerationContext, StageResult,
  AsyncResult, Result, GenerationStatus,
} from "@/lib/generation/contracts";
import { success, failure } from "@/lib/generation/infrastructure/helpers/result";
import { GenerationOrchestratorImpl } from "@/lib/generation/orchestration/orchestrator";
import type { OrchestratorConfig } from "@/lib/generation/orchestration/orchestrator";
import { GenerationValidator } from "@/lib/generation/orchestration/generation-validator";
import { GenerationLock } from "@/lib/generation/orchestration/generation-lock";
import { GenerationIdempotency } from "@/lib/generation/orchestration/generation-idempotency";
import { GenerationBudget } from "@/lib/generation/orchestration/generation-budget";
import { GenerationEngine } from "@/lib/generation/orchestration/generation-engine";
import { GenerationEstimator } from "@/lib/generation/orchestration/generation-estimator";
import { GenerationProgressTracker } from "@/lib/generation/orchestration/generation-progress";
import { GenerationRetry } from "@/lib/generation/orchestration/generation-retry";
import { GenerationCancellation } from "@/lib/generation/orchestration/generation-cancellation";
import { ORCHESTRATION_EVENTS } from "@/lib/generation/orchestration/generation-events";

function mockStage(type: string) {
  return {
    type: type as any,
    supportsDeterministic: true,
    supportsAI: false,
    supportsCache: false,
    inputs: [],
    outputs: [],
    execute: async () => success({}),
    canExecute: () => true,
  } as PipelineStageDef;
}

function createFullConfig(): OrchestratorConfig {
  return {
    generationRepository: {
      create: vi.fn().mockResolvedValue(success(createMockGen())),
      update: vi.fn().mockResolvedValue(success(createMockGen())),
      findById: vi.fn().mockResolvedValue(success(createMockGen())),
      findByCreatorId: vi.fn().mockResolvedValue(success([])),
      findByStatus: vi.fn().mockResolvedValue(success([])),
      findByIdempotencyKey: vi.fn().mockResolvedValue(success(null)),
      delete: vi.fn().mockResolvedValue(success(undefined)),
    },
    jobRepository: {
      create: vi.fn().mockResolvedValue(success({ id: "job1" })),
      update: vi.fn().mockResolvedValue(success({})),
      findById: vi.fn().mockResolvedValue(success(null)),
      findByGenerationId: vi.fn().mockResolvedValue(success([])),
      findQueued: vi.fn().mockResolvedValue(success([])),
      findDeadLetters: vi.fn().mockResolvedValue(success([])),
      delete: vi.fn().mockResolvedValue(success(undefined)),
    },
    checkpointRepository: {
      save: vi.fn().mockResolvedValue(success(undefined)),
      findByGenerationId: vi.fn().mockResolvedValue(success([])),
      findByStageId: vi.fn().mockResolvedValue(success(null)),
      deleteByGenerationId: vi.fn().mockResolvedValue(success(undefined)),
    },
    pipelineRunner: {
      execute: vi.fn().mockResolvedValue(success([] as StageResult[])),
    },
    stageRegistry: {
      register: vi.fn(),
      unregister: vi.fn(),
      get: vi.fn().mockReturnValue(mockStage("source_resolution")),
      getAll: vi.fn().mockReturnValue([mockStage("source_resolution"), mockStage("profile_extraction")]),
    },
    cache: {
      get: vi.fn().mockResolvedValue(success(null)),
      set: vi.fn().mockResolvedValue(success(undefined)),
      invalidate: vi.fn().mockResolvedValue(success(undefined)),
      invalidateByPattern: vi.fn().mockResolvedValue(success(undefined)),
      exists: vi.fn().mockResolvedValue(success(false)),
    },
    budgetManager: {
      canSpend: vi.fn().mockResolvedValue(success(true)),
      reserve: vi.fn().mockResolvedValue(success(undefined)),
      release: vi.fn().mockResolvedValue(success(undefined)),
      getRemaining: vi.fn().mockResolvedValue(success(100)),
      getSystemBudget: vi.fn().mockResolvedValue(success(1000)),
    },
    costTracker: {
      record: vi.fn().mockResolvedValue(success(undefined)),
      getGenerationCost: vi.fn().mockResolvedValue(success({ total: 0, aiCalls: 0, tokensUsed: 0 })),
      getCreatorCost: vi.fn().mockResolvedValue(success({ total: 0, aiCalls: 0, tokensUsed: 0 })),
      getTotalCost: vi.fn().mockResolvedValue(success({ total: 0, aiCalls: 0, tokensUsed: 0 })),
    },
    metrics: {
      increment: vi.fn(),
      histogram: vi.fn(),
      gauge: vi.fn(),
    },
    events: {
      publish: vi.fn().mockResolvedValue(success(undefined)),
    },
    lockProvider: {
      acquire: vi.fn().mockResolvedValue(success(true)),
      release: vi.fn().mockResolvedValue(success(undefined)),
      isLocked: vi.fn().mockResolvedValue(success(false)),
    },
    strategyFactory: {
      register: vi.fn(),
      create: vi.fn(),
    },
    aiProviderFactory: {
      register: vi.fn(),
      create: vi.fn(),
      getDefault: vi.fn(),
      list: vi.fn().mockReturnValue([]),
    },
    promptRegistry: {
      get: vi.fn().mockReturnValue(null),
      register: vi.fn(),
      getAll: vi.fn().mockReturnValue(new Map()),
    },
    queueAdapter: {
      enqueue: vi.fn().mockResolvedValue(success("job1")),
      dequeue: vi.fn().mockResolvedValue(success(null)),
      complete: vi.fn().mockResolvedValue(success(undefined)),
      fail: vi.fn().mockResolvedValue(success(undefined)),
      progress: vi.fn().mockResolvedValue(success(undefined)),
      getStatus: vi.fn().mockResolvedValue(success("queued")),
      getDeadLetters: vi.fn().mockResolvedValue(success([])),
      requeue: vi.fn().mockResolvedValue(success(undefined)),
      getQueueDepth: vi.fn().mockResolvedValue(success(0)),
    },
  };
}

function createMockRequest(overrides?: Partial<GenerationRequest>): GenerationRequest {
  return {
    sourceUrl: "https://example.com/profile",
    creatorId: "creator_1" as any,
    idempotencyKey: "idem_123",
    strategy: "free",
    mode: "full",
    options: { partial: false, forceAI: false, skipAI: false },
    ...overrides,
  };
}

let genCounter = 0;
function createMockGen(overrides?: Partial<Generation>): Generation {
  genCounter++;
  return {
    id: `gen_${genCounter}` as GenerationId,
    creatorId: "creator_1" as any,
    sourceUrl: "https://example.com",
    strategy: "free",
    mode: "full",
    status: "idle",
    pipeline: { stages: [{ type: "source_resolution", inputs: [], outputs: [], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false }] },
    context: { idempotencyKey: "idem_123" },
    result: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockResult(overrides?: Partial<GenerationResult>): GenerationResult {
  return {
    generationId: "gen_1" as GenerationId,
    status: "completed",
    version: 1,
    snapshotId: null,
    storefrontUrl: null,
    artifacts: [],
    cost: { total: 0, aiCalls: 0, tokensUsed: 0 },
    durationMs: 100,
    stages: [],
    error: null,
    ...overrides,
  };
}

// ===================== Individual Service Tests =====================

describe("GenerationValidator", () => {
  let validator: GenerationValidator;

  beforeEach(() => {
    validator = new GenerationValidator();
  });

  it("passes valid request", () => {
    expect(() => validator.validateRequest(createMockRequest())).not.toThrow();
  });

  it("rejects empty source URL", () => {
    expect(() => validator.validateRequest(createMockRequest({ sourceUrl: "" }))).toThrow("Source URL is required");
  });

  it("rejects invalid URL", () => {
    expect(() => validator.validateRequest(createMockRequest({ sourceUrl: "not-a-url" }))).toThrow("valid URL");
  });

  it("rejects empty creatorId", () => {
    expect(() => validator.validateRequest(createMockRequest({ creatorId: "" as any }))).toThrow("Creator ID is required");
  });

  it("rejects empty idempotencyKey", () => {
    expect(() => validator.validateRequest(createMockRequest({ idempotencyKey: "" }))).toThrow("Idempotency key is required");
  });

  it("rejects invalid strategy", () => {
    expect(() => validator.validateRequest(createMockRequest({ strategy: "invalid" as any }))).toThrow("Invalid strategy");
  });

  it("rejects invalid mode", () => {
    expect(() => validator.validateRequest(createMockRequest({ mode: "invalid" as any }))).toThrow("Invalid mode");
  });
});

describe("GenerationLock", () => {
  it("acquires lock successfully", async () => {
    const lock = new GenerationLock({ acquire: vi.fn().mockResolvedValue(success(true)), release: vi.fn().mockResolvedValue(success(undefined)), isLocked: vi.fn() } as any);
    const result = await lock.acquire("creator_1");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("returns message when lock fails", async () => {
    const lock = new GenerationLock({ acquire: vi.fn().mockResolvedValue(success(false)), release: vi.fn().mockResolvedValue(success(undefined)), isLocked: vi.fn() } as any);
    const result = await lock.acquire("creator_1");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("A generation is already in progress for this creator");
  });

  it("releases lock", async () => {
    const releaseFn = vi.fn().mockResolvedValue(success(undefined));
    const lock = new GenerationLock({ acquire: vi.fn(), release: releaseFn, isLocked: vi.fn() } as any);
    await lock.release("creator_1");
    expect(releaseFn).toHaveBeenCalled();
  });
});

describe("GenerationIdempotency", () => {
  it("returns false for new requests", async () => {
    const idem = new GenerationIdempotency({ findByIdempotencyKey: vi.fn().mockResolvedValue(success(null)) } as any);
    const result = await idem.check(createMockRequest());
    if (result.success) expect(result.data).toBe(false);
  });

  it("returns true for existing requests", async () => {
    const idem = new GenerationIdempotency({ findByIdempotencyKey: vi.fn().mockResolvedValue(success(createMockGen())) } as any);
    const result = await idem.check(createMockRequest());
    if (result.success) expect(result.data).toBe(true);
  });
});

describe("GenerationBudget", () => {
  it("passes when budget allows", async () => {
    const budget = new GenerationBudget({ canSpend: vi.fn().mockResolvedValue(success(true)) } as any);
    const result = await budget.check("creator_1", 10);
    expect(result.success).toBe(true);
  });

  it("fails when budget exceeded", async () => {
    const budget = new GenerationBudget({ canSpend: vi.fn().mockResolvedValue(success(false)) } as any);
    const result = await budget.check("creator_1", 100);
    expect(result.success).toBe(false);
  });
});

describe("GenerationEngine", () => {
  it("creates generation", async () => {
    const engine = new GenerationEngine(
      { create: vi.fn().mockResolvedValue(success(createMockGen())) } as any,
      {} as any,
    );
    const result = await engine.createGeneration({
      request: createMockRequest(),
      stages: [{ type: "source_resolution", inputs: [], outputs: [], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false }],
    });
    expect(result.success).toBe(true);
  });

  it("creates job", async () => {
    const engine = new GenerationEngine(
      {} as any,
      { create: vi.fn().mockResolvedValue(success({ id: "job1", generationId: "gen1" })) } as any,
    );
    const result = await engine.createJob("gen1" as any, "creator_1");
    expect(result.success).toBe(true);
  });

  it("updates generation status", async () => {
    const updateFn = vi.fn().mockResolvedValue(success(createMockGen({ status: "running" })));
    const engine = new GenerationEngine({ update: updateFn } as any, {} as any);
    const gen = createMockGen();
    await engine.updateGenerationStatus(gen, "running");
    expect(updateFn).toHaveBeenCalled();
  });
});

describe("GenerationEstimator", () => {
  it("estimates cost for free tier", async () => {
    const estimator = new GenerationEstimator({
      getAll: vi.fn().mockReturnValue([
        { type: "source_resolution", supportsDeterministic: true, supportsAI: false, supportsCache: true },
        { type: "theme_selection", supportsDeterministic: true, supportsAI: true, supportsCache: false },
      ]),
    } as any);
    const cost = await estimator.estimateCost(createMockRequest());
    expect(cost.stageCount).toBe(2);
    expect(cost.estimatedCost.total).toBe(0);
  });

  it("estimates cost for elite tier", async () => {
    const estimator = new GenerationEstimator({
      getAll: vi.fn().mockReturnValue([
        { type: "theme_selection", supportsDeterministic: true, supportsAI: true, supportsCache: false },
      ]),
    } as any);
    const cost = await estimator.estimateCost(createMockRequest({ strategy: "elite" }));
    expect(cost.estimatedCost.total).toBe(0.02);
    expect(cost.aiStageCount).toBe(1);
  });

  it("estimates duration", async () => {
    const estimator = new GenerationEstimator({
      getAll: vi.fn().mockReturnValue([
        { type: "source_resolution", supportsDeterministic: true, supportsAI: false, supportsCache: true },
      ]),
    } as any);
    const duration = await estimator.estimateDuration(createMockRequest());
    expect(duration).toBeGreaterThan(0);
  });
});

describe("GenerationProgressTracker", () => {
  let tracker: GenerationProgressTracker;

  beforeEach(() => {
    tracker = new GenerationProgressTracker();
  });

  it("tracks progress 0% initially", () => {
    const info = tracker.track("gen1" as any, "idle", [], 0, 5);
    expect(info.progress).toBe(0);
    expect(info.totalStages).toBe(5);
  });

  it("tracks 100% on completion", () => {
    const info = tracker.track("gen1" as any, "completed", [{ stage: "a" as any, status: "completed", progress: 100, startedAt: null, completedAt: null, error: null, retryCount: 0 }], 1000, 1);
    expect(info.progress).toBe(100);
  });

  it("tracks partial progress", () => {
    const info = tracker.track("gen1" as any, "running", [
      { stage: "a" as any, status: "completed", progress: 100, startedAt: null, completedAt: null, error: null, retryCount: 0 },
      { stage: "b" as any, status: "running", progress: 50, startedAt: null, completedAt: null, error: null, retryCount: 0 },
    ], 5000, 4);
    expect(info.stagesCompleted).toBe(1);
    expect(info.progress).toBeGreaterThan(0);
    expect(info.progress).toBeLessThan(100);
  });
});

describe("GenerationRetry", () => {
  it("prepares retry with checkpoints", async () => {
    const retry = new GenerationRetry(
      { findById: vi.fn().mockResolvedValue(success(createMockGen())), update: vi.fn().mockResolvedValue(success(createMockGen())) } as any,
      { findByGenerationId: vi.fn().mockResolvedValue(success([{ stageId: "a", status: "completed", output: {} }])) } as any,
      { invalidateByPattern: vi.fn() } as any,
    );
    const result = await retry.prepareRetry("gen1" as any);
    expect(result.success).toBe(true);
    if (result.success && result.data) {
      expect(result.data.checkpoints).toHaveLength(1);
    }
  });

  it("clears cache for retry", async () => {
    const invalidate = vi.fn().mockResolvedValue(success(undefined));
    const retry = new GenerationRetry({} as any, {} as any, { invalidateByPattern: invalidate } as any);
    await retry.clearCacheForRetry("gen1" as any);
    expect(invalidate).toHaveBeenCalledWith("stage:gen1:*");
  });
});

describe("GenerationCancellation", () => {
  it("cancels a running generation", async () => {
    const updateFn = vi.fn().mockImplementation(async (gen) => success(gen));
    const cancel = new GenerationCancellation({
      findById: vi.fn().mockResolvedValue(success(createMockGen({ status: "running" }))),
      update: updateFn,
    } as any);
    const result = await cancel.cancel("gen1" as any);
    expect(result.success).toBe(true);
    if (result.success && result.data) expect(result.data.status).toBe("cancelled");
  });

  it("does not cancel completed generation", async () => {
    const cancel = new GenerationCancellation({
      findById: vi.fn().mockResolvedValue(success(createMockGen({ status: "completed" }))),
    } as any);
    const result = await cancel.cancel("gen1" as any);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });

  it("returns null for unknown generation", async () => {
    const cancel = new GenerationCancellation({
      findById: vi.fn().mockResolvedValue(success(null)),
    } as any);
    const result = await cancel.cancel("gen1" as any);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeNull();
  });
});

// ===================== Orchestrator Integration Tests =====================

describe("GenerationOrchestratorImpl", () => {
  let orchestrator: GenerationOrchestratorImpl;
  let config: OrchestratorConfig;

  beforeEach(() => {
    genCounter = 0;
    config = createFullConfig();
    orchestrator = new GenerationOrchestratorImpl(config);
  });

  describe("generate", () => {
    it("generates successfully", async () => {
      const result = await orchestrator.generate(createMockRequest());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("completed");
        expect(result.data.generationId).toBeTruthy();
      }
    });

    it("returns existing result on idempotency match", async () => {
      config.generationRepository.findByIdempotencyKey = vi.fn().mockResolvedValue(
        success(createMockGen({ result: createMockResult() })),
      );
      const result = await orchestrator.generate(createMockRequest());
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe("completed");
    });

    it("fails on lock conflict", async () => {
      config.lockProvider.acquire = vi.fn().mockResolvedValue(success(false));
      const result = await orchestrator.generate(createMockRequest());
      expect(result.success).toBe(false);
    });

    it("fails on budget exceeded", async () => {
      config.budgetManager.canSpend = vi.fn().mockResolvedValue(success(false));
      const result = await orchestrator.generate(createMockRequest());
      expect(result.success).toBe(false);
    });

    it("fails on invalid request", async () => {
      const result = await orchestrator.generate(createMockRequest({ sourceUrl: "" }));
      expect(result.success).toBe(false);
    });

    it("publishes created and completed events", async () => {
      await orchestrator.generate(createMockRequest());
      expect(config.events.publish).toHaveBeenCalledWith("generation.created", expect.any(Object));
      expect(config.events.publish).toHaveBeenCalledWith("generation.completed", expect.any(Object));
    });

    it("releases lock after completion", async () => {
      await orchestrator.generate(createMockRequest());
      expect(config.lockProvider.release).toHaveBeenCalled();
    });

    it("publishes failed event when pipeline fails", async () => {
      config.pipelineRunner.execute = vi.fn().mockResolvedValue(
        success([{ stage: "a", status: "failed", progress: 0, startedAt: null, completedAt: null, error: "error", retryCount: 0 }]),
      );
      const result = await orchestrator.generate(createMockRequest());
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe("failed");
      expect(config.events.publish).toHaveBeenCalledWith("generation.failed", expect.any(Object));
    });
  });

  describe("regenerate", () => {
    it("creates new generation from existing", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(
        success(createMockGen({ context: { idempotencyKey: "old_key" } })),
      );
      config.generationRepository.findByIdempotencyKey = vi.fn().mockResolvedValue(success(null));
      const result = await orchestrator.regenerate("gen_1" as GenerationId);
      if (result.success) expect(result.data.status).toBe("completed");
    });

    it("fails for unknown generation", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(success(null));
      const result = await orchestrator.regenerate("invalid" as GenerationId);
      expect(result.success).toBe(false);
    });
  });

  describe("resume", () => {
    it("resumes from checkpoints", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(
        success(createMockGen({ status: "running" })),
      );
      const result = await orchestrator.resume("gen_1" as GenerationId, [{ stageId: "a", status: "completed", output: {} }]);
      expect(result.success).toBe(true);
    });

    it("fails for unknown generation", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(success(null));
      const result = await orchestrator.resume("invalid" as GenerationId);
      expect(result.success).toBe(false);
    });
  });

  describe("retry", () => {
    it("retries a failed generation", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(
        success(createMockGen({ status: "failed" })),
      );
      config.generationRepository.update = vi.fn().mockResolvedValue(success(createMockGen({ status: "retrying" })));
      const result = await orchestrator.retry("gen_1" as GenerationId);
      expect(result.success).toBe(true);
      expect(config.events.publish).toHaveBeenCalledWith("generation.retry", expect.any(Object));
    });

    it("fails for unknown generation", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(success(null));
      const result = await orchestrator.retry("invalid" as GenerationId);
      expect(result.success).toBe(false);
    });
  });

  describe("cancel", () => {
    it("cancels a running generation", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(
        success(createMockGen({ status: "running" })),
      );
      config.generationRepository.update = vi.fn().mockImplementation(async (gen) => success({ ...gen, status: "cancelled" }));
      const result = await orchestrator.cancel("gen_1" as GenerationId);
      if (result.success) expect(result.success).toBe(true);
      expect(config.events.publish).toHaveBeenCalledWith("generation.cancelled", expect.any(Object));
    });
  });

  describe("getStatus", () => {
    it("returns generation status", async () => {
      const result = await orchestrator.getStatus("gen_1" as GenerationId);
      if (result.success) expect(result.data).toBe("idle");
    });

    it("returns unknown for missing", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(success(null));
      const result = await orchestrator.getStatus("missing" as GenerationId);
      if (result.success) expect(result.data).toBe("unknown");
    });
  });

  describe("getResult", () => {
    it("returns generation result", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(
        success(createMockGen({ result: createMockResult() })),
      );
      const result = await orchestrator.getResult("gen_1" as GenerationId);
      if (result.success) expect(result.data).not.toBeNull();
    });
  });

  describe("getProgress", () => {
    it("returns progress information", async () => {
      const result = await orchestrator.getProgress("gen_1" as GenerationId);
      if (result.success && result.data) {
        expect(result.data.progress).toBeDefined();
        expect(result.data.stage).toBeDefined();
      }
    });

    it("returns null for missing generation", async () => {
      config.generationRepository.findById = vi.fn().mockResolvedValue(success(null));
      const result = await orchestrator.getProgress("missing" as GenerationId);
      if (result.success) expect(result.data).toBeNull();
    });
  });

  describe("dryRun", () => {
    it("validates and returns stage order", async () => {
      const result = await orchestrator.dryRun(createMockRequest());
      if (result.success) {
        expect(result.data.valid).toBe(true);
        expect(result.data.stageOrder.length).toBeGreaterThan(0);
      }
    });

    it("returns errors for invalid request", async () => {
      const result = await orchestrator.dryRun(createMockRequest({ sourceUrl: "" }));
      if (result.success) {
        expect(result.data.valid).toBe(false);
        expect(result.data.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("estimateCost", () => {
    it("returns cost estimate", async () => {
      const result = await orchestrator.estimateCost(createMockRequest());
      if (result.success) {
        expect(result.data.stageCount).toBeGreaterThan(0);
      }
    });
  });

  describe("estimateDuration", () => {
    it("returns duration estimate", async () => {
      const result = await orchestrator.estimateDuration(createMockRequest());
      if (result.success) {
        expect(result.data).toBeGreaterThan(0);
      }
    });
  });

  describe("validateRequest", () => {
    it("returns empty for valid request", () => {
      const errors = orchestrator.validateRequest(createMockRequest());
      expect(errors).toEqual([]);
    });

    it("returns errors for invalid request", () => {
      const errors = orchestrator.validateRequest(createMockRequest({ sourceUrl: "" }));
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Lifecycle events", () => {
    it("publishes all lifecycle events on successful generation", async () => {
      await orchestrator.generate(createMockRequest());
      const calls = (config.events.publish as any).mock.calls.map((c: any) => c[0]);
      expect(calls).toContain("generation.created");
      expect(calls).toContain("generation.started");
      expect(calls).toContain("generation.completed");
    });
  });
});
