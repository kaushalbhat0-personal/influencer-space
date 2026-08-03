import { describe, it, expect } from "vitest";
import {
  buildGenerationAnimation,
  type GenerationAnimation,
} from "@/lib/generation/animation/runtime";
import { normalizeProgress, progressAria } from "@/lib/generation/animation/progress";
import { GENERATION_STAGES, deriveStageStatus, type RuntimeStageEvent } from "@/lib/generation/experience/stages";
import type { GenerationExperience, GenerationExperienceInput } from "@/features/onboarding/use-generation-experience";

/** Build a full GenerationExperience from the pure input shape (mirrors the hook). */
function buildExperience(input: GenerationExperienceInput): GenerationExperience {
  const stages = GENERATION_STAGES.map((cfg) => {
    const event = input.events.find((e) => e.type === cfg.id);
    const status = deriveStageStatus(input.events, cfg.id);
    return { ...cfg, status, error: event?.error ?? null, duration: event?.duration ?? null };
  });
  const current = stages.find((s) => s.status === "running") ?? null;
  const completedCount = stages.filter((s) => s.status === "completed" || s.status === "skipped").length;
  return {
    stages,
    currentId: current?.id ?? null,
    current,
    completedCount,
    totalStages: stages.length,
    progress: input.runtimeProgress,
    derivedProgress: 0,
    elapsedLabel: "0s",
    remainingLabel: null,
    hasStarted: input.hasStarted,
    hasFailure: stages.some((s) => s.status === "failed"),
    isComplete: false,
  };
}

function eventsAt(stageCount: number, currentIsRunning = true) {
  return GENERATION_STAGES.slice(0, stageCount).map((s, i) => ({
    type: s.id,
    status: i === stageCount - 1 && currentIsRunning ? ("running" as const) : ("completed" as const),
  }));
}

describe("buildGenerationAnimation — pure mapping (animation state)", () => {
  it("maps every stage to its motion state with current/completed/failed flags", () => {
    const events = [
      ...GENERATION_STAGES.slice(0, 3).map((s) => ({ type: s.id, status: "completed" as const })),
      { type: GENERATION_STAGES[3].id, status: "running" as const },
      ...GENERATION_STAGES.slice(4).map((s) => ({ type: s.id, status: "pending" as const })),
    ];
    const anim = buildGenerationAnimation(buildExperience({ events, runtimeProgress: 45, elapsedMs: 0, estimatedRemainingMs: null, hasStarted: true }));

    expect(anim.stages).toHaveLength(GENERATION_STAGES.length);
    expect(anim.stages.filter((s) => s.isCompleted)).toHaveLength(3);
    expect(anim.stages.filter((s) => s.isCurrent)).toHaveLength(1);
    expect(anim.stages[3].isCurrent).toBe(true);
    expect(anim.stages[3].status).toBe("running");
    expect(anim.stages[0].isCompleted).toBe(true);
  });

  it("marks skipped and failed statuses correctly", () => {
    const events: Array<{ type: string; status: string }> = [
      { type: GENERATION_STAGES[0].id, status: "skipped" },
      { type: GENERATION_STAGES[1].id, status: "failed" },
    ];
    const anim = buildGenerationAnimation(buildExperience({ events, runtimeProgress: 10, elapsedMs: 0, estimatedRemainingMs: null, hasStarted: true }));
    expect(anim.stages[0].isCompleted).toBe(true); // skipped counts as done
    expect(anim.stages[1].isFailed).toBe(true);
    expect(anim.hasFailure).toBe(true);
  });

  it("changes activeStageKey only when the current stage changes (transition signature)", () => {
    const a = buildGenerationAnimation(buildExperience({ events: eventsAt(2), runtimeProgress: 15, elapsedMs: 0, estimatedRemainingMs: null, hasStarted: true }));
    const b = buildGenerationAnimation(buildExperience({ events: eventsAt(3), runtimeProgress: 25, elapsedMs: 0, estimatedRemainingMs: null, hasStarted: true }));
    expect(a.activeStageKey).not.toBe(b.activeStageKey);
    expect(a.activeStageKey).toBe(GENERATION_STAGES[1].id);
    expect(b.activeStageKey).toBe(GENERATION_STAGES[2].id);
  });

  it("passes runtime progress through verbatim — never owns or fabricates values", () => {
    const anim = buildGenerationAnimation(buildExperience({ events: eventsAt(4), runtimeProgress: 42, elapsedMs: 1000, estimatedRemainingMs: 4000, hasStarted: true }));
    expect(anim.progress).toBe(42);
    expect(anim.completedCount).toBe(3);
    expect(anim.totalStages).toBe(GENERATION_STAGES.length);
    expect(anim.hasFailure).toBe(false);
  });

  it("handles fast stage updates without broken state (sequential transitions)", () => {
    const expectedKeys: string[] = [];
    for (let i = 1; i <= GENERATION_STAGES.length; i++) {
      const anim = buildGenerationAnimation(buildExperience({ events: eventsAt(i), runtimeProgress: (i / GENERATION_STAGES.length) * 100, elapsedMs: i * 700, estimatedRemainingMs: null, hasStarted: true }));
      expectedKeys.push(anim.activeStageKey);
      // Exactly one current, everything before it completed.
      expect(anim.stages.filter((s) => s.isCurrent)).toHaveLength(1);
      expect(anim.stages.slice(0, i - 1).every((s) => s.isCompleted)).toBe(true);
    }
    expect(new Set(expectedKeys).size).toBe(GENERATION_STAGES.length);
    expect(expectedKeys[expectedKeys.length - 1]).toBe(GENERATION_STAGES[GENERATION_STAGES.length - 1].id);
  });

  it("no-op activeStageKey when nothing is running yet", () => {
    const anim = buildGenerationAnimation(buildExperience({ events: [], runtimeProgress: 0, elapsedMs: 0, estimatedRemainingMs: null, hasStarted: false }));
    expect(anim.activeStageKey).toBe("none");
    expect(anim.stages.every((s) => s.isCurrent === false)).toBe(true);
  });
});

describe("normalizeProgress — exact value contract (no overshoot/looping)", () => {
  it("preserves exact runtime values", () => {
    for (const v of [0, 7, 33.333, 50, 100]) expect(normalizeProgress(v)).toBe(v);
  });
  it("clamps below 0 and above 100", () => {
    expect(normalizeProgress(-5)).toBe(0);
    expect(normalizeProgress(120)).toBe(100);
  });
  it("defends against NaN and Infinity", () => {
    expect(normalizeProgress(NaN)).toBe(0);
    expect(normalizeProgress(Infinity)).toBe(100);
  });
});

describe("progressAria — accessibility contract", () => {
  it("exposes correct min/max/now", () => {
    expect(progressAria(55)).toEqual({ valuemin: 0, valuemax: 100, valuenow: 55 });
    expect(progressAria(33.4)).toEqual({ valuemin: 0, valuemax: 100, valuenow: 33 });
    expect(progressAria(150)).toEqual({ valuemin: 0, valuemax: 100, valuenow: 100 });
  });
});

// Re-exported so the module type is referenced (keeps import meaningful).
export type { GenerationAnimation };
