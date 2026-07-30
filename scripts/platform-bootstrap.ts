import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const SQL_FILE = "scripts/sql/platform-registry-runtime.sql";

function divider(title: string) {
  console.log("");
  console.log("=".repeat(56));
  console.log(`  ${title}`);
  console.log("=".repeat(56));
}

async function main() {
  console.log("");
  console.log("  Platform Bootstrap");
  console.log("  ─────────────────");
  console.log(`  ${new Date().toISOString()}`);
  console.log("");

  if (!url) {
    console.error("  FAILED: No database URL available. Set DIRECT_URL or DATABASE_URL.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  const { PlatformRegistrySyncService, PlatformSyncRepository } = await import("../src/lib/registry-sync");

  // ── Step 1: Check Schema ──────────────────────────────────────────────
  divider("Step 1/4 — Check Runtime Schema");

  const repo = new PlatformSyncRepository();
  const service = new PlatformRegistrySyncService(repo);
  const schemaMissing = await repo.checkSchema();
  const schemaVersion = await repo.getSchemaVersion();

  if (schemaMissing.length > 0) {
    console.log(`  Missing tables: ${schemaMissing.join(", ")}`);
    console.log("");
    console.log(`  BLOCKED: One or more required runtime tables are missing.`);
    console.log(`  Run the SQL migration in Supabase SQL Editor:`);
    console.log(`    ${SQL_FILE}`);
    console.log("");
    console.log(`  Then run this bootstrap again.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`  Schema version: ${schemaVersion ?? "(none)"}`);
  console.log("  All runtime tables present.");
  console.log("  STATUS: OK");

  // ── Step 2: Verify Schema Version ─────────────────────────────────────
  divider("Step 2/4 — Verify Schema Version");

  const versionInfo = await service.getSchemaVersion();
  if (!versionInfo.compatible) {
    console.log(`  Required: ${versionInfo.required}`);
    console.log(`  Installed: ${versionInfo.installed ?? "none"}`);
    console.log("");
    console.log(`  BLOCKED: Schema version mismatch.`);
    console.log(`  Run the upgraded SQL migration in Supabase SQL Editor.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`  Required: ${versionInfo.required}`);
  console.log(`  Installed: ${versionInfo.installed}`);
  console.log("  Compatible: yes");
  console.log("  STATUS: OK");

  // ── Step 3: Run Registry Sync ─────────────────────────────────────────
  divider("Step 3/4 — Registry Sync");

  const report = await service.sync({ dryRun: false });

  if (report.errors.length > 0) {
    console.log(`  Errors: ${report.errors.length}`);
    for (const err of report.errors) console.log(`    - ${err}`);
    console.log("");
    console.log("  FAILED: Registry sync completed with errors.");
    await prisma.$disconnect();
    process.exit(1);
  }

  const createdTotal = report.created.plans.length + report.created.pricings.length + report.created.revenueConfigs.length + report.created.billingConfigs.length + report.created.commissionPolicies.length;
  const updatedTotal = report.updated.plans.length + report.updated.pricings.length + report.updated.revenueConfigs.length + report.updated.billingConfigs.length + report.updated.commissionPolicies.length;
  const deletedTotal = report.deleted.plans.length + report.deleted.pricings.length;

  console.log(`  Created: ${createdTotal}`);
  console.log(`  Updated: ${updatedTotal}`);
  console.log(`  Deleted: ${deletedTotal}`);
  console.log(`  Time: ${report.durationMs}ms`);

  if (createdTotal > 0) {
    if (report.created.plans.length) console.log(`    plans:   ${report.created.plans.join(", ")}`);
    if (report.created.pricings.length) console.log(`    pricing:  ${report.created.pricings.join(", ")}`);
    if (report.created.revenueConfigs.length) console.log(`    revenue:  default`);
    if (report.created.billingConfigs.length) console.log(`    billing:  default`);
    if (report.created.commissionPolicies.length) console.log(`    commissions: default`);
  }

  console.log("  STATUS: OK");

  // ── Step 4: Verify Runtime ────────────────────────────────────────────
  divider("Step 4/4 — Verify Runtime");

  const verifyMissing = await repo.checkSchema();
  if (verifyMissing.length > 0) {
    console.log(`  FAILED: Tables missing after sync. This should not happen.`);
    console.log(`  Missing: ${verifyMissing.join(", ")}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const verifyVersion = await service.getSchemaVersion();
  if (!verifyVersion.compatible) {
    console.log(`  FAILED: Schema version mismatch after sync.`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`  Runtime schema: present`);
  console.log(`  Schema version: ${verifyVersion.installed}`);
  console.log("  STATUS: OK");

  await prisma.$disconnect();

  console.log("");
  console.log("  ✓ Platform bootstrap complete.");
  console.log("  ────────────────────────────");
  console.log(`  ${createdTotal} created, ${updatedTotal} updated, ${deletedTotal} deleted`);
  console.log(`  Runtime schema v${verifyVersion.installed} is compatible.`);
  console.log("");
}

main().catch((e) => {
  console.error("  FATAL:", e);
  process.exit(1);
});
