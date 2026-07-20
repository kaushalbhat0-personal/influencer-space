import type { TelemetrySnapshot } from "./types";

export class PlatformTelemetry {
  private counters = new Map<string, { value: number; labels: Record<string, string> }>();
  private timerBuckets = new Map<string, number[]>();
  private histograms = new Map<string, { buckets: number[]; values: number[] }>();
  private spans = new Map<string, { id: string; traceId: string; parentId: string | null; name: string; startTime: number; endTime: number | null; attributes: Record<string, string>; events: Array<{ name: string; timestamp: number; attributes: Record<string, string | number | boolean> }>; status: "ok" | "error" }>();
  private startTime = Date.now();

  counter(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const key = this.labelKey(name, labels);
    const existing = this.counters.get(key);
    if (existing) existing.value += value;
    else this.counters.set(key, { value, labels });
  }

  timer(name: string, durationMs: number, labels: Record<string, string> = {}): void {
    const key = this.labelKey(name, labels);
    if (!this.timerBuckets.has(key)) this.timerBuckets.set(key, []);
    this.timerBuckets.get(key)!.push(durationMs);
  }

  histogram(name: string, value: number, buckets: number[] = [1, 5, 10, 50, 100, 500, 1000, 5000]): void {
    if (!this.histograms.has(name)) this.histograms.set(name, { buckets, values: [] });
    this.histograms.get(name)!.values.push(value);
  }

  startSpan(name: string, traceId?: string, parentId?: string): string {
    const id = `span_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.spans.set(id, { id, traceId: traceId ?? id, parentId: parentId ?? null, name, startTime: performance.now(), endTime: null, attributes: {}, events: [], status: "ok" });
    return id;
  }

  endSpan(id: string, error?: Error): void {
    const span = this.spans.get(id);
    if (span) { span.endTime = performance.now(); if (error) span.status = "error"; }
  }

  addSpanEvent(spanId: string, eventName: string, attrs: Record<string, string | number | boolean> = {}): void {
    const span = this.spans.get(spanId);
    if (span) span.events.push({ name: eventName, timestamp: Date.now(), attributes: attrs });
  }

  record(metric: string, value: number, type: "counter" | "timer" | "histogram" = "counter", labels: Record<string, string> = {}): void {
    if (type === "counter") this.counter(metric, value, labels);
    else if (type === "timer") this.timer(metric, value, labels);
    else this.histogram(metric, value);
  }

  snapshot(): TelemetrySnapshot {
    const counters: Record<string, { name: string; value: number; labels: Record<string, string> }> = {};
    for (const [key, c] of Array.from(this.counters.entries())) counters[key] = { name: key, value: c.value, labels: c.labels };

    const timers: Record<string, { name: string; count: number; total: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number; values: number[] }> = {};
    for (const [key, vals] of Array.from(this.timerBuckets.entries())) {
      const sorted = [...vals].sort((a, b) => a - b);
      timers[key] = { name: key, count: sorted.length, total: sorted.reduce((s, v) => s + v, 0), min: sorted[0] ?? 0, max: sorted[sorted.length - 1] ?? 0, avg: sorted.length > 0 ? sorted.reduce((s, v) => s + v, 0) / sorted.length : 0, p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0, p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0, p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0, values: sorted };
    }

    const histograms: Record<string, { name: string; buckets: number[]; counts: number[]; sum: number; count: number }> = {};
    for (const [name, h] of Array.from(this.histograms.entries())) {
      const counts = h.buckets.map((b) => h.values.filter((v) => v <= b).length);
      for (let i = counts.length - 1; i > 0; i--) counts[i] = counts[i]! - counts[i - 1]!;
      histograms[name] = { name, buckets: h.buckets, counts, sum: h.values.reduce((s, v) => s + v, 0), count: h.values.length };
    }

    return { counters, timers, histograms, spans: Array.from(this.spans.values()), uptime: Date.now() - this.startTime };
  }

  reset(): void { this.counters.clear(); this.timerBuckets.clear(); this.histograms.clear(); this.spans.clear(); this.startTime = Date.now(); }
  private labelKey(name: string, labels: Record<string, string>): string { return name + (Object.keys(labels).length > 0 ? ":" + JSON.stringify(labels) : ""); }
}

export const platformTelemetry = new PlatformTelemetry();
