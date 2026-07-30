import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";

export interface JobDefinition {
  id: string;
  name: string;
  intervalMs: number;
  execute: () => Promise<void>;
  lastRunAt: number | null;
  running: boolean;
}

export class JobRunner {
  private jobs: JobDefinition[] = [];
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private started = false;

  register(job: Omit<JobDefinition, "lastRunAt" | "running">): void {
    if (this.jobs.find((j) => j.id === job.id)) return;
    this.jobs.push({ ...job, lastRunAt: null, running: false });
    logger.info(`Registered: ${job.name} (every ${job.intervalMs}ms)`, "job-runner");
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const job of this.jobs) {
      this.scheduleJob(job);
    }
    logger.info(`Started ${this.jobs.length} job(s)`, "job-runner");
  }

  stop(): void {
    const entries = Array.from(this.timers.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, timer] = entries[i];
      clearInterval(timer);
      logger.info(`Stopped: ${id}`, "job-runner");
    }
    this.timers.clear();
    this.started = false;
  }

  async runOnce(jobId: string): Promise<boolean> {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;
    if (job.running) return false;
    return this.executeJob(job);
  }

  getStatus(): Array<{ id: string; name: string; lastRunAt: number | null; running: boolean; intervalMs: number }> {
    return this.jobs.map((j) => ({ id: j.id, name: j.name, lastRunAt: j.lastRunAt, running: j.running, intervalMs: j.intervalMs }));
  }

  private scheduleJob(job: JobDefinition): void {
    const timer = setInterval(async () => {
      await this.executeJob(job);
    }, job.intervalMs);
    this.timers.set(job.id, timer);
  }

  private async executeJob(job: JobDefinition): Promise<boolean> {
    if (job.running) return false;
    job.running = true;
    try {
      await job.execute();
      job.lastRunAt = Date.now();
      return true;
    } catch (err) {
      captureError(err, { service: "job-runner", operation: `execute:${job.name}` });
      return false;
    } finally {
      job.running = false;
    }
  }
}

export const jobRunner = new JobRunner();
