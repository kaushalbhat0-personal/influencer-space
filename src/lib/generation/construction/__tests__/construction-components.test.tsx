// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ConstructionPreview } from "@/features/onboarding/components/construction-preview";
import { GENERATION_STAGES } from "@/lib/generation/experience/stages";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";
import type { ConstructionSnapshotData } from "@/actions/construction.actions";

/* jsdom lacks IntersectionObserver / ResizeObserver used by nav + renderers. */
class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
class NoopRO {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  cleanup();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
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

function experience(completedThrough: string, failed?: string): GenerationExperience {
  const idx = GENERATION_STAGES.findIndex((s) => s.id === completedThrough);
  const stages = GENERATION_STAGES.map((cfg, i) => {
    const status: "pending" | "running" | "completed" | "failed" =
      failed === cfg.id ? "failed" : i <= idx ? "completed" : i === idx + 1 ? "running" : "pending";
    return { ...cfg, status, error: failed === cfg.id ? "boom" : null, duration: null };
  });
  const current = stages.find((s) => s.status === "running") ?? null;
  const completedCount = stages.filter((s) => s.status === "completed").length;
  return {
    stages,
    currentId: current?.id ?? null,
    current,
    completedCount,
    totalStages: stages.length,
    progress: (idx / GENERATION_STAGES.length) * 100,
    derivedProgress: 0,
    elapsedMs: 1000,
    elapsedLabel: "1s",
    remainingLabel: null,
    hasStarted: true,
    hasFailure: !!failed,
    isComplete: false,
  };
}

const snapshot: ConstructionSnapshotData = {
  theme: {
    "--brand-primary": "#8B5CF6",
    "--surface-root": "#0E0E11",
    "--text-primary": "#F5F3FF",
  },
  navigation: [{ id: "n1", label: "Home", href: "#hero", type: "anchor", visible: true }],
  sections: [
    {
      sectionId: "sec-hero",
      moduleId: "hero.default",
      config: {
        title: "Construction Hero",
        name: "Creator",
        tagline: "Tagline",
        bio: "A short bio",
        ctaText: "Get Started",
        ctaLink: "/",
        ctaSecondaryText: "Learn more",
        ctaSecondaryLink: "/about",
        resolvedMedia: "placeholder",
        rendererDecision: "placeholder",
      },
    },
  ],
  meta: { title: "Construction", description: "Preview", themeId: null, creatorName: null, tagline: null },
};

describe("ConstructionPreview â€” component + accessibility", () => {
  it("renders the preview frame with theme NOT applied before the theme stage", () => {
    const { container } = render(
      <ConstructionPreview experience={experience("")} snapshot={snapshot} subdomain="test-creator-1" />,
    );
    const frame = container.querySelector('[data-testid="construction-preview"]');
    expect(frame).toBeTruthy();
    expect(frame?.getAttribute("data-theme-eligible")).toBe("false");
    expect(frame?.textContent).toContain("test-creator-1");
  });

  it("applies the runtime theme only when composition completes", () => {
    const { container } = render(
      <ConstructionPreview experience={experience("composition")} snapshot={snapshot} subdomain="test-creator-1" />,
    );
    const frame = container.querySelector('[data-testid="construction-preview"]');
    expect(frame?.getAttribute("data-theme-eligible")).toBe("true");
    const themed = frame?.querySelector("[style]");
    expect(themed && (themed as HTMLElement).style.getPropertyValue("--brand-primary")).toBe("#8B5CF6");
  });

  it("renders skeletons for sections whose stage has not completed", () => {
    const { container } = render(
      <ConstructionPreview experience={experience("")} snapshot={snapshot} subdomain="test-creator-1" />,
    );
    expect(container.querySelector('[data-skeleton="nav"]')).toBeTruthy();
    expect(container.querySelector('[data-skeleton="hero"]')).toBeTruthy();
    expect(container.querySelector('[data-skeleton="products"]')).toBeTruthy();
    expect(container.querySelector('[data-construction-section]')).toBeFalsy();
  });

  it("reveals the REAL section through the single renderer after the stage completes", () => {
    const { container } = render(
      <ConstructionPreview experience={experience("composition")} snapshot={snapshot} subdomain="test-creator-1" />,
    );
    const real = container.querySelector('[data-construction-section="hero.default"]');
    expect(real).toBeTruthy();
    expect(real?.getAttribute("data-status")).toBe("completed");
    expect(container.querySelector('[data-skeleton="hero"]')).toBeFalsy();
    expect(container.textContent).toContain("Construction Hero");
  });

  it("keeps completed sections on failure and shows the frozen banner", () => {
    const { container } = render(
      <ConstructionPreview experience={experience("composition", "artifact_generation")} snapshot={snapshot} subdomain="x" />,
    );
    expect(container.querySelector('[data-construction-failure]')).toBeTruthy();
    expect(container.querySelector('[data-construction-step="hero"]')).toBeTruthy();
    expect(container.querySelector('[data-construction-section="hero.default"]')).toBeTruthy();
  });

  it("exposes step chips (decorative) and a status line", () => {
    const { container } = render(
      <ConstructionPreview experience={experience("")} snapshot={null} subdomain="test-creator-1" />,
    );
    expect(container.querySelector('[data-construction-chip="hero"]')).toBeTruthy();
    expect(screen.getByTestId("construction-status").textContent).toContain("Creator profile imported");
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

  it("renders the full construction view with reduced motion â€” no exceptions", () => {
    const { container } = render(
      <ConstructionPreview experience={experience("composition")} snapshot={snapshot} subdomain="test-creator-1" />,
    );
    expect(container.querySelector('[data-construction-section="hero.default"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="construction-preview"]')).toBeTruthy();
  });
});

