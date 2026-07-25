import type { WorkerPool } from "./worker-pool";

export interface WorkerHealthStatus {
  healthy: boolean;
  totalWorkers: number;
  idleWorkers: number;
  failedWorkers: number;
  stoppedWorkers: number;
  activeWorkers: number;
  totalJobsProcessed: number;
  details: string[];
}

export class WorkerHealth {
  constructor(private pool: WorkerPool) {}

  check(): WorkerHealthStatus {
    const stats = this.pool.getStats();
    const details: string[] = [];

    if (stats.states.failed > 0) details.push(`${stats.states.failed} worker(s) in failed state`);

    const healthy = stats.states.failed === 0 && stats.totalWorkers > 0;

    if (stats.states.idle === stats.totalWorkers && stats.totalWorkers > 0) {
      details.push("All workers idle - no jobs in queue");
    }

    return {
      healthy,
      totalWorkers: stats.totalWorkers,
      idleWorkers: stats.idleWorkers,
      failedWorkers: stats.states.failed,
      stoppedWorkers: stats.states.stopped,
      activeWorkers: stats.activeWorkers,
      totalJobsProcessed: stats.totalJobsProcessed,
      details,
    };
  }

  isHealthy(): boolean {
    return this.check().healthy;
  }
}
