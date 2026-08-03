import { describe, it, expect } from "vitest";
import {
  GENERATION_STAGES,
  TOTAL_STAGE_WEIGHT,
  deriveStageStatus,
  deriveWeightedProgress,
  deriveCurrentStage,
  deriveCompletedCount,
  type RuntimeStageEvent,
} from "@/lib/generation/experience/stages";
import { formatDuration } from "@/features/onboarding/use-generation-experience";

describe("Generation Experience model — stage config", () => {
  it("defines the canonical 10-stage pipeline in order", () => {
    expect(GENERATION_STAGES.map((s) => s.id)).toEqual([
      "import_profile",
      "knowledge_intelligence",
      "persona_detection",
      "planning_context",
      "experience_planning",
      "composition",
      "artifact_generation",
      "provisioning",
      "publishing",
      "golden_validation",
    ]);
  });

  it("every stage has a title, description, icon and positive weight", () => {
    for (const s of GENERATION_STAGES) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
      expect(s.icon.length).toBeGreaterThan(0);
      expect(s.estimatedWeight).toBeGreaterThan(0);
    }
  });

  it("stage ids are unique", () => {
    expect(new Set(GENERATION_STAGES.map((s) => s.id)).size).toBe(GENERATION_STAGES.length);
  });

  it("total weight is the sum of all stages", () => {
    const sum = GENERATION_STAGES.reduce((a, s) => a + s.estimatedWeight, 0);
    expect(TOTAL_STAGE_WEIGHT).toBe(sum);
    expect(TOTAL_STAGE_WEIGHT).toBe(100);
  });
});

describe("deriveStageStatus", () => {
  const ev: RuntimeStageEvent[] = [
    { type: "import_profile", status: "completed" },
    { type: "knowledge_intelligence", status: "running" },
  ];

  it("maps completed / running / failed / skipped from runtime events", () => {
    expect(deriveStageStatus(ev, "import_profile")).toBe("completed");
    expect(deriveStageStatus(ev, "knowledge_intelligence")).toBe("running");
    expect(deriveStageStatus([{ type: "publishing", status: "failed" }], "publishing")).toBe("failed");
    expect(deriveStageStatus([{ type: "provisioning", status: "skipped" }], "provisioning")).toBe("skipped");
  });

  it("returns pending when no event exists", () => {
    expect(deriveStageStatus([], "publishing")).toBe("pending");
    expect(deriveStageStatus(ev, "golden_validation")).toBe("pending");
  });
});

describe("deriveWeightedProgress — never exceeds reality", () => {
  it("is 0 when nothing is completed", () => {
    expect(deriveWeightedProgress([])).toBe(0);
    expect(deriveWeightedProgress([{ type: "import_profile", status: "running" }])).toBe(0);
  });

  it("reflects only completed/skipped stages (running contributes 0)", () => {
    const one = [{ type: "import_profile", status: "completed" }, { type: "knowledge_intelligence", status: "running" }];
    expect(deriveWeightedProgress(one)).toBe(5);
  });

  it("is 100 only when every stage is completed", () => {
    const all = GENERATION_STAGES.map((s) => ({ type: s.id, status: "completed" as const }));
    expect(deriveWeightedProgress(all)).toBe(100);
  });

  it("never returns more than 100", () => {
    const all = GENERATION_STAGES.map((s) => ({ type: s.id, status: "completed" as const }));
    expect(deriveWeightedProgress(all)).toBeLessThanOrEqual(100);
  });
});

describe("deriveCurrentStage / deriveCompletedCount", () => {
  it("returns the first running stage in sequence order", () => {
    const events = [
      { type: "import_profile", status: "completed" },
      { type: "knowledge_intelligence", status: "running" },
      { type: "persona_detection", status: "running" },
    ];
    expect(deriveCurrentStage(events)).toBe("knowledge_intelligence");
  });

  it("returns null when nothing is running", () => {
    expect(deriveCurrentStage([])).toBeNull();
  });

  it("counts completed and skipped stages", () => {
    const events = [
      { type: "import_profile", status: "completed" },
      { type: "knowledge_intelligence", status: "skipped" },
      { type: "persona_detection", status: "failed" },
    ];
    expect(deriveCompletedCount(events)).toBe(2);
  });
});

describe("formatDuration", () => {
  it("formats seconds and minutes", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(42000)).toBe("42s");
    expect(formatDuration(90000)).toBe("1m 30s");
  });
});
