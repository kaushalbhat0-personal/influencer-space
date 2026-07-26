/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { globSync } from "glob";

const BUILDER_DIR = "src/features/builder";
const FEATURE_PATTERNS = [
  "src/features/profile/",
  "src/features/products/",
  "src/features/services/",
  "src/features/courses/",
  "src/features/gallery/",
  "src/features/links/",
  "src/features/testimonials/",
  "src/features/faq/",
  "src/features/seo/",
  "src/features/analytics/",
  "src/features/settings/",
  "src/features/domains/",
  "src/features/billing/",
  "src/features/integrations/",
];

describe("builder feature isolation", () => {
  it("never imports from other feature modules", () => {
    const files = globSync(`${BUILDER_DIR}/**/*.{ts,tsx}`, { ignore: "**/node_modules/**" });
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of FEATURE_PATTERNS) {
        const importPattern = `from "@/${pattern}`;
        if (content.includes(importPattern) && !pattern.includes("_shared")) {
          expect(content, `${file} imports from ${pattern}`).not.toMatch(importPattern);
        }
      }
    }
  });

  it("only imports from _shared, lib, actions, or components", () => {
    const files = globSync(`${BUILDER_DIR}/**/*.{ts,tsx}`, { ignore: "**/node_modules/**" });
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const match = line.match(/from\s+["']@\/features\/([^"']+)["']/);
        if (match) {
          const imported = match[1];
          if (!imported.startsWith("builder") && !imported.startsWith("_shared")) {
            expect(line, `${file} illegally imports from @/features/${imported}`).toBeUndefined();
          }
        }
      }
    }
  });

  it("service does not import UI components", () => {
    const content = readFileSync(`${BUILDER_DIR}/service.ts`, "utf-8");
    expect(content).not.toContain("tsx");
    expect(content).not.toContain("component");
    expect(content).not.toContain("react");
  });

  it("actions only import from allowed modules", () => {
    const content = readFileSync(`${BUILDER_DIR}/actions.ts`, "utf-8");
    const allowedImports = ["next-auth", "@/lib/auth", "@/lib/builder/types", "next/cache", "@/actions/builder.actions"];
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/from\s+["']([^"']+)["']/);
      if (match) {
        const imported = match[1];
        if (!imported.startsWith("@/features/builder")) {
          expect(allowedImports.some((a) => imported === a || imported.startsWith(a)),
            `actions.ts imports disallowed: ${imported}`).toBe(true);
        }
      }
    }
  });
});
