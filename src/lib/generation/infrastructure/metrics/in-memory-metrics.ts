interface MetricCounter {
  value: number;
  tags: Record<string, string>;
}

interface MetricHistogram {
  values: number[];
  sum: number;
}

interface MetricGauge {
  value: number;
}

interface MetricsSnapshot {
  counters: Record<string, { value: number; tags: Record<string, string> }>;
  histograms: Record<string, { count: number; sum: number; min: number; max: number; avg: number }>;
  gauges: Record<string, number>;
  timers: Record<string, { count: number; sum: number; min: number; max: number; avg: number }>;
}

export class InMemoryMetricsCollector {
  private counters = new Map<string, MetricCounter>();
  private histograms = new Map<string, MetricHistogram>();
  private gauges = new Map<string, MetricGauge>();
  private timers = new Map<string, MetricHistogram>();

  private key(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) return name;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}{${tagStr}}`;
  }

  increment(counter: string, value = 1, tags?: Record<string, string>): void {
    const k = this.key(counter, tags);
    const existing = this.counters.get(k);
    this.counters.set(k, { value: (existing?.value ?? 0) + value, tags: tags ?? {} });
  }

  histogram(metric: string, value: number, tags?: Record<string, string>): void {
    const k = this.key(metric, tags);
    const existing = this.histograms.get(k);
    this.histograms.set(k, {
      values: [...(existing?.values ?? []), value],
      sum: (existing?.sum ?? 0) + value,
    });
  }

  gauge(metric: string, value: number): void {
    this.gauges.set(metric, { value });
  }

  timer(metric: string, durationMs: number, tags?: Record<string, string>): void {
    const k = this.key(`timer:${metric}`, tags);
    const existing = this.timers.get(k);
    this.timers.set(k, {
      values: [...(existing?.values ?? []), durationMs],
      sum: (existing?.sum ?? 0) + durationMs,
    });
  }

  snapshot(): MetricsSnapshot {
    const counters: Record<string, { value: number; tags: Record<string, string> }> = {};
    for (const [key, c] of Array.from(this.counters)) counters[key] = { value: c.value, tags: c.tags };

    const histograms: Record<string, { count: number; sum: number; min: number; max: number; avg: number }> = {};
    for (const [key, h] of Array.from(this.histograms)) {
      const sorted = [...h.values].sort((a, b) => a - b);
      histograms[key] = {
        count: h.values.length,
        sum: h.sum,
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        avg: h.values.length > 0 ? h.sum / h.values.length : 0,
      };
    }

    const gauges: Record<string, number> = {};
    for (const [key, g] of Array.from(this.gauges)) gauges[key] = g.value;

    const timers: Record<string, { count: number; sum: number; min: number; max: number; avg: number }> = {};
    for (const [key, t] of Array.from(this.timers)) {
      const sorted = [...t.values].sort((a, b) => a - b);
      timers[key] = {
        count: t.values.length,
        sum: t.sum,
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        avg: t.values.length > 0 ? t.sum / t.values.length : 0,
      };
    }

    return { counters, histograms, gauges, timers };
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.timers.clear();
  }

  getCounter(name: string, tags?: Record<string, string>): number {
    return this.counters.get(this.key(name, tags))?.value ?? 0;
  }

  getGauge(name: string): number {
    return this.gauges.get(name)?.value ?? 0;
  }
}
