import type { JobId, QueueAdapter, GenerationJob } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";

export interface DeadLetterEntry {
  job: GenerationJob;
  failedAt: string;
  error: string;
}

export class DeadLetterManager {
  constructor(private queueAdapter: QueueAdapter) {}

  async list(queue: string) {
    const result = await this.queueAdapter.getDeadLetters(queue);
    if (!result.success) return result;
    const jobs = result.data ?? [];
    return success(
      jobs.map((job) => ({
        job,
        failedAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
        error: job.error ?? "Unknown error",
      })),
    );
  }

  async replay(jobId: JobId) {
    return this.queueAdapter.requeue(jobId);
  }

  async delete(jobId: JobId) {
    return this.queueAdapter.complete(jobId);
  }

  async restore(jobId: JobId) {
    return this.queueAdapter.requeue(jobId);
  }

  async inspect(jobId: JobId, queue: string) {
    const result = await this.queueAdapter.getDeadLetters(queue);
    if (!result.success) return result;
    const jobs = result.data ?? [];
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return success(null);
    return success({
      job,
      failedAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
      error: job.error ?? "Unknown error",
    });
  }

  async count(queue: string) {
    const result = await this.queueAdapter.getDeadLetters(queue);
    if (!result.success) return success(0);
    return success((result.data ?? []).length);
  }
}
