// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GenerationExperienceView } from "@/features/onboarding/components/generation-experience-view";
import { GENERATION_STAGES } from "@/lib/generation/experience/stages";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";

type ReducedMotion = boolean;

/** Stub matchMedia so framer-motion's useReducedMotion reads our choice. */
function stubMatchMedia(reduce: ReducedMotion) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: reduce,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function experience(overrides: Partial<GenerationExperience> = {}): GenerationExperience {
  const completed = GENERATION_STAGES.slice(0, 3);
  const current = GENERATION_STAGES[3];
  return {
    stages: GENERATION_STAGES.map((cfg) => ({
      ...cfg,
      status: completed.some((c) => c.id === cfg.id) ? "completed" : cfg.id === current.id ? "running" : "pending",
      error: null,
      duration: null,
    })),
    currentId: current.id,
    current,
    completedCount: 3,
    totalStages: GENERATION_STAGES.length,
    progress: 55,
    derivedProgress: 40,
    elapsedMs: 1000,
    elapsedLabel: "1s",
    remainingLabel: "~5s remaining",
    hasStarted: true,
    hasFailure: false,
    isComplete: false,
    ...overrides,
  };
}

describe("GenerationExperienceView â€” component + accessibility", () => {
  beforeEach(() => {
    cleanup();
    stubMatchMedia(false);
  });

  it("renders an ARIA progressbar with the exact runtime value", () => {
    render(<GenerationExperienceView experience={experience({ progress: 55 })} />);
    const bar = screen.getByTestId("generation-progress");
    expect(bar.getAttribute("role")).toBe("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("55");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("aria-label")).toBe("Storefront generation progress");
  });

  it("exposes a polite status region for screen readers", () => {
    const { container } = render(<GenerationExperienceView experience={experience()} />);
    const status = container.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute("aria-live")).toBe("polite");
  });

  it("renders all canonical stages with runtime status attributes", () => {
    const { container } = render(<GenerationExperienceView experience={experience()} />);
    const rows = Array.from(container.querySelectorAll("[data-stage]"));
    expect(rows).toHaveLength(GENERATION_STAGES.length);
    const currentRow = rows.find((r) => r.getAttribute("data-status") === "running");
    expect(currentRow?.getAttribute("data-stage")).toBe(GENERATION_STAGES[3].id);
  });

  it("shows completed, current (glow indicator) and upcoming states distinctly", () => {
    const { container } = render(<GenerationExperienceView experience={experience()} />);
    // Completed stages â†’ success icon (emerald check).
    const checks = container.querySelectorAll("svg");
    // Current stage â†’ glow indicator (bordered, pulsing span).
    const glow = container.querySelector('[data-stage="' + GENERATION_STAGES[3].id + '"] .inline-block.h-4.w-4');
    expect(glow).toBeTruthy();
    expect(glow?.getAttribute("class") || "").toContain("rounded-full");
    expect(checks.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the failure banner when the runtime reports a failure", () => {
    const failed = experience();
    failed.stages = failed.stages.map((s) => (s.id === GENERATION_STAGES[2].id ? { ...s, status: "failed", error: "timeout" } : s));
    failed.hasFailure = true;
    render(<GenerationExperienceView experience={failed} />);
    expect(screen.getByText("Some steps had issues")).toBeTruthy();
    expect(screen.getByText("timeout")).toBeTruthy();
  });

  it("shows a screen-reader-only current-stage announcement", () => {
    render(<GenerationExperienceView experience={experience()} />);
    const sr = document.querySelector(".sr-only");
    expect(sr).toBeTruthy();
    expect(sr?.textContent).toContain(`Now: ${GENERATION_STAGES[3].title}`);
  });
});

describe("Reduced motion", () => {
  beforeEach(() => {
    cleanup();
    stubMatchMedia(true);
  });

  it("renders the full view instantly with reduced motion â€” same structure, no exceptions", () => {
    const { container } = render(<GenerationExperienceView experience={experience()} />);
    const rows = Array.from(container.querySelectorAll("[data-stage]"));
    expect(rows).toHaveLength(GENERATION_STAGES.length);
    const bar = screen.getByTestId("generation-progress");
    expect(bar.getAttribute("aria-valuenow")).toBe("55");
  });
});

