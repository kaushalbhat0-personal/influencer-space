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
    expect(css).toContain("--brand-secondary");
    expect(css).toContain("--brand-accent");
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
    expect(tests).toContain("generation-intelligence.test.ts");
    expect(tests).toContain("capabilities.test.ts");
    expect(tests).toContain("billing-v2.test.ts");
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

describe("Fitness: Tenant Resolution Policy (ADR-007)", () => {
  const ADMIN_PATHS = ["src/app/admin", "src/app/super-admin", "src/app/agency", "src/app/builder"];
  const ALLOWED_PATHS = ["src/app/[domain]", "src/middleware.ts", "src/lib/tenant.ts", "src/app/admin/login"];
  const FORBIDDEN_IMPORT = "getTenantContext";

  it("should not import getTenantContext in authenticated admin routes", () => {
    const violations: string[] = [];

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = dir + "/" + entry.name;
        if (entry.isDirectory()) { scanDir(full); continue; }
        if (!entry.name.endsWith(".tsx") && !entry.name.endsWith(".ts")) continue;
        const content = fs.readFileSync(full, "utf-8");
        if (content.includes(FORBIDDEN_IMPORT)) {
          const isAllowed = ALLOWED_PATHS.some((p) => full.startsWith(p));
          if (!isAllowed) violations.push(full);
        }
      }
    }

    for (const p of ADMIN_PATHS) scanDir(p);

    if (violations.length > 0) {
      expect(`getTenantContext imported in admin routes:\n${violations.join("\n")}`).toBe("");
    }
    expect(true).toBe(true);
  });

  it("RCCF-69.4: middleware must never preserve a client-supplied x-tenant-host", () => {
    // x-tenant-host is server-authoritative: it is set only from the trusted
    // Host/slug, and REMOVED when no tenant is derivable. This guardrail fails
    // if a future change makes the middleware trust an inbound header.
    const src = fs.readFileSync("src/middleware.ts", "utf-8");
    expect(src).toContain('headers.set("x-tenant-host", extractedTenant)');
    expect(src).toContain('headers.set("x-tenant-host", classification.slug)');
    expect(src).toContain('headers.delete("x-tenant-host")');
    // The header must never be copied through unchanged when no tenant derives:
    expect(src).toContain("} else if (!extractedTenant) {");
  });
});
