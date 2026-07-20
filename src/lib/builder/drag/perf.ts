export interface FrameMetrics {
  timestamp: number;
  frameTime: number;
  belowThreshold: boolean;
  operations: Record<string, number>;
  allocations: number;
}

export interface OperationMetrics {
  name: string;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  calls: number;
  belowThreshold: boolean;
}

export interface PerfReport {
  totalFrames: number;
  droppedFrames: number;
  avgFrameTime: number;
  p95FrameTime: number;
  worstFrame: FrameMetrics | null;
  operations: OperationMetrics[];
  summary: { passed: boolean; passingFrames: number; totalFrames: number; passRate: number };
}

const FRAME_BUDGET = 16;
const HISTORY_SIZE = 120;

export class DragPerformanceMonitor {
  private frames: FrameMetrics[] = [];
  private operationTimes = new Map<string, number[]>();
  private allocations = 0;
  private frameStart = 0;
  private enabled = true;

  startFrame(): void { if (this.enabled) this.frameStart = performance.now(); }

  endFrame(extra: Record<string, number> = {}): void {
    if (!this.enabled) return;
    const frameTime = performance.now() - this.frameStart;
    const below = frameTime < FRAME_BUDGET;
    this.frames.push({ timestamp: Date.now(), frameTime, belowThreshold: below, operations: { ...extra }, allocations: this.allocations });
    if (this.frames.length > HISTORY_SIZE) this.frames.shift();
    this.allocations = 0;
  }

  record(name: string, durationMs: number): void {
    if (!this.enabled) return;
    if (!this.operationTimes.has(name)) this.operationTimes.set(name, []);
    this.operationTimes.get(name)!.push(durationMs);
    if (this.operationTimes.get(name)!.length > 200) this.operationTimes.get(name)!.shift();
  }

  recordAllocation(count = 1): void { this.allocations += count; }

  disable(): void { this.enabled = false; this.frames = []; this.operationTimes.clear(); }
  enable(): void { this.enabled = true; }

  report(): PerfReport {
    const frames = this.frames;
    if (frames.length === 0) return { totalFrames: 0, droppedFrames: 0, avgFrameTime: 0, p95FrameTime: 0, worstFrame: null, operations: [], summary: { passed: true, passingFrames: 0, totalFrames: 0, passRate: 1 } };
    const dropped = frames.filter((f) => !f.belowThreshold).length;
    const times = frames.map((f) => f.frameTime).sort((a, b) => a - b);
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    const p95 = times[Math.floor(times.length * 0.95)] ?? times[times.length - 1] ?? 0;
    const worst = frames.reduce((w, f) => f.frameTime > (w?.frameTime ?? 0) ? f : w, frames[0]!);

    const ops: OperationMetrics[] = [];
    for (const [name, vals] of Array.from(this.operationTimes.entries())) {
      const sorted = [...vals].sort((a, b) => a - b);
      ops.push({ name, avgMs: Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length * 100) / 100, p95Ms: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 100) / 100, p99Ms: Math.round((sorted[Math.floor(sorted.length * 0.99)] ?? 0) * 100) / 100, maxMs: Math.round((sorted[sorted.length - 1] ?? 0) * 100) / 100, calls: vals.length, belowThreshold: (sorted.reduce((s, v) => s + v, 0) / sorted.length) < FRAME_BUDGET });
    }

    const passRate = frames.length > 0 ? (frames.length - dropped) / frames.length : 1;
    return { totalFrames: frames.length, droppedFrames: dropped, avgFrameTime: Math.round(avg * 100) / 100, p95FrameTime: Math.round(p95 * 100) / 100, worstFrame: worst, operations: ops, summary: { passed: dropped === 0, passingFrames: frames.length - dropped, totalFrames: frames.length, passRate: Math.round(passRate * 100) / 100 } };
  }

  reset(): void { this.frames = []; this.operationTimes.clear(); this.allocations = 0; }
}

export const dragPerfMonitor = new DragPerformanceMonitor();
