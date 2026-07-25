import type { GenerationJob, JobId, QueueAdapter, EventPublisher } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";

interface ScheduledJob {
  job: GenerationJob;
  timer: ReturnType<typeof setTimeout> | null;
  scheduledAt: Date;
}

export class JobScheduler {
  private scheduled = new Map<JobId, ScheduledJob>();
  private delayedTimers = new Map<JobId, ReturnType<typeof setTimeout>>();

  constructor(
    private queueAdapter: QueueAdapter,
    private events: EventPublisher,
  ) {}

  async scheduleImmediate(job: GenerationJob) {
    return this.queueAdapter.enqueue(job);
  }

  async scheduleDelayed(job: GenerationJob, delayMs: number) {
    const enqueueResult = await this.queueAdapter.enqueue(job);
    if (!enqueueResult.success) return enqueueResult;

    const timer = setTimeout(() => {
      this.delayedTimers.delete(job.id);
    }, delayMs);

    this.scheduled.set(job.id, { job, timer, scheduledAt: new Date(Date.now() + delayMs) });
    this.delayedTimers.set(job.id, timer);

    return enqueueResult;
  }

  async cancel(jobId: JobId) {
    const delayed = this.delayedTimers.get(jobId);
    if (delayed) {
      clearTimeout(delayed);
      this.delayedTimers.delete(jobId);
    }
    this.scheduled.delete(jobId);
    return success(undefined);
  }

  isScheduled(jobId: JobId): boolean {
    return this.scheduled.has(jobId);
  }

  cancelAll(): void {
    for (const jobId of Array.from(this.delayedTimers.keys())) this.cancel(jobId);
    this.scheduled.clear();
  }

  get scheduledCount(): number {
    return this.scheduled.size;
  }

  get delayedCount(): number {
    return this.delayedTimers.size;
  }
}
