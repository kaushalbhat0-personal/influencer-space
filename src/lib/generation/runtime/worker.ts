import type {
  GenerationJob, QueueAdapter, LockProvider, EventPublisher,
  MetricsCollector, PipelineRunner, GenerationContext,
} from "@/lib/generation/contracts";
import { JobDispatcher } from "./job-dispatcher";
import { Heartbeat } from "./heartbeat";
import { JobRetryManager } from "./job-retry-manager";
import { RUNTIME_EVENTS } from "./runtime-events";

export type WorkerState = "idle" | "polling" | "executing" | "retrying" | "paused" | "stopping" | "stopped" | "failed";

export interface WorkerConfig {
  workerId: string;
  queue: string;
  queueAdapter: QueueAdapter;
  lockProvider: LockProvider;
  events: EventPublisher;
  metrics: MetricsCollector;
  pipelineRunner: PipelineRunner;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  maxRetries?: number;
}

export class Worker {
  state: WorkerState = "idle";
  currentJob: GenerationJob | null = null;
  jobsProcessed = 0;
  readonly workerId: string;

  private dispatcher: JobDispatcher;
  private heartbeat: Heartbeat;
  private retryManager: JobRetryManager;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private config: WorkerConfig;

  constructor(config: WorkerConfig) {
    this.config = config;
    this.workerId = config.workerId;
    this.dispatcher = new JobDispatcher(
      config.queueAdapter,
      config.lockProvider,
      config.events,
      config.workerId,
      config.queue,
    );
    this.heartbeat = new Heartbeat(config.lockProvider, config.events, {
      intervalMs: config.heartbeatIntervalMs ?? 15000,
      expiryMs: 60000,
    });
    this.retryManager = new JobRetryManager(config.queueAdapter, {
      maxAttempts: config.maxRetries ?? 5,
      baseDelayMs: 1000,
      maxDelayMs: 16000,
    });
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.state = "polling";

    await this.publishEvent(RUNTIME_EVENTS.WORKER_STARTED, {
      workerId: this.workerId,
      timestamp: new Date().toISOString(),
    });

    this.poll();
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.state = "stopping";
    this.running = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.currentJob) {
      this.heartbeat.stop(this.currentJob.id);
    }

    this.heartbeat.stopAll();
    this.state = "stopped";

    await this.publishEvent(RUNTIME_EVENTS.WORKER_STOPPED, {
      workerId: this.workerId,
      reason: "Worker stopped",
      jobsProcessed: this.jobsProcessed,
      timestamp: new Date().toISOString(),
    });
  }

  pause(): void {
    if (this.state === "polling" || this.state === "idle") {
      this.state = "paused";
      if (this.pollTimer) {
        clearTimeout(this.pollTimer);
        this.pollTimer = null;
      }
    }
  }

  resume(): void {
    if (this.state === "paused") {
      this.state = "polling";
      this.poll();
    }
  }

  private poll(): void {
    if (!this.running || this.state === "stopping" || this.state === "paused") return;

    const interval = this.config.pollIntervalMs ?? 2000;
    this.pollTimer = setTimeout(async () => {
      if (!this.running) return;

      try {
        this.state = "polling";
        const jobResult = await this.dispatcher.claimJob();

        if (jobResult.success && jobResult.data) {
          this.currentJob = jobResult.data;
          await this.executeJob(jobResult.data);
        } else {
          this.state = "idle";
        }
      } catch (err) {
        this.state = "failed";
        await this.publishEvent(RUNTIME_EVENTS.WORKER_FAILED, {
          workerId: this.workerId,
          error: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        });
      }

      if (this.running) this.poll();
    }, interval);
  }

  private async executeJob(job: GenerationJob): Promise<void> {
    this.state = "executing";
    this.config.metrics.increment("worker.jobs.started", 1, { worker: this.workerId });

    this.heartbeat.start(this.workerId, job.id);
    const startTime = Date.now();

    try {
      const ctx: GenerationContext = {
        source: null,
        profile: null,
        strategy: job.priority === "critical" ? "elite" : "free",
        options: { mode: "full" },
        metadata: {
          jobId: job.id,
          generationId: job.generationId,
          workerId: this.workerId,
        },
      };

      const result = await this.config.pipelineRunner.execute([], ctx);
      const durationMs = Date.now() - startTime;

      this.heartbeat.stop(job.id);

      if (result.success) {
        await this.dispatcher.completeJob(job.id);
        this.jobsProcessed++;
        this.config.metrics.increment("worker.jobs.completed", 1, { worker: this.workerId });
        this.config.metrics.histogram("worker.job.duration", durationMs, { worker: this.workerId });
      } else {
        await this.handleJobFailure(job, result.error.message);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.heartbeat.stop(job.id);
      await this.handleJobFailure(job, error);
    }

    this.currentJob = null;
    this.state = "idle";
  }

  private async handleJobFailure(job: GenerationJob, error: string): Promise<void> {
    const attempt = this.retryManager.incrementAttempts(job.id);

    if (this.retryManager.canRetry(job.id)) {
      this.state = "retrying";
      const delay = this.retryManager.getNextDelay(job.id);

      await this.publishEvent(RUNTIME_EVENTS.JOB_RETRY, {
        workerId: this.workerId,
        jobId: job.id,
        attempt,
        nextDelayMs: delay,
        timestamp: new Date().toISOString(),
      });

      this.config.metrics.increment("worker.jobs.retry", 1, { worker: this.workerId });

      await this.sleep(delay);
    } else {
      await this.retryManager.markDeadLetter(job.id, error);
      this.config.metrics.increment("worker.jobs.deadletter", 1, { worker: this.workerId });

      await this.publishEvent(RUNTIME_EVENTS.JOB_DEAD_LETTER, {
        workerId: this.workerId,
        jobId: job.id,
        error,
        attempts: attempt,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try { await this.config.events.publish(eventType, payload); } catch {}
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
