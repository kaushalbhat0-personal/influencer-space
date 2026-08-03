"use client";

/**
 * Storefront Construction Runtime — IMPLEMENTATION-29.
 *
 * A pure consumer of the Generation Experience (useGenerationExperience). It
 * determines which portions of the storefront are now ELIGIBLE to appear based
 * ONLY on which real workflow stages have completed. It never owns workflow
 * state, never calculates progress, never modifies the Builder, never simulates.
 *
 * Flow:
 *   Generation Experience → buildConstructionState() → Construction Preview
 */
import { useMemo } from "react";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";
import type { GenerationStageId, GenerationStageStatus } from "@/lib/generation/experience/stages";
import { CONSTRUCTION_STEPS, CONSTRUCTION_THEME_DEPENDS_ON, type ConstructionStepConfig } from "./config";

export type ConstructionStepStatus = "pending" | "running" | "completed" | "failed";

export interface ConstructionStepState extends ConstructionStepConfig {
  /** Derived from the REAL stage status — never fabricated. */
  status: ConstructionStepStatus;
  isEligible: boolean;
  isCurrent: boolean;
  stageStatus: GenerationStageStatus | null;
}

export interface ConstructionState {
  steps: ConstructionStepState[];
  /** True when the workflow's composition stage (theme selection) completed. */
  themeEligible: boolean;
  currentStep: ConstructionStepState | null;
  /** Any construction-relevant stage failed → freeze construction. */
  isFailure: boolean;
  /** All steps eligible + theme applied. */
  isComplete: boolean;
}

/** Pure — status of a canonical generation stage from the experience. */
export function stageStatusFromExperience(
  experience: GenerationExperience,
  stage: GenerationStageId | null,
): GenerationStageStatus | null {
  if (!stage) return null;
  return experience.stages.find((s) => s.id === stage)?.status ?? null;
}

/** Pure — derive the full construction state from the runtime experience. */
export function buildConstructionState(experience: GenerationExperience): ConstructionState {
  const steps: ConstructionStepState[] = CONSTRUCTION_STEPS.map((step) => {
    const stageStatus = stageStatusFromExperience(experience, step.dependsOnStage);
    // Un-gated steps (the base shell) are always eligible. Gated steps require
    // their stage to have actually completed/skipped.
    const isEligible =
      stageStatus === null || stageStatus === "completed" || stageStatus === "skipped";
    const status: ConstructionStepStatus =
      stageStatus === "failed"
        ? "failed"
        : stageStatus === "completed" || stageStatus === "skipped"
          ? "completed"
          : stageStatus === "running"
            ? "running"
            : isEligible
              ? "completed"
              : "pending";
    return { ...step, status, isEligible, isCurrent: false, stageStatus };
  });

  const runningIndex = steps.findIndex((s) => s.status === "running");
  if (runningIndex >= 0) steps[runningIndex] = { ...steps[runningIndex], isCurrent: true };

  const currentStep = steps[runningIndex] ?? null;
  const themeEligible =
    stageStatusFromExperience(experience, CONSTRUCTION_THEME_DEPENDS_ON) === "completed" ||
    stageStatusFromExperience(experience, CONSTRUCTION_THEME_DEPENDS_ON) === "skipped";

  return {
    steps,
    themeEligible,
    currentStep,
    isFailure: experience.hasFailure || steps.some((s) => s.status === "failed"),
    isComplete: steps.every((s) => s.isEligible) && themeEligible,
  };
}

/** Memoized hook — pure consumer of the experience. */
export function useConstructionRuntime(experience: GenerationExperience): ConstructionState {
  return useMemo(() => buildConstructionState(experience), [experience]);
}
