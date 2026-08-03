import { describe, it, expect } from "vitest";
import {
  buildConstructionState,
  stageStatusFromExperience,
} from "@/lib/generation/construction/runtime";
import {
  CONSTRUCTION_STEPS,
  CONSTRUCTION_THEME_DEPENDS_ON,
  type ConstructionStepId,
} from "@/lib/generation/construction/config";
import { GENERATION_STAGES, type GenerationStageId } from "@/lib/generation/experience/stages";
import type { GenerationExperience, GenerationExperienceInput } from "@/features/onboarding/use-generation-experience";

/** Build a full GenerationExperience from pure input (mirrors the hook). */
function buildExperience(input: GenerationExperienceInput): GenerationExperience {
  const stages = GENERATION_STAGES.map((cfg) => {
    const event = input.events.find((e) => e.type === cfg.id);
    const status = (event?.status ?? "pending") as GenerationExperience["stages"][number]["status"];
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

function completed(stage: GenerationStageId) {
  return GENERATION_STAGES.map((s) => ({ type: s.id, status: s.id === stage ? "completed" : "pending" }));
}
/** Progressive completion: every stage up to (and including) `through` is completed. */
function completedThrough(through: GenerationStageId) {
  const idx = GENERATION_STAGES.findIndex((s) => s.id === through);
  return GENERATION_STAGES.map((s, i) => ({ type: s.id, status: i <= idx ? "completed" : "pending" }));
}
function running(stage: GenerationStageId) {
  return GENERATION_STAGES.map((s) => ({ type: s.id, status: s.id === stage ? "running" : "pending" }));
}
function failed(stage: GenerationStageId) {
  return GENERATION_STAGES.map((s) => ({ type: s.id, status: s.id === stage ? "failed" : "pending" }));
}

const exp = (events: Array<{ type: string; status: string }>) =>
  buildExperience({ events, runtimeProgress: 0, elapsedMs: 0, estimatedRemainingMs: null, hasStarted: true });

describe("Construction configuration integrity", () => {
  it("has unique step ids in a fixed order", () => {
    const ids = CONSTRUCTION_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("shell");
    expect(ids[ids.length - 1]).toBe("footer");
  });

  it("only depends on canonical generation stages", () => {
    const stageIds = new Set<string>(GENERATION_STAGES.map((s) => s.id));
    for (const step of CONSTRUCTION_STEPS) {
      if (step.dependsOnStage) expect(stageIds.has(step.dependsOnStage)).toBe(true);
    }
    expect(stageIds.has(CONSTRUCTION_THEME_DEPENDS_ON)).toBe(true);
  });

  it("does not let two steps reveal the same module", () => {
    const revealed = CONSTRUCTION_STEPS.flatMap((s) => s.reveals);
    expect(new Set(revealed).size).toBe(revealed.length);
  });

  it("shell is the base step (no stage gate)", () => {
    expect(CONSTRUCTION_STEPS.find((s) => s.id === "shell")?.dependsOnStage).toBeNull();
  });
});

describe("buildConstructionState — eligibility is stage-driven", () => {
  it("nothing is gated-eligible before any stage completes (shell is the base)", () => {
    const state = buildConstructionState(exp([]));
    expect(state.steps.find((s) => s.id === "shell")?.status).toBe("completed");
    expect(state.steps.filter((s) => s.dependsOnStage).every((s) => s.status === "pending")).toBe(true);
    expect(state.themeEligible).toBe(false);
    expect(state.isComplete).toBe(false);
    expect(state.currentStep).toBeNull();
  });

  it("reveals nav only after experience_planning completes", () => {
    const state = buildConstructionState(exp(completed("experience_planning")));
    const nav = state.steps.find((s) => s.id === "nav");
    expect(nav?.isEligible).toBe(true);
    expect(state.steps.find((s) => s.id === "hero")?.isEligible).toBe(false);
    expect(state.steps.find((s) => s.id === "products")?.isEligible).toBe(false);
  });

  it("reveals hero AND applies the theme only when composition completes", () => {
    const state = buildConstructionState(exp(completed("composition")));
    expect(state.steps.find((s) => s.id === "hero")?.isEligible).toBe(true);
    expect(state.themeEligible).toBe(true);
    expect(state.steps.find((s) => s.id === "products")?.isEligible).toBe(false);
  });

  it("reveals products/services/testimonials/faq/content after artifact_generation", () => {
    const state = buildConstructionState(exp(completed("artifact_generation")));
    for (const id of ["products", "services", "testimonials", "faq", "content"] as ConstructionStepId[]) {
      expect(state.steps.find((s) => s.id === id)?.isEligible).toBe(true);
    }
    expect(state.steps.find((s) => s.id === "footer")?.isEligible).toBe(false);
  });

  it("finishes only when publishing completes and the theme is eligible", () => {
    const state = buildConstructionState(exp(completedThrough("publishing")));
    expect(state.steps.find((s) => s.id === "footer")?.isEligible).toBe(true);
    expect(state.steps.every((s) => s.isEligible)).toBe(true);
    expect(state.themeEligible).toBe(true);
    expect(state.isComplete).toBe(true);
  });

  it("marks the running stage's step as current", () => {
    const state = buildConstructionState(exp(running("artifact_generation")));
    const current = state.steps.find((s) => s.isCurrent);
    expect(current?.id).toBe("products");
    expect(current?.status).toBe("running");
    expect(state.currentStep?.id).toBe("products");
  });

  it("profile step tracks import_profile completion", () => {
    const state = buildConstructionState(exp(completed("import_profile")));
    expect(state.steps.find((s) => s.id === "profile")?.isEligible).toBe(true);
  });
});

describe("Failure handling — construction freezes, completed sections stay", () => {
  it("keeps completed steps eligible and marks the failed step", () => {
    const events = [
      ...completed("composition").slice(0, GENERATION_STAGES.findIndex((s) => s.id === "composition") + 1),
      ...failed("artifact_generation").slice(GENERATION_STAGES.findIndex((s) => s.id === "artifact_generation")),
    ];
    const state = buildConstructionState(exp(events));
    expect(state.isFailure).toBe(true);
    expect(state.steps.find((s) => s.id === "hero")?.isEligible).toBe(true);
    expect(state.steps.find((s) => s.id === "products")?.status).toBe("failed");
    expect(state.steps.find((s) => s.id === "faq")?.status).toBe("failed");
    expect(state.isComplete).toBe(false);
  });

  it("does not regress completed sections on later failure", () => {
    const events = [
      ...completed("experience_planning").slice(0, GENERATION_STAGES.findIndex((s) => s.id === "experience_planning") + 1),
      ...failed("composition").slice(GENERATION_STAGES.findIndex((s) => s.id === "composition")),
    ];
    const state = buildConstructionState(exp(events));
    expect(state.steps.find((s) => s.id === "nav")?.isEligible).toBe(true);
    expect(state.steps.find((s) => s.id === "hero")?.status).toBe("failed");
    expect(state.isFailure).toBe(true);
  });
});

describe("stageStatusFromExperience — pure lookup", () => {
  it("returns the stage status from the experience", () => {
    const experience = exp(completed("import_profile"));
    expect(stageStatusFromExperience(experience, "import_profile")).toBe("completed");
    expect(stageStatusFromExperience(experience, "composition")).toBe("pending");
    expect(stageStatusFromExperience(experience, null)).toBeNull();
  });
});
