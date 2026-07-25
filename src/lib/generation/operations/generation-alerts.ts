export type AlertSeverity = "info" | "warning" | "critical";
export type AlertCategory = "budget" | "provider" | "queue" | "worker" | "system" | "performance";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metadata: Record<string, unknown>;
}

export class GenerationAlerts {
  private alerts: Alert[] = [];
  private listeners: Array<(alert: Alert) => void> = [];

  budgetExceeded(creatorId: string, spend: number, limit: number): void {
    this.emit({
      id: this.generateId(),
      severity: "warning",
      category: "budget",
      title: "Budget exceeded",
      message: `Creator ${creatorId} spent ${spend} (limit: ${limit})`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: { creatorId, spend, limit },
    });
  }

  providerDown(providerName: string): void {
    this.emit({
      id: this.generateId(),
      severity: "critical",
      category: "provider",
      title: "Provider unavailable",
      message: `AI provider ${providerName} is down`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: { provider: providerName },
    });
  }

  queueBackedUp(depth: number, threshold: number): void {
    this.emit({
      id: this.generateId(),
      severity: "warning",
      category: "queue",
      title: "Queue backed up",
      message: `Queue depth ${depth} exceeds threshold ${threshold}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: { depth, threshold },
    });
  }

  workerOffline(workerId: string): void {
    this.emit({
      id: this.generateId(),
      severity: "critical",
      category: "worker",
      title: "Worker offline",
      message: `Worker ${workerId} has stopped responding`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: { workerId },
    });
  }

  retryStorm(generationId: string, retryCount: number): void {
    this.emit({
      id: this.generateId(),
      severity: "warning",
      category: "performance",
      title: "Retry storm detected",
      message: `Generation ${generationId} has retried ${retryCount} times`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: { generationId, retryCount },
    });
  }

  dlqGrowing(queue: string, size: number): void {
    this.emit({
      id: this.generateId(),
      severity: "warning",
      category: "queue",
      title: "DLQ growing",
      message: `Dead letter queue ${queue} has ${size} messages`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: { queue, size },
    });
  }

  generationSlowdown(averageMs: number, threshold: number): void {
    this.emit({
      id: this.generateId(),
      severity: "info",
      category: "performance",
      title: "Generation slowdown",
      message: `Average generation time ${averageMs}ms exceeds threshold ${threshold}ms`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: { averageMs, threshold },
    });
  }

  subscribe(listener: (alert: Alert) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  getUnacknowledged(): Alert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  acknowledge(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) alert.acknowledged = true;
  }

  acknowledgeAll(): void {
    for (const alert of this.alerts) alert.acknowledged = true;
  }

  clear(): void {
    this.alerts = [];
  }

  private emit(alert: Alert): void {
    this.alerts.push(alert);
    if (this.alerts.length > 1000) this.alerts.shift();
    for (const listener of this.listeners) {
      try { listener(alert); } catch {}
    }
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
