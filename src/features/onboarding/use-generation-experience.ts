"use client";

import { useMemo } from "react";
import {
  GENERATION_STAGES,
  deriveStageStatus,
  deriveWeightedProgress,
  deriveCurrentStage,
  deriveCompletedCount,
  type GenerationStageConfig,
  type RuntimeStageEvent,
} from "@/lib/generation/experience/stages";

export interface GenerationExperienceInput {
  events: RuntimeStageEvent[];
  runtimeProgress: number;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
  hasStarted: boolean;
}

export interface GenerationExperience {
  /** All stages in canonical order, enriched with runtime status. */
  stages: GenerationStageConfig[];
  currentId: string | null;
  current: GenerationStageConfig | null;
  completedCount: number;
  totalStages: number;
  /** Progress shown to the UI — the workflow runtime's own value, never a timer. */
  progress: number;
  /** Weight-derived progress (conservative cross-check; never exceeds reality). */
  derivedProgress: number;
  /** Raw elapsed time from the runtime (ms). */
  elapsedMs: number;
  elapsedLabel: string;
  remainingLabel: string | null;
  hasStarted: boolean;
  hasFailure: boolean;
  isComplete: boolean;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

/**
 * Consumes the REAL workflow runtime and derives the generation experience.
 * All derived state is memoized; re-renders only happen when the runtime input
 * actually changes.
 */
export function useGenerationExperience(input: GenerationExperienceInput): GenerationExperience {
  return useMemo(() => {
    const stages: GenerationStageConfig[] = GENERATION_STAGES.map((cfg) => {
      const event = input.events.find((e) => e.type === cfg.id);
      return {
        ...cfg,
        status: deriveStageStatus(input.events, cfg.id),
        error: event?.error ?? null,
        duration: event?.duration ?? null,
      };
    });

    const currentId = deriveCurrentStage(input.events);
    const current = stages.find((s) => s.id === currentId) ?? null;
    const completedCount = deriveCompletedCount(input.events);
    const derivedProgress = deriveWeightedProgress(input.events);
    const progress = Math.min(Math.max(input.runtimeProgress, 0), 100);
    const hasFailure = stages.some((s) => s.status === "failed");

    return {
      stages,
      currentId,
      current,
      completedCount,
      totalStages: stages.length,
      progress,
      derivedProgress,
      elapsedMs: input.elapsedMs,
      elapsedLabel: formatDuration(input.elapsedMs),
      remainingLabel:
        input.estimatedRemainingMs != null && input.estimatedRemainingMs > 0
          ? `~${formatDuration(input.estimatedRemainingMs)} remaining`
          : null,
      hasStarted: input.hasStarted,
      hasFailure,
      isComplete: progress >= 100 && completedCount === stages.length,
    };
  }, [input.events, input.runtimeProgress, input.elapsedMs, input.estimatedRemainingMs, input.hasStarted]);
}
