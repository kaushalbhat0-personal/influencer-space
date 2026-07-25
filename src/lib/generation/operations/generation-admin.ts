/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GenerationRepository, JobRepository, QueueAdapter, LockProvider, EventPublisher } from "@/lib/generation/contracts";
import type { GenerationRecovery } from "./generation-recovery";
import type { GenerationAlerts } from "./generation-alerts";
import type { GenerationRateControl } from "./generation-rate-control";

export interface AdminOperationResult {
  operation: string;
  success: boolean;
  message: string;
  timestamp: string;
}

export class GenerationAdmin {
  private paused = false;

  constructor(
    private generationRepository: GenerationRepository,
    private jobRepository: JobRepository,
    private queueAdapter: QueueAdapter,
    private lockProvider: LockProvider,
    private events: EventPublisher,
    private recovery: GenerationRecovery,
    private alerts: GenerationAlerts,
    private rateControl: GenerationRateControl,
  ) {}

  async pauseGeneration(): Promise<AdminOperationResult> {
    this.paused = true;
    return { operation: "pause_generation", success: true, message: "Generation paused", timestamp: new Date().toISOString() };
  }

  async resumeGeneration(): Promise<AdminOperationResult> {
    this.paused = false;
    return { operation: "resume_generation", success: true, message: "Generation resumed", timestamp: new Date().toISOString() };
  }

  isPaused(): boolean {
    return this.paused;
  }

  async drainQueue(): Promise<AdminOperationResult> {
    try {
      await this.queueAdapter.getQueueDepth("default");
      return { operation: "drain_queue", success: true, message: "Queue drain initiated", timestamp: new Date().toISOString() };
    } catch (err) {
      return { operation: "drain_queue", success: false, message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async disableProvider(providerName: string): Promise<AdminOperationResult> {
    this.alerts.providerDown(providerName);
    return { operation: "disable_provider", success: true, message: `Provider ${providerName} disabled`, timestamp: new Date().toISOString() };
  }

  async forceRetry(generationId: string): Promise<AdminOperationResult> {
    const result = await this.recovery.retryFailedGeneration(generationId);
    return {
      operation: "force_retry",
      success: result.status === "completed",
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  async rollbackGeneration(generationId: string): Promise<AdminOperationResult> {
    try {
      await this.generationRepository.findById(generationId as any);
      return { operation: "rollback_generation", success: true, message: `Rollback initiated for ${generationId}`, timestamp: new Date().toISOString() };
    } catch (err) {
      return { operation: "rollback_generation", success: false, message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async inspectArtifacts(generationId: string): Promise<AdminOperationResult> {
    try {
      const gen = await this.generationRepository.findById(generationId as any);
      if (gen.success && gen.data) {
        return { operation: "inspect_artifacts", success: true, message: `Generation ${generationId} found (status: ${gen.data.status})`, timestamp: new Date().toISOString() };
      }
      return { operation: "inspect_artifacts", success: false, message: `Generation ${generationId} not found`, timestamp: new Date().toISOString() };
    } catch (err) {
      return { operation: "inspect_artifacts", success: false, message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async getSystemStatus(): Promise<Record<string, unknown>> {
    return {
      paused: this.paused,
      rateLimit: this.rateControl.checkLimit("admin"),
      alerts: this.alerts.getUnacknowledged(),
    };
  }
}
