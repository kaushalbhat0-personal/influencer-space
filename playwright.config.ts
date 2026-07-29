import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["list"]] : "html",
  globalSetup: "./tests/e2e/shared/global-setup.ts",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: "smoke", testMatch: ["smoke/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "creator", testMatch: ["creator/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "agency", testMatch: ["agency/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "super-admin", testMatch: ["super-admin/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "billing", testMatch: ["billing/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    { name: "public", testMatch: ["public/**/*.spec.ts"], use: { ...devices["Desktop Chrome"] } },
    {
      name: "responsive",
      testMatch: ["public/responsive.spec.ts"],
      use: { ...devices["iPhone 13"] },
    },
  ],
});
