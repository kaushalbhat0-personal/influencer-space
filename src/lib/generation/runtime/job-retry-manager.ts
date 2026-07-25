import type { JobId, QueueAdapter } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export class JobRetryManager {
  private attempts = new Map<JobId, number>();

  constructor(
    private queueAdapter: QueueAdapter,
    private config: RetryConfig = { maxAttempts: 5, baseDelayMs: 1000, maxDelayMs: 16000 },
  ) {}

  getAttempts(jobId: JobId): number {
    return this.attempts.get(jobId) ?? 0;
  }

  incrementAttempts(jobId: JobId): number {
    const current = (this.attempts.get(jobId) ?? 0) + 1;
    this.attempts.set(jobId, current);
    return current;
  }

  canRetry(jobId: JobId): boolean {
    return this.getAttempts(jobId) < this.config.maxAttempts;
  }

  getNextDelay(jobId: JobId): number {
    const attempt = this.getAttempts(jobId);
    const delay = Math.min(this.config.baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)), this.config.maxDelayMs);
    return delay;
  }

  async markFailed(jobId: JobId, error: string) {
    await this.queueAdapter.fail(jobId, error);
    return success(undefined);
  }

  async markDeadLetter(jobId: JobId, error: string) {
    await this.queueAdapter.fail(jobId, error);
    this.attempts.delete(jobId);
    return success(undefined);
  }

  async resetAttempts(jobId: JobId) {
    this.attempts.delete(jobId);
    return success(undefined);
  }

  clear(): void {
    this.attempts.clear();
  }
}
