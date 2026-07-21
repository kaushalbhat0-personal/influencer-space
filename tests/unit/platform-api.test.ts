import { describe, it, expect } from "vitest";
import { platform } from "@/lib/platform/api";

describe("CreatorOSPlatform", () => {
  it("should expose builder API", () => {
    expect(platform.builder.store).toBeDefined();
    expect(platform.builder.commands).toBeDefined();
    expect(platform.builder.query).toBeDefined();
  });

  it("should expose theme API", () => {
    expect(platform.theme.registry).toBeDefined();
    expect(platform.theme.resolver).toBeDefined();
    expect(platform.theme.transaction).toBeDefined();
  });

  it("should expose preview API", () => {
    const state = platform.preview.getState();
    expect(state).toBeDefined();
    expect(state.device).toBeDefined();
  });

  it("should expose rendering API", () => {
    const tree = platform.rendering.buildTree();
    expect(tree).toBeDefined();
    expect(tree.root).toBeDefined();
    const html = platform.rendering.renderHtml(tree);
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("should expose plugin API", () => {
    expect(platform.plugins.sandbox).toBeDefined();
    expect(platform.plugins.list()).toBeDefined();
  });

  it("should expose telemetry API", () => {
    platform.telemetry.counter("test.metric", 1);
    const snap = platform.telemetry.snapshot();
    expect(snap.uptime).toBeGreaterThan(0);
  });

  it("should produce aggregate diagnostics", () => {
    const diag = platform.diagnostics();
    expect(diag.theme.tokens).toBeGreaterThanOrEqual(0);
    expect(diag.preview).toBeDefined();
    expect(diag.registry).toBeDefined();
  });
});
