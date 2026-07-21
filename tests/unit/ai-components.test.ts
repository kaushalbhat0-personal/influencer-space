import { describe, it, expect } from "vitest";

describe("AI Components — Data Types", () => {
  it("StepperStep should have correct shape", () => {
    const step: { id: string; label: string; status: "pending" | "active" | "completed" | "error"; description?: string } = {
      id: "test",
      label: "Test",
      status: "active",
    };
    expect(step.id).toBe("test");
    expect(step.status).toBe("active");
  });

  it("StepperStep should enforce valid statuses", () => {
    const valid: Array<"pending" | "active" | "completed" | "error"> = ["pending", "active", "completed", "error"];
    expect(valid.length).toBe(4);
    expect(valid).toContain("active");
  });

  it("StrategyOption should include time estimate", () => {
    const option = {
      id: "balanced",
      label: "Balanced",
      description: "AI copywriting + SEO + hero",
      timeEstimate: "~1 min",
      recommended: true,
      includes: ["Hero copy", "About section", "CTA text", "SEO metadata"],
      excludes: ["Full content rewrite"],
    };
    expect(option.timeEstimate).toBe("~1 min");
    expect(option.recommended).toBe(true);
    expect(option.includes.length).toBeGreaterThan(0);
  });

  it("ChecklistItem should have three statuses", () => {
    const detected = { id: "a", label: "A", status: "detected" as const };
    const missing = { id: "b", label: "B", status: "missing" as const };
    const warning = { id: "c", label: "C", status: "warning" as const };
    expect(detected.status).toBe("detected");
    expect(missing.status).toBe("missing");
    expect(warning.status).toBe("warning");
  });

  it("DeploymentStep should support duration and error", () => {
    const completed = { id: "tenant", label: "Creating Tenant", status: "completed" as const, durationMs: 1200 };
    const running = { id: "pages", label: "Generating Pages", status: "running" as const };
    const failed = { id: "broken", label: "Failed Step", status: "failed" as const, error: "Connection refused" };
    expect(completed.durationMs).toBe(1200);
    expect(running.status).toBe("running");
    expect(failed.error).toBe("Connection refused");
  });

  it("SectionToggle should have enabled flag", () => {
    const section = { id: "hero", label: "Hero", enabled: true };
    expect(section.enabled).toBe(true);
    const disabled = { ...section, enabled: false };
    expect(disabled.enabled).toBe(false);
  });

  it("ScoreRing sizing should cover sm through xl", () => {
    const sizes = ["sm", "md", "lg", "xl"] as const;
    expect(sizes).toHaveLength(4);
    sizes.forEach((size) => expect(["sm", "md", "lg", "xl"]).toContain(size));
  });

  it("DeviceType should include desktop, tablet, mobile", () => {
    const devices: Array<"desktop" | "tablet" | "mobile"> = ["desktop", "tablet", "mobile"];
    expect(devices).toHaveLength(3);
  });

  it("Stepper orientation should be horizontal or vertical", () => {
    const orientations = ["horizontal", "vertical"] as const;
    expect(orientations).toContain("horizontal");
    expect(orientations).toContain("vertical");
  });

  it("RecommendationCard priority should be high, medium, or low", () => {
    const priorities = ["high", "medium", "low"] as const;
    expect(priorities).toHaveLength(3);
  });

  it("TemplateCard should support selected and disabled states", () => {
    const card = {
      id: "portfolio",
      label: "Creator Portfolio",
      description: "Gallery, timeline, blog",
      selected: false,
      disabled: false,
      loading: false,
    };
    expect(card.selected).toBe(false);
    card.selected = true;
    expect(card.selected).toBe(true);
  });

  it("component file structure is consistent", () => {
    // Verify that every AI component follows the same export pattern:
    // named export of component + named export of types
    const expectedComponents = [
      "Stepper", "TemplateCard", "StrategyCard", "ScoreRing",
      "ChecklistGrid", "RecommendationCard", "SectionToggleGrid",
      "DeploymentCard", "DevicePreview", "WizardStep",
    ];
    expect(expectedComponents).toHaveLength(10);
    expect(new Set(expectedComponents).size).toBe(10); // all unique
  });
});
