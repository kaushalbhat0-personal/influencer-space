import type { JobId, LockProvider, EventPublisher } from "@/lib/generation/contracts";
import { RUNTIME_EVENTS } from "./runtime-events";
import type { WorkerHeartbeatPayload } from "./runtime-events";

export interface HeartbeatConfig {
  intervalMs: number;
  expiryMs: number;
}

export class Heartbeat {
  private timers = new Map<JobId, ReturnType<typeof setInterval>>();
  private lastHeartbeat = new Map<JobId, number>();

  constructor(
    private lockProvider: LockProvider,
    private events: EventPublisher,
    private config: HeartbeatConfig = { intervalMs: 15000, expiryMs: 60000 },
  ) {}

  start(workerId: string, jobId: JobId): void {
    this.stop(jobId);
    this.lastHeartbeat.set(jobId, Date.now());

    const timer = setInterval(async () => {
      this.lastHeartbeat.set(jobId, Date.now());
      await this.publishHeartbeat(workerId, jobId, "running");
    }, this.config.intervalMs);

    this.timers.set(jobId, timer);
  }

  stop(jobId: JobId): void {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(jobId);
    }
    this.lastHeartbeat.delete(jobId);
  }

  isExpired(jobId: JobId): boolean {
    const last = this.lastHeartbeat.get(jobId);
    if (!last) return true;
    return Date.now() - last > this.config.expiryMs;
  }

  getLastHeartbeat(jobId: JobId): number | null {
    return this.lastHeartbeat.get(jobId) ?? null;
  }

  stopAll(): void {
    for (const jobId of Array.from(this.timers.keys())) this.stop(jobId);
  }

  get activeCount(): number {
    return this.timers.size;
  }

  private async publishHeartbeat(workerId: string, jobId: JobId, status: string): Promise<void> {
    try {
      const payload: WorkerHeartbeatPayload = {
        workerId,
        jobId,
        status,
        timestamp: new Date().toISOString(),
      };
      await this.events.publish(RUNTIME_EVENTS.WORKER_HEARTBEAT, payload as unknown as Record<string, unknown>);
    } catch {}
  }
}
