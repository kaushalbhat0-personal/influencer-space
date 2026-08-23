// @vitest-environment jsdom
/**
 * RCCF-MKT-02-R1 — homepage structure & accessibility render tests.
 * Pins the repositioned narrative at the component level:
 *   - hero headline carries the positioning
 *   - the how-it-works timeline renders ONE set of step headings
 *     (the old component duplicated desktop+mobile heading sets)
 *   - final CTA closes on the positioning with real routes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/analytics/marketing", () => ({
  MarketingEvents: {
    heroInputFocused: vi.fn(),
    heroInputUrlEntered: vi.fn(),
    heroInputPlatformDetected: vi.fn(),
    heroInputSubmitted: vi.fn(),
  },
}));

beforeEach(() => cleanup());

describe("RCCF-MKT-02-R1 — Hero", () => {
  it("renders the positioning headline as a single H1", async () => {
    const { Hero } = await import("@/components/marketing/Hero");
    const { container } = render(<Hero />);
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toContain("Your presence.");
    expect(h1!.textContent).toContain("business");
    expect(container.querySelectorAll("h1").length).toBe(1);
    // Supporting idea present and CTA input wired.
    expect(screen.getByText(/professional home for everything you create/i)).toBeTruthy();
    expect(document.getElementById("social-url")).not.toBeNull();
  });
});

describe("RCCF-MKT-02-R1 — HowItWorks timeline", () => {
  it("renders exactly one set of step headings (no duplicated DOM timelines)", async () => {
    const { HowItWorks } = await import("@/components/marketing/HowItWorks");
    const { container } = render(<HowItWorks />);
    const steps = container.querySelectorAll("ol > li");
    expect(steps.length).toBe(5);
    const headings = container.querySelectorAll("h3");
    expect(headings.length).toBe(5); // old bug rendered 2× (desktop + mobile)
    expect(container.querySelector("ol")).not.toBeNull(); // semantic ordered list
  });

  it("uses truthful step language without internal jargon or AI overclaims", async () => {
    const source = (await import("node:fs")).readFileSync("src/components/marketing/HowItWorks.tsx", "utf8");
    expect(source).not.toContain("Planner DAG");
    expect(source).not.toMatch(/\bAI\b/);
  });
});

describe("RCCF-MKT-02-R1 — FinalCta", () => {
  it("closes on the positioning with working persona CTAs", async () => {
    const { FinalCta } = await import("@/components/marketing/FinalCta");
    render(<FinalCta />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("Your presence. Your business.");
    const creator = screen.getByRole("link", { name: "Start as Creator" }) as HTMLAnchorElement;
    const partner = screen.getByRole("link", { name: "Become a Partner" }) as HTMLAnchorElement;
    expect(creator.getAttribute("href")).toBe("/signup?persona=creator");
    expect(partner.getAttribute("href")).toBe("/signup?persona=partner");
  });
});

describe("RCCF-MKT-02-R1 — new narrative sections render cleanly", () => {
  it("CoreIdea presents one composed home (no repeated icon-card grid)", async () => {
    const { CoreIdea } = await import("@/components/marketing/CoreIdea");
    const { container } = render(<CoreIdea />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("One home.");
    expect(container.querySelectorAll("[role='list'] > div").length).toBeGreaterThan(0);
  });

  it("GrowBand shows the conceptual progression Presence → Grow", async () => {
    const { GrowBand } = await import("@/components/marketing/GrowBand");
    render(<GrowBand />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(5);
    expect(items[0]!.textContent).toContain("Presence");
    expect(items[items.length - 1]!.textContent).toContain("Grow");
  });

  it("CreatorShowcase represents broad audiences without fabricated people", async () => {
    const { CreatorShowcase } = await import("@/components/marketing/CreatorShowcase");
    render(<CreatorShowcase />);
    expect(screen.getByText(/Show what you do\./i)).toBeTruthy();
    // No fictional named creators with empty storefront placeholders.
    expect(screen.queryByText(/Storefront preview/i)).toBeNull();
    expect(screen.queryByText(/TechBytes|FitWithPriya|BeatLab/)).toBeNull();
  });

  // RCCF-MKT-03: the deferral ended — the certified SPower Gaming captures
  // (RCCF-MKT-02/R2/R3) are wired in as demonstration. The guardrail is
  // modernized: exactly the two canonical certified assets, nothing else.
  // RCCF-MKT-04-R1: the primary capture is breakpoint-aware (<picture> renders
  // one <img> whose src is the mobile default; a <source> carries the desktop
  // asset at md+), plus the phone side-card — still only certified assets.
  it("StorefrontShowcase renders exactly the two certified example captures", async () => {
    const { StorefrontShowcase } = await import("@/components/marketing/StorefrontShowcase");
    const { container } = render(<StorefrontShowcase />);
    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs.length).toBe(2);
    const rendered = new Set(
      imgs.flatMap((i) => [
        i.getAttribute("src"),
        ...Array.from(i.parentElement?.querySelectorAll("source") ?? []).map((s) => s.getAttribute("srcSet")),
      ]).filter(Boolean) as string[],
    );
    expect(rendered).toEqual(new Set([
      "/marketing-assets/storefront/01-desktop.png",
      "/marketing-assets/storefront/02-mobile.png",
    ]));
    expect(screen.getByText(/You keep 100%/i)).toBeTruthy();
  });
});
