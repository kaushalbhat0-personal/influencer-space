// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// RCCF-70.5.2 — the Dashboard Hero settings preview is the CANONICAL Hero, not
// a mock: it reuses the runtime resolver (video → poster → background →
// placeholder), renders the real HeroRenderer inside a @container/main frame,
// and stays non-actionable. No second resolver, no second renderer, no stale
// media, no navigation.

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return {
    ...actual,
    useFormState: vi.fn((_action: unknown, initialState: unknown) => [initialState, vi.fn()]),
  };
});

vi.mock("@/lib/supabase", () => ({
  BUCKET: "influencer-images",
  supabaseClient: {},
  supabaseAdmin: {},
}));

class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
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
    value: (q: string) => ({ matches: false, media: q, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  vi.clearAllMocks();
});

import { resolveHeroMediaForRuntime } from "@/lib/media/hero-media";
import { SettingsLivePreview } from "@/features/settings/components/settings-live-preview";
import { HeroRenderer } from "@/lib/registry/components/renderers";

const BASE_PROPS = {
  videoUrl: "",
  posterUrl: "",
  backgroundUrl: "",
  videoDesktopAlignment: "center" as const,
  videoMobileAlignment: "center" as const,
  imageDesktopAlignment: "center" as const,
  imageMobileAlignment: "center" as const,
  profileUrl: null,
  name: "Farah Khan",
  title: "S8UL Esports",
  subtitle: "",
  tagline: "BGMI Pro",
  bio: "Creator bio",
  ctaText: "Subscribe",
  ctaLink: "https://youtube.com/@farah",
  ctaSecondaryText: "Follow on IG",
  ctaSecondaryLink: "https://instagram.com/farah",
  liveBadgeText: "Live on YouTube",
  showLiveBadge: true,
  socialLinks: [{ platform: "youtube", url: "https://youtube.com/@farah" }],
};

describe("RCCF-70.5.2 — canonical resolver parity", () => {
  it("resolveHeroMediaForRuntime applies video → poster → background → placeholder precedence", () => {
    const video = resolveHeroMediaForRuntime({ videoUrl: "v.mp4", posterUrl: "p.jpg" });
    expect(video.resolvedMedia).toBe("video");
    expect(video.mediaUrl).toBe("v.mp4");
    expect(video.mediaPoster).toBe("p.jpg");

    const image = resolveHeroMediaForRuntime({ videoUrl: "", posterUrl: "p.jpg" });
    expect(image.resolvedMedia).toBe("image");
    expect(image.mediaUrl).toBe("p.jpg");
    expect(image.mediaPoster).toBeNull();

    const bg = resolveHeroMediaForRuntime({ videoUrl: "", posterUrl: "", backgroundUrl: "b.jpg" });
    expect(bg.resolvedMedia).toBe("background");
    expect(bg.mediaUrl).toBe("b.jpg");

    const none = resolveHeroMediaForRuntime({});
    expect(none.resolvedMedia).toBe("placeholder");
    expect(none.mediaUrl).toBeNull();
  });

  it("preview renders the canonical decision onto the renderer (video)", () => {
    const { container } = render(
      <SettingsLivePreview {...BASE_PROPS} videoUrl="https://cdn.test/v.mp4" posterUrl="https://cdn.test/p.jpg" />,
    );
    const root = container.querySelector("[data-resolved-media]");
    expect(root?.getAttribute("data-resolved-media")).toBe("video");
    expect(container.querySelector("video")).toBeTruthy();
  });

  it("preview renders the canonical decision onto the renderer (background)", () => {
    const { container } = render(
      <SettingsLivePreview {...BASE_PROPS} backgroundUrl="https://cdn.test/b.jpg" />,
    );
    const root = container.querySelector("[data-resolved-media]");
    expect(root?.getAttribute("data-resolved-media")).toBe("background");
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("cleared media renders placeholder — no stale media lingers", () => {
    const { container, rerender } = render(
      <SettingsLivePreview {...BASE_PROPS} videoUrl="https://cdn.test/v.mp4" posterUrl="https://cdn.test/p.jpg" />,
    );
    expect(container.querySelector("[data-resolved-media]")?.getAttribute("data-resolved-media")).toBe("video");

    rerender(<SettingsLivePreview {...BASE_PROPS} />);
    expect(container.querySelector("[data-resolved-media]")?.getAttribute("data-resolved-media")).toBe("placeholder");
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("preview frame is a named @container/main boundary (device-width driven)", () => {
    const { container } = render(<SettingsLivePreview {...BASE_PROPS} videoUrl="https://cdn.test/v.mp4" />);
    const frame = container.querySelector(".\\@container\\/main") as HTMLElement | null;
    expect(frame).toBeTruthy();
    expect(frame?.style.width).toBe("320px");
  });
});

describe("RCCF-70.5.2 — non-actionable preview", () => {
  it("HeroRenderer previewMode renders CTAs and social links as inert spans (no href)", () => {
    const { container } = render(
      <HeroRenderer
        props={{
          cta: "Subscribe",
          ctaLink: "https://youtube.com/@farah",
          ctaSecondaryText: "Follow on IG",
          ctaSecondaryLink: "https://instagram.com/farah",
          socialLinks: [{ platform: "youtube", url: "https://youtube.com/@farah" }],
          resolvedMedia: "placeholder",
          mediaUrl: "",
          mediaPoster: "",
        }}
        previewMode
      />,
    );
    expect(container.querySelector("a[href]")).toBeNull();
    expect(container.textContent).toContain("Subscribe");
    expect(container.textContent).toContain("Follow on IG");
    expect(container.textContent).toContain("Youtube");
  });

  it("HeroRenderer without previewMode keeps real navigation", () => {
    const { container } = render(
      <HeroRenderer
        props={{
          cta: "Subscribe",
          ctaLink: "https://youtube.com/@farah",
          socialLinks: [{ platform: "youtube", url: "https://youtube.com/@farah" }],
          resolvedMedia: "placeholder",
          mediaUrl: "",
          mediaPoster: "",
        }}
      />,
    );
    const hrefs = Array.from(container.querySelectorAll("a[href]")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://youtube.com/@farah");
  });

  it("SettingsLivePreview never emits navigation from the preview", () => {
    const { container } = render(
      <SettingsLivePreview {...BASE_PROPS} videoUrl="https://cdn.test/v.mp4" />,
    );
    expect(container.querySelector("a[href]")).toBeNull();
  });
});