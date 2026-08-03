// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ActivityFeedView } from "@/features/onboarding/components/activity-feed";
import { ACTIVITY_DEFINITIONS } from "@/lib/generation/activity/config";
import { GENERATION_STAGES } from "@/lib/generation/experience/stages";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";
import type { ActivitySnapshotInput } from "@/lib/generation/activity/runtime";

beforeEach(() => {
  cleanup();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

function experience(completedThrough: string, failed?: string, isComplete = false): GenerationExperience {
  const idx = GENERATION_STAGES.findIndex((s) => s.id === completedThrough);
  const stages = GENERATION_STAGES.map((cfg, i) => {
    const status: "pending" | "running" | "completed" | "failed" | "skipped" =
      failed === cfg.id ? "failed" : i <= idx ? "completed" : i === idx + 1 ? "running" : "pending";
    return { ...cfg, status, error: failed === cfg.id ? "boom" : null, duration: 1500 };
  });
  const current = stages.find((s) => s.status === "running") ?? null;
  const completedCount = stages.filter((s) => s.status === "completed").length;
  return {
    stages,
    currentId: current?.id ?? null,
    current,
    completedCount,
    totalStages: stages.length,
    progress: isComplete ? 100 : (idx / GENERATION_STAGES.length) * 100,
    derivedProgress: 0,
    elapsedMs: 20000,
    elapsedLabel: "20s",
    remainingLabel: null,
    hasStarted: true,
    hasFailure: !!failed,
    isComplete,
  };
}

const snapshot: ActivitySnapshotInput = {
  meta: { themeId: "com.creatos.aurora-dark", creatorName: "Creator", tagline: "Tagline" },
  sections: [
    { moduleId: "hero.default", config: { resolvedMedia: "video" } },
    { moduleId: "products.grid", config: {} },
    { moduleId: "products.grid", config: {} },
    { moduleId: "products.grid", config: {} },
  ],
};

describe("ActivityFeedView — component + accessibility", () => {
  it("renders every configured activity exactly once (no duplicates)", () => {
    const { container } = render(<ActivityFeedView experience={experience("")} snapshot={null} />);
    const rows = Array.from(container.querySelectorAll("[data-activity]"));
    expect(rows).toHaveLength(ACTIVITY_DEFINITIONS.length);
    const ids = rows.map((r) => r.getAttribute("data-activity"));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes a log with a polite live region and an ordered list", () => {
    const { container } = render(<ActivityFeedView experience={experience("")} snapshot={null} />);
    const log = container.querySelector('[role="log"]');
    expect(log?.getAttribute("aria-live")).toBe("polite");
    expect(log?.getAttribute("aria-label")).toContain("AI activity");
    expect(log?.querySelector("ol")).toBeTruthy();
  });

  it("reflects runtime statuses on each activity row", () => {
    const { container } = render(<ActivityFeedView experience={experience("composition")} snapshot={snapshot} />);
    expect(container.querySelector('[data-activity="import_profile"]')?.getAttribute("data-activity-status")).toBe("completed");
    expect(container.querySelector('[data-activity="hero_composition"]')?.getAttribute("data-activity-status")).toBe("completed");
    expect(container.querySelector('[data-activity="sections_generation"]')?.getAttribute("data-activity-status")).toBe("running");
    expect(container.querySelector('[data-activity="publishing"]')?.getAttribute("data-activity-status")).toBe("pending");
  });

  it("renders metadata chips only from real snapshot data", () => {
    const { container } = render(<ActivityFeedView experience={experience("composition")} snapshot={snapshot} />);
    expect(container.querySelector('[data-activity="theme_applied"] [data-activity-metadata="theme"]')?.textContent).toContain("aurora-dark");
    expect(container.querySelector('[data-activity="hero_composition"] [data-activity-metadata="media"]')?.textContent).toContain("Video");
  });

  it("shows no metadata when the snapshot is absent", () => {
    const { container } = render(<ActivityFeedView experience={experience("composition")} snapshot={null} />);
    expect(container.querySelector("[data-activity-metadata]")).toBeNull();
  });

  it("freezes the feed on failure, preserving completed history", () => {
    const { container } = render(<ActivityFeedView experience={experience("composition", "artifact_generation")} snapshot={snapshot} />);
    expect(container.querySelector("[data-activity-failure]")).toBeTruthy();
    expect(container.querySelector('[data-activity="hero_composition"]')?.getAttribute("data-activity-status")).toBe("completed");
    expect(container.querySelector('[data-activity="sections_generation"]')?.getAttribute("data-activity-status")).toBe("failed");
    expect(container.querySelector('[data-activity="publishing"]')?.getAttribute("data-activity-status")).toBe("pending");
    expect(container.querySelector('[data-activity="storefront_ready"]')?.getAttribute("data-activity-status")).toBe("pending");
  });

  it("completes the terminal activity and locks the feed on completion", () => {
    const { container } = render(<ActivityFeedView experience={experience("golden_validation", undefined, true)} snapshot={snapshot} />);
    expect(container.querySelector('[data-activity="storefront_ready"]')?.getAttribute("data-activity-status")).toBe("completed");
    expect(container.querySelector('[data-activity="storefront_ready"]')?.textContent).toContain("Storefront ready");
  });
});

describe("Reduced motion", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (q: string) => ({
        matches: true,
        media: q,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it("renders the full feed with reduced motion — no exceptions", () => {
    const { container } = render(<ActivityFeedView experience={experience("composition")} snapshot={snapshot} />);
    expect(container.querySelectorAll("[data-activity]").length).toBe(ACTIVITY_DEFINITIONS.length);
    expect(screen.getByTestId("activity-feed")).toBeTruthy();
  });
});
