import type { GenerationId } from "@/lib/generation/contracts";

export const ORCHESTRATION_EVENTS = {
  CREATED: "generation.created",
  STARTED: "generation.started",
  PROGRESS: "generation.progress",
  COMPLETED: "generation.completed",
  FAILED: "generation.failed",
  CANCELLED: "generation.cancelled",
  RETRY: "generation.retry",
  RESUMED: "generation.resumed",
} as const;

export interface GenerationCreatedPayload {
  generationId: GenerationId;
  creatorId: string;
  strategy: string;
  mode: string;
  sourceUrl: string;
  timestamp: string;
}

export interface GenerationStartedPayload {
  generationId: GenerationId;
  creatorId: string;
  timestamp: string;
}

export interface GenerationProgressPayload {
  generationId: GenerationId;
  progress: number;
  currentStage: string | null;
  elapsedMs: number;
  estimatedRemainingMs: number;
  timestamp: string;
}

export interface GenerationCompletedPayload {
  generationId: GenerationId;
  status: string;
  durationMs: number;
  stagesCompleted: number;
  timestamp: string;
}

export interface GenerationFailedPayload {
  generationId: GenerationId;
  error: string;
  durationMs: number;
  stagesCompleted: number;
  timestamp: string;
}

export interface GenerationCancelledPayload {
  generationId: GenerationId;
  reason: string;
  timestamp: string;
}

export interface GenerationRetryPayload {
  generationId: GenerationId;
  attempt: number;
  timestamp: string;
}

export interface GenerationResumedPayload {
  generationId: GenerationId;
  resumedFrom: string | null;
  timestamp: string;
}
