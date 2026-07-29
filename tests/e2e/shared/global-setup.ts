import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  console.log(`[E2E] Running against ${config.projects[0]?.use?.baseURL ?? "http://localhost:3000"}`);
  console.log(`[E2E] Projects: ${config.projects.map((p) => p.name).join(", ")}`);
}

export default globalSetup;
