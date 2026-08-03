"use client";

/**
 * Generation Animation Runtime — IMPLEMENTATION-28.
 *
 * The orchestration layer between the runtime-driven Generation Experience
 * (useGenerationExperience) and the motion primitives. It NEVER owns progress,
 * state or timing — it only maps runtime values into animation targets.
 *
 * Flow:
 *   Generation Runtime → useGenerationExperience() → useGenerationAnimation() → primitives
 *
 * The mapping is a pure function (buildGenerationAnimation) so stage/transition
 * logic is fully unit-testable; the hook only memoizes it.
 */
import { useMemo } from "react";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";
import type { GenerationStageStatus } from "@/lib/generation/experience/stages";

export type StageMotionState = {
  key: string;
  status: GenerationStageStatus;
  /** Stable across re-renders so entering/exiting animations are keyed by stage. */
  isCurrent: boolean;
  isCompleted: boolean;
  isFailed: boolean;
};

export type GenerationAnimation = {
  stages: StageMotionState[];
  /** Signature that changes only when the active stage changes. */
  activeStageId: string | null;
  activeStageKey: string;
  progress: number;
  completedCount: number;
  totalStages: number;
  hasFailure: boolean;
};

/**
 * Pure mapping from the runtime experience to animation targets. Never mutates
 * input; never fabricates progress — values are passed through verbatim.
 */
export function buildGenerationAnimation(experience: GenerationExperience): GenerationAnimation {
  const stages: StageMotionState[] = experience.stages.map((s) => ({
    key: s.id,
    status: s.status,
    isCurrent: s.id === experience.currentId,
    isCompleted: s.status === "completed" || s.status === "skipped",
    isFailed: s.status === "failed",
  }));

  return {
    stages,
    activeStageId: experience.currentId,
    activeStageKey: experience.currentId ?? "none",
    progress: experience.progress,
    completedCount: experience.completedCount,
    totalStages: experience.totalStages,
    hasFailure: experience.hasFailure,
  };
}

/** The hook form — memoized on the experience input (pure consumer). */
export function useGenerationAnimation(experience: GenerationExperience): GenerationAnimation {
  return useMemo(() => buildGenerationAnimation(experience), [experience]);
}
