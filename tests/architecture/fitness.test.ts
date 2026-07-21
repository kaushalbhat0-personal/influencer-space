/**
 * Architecture Fitness Functions v1.0.0
 *
 * Automated CI checks that validate architectural rules.
 * Run: npx vitest run tests/architecture/
 */

import { describe, it, expect } from "vitest";
import fs from "fs";

describe("Fitness: Design Token Compliance", () => {
  it("ADR-004: globals.css must declare :root tokens", () => {
    const css = fs.readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain("--surface-root");
    expect(css).toContain("--brand-primary");
    expect(css).toContain("--neon-cyan");
    expect(css).toContain("--focus-ring");
  });
});

describe("Fitness: Accessibility Foundation", () => {
  it("ADR-005: globals.css must contain prefers-reduced-motion", () => {
    const css = fs.readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("globals.css must have sr-only utility", () => {
    const css = fs.readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain("sr-only");
  });

  it("globals.css must have focus-visible ring", () => {
    const css = fs.readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain("focus-visible");
  });
});

describe("Fitness: ADR Compliance", () => {
  it("ADR-006: MotionDiv wrapper must exist", () => {
    const exists = fs.existsSync("src/components/ui/MotionSafe.tsx");
    expect(exists).toBe(true);
  });

  it("ADR-005: useReducedMotion hook must exist", () => {
    const exists = fs.existsSync("src/hooks/use-reduced-motion.ts");
    expect(exists).toBe(true);
  });

  it("ADR-003: Navigation config must export three nav objects", async () => {
    const mod = await import("@/lib/navigation/config");
    expect(mod.CREATOR_NAV).toBeDefined();
    expect(mod.SUPER_ADMIN_NAV).toBeDefined();
    expect(mod.AGENCY_NAV).toBeDefined();
    expect(mod.getNavForRole).toBeDefined();
  });
});

describe("Fitness: Test Coverage", () => {
  it("Major features must have test files", () => {
    const tests = fs.readdirSync("tests/unit");
    expect(tests).toContain("commerce.test.ts");
    expect(tests).toContain("ai-generation.test.ts");
    expect(tests).toContain("gallery-module.test.ts");
    expect(tests).toContain("product-module.test.ts");
  });
});

describe("Fitness: Error Boundaries", () => {
  it("ErrorBoundary must exist", () => {
    expect(fs.existsSync("src/components/ui/ErrorBoundary.tsx")).toBe(true);
  });

  it("EmptyState must exist", () => {
    expect(fs.existsSync("src/components/ui/EmptyState.tsx")).toBe(true);
  });
});
