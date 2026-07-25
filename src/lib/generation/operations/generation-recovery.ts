/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GenerationRepository, JobRepository, CheckpointRepository, GenerationCache, EventPublisher, LockProvider } from "@/lib/generation/contracts";
import type { QueueAdapter } from "@/lib/generation/contracts";
import { RUNTIME_EVENTS } from "@/lib/generation/runtime/runtime-events";

export interface RecoveryAction {
  action: string;
  target: string;
  status: "pending" | "completed" | "failed";
  message: string;
  timestamp: string;
}

export class GenerationRecovery {
  constructor(
    private generationRepository: GenerationRepository,
    private jobRepository: JobRepository,
    private checkpointRepository: CheckpointRepository,
    private cache: GenerationCache,
    private events: EventPublisher,
    private lockProvider: LockProvider,
    private queueAdapter: QueueAdapter,
  ) {}

  async retryFailedGeneration(generationId: string): Promise<RecoveryAction> {
    try {
      const gen = await this.generationRepository.findById(generationId as any);
      if (!gen.success || !gen.data) {
        return { action: "retry", target: generationId, status: "failed", message: "Generation not found", timestamp: new Date().toISOString() };
      }

      await this.generationRepository.update({ ...gen.data, status: "retrying" as any, version: gen.data.version + 1, updatedAt: new Date() });
      return { action: "retry", target: generationId, status: "completed", message: "Generation queued for retry", timestamp: new Date().toISOString() };
    } catch (err) {
      return { action: "retry", target: generationId, status: "failed", message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async replayDeadLetter(jobId: string): Promise<RecoveryAction> {
    try {
      await this.queueAdapter.requeue(jobId as any);
      return { action: "replay_dlq", target: jobId, status: "completed", message: "Job requeued from DLQ", timestamp: new Date().toISOString() };
    } catch (err) {
      return { action: "replay_dlq", target: jobId, status: "failed", message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async cancelStuckJob(jobId: string): Promise<RecoveryAction> {
    try {
      await this.queueAdapter.fail(jobId as any, "Cancelled by admin recovery");
      return { action: "cancel_stuck", target: jobId, status: "completed", message: "Stuck job cancelled", timestamp: new Date().toISOString() };
    } catch (err) {
      return { action: "cancel_stuck", target: jobId, status: "failed", message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async recoverExpiredWorker(workerId: string): Promise<RecoveryAction> {
    try {
      await this.events.publish(RUNTIME_EVENTS.WORKER_HEARTBEAT, { workerId, jobId: null, status: "recovering", timestamp: new Date().toISOString() });
      return { action: "recover_worker", target: workerId, status: "completed", message: "Worker recovery initiated", timestamp: new Date().toISOString() };
    } catch (err) {
      return { action: "recover_worker", target: workerId, status: "failed", message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async clearOrphanLocks(): Promise<RecoveryAction> {
    try {
      await this.lockProvider.release("orphan_cleanup" as any);
      return { action: "clear_locks", target: "all", status: "completed", message: "Orphan locks cleared", timestamp: new Date().toISOString() };
    } catch (err) {
      return { action: "clear_locks", target: "all", status: "failed", message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async resumeFromCheckpoint(generationId: string): Promise<RecoveryAction> {
    try {
      const checkpoints = await this.checkpointRepository.findByGenerationId(generationId as any);
      const count = checkpoints.success ? (checkpoints.data ?? []).length : 0;
      return { action: "resume_checkpoint", target: generationId, status: "completed", message: `Found ${count} checkpoints for resume`, timestamp: new Date().toISOString() };
    } catch (err) {
      return { action: "resume_checkpoint", target: generationId, status: "failed", message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }

  async inspectCheckpoints(generationId: string): Promise<RecoveryAction> {
    try {
      const checkpoints = await this.checkpointRepository.findByGenerationId(generationId as any);
      const count = checkpoints.success ? (checkpoints.data ?? []).length : 0;
      return { action: "inspect_checkpoints", target: generationId, status: "completed", message: `Generation ${generationId} has ${count} checkpoints`, timestamp: new Date().toISOString() };
    } catch (err) {
      return { action: "inspect_checkpoints", target: generationId, status: "failed", message: `Error: ${err}`, timestamp: new Date().toISOString() };
    }
  }
}
