import { FullConfig } from "@playwright/test";
import { getSuperAdmin, disconnectDb, countUsers } from "./database";

async function globalSetup(config: FullConfig) {
  const baseUrl = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const names = config.projects.map((p) => p.name).join(", ");
  console.log(`[Certification] Base URL: ${baseUrl}`);
  console.log(`[Certification] Projects: ${names}`);

  // Validate database connectivity and Super Admin existence
  try {
    const admin = await getSuperAdmin();
    if (!admin) {
      throw new Error("Super Admin account not found in database. Seed the database first.");
    }
    const totalUsers = await countUsers();
    console.log(`[Certification] Super Admin: ${admin.email} (${admin.id})`);
    console.log(`[Certification] Total users in DB: ${totalUsers}`);
    console.log(`[Certification] Database: OK`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Certification] Database validation failed: ${message}`);
    throw err;
  } finally {
    await disconnectDb();
  }
}

export default globalSetup;
