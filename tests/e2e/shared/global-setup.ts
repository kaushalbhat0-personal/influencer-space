import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseUrl = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const names = config.projects.map((p) => p.name).join(", ");
  console.log(`[Certification] Base URL: ${baseUrl}`);
  console.log(`[Certification] Projects: ${names}`);

  if (process.env.SKIP_DB_CHECK === "true" || process.env.CI) {
    console.log(`[Certification] Skipping DB validation`);
    return;
  }

  try {
    const { getSuperAdmin, disconnectDb, countUsers } = await import("./database");
    const admin = await getSuperAdmin();
    if (!admin) throw new Error("Super Admin not found. Seed the database.");
    console.log(`[Certification] Super Admin: ${admin.email}`);
    console.log(`[Certification] Total users: ${await countUsers()}`);
    await disconnectDb();
  } catch (err) {
    console.error(`[Certification] DB validation failed:`, err);
    throw err;
  }
}

export default globalSetup;
