import type { QueueAdapter } from "@/lib/generation/contracts";
import type { WorkerPool } from "./worker-pool";
import type { DeadLetterManager } from "./dead-letter-manager";

export interface QueueStats {
  queueDepth: number;
  activeWorkers: number;
  idleWorkers: number;
  failedWorkers: number;
  deadLetterCount: number;
  workerUtilization: number;
  totalWorkers: number;
}

export class QueueMonitor {
  private history: Array<{ timestamp: number; queueDepth: number }> = [];

  constructor(
    private queueAdapter: QueueAdapter,
    private pool: WorkerPool,
    private deadLetterManager: DeadLetterManager,
  ) {}

  async snapshot(): Promise<QueueStats> {
    const poolStats = this.pool.getStats();
    const depthResult = await this.queueAdapter.getQueueDepth("default");
    const deadLetterResult = await this.deadLetterManager.count("default");

    const queueDepth = depthResult.success ? (depthResult.data ?? 0) : 0;
    const deadLetterCount = deadLetterResult.success ? (deadLetterResult.data ?? 0) : 0;

    this.history.push({ timestamp: Date.now(), queueDepth });
    if (this.history.length > 1000) this.history.shift();

    const activeWorkers = poolStats.activeWorkers;
    const totalWorkers = poolStats.totalWorkers;
    const workerUtilization = totalWorkers > 0 ? activeWorkers / totalWorkers : 0;

    return {
      queueDepth,
      activeWorkers,
      idleWorkers: poolStats.idleWorkers,
      failedWorkers: poolStats.states.failed,
      deadLetterCount,
      workerUtilization,
      totalWorkers,
    };
  }

  async getAvgWaitTime(): Promise<number> {
    if (this.history.length < 2) return 0;
    const total = this.history.reduce((sum, h) => sum + h.queueDepth, 0);
    return total / this.history.length;
  }

  clearHistory(): void {
    this.history = [];
  }
}
