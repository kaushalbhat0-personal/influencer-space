/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { globSync } from "glob";

const STOREFRONT_DIR = "src/features/storefront";
const OTHER_FEATURES = [
  "src/features/profile/", "src/features/products/", "src/features/services/",
  "src/features/courses/", "src/features/gallery/", "src/features/links/",
  "src/features/testimonials/", "src/features/faq/", "src/features/seo/",
  "src/features/analytics/", "src/features/settings/", "src/features/domains/",
  "src/features/billing/", "src/features/integrations/", "src/features/builder/",
];

describe("storefront feature isolation", () => {
  it("never imports from other feature modules except _shared", () => {
    const files = globSync(`${STOREFRONT_DIR}/**/*.{ts,tsx}`, { ignore: "**/node_modules/**" });
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of OTHER_FEATURES) {
        const importPattern = `from "@/${pattern}`;
        if (content.includes(importPattern)) {
          expect(pattern, `${file} imports from ${pattern}`).toBe("_shared");
        }
      }
    }
  });

  it("service does not import UI components", () => {
    const content = readFileSync(`${STOREFRONT_DIR}/service.ts`, "utf-8");
    expect(content).not.toContain("tsx");
    expect(content).not.toContain("react");
  });

  it("actions only import auth and infrastructure", () => {
    const content = readFileSync(`${STOREFRONT_DIR}/actions.ts`, "utf-8");
    const allowedImports = [
      "next-auth", "@/lib/auth", "@/lib/prisma",
      "./service", "./versions",
    ];
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/from\s+["']([^"']+)["']/);
      if (match) {
        const imported = match[1];
        if (!imported.startsWith("@/features/storefront")) {
          expect(allowedImports.some((a) => imported.includes(a)),
            `actions.ts imports disallowed: ${imported}`).toBe(true);
        }
      }
    }
  });

  it("is a read-only renderer (no write operations)", () => {
    const files = globSync(`${STOREFRONT_DIR}/**/*.ts`, { ignore: "**/node_modules/**" });
    const writeOps = ["prisma.", "update", "create", "delete", "upsert"];
    for (const file of files) {
      if (file.includes("__tests__") || file.includes("cache") || file.includes("actions") || file.includes("analytics")) continue;
      const content = readFileSync(file, "utf-8");
      for (const op of writeOps) {
        if (content.includes(`.${op}(`)) {
          expect(content, `${file} contains write operation .${op}()`).not.toContain(`.${op}(`);
        }
      }
    }
  });
});
