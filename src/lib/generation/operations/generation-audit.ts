export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: Record<string, unknown>;
  timestamp: string;
  ip: string;
}

export class GenerationAudit {
  private entries: AuditEntry[] = [];

  log(action: string, actor: string, target: string, details: Record<string, unknown> = {}): void {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action,
      actor,
      target,
      details,
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    };
    this.entries.push(entry);
    if (this.entries.length > 10000) this.entries.shift();
  }

  getEntries(filters?: { action?: string; actor?: string; target?: string; limit?: number }): AuditEntry[] {
    let filtered = [...this.entries];
    if (filters?.action) filtered = filtered.filter((e) => e.action === filters.action);
    if (filters?.actor) filtered = filtered.filter((e) => e.actor === filters.actor);
    if (filters?.target) filtered = filtered.filter((e) => e.target === filters.target);
    if (filters?.limit) filtered = filtered.slice(0, filters.limit);
    return filtered;
  }

  getRecent(count: number = 50): AuditEntry[] {
    return this.entries.slice(-count).reverse();
  }

  clear(): void {
    this.entries = [];
  }
}
