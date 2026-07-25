import type { JobId, QueueAdapter, LockProvider, EventPublisher } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";
import { RUNTIME_EVENTS } from "./runtime-events";

export class JobDispatcher {
  constructor(
    private queueAdapter: QueueAdapter,
    private lockProvider: LockProvider,
    private events: EventPublisher,
    private workerId: string,
    private queueName: string = "default",
  ) {}

  async claimJob() {
    const job = await this.queueAdapter.dequeue(this.queueName, this.workerId);
    if (!job.success) return job;
    if (!job.data) return success(null);

    await this.publishEvent(RUNTIME_EVENTS.JOB_CLAIMED, {
      workerId: this.workerId,
      jobId: job.data.id,
      queue: this.queueName,
      timestamp: new Date().toISOString(),
    });

    return success(job.data);
  }

  async completeJob(jobId: JobId) {
    const result = await this.queueAdapter.complete(jobId);
    if (!result.success) return result;

    await this.publishEvent(RUNTIME_EVENTS.JOB_COMPLETED, {
      workerId: this.workerId,
      jobId,
      durationMs: 0,
      timestamp: new Date().toISOString(),
    });

    return success(undefined);
  }

  async failJob(jobId: JobId, error: string) {
    const result = await this.queueAdapter.fail(jobId, error);
    if (!result.success) return result;

    await this.publishEvent(RUNTIME_EVENTS.JOB_FAILED, {
      workerId: this.workerId,
      jobId,
      error,
      attempt: 1,
      maxAttempts: 5,
      willRetry: false,
      timestamp: new Date().toISOString(),
    });

    return success(undefined);
  }

  async getQueueDepth() {
    return this.queueAdapter.getQueueDepth(this.queueName);
  }

  private async publishEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try { await this.events.publish(eventType, payload); } catch {}
  }
}
