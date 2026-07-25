import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { QueueAdapter, LockProvider, EventPublisher, MetricsCollector, PipelineRunner, GenerationJob, JobId } from "@/lib/generation/contracts";
import { success } from "@/lib/generation/infrastructure/helpers/result";
import { Worker } from "@/lib/generation/runtime/worker";
import type { WorkerConfig } from "@/lib/generation/runtime/worker";
import { WorkerPool } from "@/lib/generation/runtime/worker-pool";
import { JobDispatcher } from "@/lib/generation/runtime/job-dispatcher";
import { JobScheduler } from "@/lib/generation/runtime/job-scheduler";
import { JobRetryManager } from "@/lib/generation/runtime/job-retry-manager";
import { DeadLetterManager } from "@/lib/generation/runtime/dead-letter-manager";
import { Heartbeat } from "@/lib/generation/runtime/heartbeat";
import { WorkerHealth } from "@/lib/generation/runtime/worker-health";
import { QueueMonitor } from "@/lib/generation/runtime/queue-monitor";
import { RUNTIME_EVENTS } from "@/lib/generation/runtime/runtime-events";

function mockJob(overrides?: Partial<GenerationJob>): GenerationJob {
  return {
    id: "job_1" as JobId,
    generationId: "gen_1" as any,
    queue: "default",
    status: "queued",
    attempts: 0,
    maxAttempts: 3,
    priority: "normal" as any,
    scheduledAt: new Date(),
    startedAt: null,
    completedAt: null,
    error: null,
    workerId: null,
    checkpoint: null,
    ...overrides,
  };
}

function createMockQueueAdapter(): QueueAdapter {
  return {
    enqueue: vi.fn().mockResolvedValue(success("job_1" as JobId)),
    dequeue: vi.fn().mockResolvedValue(success(null)),
    complete: vi.fn().mockResolvedValue(success(undefined)),
    fail: vi.fn().mockResolvedValue(success(undefined)),
    progress: vi.fn().mockResolvedValue(success(undefined)),
    getStatus: vi.fn().mockResolvedValue(success("queued")),
    getDeadLetters: vi.fn().mockResolvedValue(success([])),
    requeue: vi.fn().mockResolvedValue(success(undefined)),
    getQueueDepth: vi.fn().mockResolvedValue(success(0)),
  };
}

// ===================== Runtime Events =====================
describe("Runtime Events", () => {
  it("has correct event type constants", () => {
    expect(RUNTIME_EVENTS.WORKER_STARTED).toBe("worker.started");
    expect(RUNTIME_EVENTS.WORKER_STOPPED).toBe("worker.stopped");
    expect(RUNTIME_EVENTS.WORKER_FAILED).toBe("worker.failed");
    expect(RUNTIME_EVENTS.WORKER_HEARTBEAT).toBe("worker.heartbeat");
    expect(RUNTIME_EVENTS.JOB_CLAIMED).toBe("job.claimed");
    expect(RUNTIME_EVENTS.JOB_COMPLETED).toBe("job.completed");
    expect(RUNTIME_EVENTS.JOB_FAILED).toBe("job.failed");
    expect(RUNTIME_EVENTS.JOB_RETRY).toBe("job.retry");
    expect(RUNTIME_EVENTS.JOB_DEAD_LETTER).toBe("job.deadletter");
  });
});

// ===================== Job Retry Manager =====================
describe("JobRetryManager", () => {
  let retry: JobRetryManager;

  beforeEach(() => {
    retry = new JobRetryManager(createMockQueueAdapter(), { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 4000 });
  });

  it("returns 0 attempts initially", () => {
    expect(retry.getAttempts("job_1" as JobId)).toBe(0);
  });

  it("increments attempts", () => {
    expect(retry.incrementAttempts("job_1" as JobId)).toBe(1);
    expect(retry.incrementAttempts("job_1" as JobId)).toBe(2);
  });

  it("canRetry returns true within limit", () => {
    retry.incrementAttempts("job_1" as JobId);
    retry.incrementAttempts("job_1" as JobId);
    expect(retry.canRetry("job_1" as JobId)).toBe(true);
  });

  it("canRetry returns false at limit", () => {
    retry.incrementAttempts("job_1" as JobId);
    retry.incrementAttempts("job_1" as JobId);
    retry.incrementAttempts("job_1" as JobId);
    expect(retry.canRetry("job_1" as JobId)).toBe(false);
  });

  it("calculates exponential backoff", () => {
    expect(retry.getNextDelay("job_1" as JobId)).toBe(1000);
    retry.incrementAttempts("job_1" as JobId);
    expect(retry.getNextDelay("job_1" as JobId)).toBe(1000);
    retry.incrementAttempts("job_1" as JobId);
    expect(retry.getNextDelay("job_1" as JobId)).toBe(2000);
    retry.incrementAttempts("job_1" as JobId);
    expect(retry.getNextDelay("job_1" as JobId)).toBe(4000);
  });

  it("caps delay at maxDelayMs", () => {
    retry.incrementAttempts("job_1" as JobId);
    retry.incrementAttempts("job_1" as JobId);
    retry.incrementAttempts("job_1" as JobId);
    expect(retry.getNextDelay("job_1" as JobId)).toBe(4000);
  });

  it("markDeadLetter removes attempt tracking", async () => {
    retry.incrementAttempts("job_1" as JobId);
    await retry.markDeadLetter("job_1" as JobId, "error");
    expect(retry.getAttempts("job_1" as JobId)).toBe(0);
  });

  it("resetAttempts clears attempts", async () => {
    retry.incrementAttempts("job_1" as JobId);
    await retry.resetAttempts("job_1" as JobId);
    expect(retry.getAttempts("job_1" as JobId)).toBe(0);
  });

  it("clear removes all attempts", () => {
    retry.incrementAttempts("job_1" as JobId);
    retry.incrementAttempts("job_2" as JobId);
    retry.clear();
    expect(retry.getAttempts("job_1" as JobId)).toBe(0);
    expect(retry.getAttempts("job_2" as JobId)).toBe(0);
  });
});

// ===================== Dead Letter Manager =====================
describe("DeadLetterManager", () => {
  let manager: DeadLetterManager;
  let queueAdapter: QueueAdapter;

  beforeEach(() => {
    queueAdapter = createMockQueueAdapter();
    manager = new DeadLetterManager(queueAdapter);
  });

  it("lists dead letters", async () => {
    queueAdapter.getDeadLetters = vi.fn().mockResolvedValue(success([mockJob({ error: "fail" })]));
    const result = await manager.list("default");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
  });

  it("replays a dead letter", async () => {
    queueAdapter.requeue = vi.fn().mockResolvedValue(success(undefined));
    const result = await manager.replay("job_1" as JobId);
    expect(result.success).toBe(true);
    expect(queueAdapter.requeue).toHaveBeenCalledWith("job_1");
  });

  it("deletes a dead letter", async () => {
    queueAdapter.complete = vi.fn().mockResolvedValue(success(undefined));
    const result = await manager.delete("job_1" as JobId);
    expect(result.success).toBe(true);
  });

  it("restores a dead letter", async () => {
    queueAdapter.requeue = vi.fn().mockResolvedValue(success(undefined));
    const result = await manager.restore("job_1" as JobId);
    expect(result.success).toBe(true);
  });

  it("inspects a specific dead letter", async () => {
    const job = mockJob({ id: "job_1" as JobId, error: "fail" });
    queueAdapter.getDeadLetters = vi.fn().mockResolvedValue(success([job]));
    const result = await manager.inspect("job_1" as JobId, "default");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toBeNull();
  });

  it("returns null inspecting unknown job", async () => {
    queueAdapter.getDeadLetters = vi.fn().mockResolvedValue(success([mockJob()]));
    const result = await manager.inspect("unknown" as JobId, "default");
    if (result.success) expect(result.data).toBeNull();
  });

  it("counts dead letters", async () => {
    queueAdapter.getDeadLetters = vi.fn().mockResolvedValue(success([mockJob(), mockJob()]));
    const result = await manager.count("default");
    if (result.success) expect(result.data).toBe(2);
  });
});

// ===================== Heartbeat =====================
describe("Heartbeat", () => {
  let heartbeat: Heartbeat;
  let events: EventPublisher;

  beforeEach(() => {
    vi.useFakeTimers();
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    heartbeat = new Heartbeat(
      { acquire: vi.fn(), release: vi.fn(), isLocked: vi.fn() } as any,
      events,
      { intervalMs: 100, expiryMs: 500 },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts heartbeat for a job", () => {
    heartbeat.start("worker1", "job_1" as JobId);
    expect(heartbeat.activeCount).toBe(1);
    heartbeat.stop("job_1" as JobId);
  });

  it("stops heartbeat for a job", () => {
    heartbeat.start("worker1", "job_1" as JobId);
    heartbeat.stop("job_1" as JobId);
    expect(heartbeat.activeCount).toBe(0);
  });

  it("publishes heartbeat events", () => {
    heartbeat.start("worker1", "job_1" as JobId);
    vi.advanceTimersByTime(200);
    expect(events.publish).toHaveBeenCalled();
    heartbeat.stop("job_1" as JobId);
  });

  it("reports expiry correctly", () => {
    heartbeat.start("worker1", "job_1" as JobId);
    expect(heartbeat.isExpired("job_1" as JobId)).toBe(false);
    heartbeat.stop("job_1" as JobId);
    expect(heartbeat.isExpired("job_1" as JobId)).toBe(true);
  });

  it("returns true for expired unknown job", () => {
    expect(heartbeat.isExpired("unknown" as JobId)).toBe(true);
  });

  it("stopAll clears all heartbeats", () => {
    heartbeat.start("w1", "j1" as JobId);
    heartbeat.start("w1", "j2" as JobId);
    heartbeat.stopAll();
    expect(heartbeat.activeCount).toBe(0);
  });

  it("getLastHeartbeat returns timestamp", () => {
    heartbeat.start("w1", "j1" as JobId);
    expect(heartbeat.getLastHeartbeat("j1" as JobId)).not.toBeNull();
    heartbeat.stop("j1" as JobId);
  });

  it("getLastHeartbeat returns null for unknown", () => {
    expect(heartbeat.getLastHeartbeat("unknown" as JobId)).toBeNull();
  });
});

// ===================== Job Scheduler =====================
describe("JobScheduler", () => {
  let scheduler: JobScheduler;
  let queueAdapter: QueueAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    queueAdapter = createMockQueueAdapter();
    scheduler = new JobScheduler(queueAdapter, { publish: vi.fn() } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules immediate job", async () => {
    const result = await scheduler.scheduleImmediate(mockJob());
    expect(result.success).toBe(true);
    expect(queueAdapter.enqueue).toHaveBeenCalled();
  });

  it("schedules delayed job", async () => {
    const result = await scheduler.scheduleDelayed(mockJob(), 1000);
    expect(result.success).toBe(true);
    expect(scheduler.scheduledCount).toBe(1);
    expect(scheduler.delayedCount).toBe(1);
  });

  it("cancels a scheduled job", async () => {
    await scheduler.scheduleDelayed(mockJob(), 1000);
    await scheduler.cancel("job_1" as JobId);
    expect(scheduler.scheduledCount).toBe(0);
    expect(scheduler.delayedCount).toBe(0);
  });

  it("isScheduled returns correct state", async () => {
    expect(scheduler.isScheduled("job_1" as JobId)).toBe(false);
    await scheduler.scheduleDelayed(mockJob(), 1000);
    expect(scheduler.isScheduled("job_1" as JobId)).toBe(true);
  });

  it("cancelAll clears all schedules", async () => {
    await scheduler.scheduleDelayed(mockJob({ id: "j1" as JobId }), 1000);
    await scheduler.scheduleDelayed(mockJob({ id: "j2" as JobId }), 2000);
    scheduler.cancelAll();
    expect(scheduler.scheduledCount).toBe(0);
  });
});

// ===================== Job Dispatcher =====================
describe("JobDispatcher", () => {
  let dispatcher: JobDispatcher;
  let queueAdapter: QueueAdapter;
  let events: EventPublisher;

  beforeEach(() => {
    queueAdapter = createMockQueueAdapter();
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    dispatcher = new JobDispatcher(
      queueAdapter,
      { acquire: vi.fn(), release: vi.fn(), isLocked: vi.fn() } as any,
      events,
      "worker1",
      "default",
    );
  });

  it("claims a job from queue", async () => {
    queueAdapter.dequeue = vi.fn().mockResolvedValue(success(mockJob()));
    const result = await dispatcher.claimJob();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toBeNull();
  });

  it("returns null when no jobs available", async () => {
    const result = await dispatcher.claimJob();
    if (result.success) expect(result.data).toBeNull();
  });

  it("publishes job claimed event", async () => {
    queueAdapter.dequeue = vi.fn().mockResolvedValue(success(mockJob()));
    await dispatcher.claimJob();
    expect(events.publish).toHaveBeenCalledWith("job.claimed", expect.any(Object));
  });

  it("completes a job", async () => {
    await dispatcher.completeJob("job_1" as JobId);
    expect(queueAdapter.complete).toHaveBeenCalledWith("job_1");
  });

  it("fails a job", async () => {
    await dispatcher.failJob("job_1" as JobId, "error");
    expect(queueAdapter.fail).toHaveBeenCalledWith("job_1", "error");
  });

  it("gets queue depth", async () => {
    queueAdapter.getQueueDepth = vi.fn().mockResolvedValue(success(5));
    const result = await dispatcher.getQueueDepth();
    if (result.success) expect(result.data).toBe(5);
  });
});

// ===================== Worker =====================
describe("Worker", () => {
  let worker: Worker;
  let config: WorkerConfig;
  let events: EventPublisher;
  let metrics: MetricsCollector;
  let pipelineRunner: PipelineRunner;

  function createWorkerConfig(overrides?: Partial<WorkerConfig>): WorkerConfig {
    return {
      workerId: "test_worker",
      queue: "default",
      queueAdapter: createMockQueueAdapter(),
      lockProvider: { acquire: vi.fn(), release: vi.fn(), isLocked: vi.fn() } as any,
      events,
      metrics,
      pipelineRunner,
      pollIntervalMs: 50,
      heartbeatIntervalMs: 100,
      maxRetries: 3,
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    events = { publish: vi.fn().mockResolvedValue(success(undefined)) };
    metrics = { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() };
    pipelineRunner = { execute: vi.fn().mockResolvedValue(success([])) };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle state", () => {
    worker = new Worker(createWorkerConfig());
    expect(worker.state).toBe("idle");
  });

  it("transitions to polling on start", async () => {
    worker = new Worker(createWorkerConfig());
    await worker.start();
    expect(worker.state).toBe("polling");
    await worker.stop();
  });

  it("publishes worker started event", async () => {
    worker = new Worker(createWorkerConfig());
    await worker.start();
    expect(events.publish).toHaveBeenCalledWith("worker.started", expect.any(Object));
    await worker.stop();
  });

  it("transitions to stopped on stop", async () => {
    worker = new Worker(createWorkerConfig());
    await worker.start();
    await worker.stop();
    expect(worker.state).toBe("stopped");
  });

  it("publishes worker stopped event", async () => {
    worker = new Worker(createWorkerConfig());
    await worker.start();
    await worker.stop();
    expect(events.publish).toHaveBeenCalledWith("worker.stopped", expect.any(Object));
  });

  it("processes a claimed job", async () => {
    const qa = createMockQueueAdapter();
    qa.dequeue = vi.fn()
      .mockResolvedValueOnce(success(mockJob()))
      .mockResolvedValue(success(null));
    worker = new Worker(createWorkerConfig({ queueAdapter: qa }));
    await worker.start();
    await vi.advanceTimersByTimeAsync(150);
    expect(worker.jobsProcessed).toBe(1);
    await worker.stop();
  });

  it("moves job to dead letter after max retries", async () => {
    const qa = createMockQueueAdapter();
    qa.dequeue = vi.fn().mockResolvedValue(success(mockJob()));
    pipelineRunner.execute = vi.fn().mockResolvedValue({ success: false, error: new Error("fail") });
    worker = new Worker(createWorkerConfig({ queueAdapter: qa, maxRetries: 1 }));
    await worker.start();
    await vi.advanceTimersByTimeAsync(500);
    expect(events.publish).toHaveBeenCalledWith("job.deadletter", expect.any(Object));
    await worker.stop();
  });

  it("pauses and resumes polling", async () => {
    worker = new Worker(createWorkerConfig({ pollIntervalMs: 1000 }));
    await worker.start();
    worker.pause();
    expect(worker.state).toBe("paused");
    worker.resume();
    expect(worker.state).toBe("polling");
    await worker.stop();
  });

  it("does not start twice", async () => {
    worker = new Worker(createWorkerConfig());
    await worker.start();
    const eventsCount = (events.publish as any).mock.calls.length;
    await worker.start();
    expect((events.publish as any).mock.calls.length).toBe(eventsCount);
    await worker.stop();
  });
});

// ===================== Worker Pool =====================
describe("WorkerPool", () => {
  let pool: WorkerPool;

  afterEach(async () => {
    await pool.stop();
  });

  it("initializes with min workers", async () => {
    pool = new WorkerPool({
      minWorkers: 3,
      maxWorkers: 10,
      workerFactory: (id) => new Worker({
        workerId: id,
        queue: "default",
        queueAdapter: createMockQueueAdapter(),
        lockProvider: { acquire: vi.fn(), release: vi.fn(), isLocked: vi.fn() } as any,
        events: { publish: vi.fn() } as any,
        metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() },
        pipelineRunner: { execute: vi.fn() } as any,
        pollIntervalMs: 5000,
      }),
    });
    await pool.initialize();
    expect(pool.workerCount).toBe(3);
  });

  it("scales up", async () => {
    pool = new WorkerPool({
      minWorkers: 1, maxWorkers: 5,
      workerFactory: (id) => new Worker({ workerId: id, queue: "default", queueAdapter: createMockQueueAdapter(), lockProvider: {} as any, events: { publish: vi.fn() } as any, metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() }, pipelineRunner: { execute: vi.fn() } as any, pollIntervalMs: 5000 }),
    });
    await pool.initialize();
    pool.scaleTo(4);
    expect(pool.workerCount).toBe(4);
  });

  it("scales down", async () => {
    pool = new WorkerPool({
      minWorkers: 5, maxWorkers: 10,
      workerFactory: (id) => new Worker({ workerId: id, queue: "default", queueAdapter: createMockQueueAdapter(), lockProvider: {} as any, events: { publish: vi.fn() } as any, metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() }, pipelineRunner: { execute: vi.fn() } as any, pollIntervalMs: 5000 }),
    });
    await pool.initialize();
    pool.scaleTo(2);
    expect(pool.workerCount).toBe(2);
  });

  it("getStats returns pool statistics", async () => {
    pool = new WorkerPool({
      minWorkers: 2, maxWorkers: 5,
      workerFactory: (id) => new Worker({ workerId: id, queue: "default", queueAdapter: createMockQueueAdapter(), lockProvider: {} as any, events: { publish: vi.fn() } as any, metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() }, pipelineRunner: { execute: vi.fn() } as any, pollIntervalMs: 5000 }),
    });
    await pool.initialize();
    const stats = pool.getStats();
    expect(stats.totalWorkers).toBe(2);
    expect(stats.states.idle).toBe(2);
  });

  it("getWorker returns worker by id", async () => {
    pool = new WorkerPool({
      minWorkers: 1, maxWorkers: 2,
      workerFactory: (id) => new Worker({ workerId: id, queue: "default", queueAdapter: createMockQueueAdapter(), lockProvider: {} as any, events: { publish: vi.fn() } as any, metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() }, pipelineRunner: { execute: vi.fn() } as any, pollIntervalMs: 5000 }),
    });
    await pool.initialize();
    const w = pool.getWorker("worker_0");
    expect(w).toBeDefined();
    expect(pool.getWorker("nonexistent")).toBeUndefined();
  });
});

// ===================== Worker Health =====================
describe("WorkerHealth", () => {
  it("reports healthy when no failed workers", async () => {
    const pool = new WorkerPool({
      minWorkers: 1, maxWorkers: 2,
      workerFactory: (id) => new Worker({ workerId: id, queue: "default", queueAdapter: createMockQueueAdapter(), lockProvider: {} as any, events: { publish: vi.fn() } as any, metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() }, pipelineRunner: { execute: vi.fn() } as any, pollIntervalMs: 5000 }),
    });
    await pool.initialize();
    const health = new WorkerHealth(pool);
    const status = health.check();
    expect(status.healthy).toBe(true);
  });

  it("isHealthy returns boolean", () => {
    const pool = new WorkerPool({
      minWorkers: 1, maxWorkers: 2,
      workerFactory: (id) => new Worker({ workerId: id, queue: "default", queueAdapter: createMockQueueAdapter(), lockProvider: {} as any, events: { publish: vi.fn() } as any, metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() }, pipelineRunner: { execute: vi.fn() } as any, pollIntervalMs: 5000 }),
    });
    const health = new WorkerHealth(pool);
    expect(typeof health.isHealthy()).toBe("boolean");
  });
});

// ===================== Queue Monitor =====================
describe("QueueMonitor", () => {
  it("captures queue snapshot", async () => {
    const queueAdapter = createMockQueueAdapter();
    queueAdapter.getQueueDepth = vi.fn().mockResolvedValue(success(5));
    const pool = new WorkerPool({
      minWorkers: 2, maxWorkers: 5,
      workerFactory: (id) => new Worker({ workerId: id, queue: "default", queueAdapter: createMockQueueAdapter(), lockProvider: {} as any, events: { publish: vi.fn() } as any, metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() }, pipelineRunner: { execute: vi.fn() } as any, pollIntervalMs: 5000 }),
    });
    await pool.initialize();
    const monitor = new QueueMonitor(
      queueAdapter,
      pool,
      new DeadLetterManager(queueAdapter),
    );
    const stats = await monitor.snapshot();
    expect(stats.queueDepth).toBe(5);
    expect(stats.totalWorkers).toBe(2);
  });

  it("clears history", async () => {
    const queueAdapter = createMockQueueAdapter();
    const pool = new WorkerPool({
      minWorkers: 1, maxWorkers: 2,
      workerFactory: (id) => new Worker({ workerId: id, queue: "default", queueAdapter: createMockQueueAdapter(), lockProvider: {} as any, events: { publish: vi.fn() } as any, metrics: { increment: vi.fn(), histogram: vi.fn(), gauge: vi.fn() }, pipelineRunner: { execute: vi.fn() } as any, pollIntervalMs: 5000 }),
    });
    await pool.initialize();
    const monitor = new QueueMonitor(queueAdapter, pool, new DeadLetterManager(queueAdapter));
    await monitor.snapshot();
    monitor.clearHistory();
    const avg = await monitor.getAvgWaitTime();
    expect(avg).toBe(0);
  });
});
