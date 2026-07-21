import { describe, it, expect, afterAll } from "vitest";
import { previewRuntime } from "@/lib/builder/preview";
import { builderStore } from "@/lib/builder/store";

describe("PreviewRuntime", () => {
  afterAll(() => {
    previewRuntime.destroy();
  });

  it("should produce initial state", () => {
    const state = previewRuntime.getState();
    expect(state.device).toBe("desktop");
    expect(state.zoom).toBe(1);
    expect(state.pages).toBeDefined();
  });

  it("should re-render after builder changes", () => {
    const page = builderStore.addPage("PreviewTest", "/p");
    const section = builderStore.addSection("Hero", page.id);
    builderStore.addSlot("com.creatos.hero", section.id, page.id);
    const state = previewRuntime.render();
    expect(state.renderCount).toBeGreaterThan(0);
  });

  it("should produce diagnostics", () => {
    const diag = previewRuntime.diagnostics();
    expect(diag.renderCount).toBeGreaterThan(0);
    expect(diag.lastRenderMs).toBeGreaterThanOrEqual(0);
  });

  it("should get page by id", () => {
    const state = previewRuntime.getState();
    const pages = state.pages;
    if (pages.length > 0) {
      const page = previewRuntime.getPage(pages[0]!.id);
      expect(page).not.toBeNull();
    }
  });
});
