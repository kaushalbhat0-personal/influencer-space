/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import {
  buildSrcSet, getPlaceholderBlurHash, isCdnReady,
  getOptimalImageFormat, supportsWebP, calculateAspectRatio, getBestFitWidth,
} from "../images";

describe("buildSrcSet", () => {
  it("builds srcset with widths", () => {
    const srcset = buildSrcSet("/image.jpg", [320, 640, 1024]);
    expect(srcset).toContain("320w");
    expect(srcset).toContain("640w");
    expect(srcset).toContain("1024w");
  });

  it("adds format extension when specified", () => {
    const srcset = buildSrcSet("/image.jpg", [320], "webp");
    expect(srcset).toContain(".webp");
  });

  it("handles avif format", () => {
    const srcset = buildSrcSet("/image.png", [640], "avif");
    expect(srcset).toContain(".avif");
  });
});

describe("getPlaceholderBlurHash", () => {
  it("returns SVG data URL", () => {
    const hash = getPlaceholderBlurHash("/image.jpg");
    expect(hash).toContain("data:image/svg+xml");
    expect(hash).toContain("feGaussianBlur");
  });
});

describe("isCdnReady", () => {
  it("returns true for https URLs", () => {
    expect(isCdnReady("https://cdn.example.com/image.jpg")).toBe(true);
  });

  it("returns false for relative paths", () => {
    expect(isCdnReady("/image.jpg")).toBe(false);
  });
});

describe("getOptimalImageFormat", () => {
  it("returns webp in non-browser environment", () => {
    expect(getOptimalImageFormat()).toBe("webp");
  });
});

describe("supportsWebP", () => {
  it("returns true in non-browser environment", () => {
    expect(supportsWebP()).toBe(true);
  });
});

describe("calculateAspectRatio", () => {
  it("calculates 16:9", () => {
    expect(calculateAspectRatio(16, 9)).toBeCloseTo(1.777, 2);
  });

  it("calculates 1:1", () => {
    expect(calculateAspectRatio(100, 100)).toBe(1);
  });

  it("handles fractional results", () => {
    expect(calculateAspectRatio(3, 2)).toBe(1.5);
  });
});

describe("getBestFitWidth", () => {
  it("finds smallest breakpoint >= container", () => {
    expect(getBestFitWidth(500, [320, 640, 1024])).toBe(640);
  });

  it("returns last breakpoint when container exceeds all", () => {
    expect(getBestFitWidth(2000, [320, 640, 1024])).toBe(1024);
  });

  it("returns first when container is smallest", () => {
    expect(getBestFitWidth(100, [320, 640])).toBe(320);
  });
});
