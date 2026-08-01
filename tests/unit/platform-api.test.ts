import { describe, it, expect } from "vitest";
import { platformAPI } from "@/lib/platform/api";

describe("CreatorOSPlatform", () => {
  it("should expose builder API", () => {
    expect(platformAPI.builder.store).toBeDefined();
    expect(platformAPI.builder.commands).toBeDefined();
    expect(platformAPI.builder.events).toBeDefined();
    expect(platformAPI.builder.query).toBeDefined();
  });

  it("should NOT expose a separate preview runtime", () => {
    // IMPLEMENTATION-14: one runtime only. Builder canvas and storefront are
    // the same renderer; preview is the builder runtime full-page.
    expect("preview" in platformAPI).toBe(false);
    expect("render" in platformAPI).toBe(false);
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
