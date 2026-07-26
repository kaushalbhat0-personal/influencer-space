/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { DEVICES, getResponsiveValue, setResponsiveValue } from "../responsive";

describe("DEVICES complete", () => {
  it("all devices have required fields", () => {
    for (const d of Object.values(DEVICES)) {
      expect(d).toHaveProperty("type");
      expect(d).toHaveProperty("width");
      expect(d).toHaveProperty("height");
      expect(d).toHaveProperty("label");
      expect(d).toHaveProperty("icon");
    }
  });

  it("device labels are descriptive", () => {
    expect(DEVICES.desktop.label).toBe("Desktop");
    expect(DEVICES.tablet.label).toBe("Tablet");
    expect(DEVICES.mobile.label).toBe("Mobile");
  });
});

describe("getResponsiveValue complete", () => {
  it("returns undefined for empty object", () => {
    expect(getResponsiveValue({ desktop: undefined as any }, "desktop")).toBeUndefined();
  });

  it("mobile falls back to tablet then desktop", () => {
    expect(getResponsiveValue({ desktop: "lg", tablet: "md" }, "mobile")).toBe("md");
  });

  it("tablet falls back to desktop", () => {
    expect(getResponsiveValue({ desktop: "lg" }, "tablet")).toBe("lg");
  });

  it("all three levels work independently", () => {
    const rv = { desktop: "lg", tablet: "md", mobile: "sm" };
    expect(getResponsiveValue(rv, "desktop")).toBe("lg");
    expect(getResponsiveValue(rv, "tablet")).toBe("md");
    expect(getResponsiveValue(rv, "mobile")).toBe("sm");
  });

  it("handles number values", () => {
    const rv = { desktop: 12, tablet: 8, mobile: 4 };
    expect(getResponsiveValue(rv, "mobile")).toBe(4);
  });
});

describe("setResponsiveValue complete", () => {
  it("overwrites existing value for device", () => {
    const rv = { desktop: "lg" };
    const result = setResponsiveValue(rv, "desktop", "xl");
    expect(result.desktop).toBe("xl");
  });

  it("adds new device not previously set", () => {
    const rv = { desktop: "lg" };
    const result = setResponsiveValue(rv, "mobile", "sm");
    expect(result.mobile).toBe("sm");
    expect(result.desktop).toBe("lg");
  });

  it("does not mutate original object", () => {
    const rv = { desktop: "lg" };
    setResponsiveValue(rv, "tablet", "md");
    expect(rv).toEqual({ desktop: "lg" });
  });
});
