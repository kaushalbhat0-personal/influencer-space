export interface TelemetryEvent { name: string; timestamp: number; attributes: Record<string, string | number | boolean>; }
export interface Counter { name: string; value: number; labels: Record<string, string>; }
export interface Timer { name: string; count: number; total: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number; values: number[]; }
export interface Histogram { name: string; buckets: number[]; counts: number[]; sum: number; count: number; }
export interface Span { id: string; traceId: string; parentId: string | null; name: string; startTime: number; endTime: number | null; attributes: Record<string, string>; events: TelemetryEvent[]; status: "ok" | "error"; }
export interface TelemetrySnapshot { counters: Record<string, Counter>; timers: Record<string, Timer>; histograms: Record<string, Histogram>; spans: Span[]; uptime: number; }
