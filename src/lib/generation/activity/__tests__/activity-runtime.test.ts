import { describe, it, expect } from "vitest";
import { buildActivityState, deriveAgeLabel, heroMediaLabel, sectionCounts } from "@/lib/generation/activity/runtime";
import { ACTIVITY_DEFINITIONS, ACTIVITY_CATEGORIES } from "@/lib/generation/activity/config";
import { GENERATION_STAGES, type GenerationStageId } from "@/lib/generation/experience/stages";
import type { GenerationExperience, GenerationExperienceInput } from "@/features/onboarding/use-generation-experience";
import type { ActivitySnapshotInput } from "@/lib/generation/activity/runtime";

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
    elapsedMs: input.elapsedMs,
    elapsedLabel: "0s",
    remainingLabel: null,
    hasStarted: input.hasStarted,
    hasFailure: stages.some((s) => s.status === "failed"),
    isComplete: input.runtimeProgress >= 100 && completedCount === stages.length,
  };
}

function completedThrough(through: GenerationStageId, duration = 1500) {
  const idx = GENERATION_STAGES.findIndex((s) => s.id === through);
  return GENERATION_STAGES.map((s, i) => ({
    type: s.id,
    status: i <= idx ? ("completed" as const) : i === idx + 1 ? ("running" as const) : ("pending" as const),
    duration,
  }));
}

const exp = (events: Array<{ type: string; status: string; duration?: number | null }>, elapsedMs = 20000) => {
  const completed = events.filter((e) => e.status === "completed" || e.status === "skipped").length;
  const progress = (completed / GENERATION_STAGES.length) * 100;
  return buildExperience({
    events,
    runtimeProgress: progress,
    elapsedMs,
    estimatedRemainingMs: null,
    hasStarted: true,
  });
};

const snapshot: ActivitySnapshotInput = {
  meta: { themeId: "com.creatos.aurora-dark", creatorName: "Creator", tagline: "Tagline" },
  sections: [
    { moduleId: "hero.default", config: { resolvedMedia: "video" } },
    { moduleId: "products.grid", config: {} },
    { moduleId: "products.grid", config: {} },
    { moduleId: "products.grid", config: {} },
    { moduleId: "services.default", config: {} },
  ],
};

describe("Activity configuration integrity", () => {
  it("defines unique activity ids in chronological order", () => {
    const ids = ACTIVITY_DEFINITIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("preparing_workspace");
    expect(ids[ids.length - 1]).toBe("storefront_ready");
  });

  it("only depends on canonical generation stages", () => {
    const stageIds = new Set(GENERATION_STAGES.map((s) => s.id));
    for (const a of ACTIVITY_DEFINITIONS) {
      if (a.dependsOnStage) expect(stageIds.has(a.dependsOnStage)).toBe(true);
    }
  });

  it("uses only configured categories", () => {
    const cats = new Set(ACTIVITY_CATEGORIES.map((c) => c.id));
    for (const a of ACTIVITY_DEFINITIONS) expect(cats.has(a.category)).toBe(true);
  });

  it("defines exactly one terminal activity", () => {
    expect(ACTIVITY_DEFINITIONS.filter((a) => a.terminal)).toHaveLength(1);
  });
});

describe("buildActivityState — runtime-derived status", () => {
  it("everything is pending until the workflow starts; base activity completes", () => {
    const state = buildActivityState(exp([]));
    const base = state.find((a) => a.id === "preparing_workspace");
    expect(base?.status).toBe("completed");
    expect(state.filter((a) => a.status === "pending")).toHaveLength(ACTIVITY_DEFINITIONS.length - 1);
    expect(state.find((a) => a.id === "storefront_ready")?.status).toBe("pending");
  });

  it("activates activities in runtime order as stages complete", () => {
    const state = buildActivityState(exp(completedThrough("composition")));
    expect(state.find((a) => a.id === "import_profile")?.status).toBe("completed");
    expect(state.find((a) => a.id === "knowledge_intelligence")?.status).toBe("completed");
    expect(state.find((a) => a.id === "hero_composition")?.status).toBe("completed");
    expect(state.find((a) => a.id === "theme_applied")?.status).toBe("completed");
    expect(state.find((a) => a.id === "sections_generation")?.status).toBe("running");
    expect(state.find((a) => a.id === "publishing")?.status).toBe("pending");
  });

  it("marks only the newest running activity as active", () => {
    const state = buildActivityState(exp(completedThrough("artifact_generation")));
    const running = state.filter((a) => a.status === "running");
    expect(running.length).toBeGreaterThan(0);
    expect(state.filter((a) => a.isActive)).toHaveLength(1);
  });

  it("derives status transitions pending → running → completed", () => {
    const before = buildActivityState(
      exp(GENERATION_STAGES.map((s) => ({ type: s.id, status: "pending" }))),
    );
    expect(before.find((a) => a.id === "publishing")?.status).toBe("pending");

    const running = buildActivityState(
      exp(GENERATION_STAGES.map((s) => ({ type: s.id, status: s.id === "publishing" ? "running" : "pending" }))),
    );
    expect(running.find((a) => a.id === "publishing")?.status).toBe("running");

    const done = buildActivityState(exp(completedThrough("publishing")));
    expect(done.find((a) => a.id === "publishing")?.status).toBe("completed");
  });

  it("completes the terminal activity only when the workflow is complete", () => {
    const state = buildActivityState(exp(completedThrough("golden_validation"), 1500));
    const terminal = state.find((a) => a.id === "storefront_ready");
    expect(terminal?.status).toBe("completed");
    expect(state.every((a) => a.status === "completed" || a.status === "skipped")).toBe(true);
  });

  it("handles skipped and failed statuses", () => {
    const events = GENERATION_STAGES.map((s, i) => ({
      type: s.id,
      status: i === 1 ? ("skipped" as const) : i === 6 ? ("failed" as const) : ("pending" as const),
    }));
    const state = buildActivityState(exp(events));
    expect(state.find((a) => a.id === "knowledge_intelligence")?.status).toBe("skipped");
    expect(state.find((a) => a.id === "sections_generation")?.status).toBe("failed");
  });
});

describe("Timestamps and age labels", () => {
  it("derives cumulative timestamps from real stage durations", () => {
    const events = completedThrough("experience_planning", 1500); // 5 stages completed × 1500ms
    const state = buildActivityState(exp(events, 10000));
    const planning = state.find((a) => a.id === "planning_content");
    expect(planning?.timestampMs).toBe(1500 * 5);
    expect(planning?.ageLabel).toBe("2s ago"); // 10000 - 7500 = 2500ms
  });

  it("yields no timestamp when durations are absent (never fabricated)", () => {
    const events = completedThrough("composition").map((e) => ({ ...e, duration: null }));
    const state = buildActivityState(exp(events, 5000));
    expect(state.find((a) => a.id === "hero_composition")?.timestampMs).toBeNull();
    expect(state.find((a) => a.id === "hero_composition")?.ageLabel).toBeNull();
  });

  it("formats age labels relative to elapsed time", () => {
    expect(deriveAgeLabel(0, 0)).toBe("Just now");
    expect(deriveAgeLabel(10000, 10000)).toBe("Just now");
    expect(deriveAgeLabel(9000, 12000)).toBe("3s ago");
    expect(deriveAgeLabel(60000, 90000)).toBe("30s ago");
    expect(deriveAgeLabel(0, 150000)).toBe("2m 30s ago");
  });
});

describe("Failure — the feed freezes, history is preserved", () => {
  it("keeps completed activities and marks the failed one", () => {
    const events = [
      ...completedThrough("composition").slice(0, GENERATION_STAGES.findIndex((s) => s.id === "composition") + 1),
      ...GENERATION_STAGES.slice(GENERATION_STAGES.findIndex((s) => s.id === "composition") + 1).map((s) => ({
        type: s.id,
        status: s.id === "artifact_generation" ? ("failed" as const) : ("pending" as const),
      })),
    ];
    const state = buildActivityState(exp(events));
    expect(state.some((a) => a.status === "failed")).toBe(true);
    expect(state.find((a) => a.id === "hero_composition")?.status).toBe("completed");
    expect(state.find((a) => a.id === "sections_generation")?.status).toBe("failed");
    expect(state.find((a) => a.id === "publishing")?.status).toBe("pending");
    expect(state.find((a) => a.id === "storefront_ready")?.status).toBe("pending");
  });
});

describe("Metadata — only from real runtime data", () => {
  it("attaches theme id when the snapshot provides it", () => {
    const state = buildActivityState(exp(completedThrough("composition")), snapshot);
    const theme = state.find((a) => a.id === "theme_applied");
    expect(theme?.metadata).toEqual({ theme: "aurora-dark" });
  });

  it("attaches hero media label from the resolved hero config", () => {
    expect(heroMediaLabel(snapshot)).toBe("Video");
    const state = buildActivityState(exp(completedThrough("composition")), snapshot);
    expect(state.find((a) => a.id === "hero_composition")?.metadata).toEqual({ media: "Video" });
  });

  it("attaches real section counts", () => {
    expect(sectionCounts(snapshot)).toEqual({ hero: 1, products: 3, services: 1 });
    const state = buildActivityState(exp(completedThrough("artifact_generation")), snapshot);
    expect(state.find((a) => a.id === "sections_generation")?.metadata).toEqual({
      sections: 3,
      products: 3,
      services: 1,
    });
  });

  it("returns no metadata when the snapshot is absent (never fabricates)", () => {
    const state = buildActivityState(exp(completedThrough("composition")), null);
    expect(state.find((a) => a.id === "theme_applied")?.metadata).toBeNull();
    expect(state.find((a) => a.id === "hero_composition")?.metadata).toBeNull();
  });

  it("returns no metadata for activities without a metadata kind", () => {
    const state = buildActivityState(exp(completedThrough("composition")), snapshot);
    expect(state.find((a) => a.id === "import_profile")?.metadata).toBeNull();
  });
});
