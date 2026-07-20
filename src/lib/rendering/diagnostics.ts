import type { ModuleId } from "@/lib/module/types";
import type { ModuleRenderSlot, RenderDiagnostics } from "./types";

export class RenderDiagnosticsCollector {
  private startTime = 0;
  private endTime = 0;
  private loadedModules = 0;
  private failedModules = 0;
  private skippedModules = 0;
  private timeoutModules = 0;
  private totalDataLoadMs = 0;
  private totalRenderMs = 0;
  private slowModules: { moduleId: ModuleId; durationMs: number }[] = [];
  private compatibilityIssues: { moduleId: ModuleId; compatible: boolean }[] = [];
  private errors: string[] = [];
  private warnings: string[] = [];
  private slowThreshold = 3000;

  constructor(slowThresholdMs = 3000) {
    this.slowThreshold = slowThresholdMs;
  }

  start(): void {
    this.startTime = performance.now();
  }

  stop(): void {
    this.endTime = performance.now();
  }

  recordSlot(slot: ModuleRenderSlot): void {
    switch (slot.state) {
      case "loaded":
        this.loadedModules++;
        if (slot.loadDurationMs !== null) {
          this.totalDataLoadMs += slot.loadDurationMs;
          if (slot.loadDurationMs > this.slowThreshold) {
            this.slowModules.push({
              moduleId: slot.moduleId,
              durationMs: slot.loadDurationMs,
            });
          }
        }
        if (slot.renderDurationMs !== null) {
          this.totalRenderMs += slot.renderDurationMs;
        }
        break;
      case "failed":
        this.failedModules++;
        if (slot.error) {
          this.errors.push(`[${slot.moduleId}] ${slot.error}`);
        }
        break;
      case "skipped":
        this.skippedModules++;
        break;
      case "timeout":
        this.timeoutModules++;
        this.errors.push(`[${slot.moduleId}] Timed out`);
        break;
    }
  }

  recordError(message: string): void {
    this.errors.push(message);
  }

  recordWarning(message: string): void {
    this.warnings.push(message);
  }

  recordCompatibility(moduleId: ModuleId, compatible: boolean): void {
    this.compatibilityIssues.push({ moduleId, compatible });
  }

  collect(totalModules: number): RenderDiagnostics {
    return {
      totalModules,
      loadedModules: this.loadedModules,
      failedModules: this.failedModules,
      skippedModules: this.skippedModules,
      timeoutModules: this.timeoutModules,
      slowModules: this.slowModules,
      totalDataLoadMs: Math.round(this.totalDataLoadMs * 100) / 100,
      totalRenderMs: Math.round(this.totalRenderMs * 100) / 100,
      surfaceCompatibility: this.compatibilityIssues,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  get elapsed(): number {
    return this.endTime > 0
      ? Math.round((this.endTime - this.startTime) * 100) / 100
      : 0;
  }
}
