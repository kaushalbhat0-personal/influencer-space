import type { Worker, WorkerState } from "./worker";

export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  workerFactory: (id: string) => Worker;
}

export interface PoolStats {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  states: Record<WorkerState, number>;
  totalJobsProcessed: number;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private config: WorkerPoolConfig;

  constructor(config: WorkerPoolConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.config.minWorkers; i++) {
      const worker = this.config.workerFactory(`worker_${i}`);
      this.workers.push(worker);
    }
  }

  async start(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.start()));
  }

  async stop(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.stop()));
  }

  scaleTo(count: number): void {
    const currentCount = this.workers.length;
    if (count > currentCount) {
      for (let i = currentCount; i < count; i++) {
        const worker = this.config.workerFactory(`worker_${i}`);
        this.workers.push(worker);
        worker.start();
      }
    } else if (count < currentCount) {
      const toRemove = this.workers.splice(count);
      toRemove.forEach((w) => w.stop());
    }
  }

  getWorker(id: string): Worker | undefined {
    return this.workers.find((w) => w.workerId === id);
  }

  getStats(): PoolStats {
    const states: Record<WorkerState, number> = {
      idle: 0, polling: 0, executing: 0, retrying: 0,
      paused: 0, stopping: 0, stopped: 0, failed: 0,
    };
    let totalJobsProcessed = 0;

    for (const w of this.workers) {
      states[w.state] = (states[w.state] ?? 0) + 1;
      totalJobsProcessed += w.jobsProcessed;
    }

    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.workers.filter((w) => w.state === "executing" || w.state === "polling").length,
      idleWorkers: this.workers.filter((w) => w.state === "idle").length,
      states,
      totalJobsProcessed,
    };
  }

  get workerCount(): number {
    return this.workers.length;
  }
}
