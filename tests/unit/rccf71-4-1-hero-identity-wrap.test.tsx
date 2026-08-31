// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";

// RCCF-71.4.1 P3 — a long Hero identity/title extended past the 390px Builder
// canvas and was clipped on both sides. Root cause: the canonical HeroRenderer
// H1/H2 had no overflow-wrap control, so long unbroken identity content
// overflowed the container instead of wrapping. Fix: `break-words` on the
// canonical H1/H2 (overflow-wrap: break-word) so names/titles always wrap
// inside the canvas at 390/375/320px. The fix lives in the SINGLE canonical
// renderer shared by storefront, preview route, Builder canvas and settings
// preview — not a Builder-only patch.

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

class NoopIO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
class NoopRO { observe() {} unobserve() {} disconnect() {} }

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

import { HeroRenderer } from "@/lib/registry/components/renderers";

const LONG_IDENTITY = "RCCF 70.4.6.1 QA — a really, really long creator identity that must wrap";

describe("RCCF-71.4.1 P3 — long Hero identity wraps instead of clipping", () => {
  it("renders the H1 identity with overflow-wrap (break-words)", () => {
    const { container } = render(
      <HeroRenderer
        props={{
          name: LONG_IDENTITY,
          title: "Long Title That Also Wraps",
          resolvedMedia: "placeholder",
          mediaUrl: "",
          mediaPoster: "",
          showLiveBadge: false,
          socialLinks: [],
        }}
        previewMode
      />,
    );

    const h1 = container.querySelector("h1");
    expect(h1?.textContent).toContain(LONG_IDENTITY);
    expect(h1?.className).toContain("break-words");
  });

  it("renders the secondary title (h2) with overflow-wrap (break-words)", () => {
    const { container } = render(
      <HeroRenderer
        props={{
          name: "Farah Khan",
          title: LONG_IDENTITY,
          resolvedMedia: "placeholder",
          mediaUrl: "",
          mediaPoster: "",
          showLiveBadge: false,
          socialLinks: [],
        }}
        previewMode
      />,
    );

    const h2 = container.querySelector("h2");
    expect(h2?.textContent).toContain(LONG_IDENTITY);
    expect(h2?.className).toContain("break-words");
  });
});

describe("RCCF-71.4.1 P3 — source-level guardrail (canonical renderer only)", () => {
  it("HeroRenderer carries break-words on the identity/title and no nowrap is introduced", () => {
    const src = readFileSync("src/lib/registry/components/renderers.tsx", "utf8");
    expect(src).toContain("break-words");
    expect(src).not.toMatch(/whitespace-nowrap/);
  });
});
