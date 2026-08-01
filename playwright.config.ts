import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env.playwright" });

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report" }], ["list"], ["junit", { outputFile: "playwright-report/results.xml" }]]
    : "html",
  globalSetup: "./tests/e2e/shared/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // Level 1 — Smoke (every PR)
    { name: "smoke", testMatch: ["smoke/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },

    // Level 2 — Regression (nightly, pre-merge)
    { name: "creator", testMatch: ["creator/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "agency", testMatch: ["agency/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "super-admin", testMatch: ["super-admin/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "billing", testMatch: ["billing/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "public", testMatch: ["public/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "security", testMatch: ["security/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },

    // Level 3 — Release Certification (pre-tag)
    { name: "release", testMatch: ["release/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "accessibility", testMatch: ["accessibility/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "performance", testMatch: ["performance/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "responsive", testMatch: ["responsive/**/*.spec.ts"], use: { ...devices["iPhone 13"] } },

    // Level 4 — Production E2E verification (IMPLEMENTATION-15)
    { name: "production", testMatch: ["production/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
  ],
});
