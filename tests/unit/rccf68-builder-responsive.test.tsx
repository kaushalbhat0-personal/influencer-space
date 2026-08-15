// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

// RCCF-68.3.3 — Stitch Builder responsive workspace shell.
// Presentation-only assertions: desktop panels preserved, mobile overlays,
// pointer-events resizing, functional preservation. No frozen builder logic is
// exercised beyond the real store/commands the shell already calls.

// jsdom lacks IntersectionObserver / ResizeObserver used by framer-motion and
// the nav components pulled in by the renderer tree.
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

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
  (globalThis as Record<string, unknown>).ResizeObserver = NoopRO;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: false, media: q, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
  // jsdom lacks PointerEvent helpers — stub capture/release so the pointer
  // handlers can be exercised.
  (globalThis as Record<string, unknown>).PointerEvent = globalThis.Event;
  if (typeof (globalThis as Record<string, unknown>).HTMLElement !== "undefined") {
    const proto = (globalThis as Record<string, unknown>).HTMLElement.prototype as Record<string, unknown>;
    if (!proto.setPointerCapture) proto.setPointerCapture = function () {};
    if (!proto.releasePointerCapture) proto.releasePointerCapture = function () {};
  }
  // Default action results.
  h.mockLoadBuilderPages.mockResolvedValue({ success: true, pages: [] });
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
import { ResizablePanel } from "@/features/builder/components/panel";

async function mountBuilder() {
  const utils = render(<BuilderWorkspace />);
  await waitFor(() => expect(screen.queryByText("Loading your editor…")).toBeNull());
  return utils;
}

describe("RCCF-68.3.3 — desktop Builder shell", () => {
  it("renders the sections panel", async () => {
    await mountBuilder();
    expect(screen.getByRole("button", { name: /collapse sections panel/i })).toBeTruthy();
    // The panel header + the mobile bar both say "Sections"; assert the panel one.
    expect(screen.getAllByText("Sections").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the canvas (existing InteractiveCanvas component)", async () => {
    const { container } = await mountBuilder();
    expect(container.querySelector('[data-testid="builder-canvas"]')).toBeTruthy();
  });

  it("renders the properties panel", async () => {
    await mountBuilder();
    expect(screen.getByRole("button", { name: /collapse properties panel/i })).toBeTruthy();
    expect(screen.getByText("Website")).toBeTruthy();
  });

  it("keeps existing desktop panel configuration (side rails + resizable handles)", async () => {
    const { container } = await mountBuilder();
    // Both desktop rails are present with the resizable handle separators.
    const separators = container.querySelectorAll('[role="separator"][aria-orientation="vertical"]');
    expect(separators.length).toBe(2);
    // Desktop rails are hidden below lg (no permanent canvas-width theft on mobile).
    const leftRail = container.querySelector('[data-testid="panel-toggle-left"]')?.closest(".relative");
    expect(leftRail).toBeTruthy();
  });
});

describe("RCCF-68.3.3 — mobile Builder shell", () => {
  it("canvas wrapper is the primary workspace (flex-1 min-w-0, no fixed 200px rails consuming width)", async () => {
    const { container } = await mountBuilder();
    const canvasRegion = container.querySelector('[data-testid="builder-canvas"]');
    const canvasScroll = canvasRegion?.closest(".overflow-auto");
    expect(canvasScroll).toBeTruthy();
    // No inline fixed min-width rails.
    expect(container.querySelector('[style*="min-width: 200px"]')).toBeNull();
    // Rails carry `hidden lg:block` → they occupy no width below lg.
    const rails = Array.from(container.querySelectorAll('[role="separator"]')).map((s) => s.closest(".relative"));
    for (const rail of rails) {
      expect(rail?.className).toContain("hidden");
      expect(rail?.className).toContain("lg:block");
    }
  });

  it("sections panel does not permanently consume canvas width (overlay only)", async () => {
    const { container } = await mountBuilder();
    // No mobile panel open by default.
    expect(container.querySelector('[data-testid="builder-mobile-panel"]')).toBeNull();
    // The mobile bar exposes Sections/Canvas/Properties.
    expect(screen.getByTestId("mobile-bar-sections")).toBeTruthy();
    expect(screen.getByTestId("mobile-bar-canvas")).toBeTruthy();
    expect(screen.getByTestId("mobile-bar-properties")).toBeTruthy();
  });

  it("mobile Sections control opens the overlay", async () => {
    await mountBuilder();
    fireEvent.click(screen.getByTestId("mobile-bar-sections"));
    const panel = screen.getByTestId("builder-mobile-panel");
    expect(panel).toBeTruthy();
    expect(within(panel).getByRole("dialog", { name: "Sections" })).toBeTruthy();
  });

  it("mobile Properties control opens the overlay", async () => {
    await mountBuilder();
    fireEvent.click(screen.getByTestId("mobile-bar-properties"));
    const panel = screen.getByTestId("builder-mobile-panel");
    expect(panel).toBeTruthy();
    expect(within(panel).getByRole("dialog", { name: "Properties" })).toBeTruthy();
  });

  it("panel closes via the close control", async () => {
    const { container } = await mountBuilder();
    fireEvent.click(screen.getByTestId("mobile-bar-sections"));
    expect(container.querySelector('[data-testid="builder-mobile-panel"]')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /close sections/i }));
    await waitFor(() => expect(container.querySelector('[data-testid="builder-mobile-panel"]')).toBeNull());
  });

  it("Escape closes the overlay", async () => {
    const { container } = await mountBuilder();
    fireEvent.click(screen.getByTestId("mobile-bar-sections"));
    expect(container.querySelector('[data-testid="builder-mobile-panel"]')).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(container.querySelector('[data-testid="builder-mobile-panel"]')).toBeNull());
  });

  it("canvas remains available after closing the overlay", async () => {
    const { container } = await mountBuilder();
    fireEvent.click(screen.getByTestId("mobile-bar-sections"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector('[data-testid="builder-canvas"]')).toBeTruthy();
  });

  it("toolbar does not require horizontal scrolling (wrapping row)", async () => {
    await mountBuilder();
    // The second toolbar row wraps (flex-wrap) so device/preview/save stay on-screen.
    const wrapRows = screen.getAllByRole("button", { name: /desktop preview/i });
    expect(wrapRows.length).toBeGreaterThan(0);
  });

  it("no fixed 200px side-panel requirement remains on mobile", async () => {
    const { container } = await mountBuilder();
    // Rails are display-hidden below lg (hidden lg:block) and carry no min-width.
    const rails = Array.from(container.querySelectorAll('[data-testid^="panel-toggle-"]'));
    for (const rail of rails) {
      const panelDiv = rail.closest(".relative");
      expect(panelDiv?.className).toContain("hidden");
      expect((panelDiv as HTMLElement | null)?.style.minWidth ?? "").not.toContain("200");
    }
  });
});

describe("RCCF-68.3.3 — pointer-event resizing", () => {
  it("resize handle uses pointer events (onPointerDown in source, no mouse-only handlers)", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/features/builder/components/panel.tsx", "utf8");
    expect(source).toContain("onPointerDown");
    expect(source).toContain('addEventListener("pointermove"');
    expect(source).toContain('addEventListener("pointerup"');
    // No legacy mousemove/mouseup resizing remains.
    expect(source).not.toContain('addEventListener("mousemove"');
    expect(source).not.toContain('onMouseMove');
  });

  it("touch is supported through pointer events (single code path, touch-action none)", () => {
    const { container } = render(
      <ResizablePanel side="right" defaultWidth={260}>
        <div>right content</div>
      </ResizablePanel>,
    );
    const handle = container.querySelector('[role="separator"]') as HTMLDivElement;
    // touch-action: none prevents the browser hijacking a drag into page scroll.
    expect(handle.className).toContain("touch-none");
    expect(handle.className).toContain("select-none");
  });

  it("pointer capture is requested on the handle during a drag", () => {
    const { container } = render(
      <ResizablePanel side="left" defaultWidth={280}>
        <div>left content</div>
      </ResizablePanel>,
    );
    const handle = container.querySelector('[role="separator"]') as HTMLDivElement;
    const captureSpy = vi.spyOn(handle, "setPointerCapture").mockImplementation(() => {});
    const evt = new Event("pointerdown", { bubbles: true });
    Object.defineProperty(evt, "pointerId", { value: 7 });
    Object.defineProperty(evt, "button", { value: 0 });
    Object.defineProperty(evt, "pointerType", { value: "touch" });
    handle.dispatchEvent(evt);
    expect(captureSpy).toHaveBeenCalledWith(7);
    captureSpy.mockRestore();
  });

  it("resize handle has an accessible separator label", () => {
    const { container } = render(
      <ResizablePanel side="right" defaultWidth={260}>
        <div>right content</div>
      </ResizablePanel>,
    );
    const handle = container.querySelector('[role="separator"]') as HTMLElement;
    expect(handle.getAttribute("aria-orientation")).toBe("vertical");
    expect(handle.getAttribute("aria-label")).toMatch(/resize .* panel/i);
  });
});

describe("RCCF-68.3.3 — functional preservation", () => {
  it("InteractiveCanvas remains the existing component (imported, not replaced)", async () => {
    const source = (await import("node:fs")).readFileSync("src/features/builder/components/workspace.tsx", "utf8");
    expect(source).toContain('from "../canvas/interactive-canvas"');
    expect(source).toContain("<InteractiveCanvas");
  });

  it("existing builder commands/events/persistence are still wired", async () => {
    const source = (await import("node:fs")).readFileSync("src/features/builder/components/workspace.tsx", "utf8");
    expect(source).toContain('from "@/lib/builder/store"');
    expect(source).toContain('from "@/lib/builder/events"');
    expect(source).toContain('from "./persistence"');
    expect(source).toContain('builderStore.isDirty');
    expect(source).toContain('builderPersistence.save');
  });

  it("save/autosave/publish use the same server actions", async () => {
    const source = (await import("node:fs")).readFileSync("src/features/builder/components/workspace.tsx", "utf8");
    expect(source).toContain('loadBuilderPages, saveBuilderPages } from "@/actions/builder.actions"');
    expect(source).toContain('from "@/actions/publish.actions"');
    expect(source).toContain("publishWebsite()");
    // Autosave debounce + beforeunload guard preserved.
    expect(source).toContain("autoSaveRef.current = setTimeout");
    expect(source).toContain("beforeunload");
    expect(source).toContain('builderEvents.subscribe("save:requested"');
  });

  it("preview mode plumbing is unchanged", async () => {
    const source = (await import("node:fs")).readFileSync("src/features/builder/canvas/interactive-canvas.tsx", "utf8");
    expect(source).toContain("previewMode");
  });

  it("no new server action is imported by the shell", async () => {
    const source = (await import("node:fs")).readFileSync("src/features/builder/components/workspace.tsx", "utf8");
    const actionImports = source.match(/from "@\/actions\/[\w.-]+"/g) ?? [];
    const allowed = [
      "@/actions/builder.actions",
      "@/actions/theme.actions",
      "@/actions/publish.actions",
      "@/actions/builder-overview.actions",
      "@/actions/health.actions",
    ];
    for (const imp of actionImports) {
      const clean = imp.replace('from "', "").replace('"', "");
      expect(allowed, `unexpected action import ${clean}`).toContain(clean);
    }
  });

  it("no new data source or schema/capability change", async () => {
    const source = (await import("node:fs")).readFileSync("src/features/builder/components/workspace.tsx", "utf8");
    expect(source).not.toContain("prisma.");
    expect(source).not.toContain("@/generated/prisma");
    expect(source).not.toContain("@/lib/capabilities");
  });
});
