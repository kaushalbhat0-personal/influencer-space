import { describe, it, expect } from "vitest";
import { platformAPI } from "@/lib/platform/api";

describe("CreatorOSPlatform", () => {
  it("should expose builder API", () => {
    expect(platformAPI.builder.store).toBeDefined();
    expect(platformAPI.builder.commands).toBeDefined();
    expect(platformAPI.builder.events).toBeDefined();
    expect(platformAPI.builder.query).toBeDefined();
  });

  it("should expose preview API", () => {
    const state = platformAPI.preview.getState();
    expect(state).toBeDefined();
    expect(state.device).toBeDefined();
  });

  it("should expose render API", () => {
    expect(platformAPI.render.treeBuilder).toBeDefined();
    expect(platformAPI.render.htmlAdapter).toBeDefined();
    expect(platformAPI.render.reactAdapter).toBeDefined();
    expect(platformAPI.render.staticAdapter).toBeDefined();
  });

  it("should expose telemetry API", () => {
    expect(platformAPI.telemetry.counter).toBeDefined();
    expect(platformAPI.telemetry.snapshot).toBeDefined();
  });

  it("should produce telemetry snapshot", () => {
    platformAPI.telemetry.counter("test.metric", 1);
    const snap = platformAPI.telemetry.snapshot();
    expect(snap).toBeDefined();
    expect(snap.uptime).toBeGreaterThan(0);
  });
});
