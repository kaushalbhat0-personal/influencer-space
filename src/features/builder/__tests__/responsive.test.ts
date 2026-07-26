/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { DEVICES, getResponsiveValue, setResponsiveValue } from "../responsive";
import type { DeviceType } from "../responsive";

describe("DEVICES", () => {
  it("has desktop, tablet, mobile", () => {
    expect(DEVICES.desktop.type).toBe("desktop");
    expect(DEVICES.tablet.type).toBe("tablet");
    expect(DEVICES.mobile.type).toBe("mobile");
  });

  it("desktop has largest width", () => {
    expect(DEVICES.desktop.width).toBeGreaterThan(DEVICES.tablet.width);
    expect(DEVICES.tablet.width).toBeGreaterThan(DEVICES.mobile.width);
  });
});

describe("getResponsiveValue", () => {
  const rv = { desktop: "lg", tablet: "md", mobile: "sm" };

  it("returns desktop value for desktop", () => {
    expect(getResponsiveValue(rv, "desktop")).toBe("lg");
  });

  it("returns tablet value for tablet", () => {
    expect(getResponsiveValue(rv, "tablet")).toBe("md");
  });

  it("returns mobile value for mobile", () => {
    expect(getResponsiveValue(rv, "mobile")).toBe("sm");
  });

  it("falls back to desktop when tablet missing", () => {
    expect(getResponsiveValue({ desktop: "lg" }, "tablet")).toBe("lg");
  });

  it("falls back to tablet when mobile missing", () => {
    expect(getResponsiveValue({ desktop: "lg", tablet: "md" }, "mobile")).toBe("md");
  });

  it("returns undefined for undefined value", () => {
    expect(getResponsiveValue(undefined, "desktop")).toBeUndefined();
  });
});

describe("setResponsiveValue", () => {
  it("sets value for given device", () => {
    const result = setResponsiveValue({ desktop: "lg" }, "tablet", "md");
    expect(result.desktop).toBe("lg");
    expect(result.tablet).toBe("md");
  });

  it("preserves other device values", () => {
    const result = setResponsiveValue({ desktop: "lg", mobile: "sm" }, "tablet", "md");
    expect(result.desktop).toBe("lg");
    expect(result.mobile).toBe("sm");
    expect(result.tablet).toBe("md");
  });
});
