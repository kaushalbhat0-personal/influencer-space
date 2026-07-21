import { describe, it, expect } from "vitest";
import { renderTreeBuilder, htmlAdapter, reactAdapter, staticAdapter } from "@/lib/builder/render";
import { previewRuntime } from "@/lib/builder/preview";
import { builderStore } from "@/lib/builder/store";

describe("RenderSystem", () => {
  it("should build render tree from preview state", () => {
    const page = builderStore.addPage("RtTest", "/rt");
    const section = builderStore.addSection("Hero", page.id);
    builderStore.addSlot("com.creatos.hero", section.id, page.id);
    previewRuntime.render();
    const tree = renderTreeBuilder.build();
    expect(tree.metadata.nodes).toBeGreaterThan(0);
    expect(tree.root.type).toBe("container");
  });

  it("should render HTML with valid structure", () => {
    const page = builderStore.addPage("HtTest", "/ht");
    const section = builderStore.addSection("Content", page.id);
    builderStore.addSlot("com.creatos.products", section.id, page.id);
    previewRuntime.render();
    const tree = renderTreeBuilder.build();
    const html = htmlAdapter.render(tree);
    expect(html).toContain("<!DOCTYPE html>");
    expect(tree.metadata.slots).toBeGreaterThanOrEqual(0);
  });

  it("should produce React serializable output", () => {
    previewRuntime.render();
    const tree = renderTreeBuilder.build();
    const result = reactAdapter.render(tree);
    expect(result.type).toBe("div");
  });

  it("should produce valid static export JSON", () => {
    previewRuntime.render();
    const tree = renderTreeBuilder.build();
    const json = staticAdapter.render(tree);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("should produce diagnostics", () => {
    previewRuntime.render();
    renderTreeBuilder.build();
    const diag = renderTreeBuilder.diagnostics();
    expect(diag.treesBuilt).toBeGreaterThan(0);
  });
});
