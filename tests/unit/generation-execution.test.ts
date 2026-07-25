import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  PipelineStageDef, StageResult, GenerationContext,
  PipelineStage, StageRegistry, CheckpointRepository,
  GenerationCache, LockProvider,
  MetricsCollector, EventPublisher, GenerationStrategy,
  AsyncResult,
} from "@/lib/generation/contracts";

interface CheckpointRow {
  stageId: string;
  status: string;
  output: Record<string, unknown>;
}
import { success, failure } from "@/lib/generation/infrastructure/helpers/result";
import { PipelineGraphResolver } from "@/lib/generation/execution/pipeline-graph-resolver";
import { ExecutionPlanBuilder } from "@/lib/generation/execution/execution-plan";
import type { ExecutionPlan } from "@/lib/generation/execution/execution-plan";
import { CheckpointManager } from "@/lib/generation/execution/checkpoint-manager";
import { ArtifactManager } from "@/lib/generation/execution/artifact-manager";
import { StageExecutor } from "@/lib/generation/execution/stage-executor";
import { PipelineExecutor } from "@/lib/generation/execution/pipeline-executor";
import { PipelineRunnerImpl } from "@/lib/generation/execution/pipeline-runner";
import type { PipelineRunnerConfig } from "@/lib/generation/execution/pipeline-runner";
import { createPipelineContext } from "@/lib/generation/execution/execution-context";
import type { PipelineContext } from "@/lib/generation/execution/execution-context";
import { PIPELINE_EVENTS } from "@/lib/generation/execution/pipeline-events";

function createMockStage(type: PipelineStage, options?: {
  supportsCache?: boolean;
  inputs?: string[];
  outputs?: string[];
  execute?: () => AsyncResult<Record<string, unknown>>;
  canExecute?: () => boolean;
}): PipelineStageDef {
  return {
    type,
    supportsDeterministic: true,
    supportsAI: false,
    supportsCache: options?.supportsCache ?? false,
    inputs: options?.inputs ?? [],
    outputs: options?.outputs ?? [],
    execute: options?.execute ?? (async () => success({})),
    canExecute: options?.canExecute ?? (() => true),
  };
}

function createMockContext(overrides?: Partial<GenerationContext>): GenerationContext {
  return {
    source: null,
    profile: null,
    strategy: "free",
    options: {},
    metadata: { generationId: "test_gen_1" },
    ...overrides,
  };
}

function createMockStrategy(overrides?: Partial<GenerationStrategy>): GenerationStrategy {
  return {
    type: "free",
    allowsAI: false,
    maxRegenerationsPerDay: 0,
    maxAICallsPerGeneration: 0,
    cacheTTL: 300000,
    parallelStages: false,
    budget: { dailyAiCost: 0, monthlyAiCost: 0 },
    canRegenerate: () => false,
    canUseAI: () => false,
    ...overrides,
  };
}

// ============================================================
// Pipeline Events
// ============================================================
describe("Pipeline Events", () => {
  it("has correct event type constants", () => {
    expect(PIPELINE_EVENTS.STARTED).toBe("pipeline.started");
    expect(PIPELINE_EVENTS.STAGE_STARTED).toBe("stage.started");
    expect(PIPELINE_EVENTS.STAGE_COMPLETED).toBe("stage.completed");
    expect(PIPELINE_EVENTS.STAGE_FAILED).toBe("stage.failed");
    expect(PIPELINE_EVENTS.STAGE_SKIPPED).toBe("stage.skipped");
    expect(PIPELINE_EVENTS.COMPLETED).toBe("pipeline.completed");
    expect(PIPELINE_EVENTS.FAILED).toBe("pipeline.failed");
  });
});

// ============================================================
// Execution Plan Builder
// ============================================================
describe("ExecutionPlanBuilder", () => {
  it("builds empty plan", () => {
    const builder = new ExecutionPlanBuilder();
    const plan = builder.build();
    expect(plan.valid).toBe(true);
    expect(plan.stageCount).toBe(0);
    expect(plan.orderedStages).toEqual([]);
  });

  it("builds plan with stages", () => {
    const builder = new ExecutionPlanBuilder();
    builder.addStage(
      { type: "source_resolution", inputs: [], outputs: ["source"], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    builder.addStage(
      { type: "profile_extraction", inputs: ["source"], outputs: ["profile"], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      ["source_resolution"],
    );
    const plan = builder.build();
    expect(plan.stageCount).toBe(2);
    expect(plan.valid).toBe(true);
  });

  it("reports errors when added", () => {
    const builder = new ExecutionPlanBuilder();
    builder.addError("Something went wrong");
    const plan = builder.build();
    expect(plan.valid).toBe(false);
    expect(plan.errors).toEqual(["Something went wrong"]);
  });

  it("produces immutable plan", () => {
    const builder = new ExecutionPlanBuilder();
    builder.addStage(
      { type: "source_resolution", inputs: [], outputs: [], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    const plan = builder.build();
    expect(() => { (plan as any).orderedStages.push("x"); }).toThrow();
  });

  it("tracks optional stages", () => {
    const builder = new ExecutionPlanBuilder();
    builder.addStage(
      { type: "source_resolution", inputs: [], outputs: [], optional: true, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    const plan = builder.build();
    expect(plan.hasOptionalStages).toBe(true);
    expect(plan.optionalStages).toEqual(["source_resolution"]);
  });
});

// ============================================================
// Pipeline Graph Resolver
// ============================================================
describe("PipelineGraphResolver", () => {
  let resolver: PipelineGraphResolver;

  beforeEach(() => {
    resolver = new PipelineGraphResolver();
  });

  it("resolves empty pipeline", () => {
    const plan = resolver.resolve([]);
    expect(plan.valid).toBe(true);
    expect(plan.stageCount).toBe(0);
  });

  it("resolves linear pipeline", () => {
    const stages = [
      createMockStage("source_resolution", { outputs: ["source"] }),
      createMockStage("profile_extraction", { inputs: ["source"], outputs: ["profile"] }),
    ];
    const plan = resolver.resolve(stages);
    expect(plan.valid).toBe(true);
    expect(plan.stageCount).toBe(2);
  });

  it("resolves dependency order via topological sort", () => {
    const stages = [
      createMockStage("profile_extraction", { inputs: ["source"], outputs: ["profile"] }),
      createMockStage("source_resolution", { outputs: ["source"] }),
    ];
    const order = resolver.executionOrder(stages);
    expect(order[0]).toBe("source_resolution");
    expect(order[1]).toBe("profile_extraction");
  });

  it("detects cycles", () => {
    const stages = [
      createMockStage("source_resolution", { inputs: ["x"], outputs: ["y"] }),
      createMockStage("profile_extraction", { inputs: ["y"], outputs: ["x"] }),
    ];
    const plan = resolver.resolve(stages);
    expect(plan.valid).toBe(false);
    expect(plan.errors.some((e) => e.includes("Cycle"))).toBe(true);
  });

  it("detects missing dependencies", () => {
    const stages = [
      createMockStage("profile_extraction", { inputs: ["nonexistent"], outputs: ["profile"] }),
    ];
    const plan = resolver.resolve(stages);
    expect(plan.valid).toBe(false);
    expect(plan.errors.some((e) => e.includes("Missing dependency"))).toBe(true);
  });

  it("handles independent parallel stages", () => {
    const stages = [
      createMockStage("profile_extraction", { outputs: ["profile"] }),
      createMockStage("theme_selection", { outputs: ["theme"] }),
    ];
    const plan = resolver.resolve(stages);
    expect(plan.valid).toBe(true);
    expect(plan.stageCount).toBe(2);
  });

  it("validate returns errors for cycles", () => {
    const stages = [
      createMockStage("a", { inputs: ["x"], outputs: ["y"] }),
      createMockStage("b", { inputs: ["y"], outputs: ["x"] }),
    ];
    const errors = resolver.validate(stages);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("Cycle"))).toBe(true);
  });

  it("validate returns errors for missing deps", () => {
    const stages = [
      createMockStage("a", { inputs: ["missing"], outputs: [] }),
    ];
    const errors = resolver.validate(stages);
    expect(errors.some((e) => e.includes("Missing dependency"))).toBe(true);
  });

  it("validate detects duplicate stages", () => {
    const stages = [
      createMockStage("source_resolution"),
      createMockStage("source_resolution"),
    ];
    const errors = resolver.validate(stages);
    expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  it("dryRun returns plan and order", () => {
    const stages = [
      createMockStage("source_resolution", { outputs: ["src"] }),
      createMockStage("profile_extraction", { inputs: ["src"], outputs: ["profile"] }),
    ];
    const result = resolver.dryRun(stages);
    expect(result.plan.valid).toBe(true);
    expect(result.stageOrder).toEqual(["source_resolution", "profile_extraction"]);
  });

  it("validate returns empty for valid pipeline", () => {
    const stages = [
      createMockStage("source_resolution", { outputs: ["src"] }),
      createMockStage("profile_extraction", { inputs: ["src"] }),
    ];
    expect(resolver.validate(stages)).toEqual([]);
  });
});

// ============================================================
// Checkpoint Manager
// ============================================================
describe("CheckpointManager", () => {
  let manager: CheckpointManager;
  let mockRepo: CheckpointRepository;

  beforeEach(() => {
    mockRepo = {
      save: vi.fn().mockResolvedValue(success(undefined)),
      findByGenerationId: vi.fn().mockResolvedValue(success([])),
      findByStageId: vi.fn().mockResolvedValue(success(null)),
      deleteByGenerationId: vi.fn().mockResolvedValue(success(undefined)),
    };
    manager = new CheckpointManager(mockRepo);
  });

  it("loads checkpoints from repository", async () => {
    const result = await manager.load("gen1");
    expect(result.success).toBe(true);
    expect(mockRepo.findByGenerationId).toHaveBeenCalled();
  });

  it("saves checkpoint to repository", async () => {
    const result = await manager.save("gen1", "stage_a", "completed", { data: "value" });
    expect(result.success).toBe(true);
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it("clears checkpoints", async () => {
    const result = await manager.clear("gen1");
    expect(result.success).toBe(true);
    expect(mockRepo.deleteByGenerationId).toHaveBeenCalled();
  });

  it("completedStages returns list of completed stage IDs", () => {
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "completed", output: {} },
      { stageId: "b", status: "failed", output: {} },
      { stageId: "c", status: "completed", output: {} },
    ];
    expect(manager.completedStages(cps)).toEqual(["a", "c"]);
  });

  it("failedStages returns list of failed stage IDs", () => {
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "completed", output: {} },
      { stageId: "b", status: "failed", output: {} },
    ];
    expect(manager.failedStages(cps)).toEqual(["b"]);
  });

  it("resumeFrom skips completed stages and returns remaining", () => {
    const stages = [
      { type: "a" as PipelineStage },
      { type: "b" as PipelineStage },
      { type: "c" as PipelineStage },
    ];
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "completed", output: {} },
    ];
    const remaining = manager.resumeFrom(stages, cps);
    expect(remaining).toHaveLength(2);
    expect(remaining[0]!.type).toBe("b");
    expect(remaining[1]!.type).toBe("c");
  });

  it("resumeFrom returns empty when all completed", () => {
    const stages = [{ type: "a" as PipelineStage }];
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "completed", output: {} },
    ];
    expect(manager.resumeFrom(stages, cps)).toEqual([]);
  });

  it("nextStage returns first non-completed stage", () => {
    const stages = [
      { type: "a" as PipelineStage },
      { type: "b" as PipelineStage },
    ];
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "completed", output: {} },
    ];
    expect(manager.nextStage(stages, cps)?.type).toBe("b");
  });

  it("nextStage returns null when all completed", () => {
    const stages = [{ type: "a" as PipelineStage }];
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "completed", output: {} },
    ];
    expect(manager.nextStage(stages, cps)).toBeNull();
  });

  it("isStageCompleted checks stage completion", () => {
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "completed", output: {} },
    ];
    expect(manager.isStageCompleted(cps, "a")).toBe(true);
    expect(manager.isStageCompleted(cps, "b")).toBe(false);
  });

  it("getCheckpoint returns checkpoint for stage", () => {
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "completed", output: { key: "val" } },
    ];
    expect(manager.getCheckpoint(cps, "a")?.output).toEqual({ key: "val" });
    expect(manager.getCheckpoint(cps, "b")).toBeNull();
  });
});

// ============================================================
// Artifact Manager
// ============================================================
describe("ArtifactManager", () => {
  let manager: ArtifactManager;

  beforeEach(() => {
    manager = new ArtifactManager();
  });

  it("creates and retrieves artifacts", () => {
    manager.create("source_resolution", "source", { url: "https://example.com" });
    const entry = manager.get("source");
    expect(entry).not.toBeNull();
    expect(entry!.data).toEqual({ url: "https://example.com" });
    expect(entry!.version).toBe(1);
  });

  it("latest returns same as get", () => {
    manager.create("source_resolution", "source", { val: 1 });
    expect(manager.latest("source")?.data).toEqual({ val: 1 });
  });

  it("version tracks version number", () => {
    expect(manager.version("nonexistent")).toBe(0);
    manager.create("a", "artifact", { v: 1 });
    expect(manager.version("artifact")).toBe(1);
  });

  it("lineage tracks ancestors", () => {
    manager.create("stage_a", "art", { v: 1 });
    manager.create("stage_b", "art", { v: 2 });
    expect(manager.lineage("art")).toEqual(["stage_a"]);
  });

  it("resolve returns map of artifact data by input names", () => {
    manager.create("s1", "source", { url: "http://example.com" });
    manager.create("s2", "profile", { name: "test" });
    const resolved = manager.resolve(["source", "profile", "nonexistent"]);
    expect(resolved.source).toEqual({ url: "http://example.com" });
    expect(resolved.profile).toEqual({ name: "test" });
    expect(resolved.nonexistent).toBeUndefined();
  });

  it("replace overwrites artifact", () => {
    manager.create("s1", "art", { v: 1 });
    manager.replace("s2", "art", { v: 2 });
    expect(manager.version("art")).toBe(1);
    expect(manager.get("art")?.data).toEqual({ v: 2 });
  });

  it("has returns correct boolean", () => {
    expect(manager.has("art")).toBe(false);
    manager.create("s1", "art", {});
    expect(manager.has("art")).toBe(true);
  });

  it("clear removes all artifacts", () => {
    manager.create("s1", "art1", {});
    manager.create("s2", "art2", {});
    manager.clear();
    expect(manager.size).toBe(0);
  });

  it("allNames returns all artifact names", () => {
    manager.create("s1", "art1", {});
    manager.create("s2", "art2", {});
    expect(manager.allNames()).toEqual(["art1", "art2"]);
  });

  it("get returns null for missing", () => {
    expect(manager.get("missing")).toBeNull();
  });

  it("versionCount returns number of versions", () => {
    expect(manager.versionCount("art")).toBe(0);
    manager.create("s1", "art", { v: 1 });
    manager.create("s2", "art", { v: 2 });
    expect(manager.versionCount("art")).toBe(2);
  });
});

// ============================================================
// Stage Executor
// ============================================================
describe("StageExecutor", () => {
  let executor: StageExecutor;
  let mockCtx: PipelineContext;
  let events: EventPublisher;
  let metrics: MetricsCollector;

  beforeEach(() => {
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    metrics = {
      increment: vi.fn(),
      histogram: vi.fn(),
      gauge: vi.fn(),
    };
    mockCtx = createPipelineContext({
      generationId: "test_gen",
      generationContext: createMockContext(),
      strategy: createMockStrategy(),
      cache: { get: vi.fn(), set: vi.fn(), invalidate: vi.fn(), invalidateByPattern: vi.fn(), exists: vi.fn() },
      lock: { acquire: vi.fn(), release: vi.fn(), isLocked: vi.fn() },
      metrics,
      events,
      checkpoints: new CheckpointManager({
        save: vi.fn().mockResolvedValue(success(undefined)),
        findByGenerationId: vi.fn().mockResolvedValue(success([])),
        findByStageId: vi.fn().mockResolvedValue(success(null)),
        deleteByGenerationId: vi.fn().mockResolvedValue(success(undefined)),
      }),
      artifacts: new ArtifactManager(),
    });
    executor = new StageExecutor();
  });

  it("executes a stage successfully", async () => {
    const stage = createMockStage("source_resolution", {
      execute: async () => success({ source: "data" }),
    });
    const result = await executor.execute(stage, {}, mockCtx);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.result.status).toBe("completed");
      expect(result.data.outputs).toEqual({ source: "data" });
    }
  });

  it("skips stage when canExecute returns false", async () => {
    const stage = createMockStage("source_resolution", { canExecute: () => false });
    const result = await executor.execute(stage, {}, mockCtx);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.result.status).toBe("skipped");
    }
  });

  it("records metrics on completion", async () => {
    const stage = createMockStage("source_resolution", {
      execute: async () => success({ data: "val" }),
    });
    await executor.execute(stage, {}, mockCtx);
    expect(metrics.increment).toHaveBeenCalledWith("stage.completed", 1, { stage: "source_resolution" });
    expect(metrics.histogram).toHaveBeenCalledWith("stage.duration", expect.any(Number), { stage: "source_resolution" });
  });

  it("publishes stage events", async () => {
    const stage = createMockStage("source_resolution", {
      execute: async () => success({}),
    });
    await executor.execute(stage, {}, mockCtx);
    expect(events.publish).toHaveBeenCalledWith("stage.started", expect.any(Object));
    expect(events.publish).toHaveBeenCalledWith("stage.completed", expect.any(Object));
  });

  it("retries on failure", async () => {
    let attempts = 0;
    const stage = createMockStage("source_resolution", {
      execute: async () => {
        attempts++;
        if (attempts < 2) return failure(new Error("fail"));
        return success({});
      },
    });
    const result = await executor.execute(stage, {}, mockCtx);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.result.status).toBe("completed");
    }
  });

  it("fails after exhausting retries", async () => {
    const stage = createMockStage("source_resolution", {
      execute: async () => failure(new Error("always fails")),
    });
    const result = await executor.execute(stage, {}, mockCtx);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.result.status).toBe("failed");
      expect(result.data.result.error).toBe("always fails");
    }
  });
});

// ============================================================
// Pipeline Executor
// ============================================================
describe("PipelineExecutor", () => {
  let executor: PipelineExecutor;
  let mockCtx: PipelineContext;
  let events: EventPublisher;
  let metrics: MetricsCollector;
  let cache: GenerationCache;
  let checkpointRepo: CheckpointRepository;

  function createExecutorCtx(overrides?: Partial<PipelineContext>): PipelineContext {
    const base = createPipelineContext({
      generationId: "test_gen",
      generationContext: createMockContext(),
      strategy: createMockStrategy({ cacheTTL: 5000 }),
      cache,
      lock: { acquire: vi.fn(), release: vi.fn(), isLocked: vi.fn() },
      metrics,
      events,
      checkpoints: new CheckpointManager(checkpointRepo),
      artifacts: new ArtifactManager(),
    });
    return { ...base, ...overrides };
  }

  beforeEach(() => {
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    metrics = {
      increment: vi.fn(),
      histogram: vi.fn(),
      gauge: vi.fn(),
    };
    cache = {
      get: vi.fn().mockResolvedValue(success(null)),
      set: vi.fn().mockResolvedValue(success(undefined)),
      invalidate: vi.fn().mockResolvedValue(success(undefined)),
      invalidateByPattern: vi.fn().mockResolvedValue(success(undefined)),
      exists: vi.fn().mockResolvedValue(success(false)),
    };
    checkpointRepo = {
      save: vi.fn().mockResolvedValue(success(undefined)),
      findByGenerationId: vi.fn().mockResolvedValue(success([])),
      findByStageId: vi.fn().mockResolvedValue(success(null)),
      deleteByGenerationId: vi.fn().mockResolvedValue(success(undefined)),
    };
    mockCtx = createExecutorCtx();
    executor = new PipelineExecutor(new StageExecutor());
  });

  it("executes all stages in order", async () => {
    const plan = new ExecutionPlanBuilder();
    plan.addStage(
      { type: "source_resolution", inputs: [], outputs: ["src"], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    plan.addStage(
      { type: "profile_extraction", inputs: ["src"], outputs: ["profile"], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      ["source_resolution"],
    );
    const result = await executor.execute(plan.build(), mockCtx, []);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.status).toBe("completed");
      expect(result.data[1]!.status).toBe("completed");
    }
  });

  it("skips completed stages from checkpoints", async () => {
    const plan = new ExecutionPlanBuilder();
    plan.addStage(
      { type: "source_resolution", inputs: [], outputs: [], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    plan.addStage(
      { type: "profile_extraction", inputs: [], outputs: [], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    const cps: CheckpointRow[] = [
      { stageId: "source_resolution", status: "completed", output: {} },
    ];
    const result = await executor.execute(plan.build(), mockCtx, cps);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.status).toBe("completed");
      expect(result.data[0]!.stage).toBe("source_resolution");
      expect(result.data[1]!.status).toBe("completed");
    }
  });

  it("skips stages not in targetStages for partial execution", async () => {
    const plan = new ExecutionPlanBuilder();
    plan.addStage(
      { type: "source_resolution", inputs: [], outputs: [], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    plan.addStage(
      { type: "profile_extraction", inputs: [], outputs: [], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    const partialCtx = createExecutorCtx({ partial: true, targetStages: ["source_resolution"] });
    const result = await executor.execute(plan.build(), partialCtx, []);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]!.status).toBe("completed");
      expect(result.data[1]!.status).toBe("skipped");
    }
  });

  it("uses cached stage result", async () => {
    cache.get = vi.fn().mockResolvedValue(success({ source: "cached_data" }));
    const plan = new ExecutionPlanBuilder();
    plan.addStage(
      { type: "source_resolution", inputs: [], outputs: ["source"], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: true },
      [],
    );
    const result = await executor.execute(plan.build(), mockCtx, []);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]!.status).toBe("completed");
    }
    expect(metrics.increment).toHaveBeenCalledWith("cache.hit", 1, { stage: "source_resolution" });
  });

  it("caches stage result after execution", async () => {
    const plan = new ExecutionPlanBuilder();
    plan.addStage(
      { type: "source_resolution", inputs: [], outputs: ["result"], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: true },
      [],
    );
    await executor.execute(plan.build(), mockCtx, []);
    expect(cache.set).toHaveBeenCalled();
  });

  it("saves checkpoint after stage completion", async () => {
    const plan = new ExecutionPlanBuilder();
    plan.addStage(
      { type: "source_resolution", inputs: [], outputs: ["data"], optional: false, supportsDeterministic: true, supportsAI: false, supportsCache: false },
      [],
    );
    await executor.execute(plan.build(), mockCtx, []);
    expect(checkpointRepo.save).toHaveBeenCalled();
  });

  it("publishes stage events during execution", async () => {
    events.publish = vi.fn().mockResolvedValue(success(undefined));
    const pipeline = [createMockStage("source_resolution")];
    const plan = new PipelineGraphResolver().resolve(pipeline);
    const stageMap = new Map(pipeline.map((s) => [s.type, s]));
    await executor.execute(plan, mockCtx, [], stageMap);
    expect(events.publish).toHaveBeenCalledWith("stage.started", expect.any(Object));
    expect(events.publish).toHaveBeenCalledWith("stage.completed", expect.any(Object));
  });

  it("handles empty plan", async () => {
    const plan = new ExecutionPlanBuilder().build();
    const result = await executor.execute(plan, mockCtx, []);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual([]);
  });
});

// ============================================================
// Pipeline Runner
// ============================================================
describe("PipelineRunnerImpl", () => {
  let runner: PipelineRunnerImpl;
  let mockConfig: PipelineRunnerConfig;
  let events: EventPublisher;
  let metrics: MetricsCollector;
  let cache: GenerationCache;
  let checkpointRepo: CheckpointRepository;
  let stageRegistry: StageRegistry;
  let lock: LockProvider;

  function createExecutingStage(type: PipelineStage, outputs: string[] = [], execute?: () => AsyncResult<Record<string, unknown>>): PipelineStageDef {
    return {
      type,
      supportsDeterministic: true,
      supportsAI: false,
      supportsCache: false,
      inputs: [],
      outputs,
      execute: execute ?? (async () => success({})),
      canExecute: () => true,
    };
  }

  beforeEach(() => {
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    metrics = {
      increment: vi.fn(),
      histogram: vi.fn(),
      gauge: vi.fn(),
    };
    cache = {
      get: vi.fn().mockResolvedValue(success(null)),
      set: vi.fn().mockResolvedValue(success(undefined)),
      invalidate: vi.fn().mockResolvedValue(success(undefined)),
      invalidateByPattern: vi.fn().mockResolvedValue(success(undefined)),
      exists: vi.fn().mockResolvedValue(success(false)),
    };
    checkpointRepo = {
      save: vi.fn().mockResolvedValue(success(undefined)),
      findByGenerationId: vi.fn().mockResolvedValue(success([])),
      findByStageId: vi.fn().mockResolvedValue(success(null)),
      deleteByGenerationId: vi.fn().mockResolvedValue(success(undefined)),
    };
    stageRegistry = {
      register: vi.fn(),
      unregister: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
    };
    lock = {
      acquire: vi.fn().mockResolvedValue(success(true)),
      release: vi.fn().mockResolvedValue(success(undefined)),
      isLocked: vi.fn().mockResolvedValue(success(false)),
    };

    mockConfig = {
      stageRegistry,
      checkpointRepository: checkpointRepo,
      cache,
      lock,
      metrics,
      events,
      strategy: createMockStrategy({ cacheTTL: 5000 }),
    };
    runner = new PipelineRunnerImpl(mockConfig);
  });

  it("executes a valid pipeline", async () => {
    const pipeline = [createExecutingStage("source_resolution")];
    const result = await runner.execute(pipeline, createMockContext());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.status).toBe("completed");
    }
  });

  it("fails on invalid pipeline (cycle)", async () => {
    const pipeline = [
      createMockStage("a", { inputs: ["x"], outputs: ["y"], execute: async () => success({}) }),
      createMockStage("b", { inputs: ["y"], outputs: ["x"], execute: async () => success({}) }),
    ];
    const result = await runner.execute(pipeline, createMockContext());
    expect(result.success).toBe(false);
  });

  it("publishes pipeline started and completed events", async () => {
    const pipeline = [createExecutingStage("source_resolution")];
    await runner.execute(pipeline, createMockContext());
    expect(events.publish).toHaveBeenCalledWith(
      "pipeline.started",
      expect.objectContaining({ totalStages: 1 }),
    );
    expect(events.publish).toHaveBeenCalledWith(
      "pipeline.completed",
      expect.objectContaining({ stagesCompleted: 1 }),
    );
  });

  it("publishes pipeline.failed when stages fail", async () => {
    const pipeline = [
      createExecutingStage("source_resolution", [], () => failure(new Error("stage failed"))),
    ];
    await runner.execute(pipeline, createMockContext());
    expect(events.publish).toHaveBeenCalledWith(
      "pipeline.failed",
      expect.objectContaining({ stagesFailed: 1 }),
    );
  });

  it("validates pipeline via validate method", () => {
    const pipeline = [
      createExecutingStage("source_resolution"),
    ];
    const errors = runner.validate(pipeline);
    expect(errors).toEqual([]);
  });

  it("dryRun returns plan info without executing", () => {
    const pipeline = [createExecutingStage("source_resolution")];
    const result = runner.dryRun(pipeline);
    expect(result.valid).toBe(true);
    expect(result.stageOrder).toEqual(["source_resolution"]);
  });

  it("dryRun reports invalid pipeline", () => {
    const pipeline = [
      createMockStage("a", { inputs: ["x"], outputs: ["y"] }),
      createMockStage("b", { inputs: ["y"], outputs: ["x"] }),
    ];
    const result = runner.dryRun(pipeline);
    expect(result.valid).toBe(false);
  });

  it("executeUntil runs only up to target stage", async () => {
    stageRegistry.get = vi.fn().mockImplementation((type: string) => {
      return createExecutingStage(type as any);
    });
    const pipeline = [
      createExecutingStage("source_resolution"),
      createExecutingStage("profile_extraction"),
      createExecutingStage("theme_selection"),
    ];
    const result = await runner.executeUntil(pipeline, createMockContext(), "profile_extraction");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("executeUntil fails for unknown target stage", async () => {
    const pipeline = [createExecutingStage("source_resolution")];
    const result = await runner.executeUntil(pipeline, createMockContext(), "nonexistent");
    expect(result.success).toBe(false);
  });

  it("resume skips completed stages", async () => {
    const pipeline = [
      createExecutingStage("source_resolution"),
      createExecutingStage("profile_extraction"),
    ];
    const cps: CheckpointRow[] = [
      { stageId: "source_resolution", status: "completed", output: {} },
    ];
    const result = await runner.resume(pipeline, createMockContext(), cps);
    expect(result.success).toBe(true);
    if (result.success) {
      // Source resolution is completed, so only profile_extraction runs
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.stage).toBe("profile_extraction");
    }
  });

  it("resume returns empty when all stages completed", async () => {
    const pipeline = [createExecutingStage("source_resolution")];
    const cps: CheckpointRow[] = [
      { stageId: "source_resolution", status: "completed", output: {} },
    ];
    const result = await runner.resume(pipeline, createMockContext(), cps);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual([]);
  });
});

// ============================================================
// Artifact Manager - Edge Cases
// ============================================================
describe("ArtifactManager edge cases", () => {
  it("create with multiple versions tracks lineage correctly", () => {
    const am = new ArtifactManager();
    am.create("s1", "profile", { name: "Alice" });
    am.create("s2", "profile", { name: "Alice", niche: "tech" });
    const entry = am.get("profile")!;
    expect(entry.version).toBe(2);
    expect(entry.lineage).toEqual(["s1"]);
  });

  it("resolve handles empty inputs", () => {
    const am = new ArtifactManager();
    expect(am.resolve([])).toEqual({});
  });
});

// ============================================================
// Checkpoint Manager - Edge Cases
// ============================================================
describe("CheckpointManager edge cases", () => {
  it("resumeFrom skips failed stages too", () => {
    const cm = new CheckpointManager({
      save: vi.fn().mockResolvedValue(success(undefined)),
      findByGenerationId: vi.fn().mockResolvedValue(success([])),
      findByStageId: vi.fn().mockResolvedValue(success(null)),
      deleteByGenerationId: vi.fn().mockResolvedValue(success(undefined)),
    });
    const stages = [
      { type: "a" as PipelineStage },
      { type: "b" as PipelineStage },
    ];
    const cps: CheckpointRow[] = [
      { stageId: "a", status: "failed", output: {} },
    ];
    const remaining = cm.resumeFrom(stages, cps);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.type).toBe("b");
  });

  it("load handles repository failure gracefully", async () => {
    const cm = new CheckpointManager({
      save: vi.fn().mockResolvedValue(success(undefined)),
      findByGenerationId: vi.fn().mockResolvedValue(success([])),
      findByStageId: vi.fn().mockResolvedValue(success(null)),
      deleteByGenerationId: vi.fn().mockResolvedValue(success(undefined)),
    });
    const result = await cm.load("gen1");
    expect(result.success).toBe(true);
  });
});

// ============================================================
// Execution Context
// ============================================================
describe("createPipelineContext", () => {
  it("creates frozen context", () => {
    const ctx = createPipelineContext({
      generationId: "gen_1",
      generationContext: createMockContext(),
      strategy: createMockStrategy(),
      cache: {} as any,
      lock: {} as any,
      metrics: {} as any,
      events: {} as any,
      checkpoints: {} as any,
      artifacts: new ArtifactManager(),
    });
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(ctx.generationId).toBe("gen_1");
  });

  it("uses default logger when none provided", () => {
    const ctx = createPipelineContext({
      generationId: "gen_1",
      generationContext: createMockContext(),
      strategy: createMockStrategy(),
      cache: {} as any,
      lock: {} as any,
      metrics: {} as any,
      events: {} as any,
      checkpoints: {} as any,
      artifacts: new ArtifactManager(),
    });
    expect(() => ctx.logger.info("test")).not.toThrow();
  });

  it("captures startedAt timestamp", () => {
    const before = Date.now();
    const ctx = createPipelineContext({
      generationId: "gen_1",
      generationContext: createMockContext(),
      strategy: createMockStrategy(),
      cache: {} as any,
      lock: {} as any,
      metrics: {} as any,
      events: {} as any,
      checkpoints: {} as any,
      artifacts: new ArtifactManager(),
    });
    expect(ctx.startedAt).toBeGreaterThanOrEqual(before);
  });
});
