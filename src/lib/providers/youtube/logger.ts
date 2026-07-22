export interface ImportLogEntry {
  timestamp: string;
  correlationId: string;
  event: string;
  creator: string;
  provider: string;
  duration: number;
  severity: "info" | "warn" | "error";
  details?: Record<string, unknown>;
}

const logs: ImportLogEntry[] = [];
const MAX_LOGS = 500;

export class ImportLogger {
  private correlationId: string;

  constructor(correlationId?: string) {
    this.correlationId = correlationId || `import_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  info(event: string, creator: string, provider: string, duration = 0, details?: Record<string, unknown>): void {
    this.log("info", event, creator, provider, duration, details);
  }

  warn(event: string, creator: string, provider: string, duration = 0, details?: Record<string, unknown>): void {
    this.log("warn", event, creator, provider, duration, details);
  }

  error(event: string, creator: string, provider: string, duration = 0, details?: Record<string, unknown>): void {
    this.log("error", event, creator, provider, duration, details);
  }

  private log(severity: ImportLogEntry["severity"], event: string, creator: string, provider: string, duration: number, details?: Record<string, unknown>): void {
    const entry: ImportLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      event,
      creator,
      provider,
      duration,
      severity,
      details,
    };
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.pop();
    // Console for production observability
    const prefix = `[${severity.toUpperCase()}][${this.correlationId}] ${event}`;
    if (severity === "error") console.error(prefix, details || "");
    else if (severity === "warn") console.warn(prefix, details || "");
    else console.log(prefix, details || "");
  }

  getLogs(): ImportLogEntry[] {
    return [...logs];
  }

  getRecentLogs(count = 50): ImportLogEntry[] {
    return logs.slice(0, count);
  }
}
