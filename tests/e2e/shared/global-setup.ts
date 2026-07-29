import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseUrl = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const names = config.projects.map((p) => p.name).join(", ");
  console.log(`[Certification] Base URL: ${baseUrl}`);
  console.log(`[Certification] Projects: ${names}`);
}

export default globalSetup;
