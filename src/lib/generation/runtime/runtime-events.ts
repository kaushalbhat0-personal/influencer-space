import type { JobId } from "@/lib/generation/contracts";

export const RUNTIME_EVENTS = {
  WORKER_STARTED: "worker.started",
  WORKER_STOPPED: "worker.stopped",
  WORKER_FAILED: "worker.failed",
  WORKER_HEARTBEAT: "worker.heartbeat",
  JOB_CLAIMED: "job.claimed",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",
  JOB_RETRY: "job.retry",
  JOB_DEAD_LETTER: "job.deadletter",
} as const;

export interface WorkerStartedPayload {
  workerId: string;
  timestamp: string;
}

export interface WorkerStoppedPayload {
  workerId: string;
  reason: string;
  jobsProcessed: number;
  timestamp: string;
}

export interface WorkerFailedPayload {
  workerId: string;
  error: string;
  timestamp: string;
}

export interface WorkerHeartbeatPayload {
  workerId: string;
  jobId: JobId | null;
  status: string;
  memoryUsage?: number;
  timestamp: string;
}

export interface JobClaimedPayload {
  workerId: string;
  jobId: JobId;
  queue: string;
  timestamp: string;
}

export interface JobCompletedPayload {
  workerId: string;
  jobId: JobId;
  durationMs: number;
  timestamp: string;
}

export interface JobFailedPayload {
  workerId: string;
  jobId: JobId;
  error: string;
  attempt: number;
  maxAttempts: number;
  willRetry: boolean;
  timestamp: string;
}

export interface JobRetryPayload {
  workerId: string;
  jobId: JobId;
  attempt: number;
  nextDelayMs: number;
  timestamp: string;
}

export interface JobDeadLetterPayload {
  workerId: string;
  jobId: JobId;
  error: string;
  attempts: number;
  timestamp: string;
}
