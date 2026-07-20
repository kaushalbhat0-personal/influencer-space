interface Bounds { x: number; y: number; w: number; h: number; id: string; }

export class SpatialIndex {
  private cells = new Map<string, Bounds[]>();
  private cellSize: number;

  constructor(cellSize = 100) { this.cellSize = cellSize; }

  build(items: Bounds[]): void {
    this.cells.clear();
    for (const item of items) {
      const keys = this.cellKeys(item);
      for (const key of keys) {
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key)!.push(item);
      }
    }
  }

  query(x: number, y: number, radius = 0): Bounds[] {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const results: Bounds[] = [];
    const seen = new Set<string>();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const item of cell) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            const inX = x >= item.x - radius && x <= item.x + item.w + radius;
            const inY = y >= item.y - radius && y <= item.y + item.h + radius;
            if (inX && inY) results.push(item);
          }
        }
      }
    }
    return results;
  }

  clear(): void { this.cells.clear(); }
  get size(): number { return this.cells.size; }

  private cellKeys(item: Bounds): string[] {
    const x1 = Math.floor(item.x / this.cellSize);
    const y1 = Math.floor(item.y / this.cellSize);
    const x2 = Math.floor((item.x + item.w) / this.cellSize);
    const y2 = Math.floor((item.y + item.h) / this.cellSize);
    const keys: string[] = [];
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) keys.push(`${x},${y}`);
    return keys;
  }
}

export class DragBenchmark {
  private results: Map<string, number[]> = new Map();

  run(name: string, fn: () => void, iterations = 100): { name: string; avg: number; p95: number; min: number; max: number } {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      fn();
      times.push(performance.now() - start);
    }
    const sorted = [...times].sort((a, b) => a - b);
    this.results.set(name, sorted);
    return { name, avg: Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length * 1000) / 1000, p95: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 1000) / 1000, min: Math.round((sorted[0] ?? 0) * 1000) / 1000, max: Math.round((sorted[sorted.length - 1] ?? 0) * 1000) / 1000 };
  }

  compare(label: string, fn1: () => void, fn2: () => void, iterations = 100): { label: string; before: ReturnType<DragBenchmark["run"]>; after: ReturnType<DragBenchmark["run"]>; improvement: string } {
    const before = this.run(`${label}-before`, fn1, iterations);
    const after = this.run(`${label}-after`, fn2, iterations);
    const pct = before.avg > 0 ? Math.round((1 - after.avg / before.avg) * 100) : 0;
    return { label, before, after, improvement: pct > 0 ? `${pct}% faster` : pct < 0 ? `${Math.abs(pct)}% slower` : "unchanged" };
  }

  report(): string {
    const lines: string[] = ["=== Drag Benchmark Report ==="];
    for (const [name, times] of Array.from(this.results.entries())) {
      const sorted = [...times].sort((a, b) => a - b);
      const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
      lines.push(`  ${name}: avg=${(avg * 1000).toFixed(3)}ms p95=${(sorted[Math.floor(sorted.length * 0.95)]! * 1000).toFixed(3)}ms`);
    }
    return lines.join("\n");
  }

  clear(): void { this.results.clear(); }
}

export const dragBenchmark = new DragBenchmark();
