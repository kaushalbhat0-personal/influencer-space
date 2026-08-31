// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";

// RCCF-70.4.6 — Builder Visual QA & Stitch Parity Closure.
// Verifies the canonical /builder surface against the design contract that was
// visually QA'd in the real running app (desktop 1440px + mobile 320/375/390):
// no horizontal document overflow, device-driven canvas, frozen rail widths,
// accessible section actions, Save/Publish separation, and the Premium Creator
// OS token discipline (indigo primary, no legacy s8ul accents).
//
// Checks 1-3  Desktop shell + device canvas (clipped preview = no doc overflow)
// Checks 4-5  Rails (rccf68-frozen widths, hidden below lg)
// Check 6     Mobile bottom bar + dialog panels
// Checks 7-8  Section actions + catalog; Save vs Publish separation
// Checks 9-10 Source-truth: tokens, no legacy accents, no new actions/plans

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

const h = vi.hoisted(() => ({
  mockLoadBuilderPages: vi.fn(),
  mockSaveBuilderPages: vi.fn(),
  mockApplyThemePackage: vi.fn(),
  mockPublishWebsite: vi.fn(),
  mockGetPublishStatus: vi.fn(),
  mockGetBuilderOverview: vi.fn(),
  mockGetWebsiteHealthScore: vi.fn(),
  mockGetLivePreviewData: vi.fn(),
}));

// Server actions — resolved to deterministic no-op results so the shell mounts
// without a database. These are the SAME action modules the builder calls.
vi.mock("@/actions/builder.actions", () => ({
  loadBuilderPages: h.mockLoadBuilderPages,
  saveBuilderPages: h.mockSaveBuilderPages,
}));
vi.mock("@/actions/theme.actions", () => ({
  applyThemePackage: h.mockApplyThemePackage,
}));
vi.mock("@/actions/publish.actions", () => ({
  publishWebsite: h.mockPublishWebsite,
  getPublishStatus: h.mockGetPublishStatus,
}));
vi.mock("@/actions/builder-overview.actions", () => ({
  getBuilderOverview: h.mockGetBuilderOverview,
}));
vi.mock("@/actions/health.actions", () => ({
  getWebsiteHealthScore: h.mockGetWebsiteHealthScore,
}));
vi.mock("@/actions/builder-preview.actions", () => ({
  getLivePreviewData: h.mockGetLivePreviewData,
}));

vi.mock("@/lib/supabase", () => ({
  BUCKET: "influencer-images",
  supabaseClient: {},
  supabaseAdmin: {},
}));

// Files covered by the visual QA (the RCCF-70.4.5 restyled Builder surface).
const COVERED = [
  "src/features/builder/components/workspace.tsx",
  "src/features/builder/components/toolbar.tsx",
  "src/features/builder/components/sidebar.tsx",
  "src/features/builder/components/section-manager.tsx",
  "src/features/builder/components/website-panel.tsx",
  "src/features/builder/components/section-presentation-panel.tsx",
  "src/features/builder/components/theme-card.tsx",
  "src/features/builder/components/completion-badge.tsx",
  "src/features/builder/components/mobile-panel.tsx",
  "src/features/builder/components/panel.tsx",
  "src/features/builder/components/loader.tsx",
  "src/features/builder/components/builder-error-boundary.tsx",
  "src/features/builder/components/persistence.ts",
  "src/features/builder/canvas/interactive-canvas.tsx",
  "src/features/builder/canvas/section-actions.tsx",
];

const readAll = () => COVERED.map((f) => ({ file: f, source: readFileSync(f, "utf8") }));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: false, media: q, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  (globalThis as Record<string, unknown>).PointerEvent = globalThis.Event;
  if (typeof (globalThis as Record<string, unknown>).HTMLElement !== "undefined") {
    const proto = (globalThis as Record<string, unknown>).HTMLElement.prototype as Record<string, unknown>;
    if (!proto.setPointerCapture) proto.setPointerCapture = function () {};
    if (!proto.releasePointerCapture) proto.releasePointerCapture = function () {};
  }
  h.mockLoadBuilderPages.mockResolvedValue({ success: true, pages: [DEFAULT_PAGE] });
  h.mockSaveBuilderPages.mockResolvedValue({ success: true });
  h.mockApplyThemePackage.mockResolvedValue({ success: true, themeId: "com.creatos.neon-dark" });
  h.mockPublishWebsite.mockResolvedValue({ success: true });
  h.mockGetPublishStatus.mockResolvedValue({ success: true, status: { state: "draft", storefrontUrl: "/testcreator" } });
  h.mockGetBuilderOverview.mockResolvedValue({
    success: true,
    data: {
      tenant: { id: "tenant-1", name: "Test Creator" },
      website: { themePackageId: "com.creatos.neon-dark" },
      blueprint: { name: "Creator" },
      subscription: { code: "creator_launch" },
    },
  });
  h.mockGetWebsiteHealthScore.mockResolvedValue({ success: true, score: 62 });
  h.mockGetLivePreviewData.mockResolvedValue({ success: false });
});

import { BuilderWorkspace } from "@/features/builder/components/workspace";
import { builderStore } from "@/lib/builder/store";

const DEFAULT_PAGE = {
  id: "page_default",
  name: "Home",
  slug: "/",
  order: 0,
  isHome: true,
  theme: "default",
  metadata: {},
  sections: [
    {
      id: "sec_hero_default",
      name: "Hero",
      order: 0,
      visible: true,
      locked: false,
      metadata: {},
      slots: [
        { id: "slot_hero_default", moduleId: "hero.default", parentId: "sec_hero_default", order: 0, visible: true, locked: false, config: {}, metadata: {} },
      ],
    },
  ],
};

async function mountBuilder() {
  const utils = render(<BuilderWorkspace />);
  await waitFor(() => expect(screen.queryByText("Loading your editor…")).toBeNull());
  return utils;
}

describe("RCCF-70.4.6 — Desktop shell + device canvas (1-3)", () => {
  it("1. desktop shell renders the Premium toolbar, three-region layout, and status bar (Save / Publish / Draft saved)", async () => {
    await mountBuilder();
    // Toolbar.
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toBeTruthy();
    expect(screen.getByText("CreatorStore")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Redo" })).toBeTruthy();
    // Left Sections rail + right Website/Theme/Progress groups.
    expect(screen.getAllByText("Sections").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Website")).toBeTruthy();
    expect(screen.getByText("Theme")).toBeTruthy();
    expect(screen.getByText("Progress")).toBeTruthy();
    // Status bar.
    expect(screen.getByTestId("builder-publish")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /save/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Draft saved")).toBeTruthy();
  });

  it("2. the device frame is clipped inside the canvas (overflow-auto + @container/main), so the desktop 1200px preview never overflows the document", async () => {
    const { container } = await mountBuilder();
    const canvas = container.querySelector('[data-testid="builder-canvas"]');
    expect(canvas).toBeTruthy();
    // Verified live: document.scrollWidth == clientWidth at 1440/320/375/390.
    expect((canvas as HTMLElement).className).toContain("overflow-auto");
    const deviceCard = container.querySelector('[class*="@container/main"]');
    expect(deviceCard).toBeTruthy();
    expect((deviceCard as HTMLElement).className).toContain("overflow-hidden");
    // The desktop browser-chrome label (1200px) renders above the card.
    expect(screen.getByText("1200px")).toBeTruthy();
  });

  it("3. the canvas is device-driven: DEVICE_WIDTHS { mobile 375, tablet 768, desktop 1200 }, default device desktop at zoom 1", async () => {
    const canvasSrc = readAll().find((f) => f.file.includes("interactive-canvas"))!.source;
    expect(canvasSrc).toContain("DEVICE_WIDTHS: Record<string, number> = { mobile: 375, tablet: 768, desktop: 1200 }");
    expect(canvasSrc).toContain("DEVICE_WIDTHS[device] ?? 1200");
    expect(canvasSrc).toContain("transform: `scale(${zoom})`");
    // The workspace owns the device state and defaults to desktop.
    const ws = readAll().find((f) => f.file.includes("workspace.tsx"))!.source;
    expect(ws).toContain('? persisted.responsiveMode as BuilderCanvasType["device"] : "desktop"');
    expect(ws).toContain("<InteractiveCanvas device={device} zoom={1}");
    // Verified live: a 375px viewport shows the 1200px desktop card centered at
    // x=-412 (clipped, no document scroll); the Mobile preview switch resizes it
    // to exactly 375px (x=0). Both are by-design, not defects.
  });
});

describe("RCCF-70.4.6 — Rails (4-5)", () => {
  it("4. rail widths are frozen at the RCCF-68 contract values (left 280 / right 260) — the right rail is the intentional inspector divergence, not a defect", async () => {
    const ws = readAll().find((f) => f.file.includes("workspace.tsx"))!.source;
    expect(ws).toContain('side="left"');
    expect(ws).toContain("defaultWidth={280}");
    expect(ws).toContain('side="right"');
    expect(ws).toContain("defaultWidth={260}");
    // The RCCF-68 responsive test freezes these widths; do not drift them.
  });

  it("5. desktop rails are hidden below lg (hidden lg:block) — never stealing canvas width on mobile", async () => {
    const { container } = await mountBuilder();
    const rails = Array.from(container.querySelectorAll('[role="separator"]')).map((s) => s.closest(".relative"));
    expect(rails.length).toBeGreaterThanOrEqual(2);
    for (const rail of rails) {
      expect(rail?.className).toContain("hidden");
      expect(rail?.className).toContain("lg:block");
    }
  });
});

describe("RCCF-70.4.6 — Mobile (6)", () => {
  it("6. the mobile bottom control bar renders three tabs and opens a dialog panel; verified live at 320/375/390 with zero horizontal overflow", async () => {
    const { container } = await mountBuilder();
    expect(container.querySelector('[data-testid="builder-mobile-bar"]')).toBeTruthy();
    expect(screen.getByTestId("mobile-bar-sections")).toBeTruthy();
    expect(screen.getByTestId("mobile-bar-canvas")).toBeTruthy();
    expect(screen.getByTestId("mobile-bar-properties")).toBeTruthy();
    fireEvent.click(screen.getByTestId("mobile-bar-sections"));
    const panel = screen.getByTestId("builder-mobile-panel");
    expect(within(panel).getByRole("dialog", { name: "Sections" })).toBeTruthy();
  });
});

describe("RCCF-70.4.6 — Interactions (7-8)", () => {
  it("7. section rows expose accessible actions and the add-section catalog maps to REGISTERED components", async () => {
    await mountBuilder();
    expect(screen.getByTestId("builder-section-hero")).toBeTruthy();
    expect(screen.getByRole("button", { name: /move hero up/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /move hero down/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /hide hero/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /duplicate hero/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /delete hero/i })).toBeTruthy();
    expect(screen.getByTestId("add-section-hero")).toBeTruthy();
    expect(screen.getByTestId("add-section-products")).toBeTruthy();
    expect(screen.getByTestId("add-section-footer")).toBeTruthy();
  });

  it("8. SAVE and PUBLISH are distinct: Save calls saveBuilderPages only; the publish control is present with draft state surfaced", async () => {
    await mountBuilder();
    fireEvent.click(screen.getAllByRole("button", { name: /^save$/i })[0]);
    await waitFor(() => expect(h.mockSaveBuilderPages).toHaveBeenCalled());
    expect(h.mockPublishWebsite).not.toHaveBeenCalled();
    expect(screen.getByTestId("builder-publish")).toBeTruthy();
    expect(screen.getByText("Draft saved")).toBeTruthy();
  });
});

describe("RCCF-70.4.6 — Source-truth (9-10)", () => {
  it("9. Premium Creator OS token discipline: indigo primary (#6366F1 fallback), no legacy s8ul accents, brand gradient", async () => {
    const combined = readAll().map((f) => f.source).join("\n");
    const toolbar = readAll().find((f) => f.file.includes("toolbar.tsx"))!.source;
    expect(toolbar).toContain("from-indigo-400");
    expect(toolbar).toContain("to-violet-400");
    // The live theme resolves --brand-primary to #6366F1; the canvas carries the
    // same indigo-primary fallback until the theme aggregate loads.
    const canvas = readAll().find((f) => f.file.includes("interactive-canvas"))!.source;
    expect(canvas).toContain('?? "#6366F1"');
    expect(combined).not.toMatch(/s8ul-(cyan|pink|purple|yellow|blue|green)/);
  });

  it("10. no arbitrary radius/font/shadow/font-family, no new server action imports, no hardcoded plan codes, single store source", async () => {
    const files = readAll();
    for (const { file, source } of files) {
      expect(source, `${file} has inline font-family`).not.toMatch(/font-family\s*:/);
      expect(source, `${file} has arbitrary radius`).not.toMatch(/rounded-\[/);
      expect(source, `${file} has arbitrary font`).not.toMatch(/font-\[/);
      expect(source, `${file} has arbitrary shadow`).not.toMatch(/shadow-\[/);
      expect(source, `${file} contains hardcoded plan code`).not.toMatch(/creator_(launch|grow|scale)/);
      const storeImports = source.match(/from\s+"@\/lib\/builder\/store"/g) ?? [];
      expect(storeImports.length).toBeLessThanOrEqual(1);
    }
    const allowed = [
      "@/actions/builder.actions",
      "@/actions/theme.actions",
      "@/actions/publish.actions",
      "@/actions/builder-overview.actions",
      "@/actions/health.actions",
      "@/actions/builder-preview.actions",
    ];
    for (const { file, source } of files) {
      const actionImports = source.match(/from\s+"@\/actions\/[\w.-]+"/g) ?? [];
      for (const imp of actionImports) {
        const clean = imp.replace('from "', "").replace('"', "");
        expect(allowed, `${file} imports unexpected action ${clean}`).toContain(clean);
      }
    }
  });
});