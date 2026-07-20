import { themeRegistry } from "./registry";
import { themeDiagnostics } from "./diagnostics";
import { builderEvents } from "../events";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

interface TokenSnapshot {
  key: string;
  value: string;
}

export interface TransactionState {
  active: boolean;
  changedKeys: Set<string>;
  originalValues: Map<string, string>;
  startedAt: number | null;
  affectedCount: number;
}

export interface TransactionResult {
  success: boolean;
  changedCount: number;
  validationErrors: string[];
  error: string | null;
}

export class ThemeTransactionManager {
  private originalValues = new Map<string, string>();
  private changedKeys = new Set<string>();
  private active = false;
  private startedAt: number | null = null;

  begin(): void {
    this.originalValues.clear();
    this.changedKeys.clear();
    const tokens = themeRegistry.getAllTokens();
    for (const [key, token] of Array.from(tokens.entries())) {
      this.originalValues.set(key, token.value);
    }
    this.active = true;
    this.startedAt = Date.now();
    platformTelemetry.counter("builder.theme.transaction.begin", 1);
  }

  commit(): TransactionResult {
    if (!this.active) return { success: false, changedCount: 0, validationErrors: [], error: "No active transaction" };

    const diag = themeDiagnostics.run();
    if (diag.invalidReferences.length > 0) {
      return { success: false, changedCount: this.changedKeys.size, validationErrors: diag.invalidReferences.map((r) => `${r.key} → ${r.reference}`), error: "Validation failed" };
    }
    if (diag.circularReferences.length > 0) {
      return { success: false, changedCount: this.changedKeys.size, validationErrors: diag.circularReferences.map((c) => c.join(" → ")), error: "Circular references detected" };
    }

    const count = this.changedKeys.size;
    this.originalValues.clear();
    this.changedKeys.clear();
    this.active = false;
    this.startedAt = null;

    builderEvents.emit("token:changed" as never, { key: "theme", value: "committed" } as never);
    platformTelemetry.counter("builder.theme.transaction.commit", 1, { changedCount: String(count) });

    return { success: true, changedCount: count, validationErrors: [], error: null };
  }

  rollback(): TransactionResult {
    if (!this.active) return { success: false, changedCount: 0, validationErrors: [], error: "No active transaction" };

    let restored = 0;
    for (const [key, originalValue] of Array.from(this.originalValues.entries())) {
      const token = themeRegistry.getToken(key);
      if (!token) {
        platformTelemetry.counter("builder.theme.transaction.conflict", 1, { key });
        continue;
      }
      if (token.value !== originalValue) {
        token.value = originalValue;
        restored++;
      }
    }

    this.originalValues.clear();
    this.changedKeys.clear();
    this.active = false;
    this.startedAt = null;

    builderEvents.emit("token:changed" as never, { key: "theme", value: "rolled-back" } as never);
    platformTelemetry.counter("builder.theme.transaction.rollback", 1, { restoredCount: String(restored) });

    return { success: true, changedCount: restored, validationErrors: [], error: null };
  }

  preview(): ThemeTransactionManager {
    const preview = new ThemeTransactionManager();
    preview.begin();
    return preview;
  }

  discardPreview(): void {
    if (this.active) this.rollback();
  }

  trackChange(key: string): void {
    if (!this.active) return;
    this.changedKeys.add(key);
  }

  get state(): TransactionState {
    return {
      active: this.active,
      changedKeys: new Set(this.changedKeys),
      originalValues: new Map(this.originalValues),
      startedAt: this.startedAt,
      affectedCount: this.changedKeys.size,
    };
  }

  isActive(): boolean { return this.active; }

  getSnapshot(): TokenSnapshot[] {
    return Array.from(this.originalValues.entries()).map(([key, value]) => ({ key, value }));
  }

  reset(): void {
    this.originalValues.clear();
    this.changedKeys.clear();
    this.active = false;
    this.startedAt = null;
  }
}

export const themeTransaction = new ThemeTransactionManager();
