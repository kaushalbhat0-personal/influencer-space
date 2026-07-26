import { FullConfig } from "@playwright/test";

async function globalSetup(_config: FullConfig): Promise<void> {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[SmokeSetup] Health check returned ${res.status}. Continuing anyway.`);
    } else {
      console.log("[SmokeSetup] App is healthy.");
    }
  } catch {
    console.warn("[SmokeSetup] App not reachable. Ensure dev server is running.");
  }

  try {
    const seedRes = await fetch(`${baseUrl}/api/dev/seed`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
    });
    if (seedRes.ok) {
      console.log("[SmokeSetup] Database seeded successfully.");
    } else {
      console.warn(`[SmokeSetup] Seed returned ${seedRes.status}. The test may have issues.`);
    }
  } catch {
    console.warn("[SmokeSetup] Could not seed database. Continuing with existing data.");
  }

  const screenshotBase = "docs/alpha/screenshots";
  console.log(`[SmokeSetup] Screenshots will be saved under ${screenshotBase}/`);
  console.log("[SmokeSetup] Smoke test global setup complete.");
}

export default globalSetup;
