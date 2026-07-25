import type { PipelineStage } from "@/lib/generation/contracts";

export const PIPELINE_EVENTS = {
  STARTED: "pipeline.started",
  STAGE_STARTED: "stage.started",
  STAGE_COMPLETED: "stage.completed",
  STAGE_FAILED: "stage.failed",
  STAGE_SKIPPED: "stage.skipped",
  COMPLETED: "pipeline.completed",
  FAILED: "pipeline.failed",
} as const;

export interface PipelineStartedPayload {
  generationId: string;
  totalStages: number;
  strategy: string;
  mode: string;
  timestamp: string;
}

export interface StageStartedPayload {
  generationId: string;
  stage: PipelineStage;
  attempt: number;
  timestamp: string;
}

export interface StageCompletedPayload {
  generationId: string;
  stage: PipelineStage;
  durationMs: number;
  cached: boolean;
  timestamp: string;
}

export interface StageFailedPayload {
  generationId: string;
  stage: PipelineStage;
  error: string;
  attempt: number;
  willRetry: boolean;
  timestamp: string;
}

export interface StageSkippedPayload {
  generationId: string;
  stage: PipelineStage;
  reason: string;
  timestamp: string;
}

export interface PipelineCompletedPayload {
  generationId: string;
  stagesCompleted: number;
  stagesFailed: number;
  stagesSkipped: number;
  totalDurationMs: number;
  timestamp: string;
}

export interface PipelineFailedPayload {
  generationId: string;
  error: string;
  stagesCompleted: number;
  stagesFailed: number;
  timestamp: string;
}
