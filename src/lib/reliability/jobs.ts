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
    console.log(`[JobRunner] Registered: ${job.name} (every ${job.intervalMs}ms)`);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const job of this.jobs) {
      this.scheduleJob(job);
    }
    console.log(`[JobRunner] Started ${this.jobs.length} job(s)`);
  }

  stop(): void {
    const entries = Array.from(this.timers.entries());
    for (let i = 0; i < entries.length; i++) {
      const [id, timer] = entries[i];
      clearInterval(timer);
      console.log(`[JobRunner] Stopped: ${id}`);
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
      console.error(`[JobRunner] Job "${job.name}" failed:`, err);
      return false;
    } finally {
      job.running = false;
    }
  }
}

export const jobRunner = new JobRunner();
