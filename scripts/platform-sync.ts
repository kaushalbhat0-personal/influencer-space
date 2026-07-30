import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");
  const planFilter = args.find((a) => a.startsWith("--plans="))?.split("=")[1];
  const planCodes = planFilter ? planFilter.split(",") : undefined;

  if (!url) {
    console.error("No database URL available. Set DIRECT_URL or DATABASE_URL.");
    process.exit(1);
  }

  console.log(`Platform Registry Sync — ${dryRun ? "DRY RUN (use --apply to commit)" : "APPLYING CHANGES"}`);
  if (planCodes) console.log(`  Filtering to plans: ${planCodes.join(", ")}`);
  console.log("");

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  const { PlatformRegistrySyncService, PlatformSyncRepository } = await import("../src/lib/registry-sync");
  const repo = new PlatformSyncRepository();
  const service = new PlatformRegistrySyncService(repo);

  const report = await service.sync({ dryRun, planCodes });

  if (report.schemaMissing.length > 0) {
    console.log("  BLOCKED — Missing runtime tables:\n");
    for (const t of report.schemaMissing) console.log(`    - ${t}`);
    console.log("");
    console.log("  Run scripts/sql/platform-registry-runtime.sql in Supabase SQL Editor.");
    await prisma.$disconnect();
    process.exit(1);
  }

  if (!report.schemaVersion.compatible) {
    console.log("  BLOCKED — Schema version mismatch:\n");
    console.log(`    Required: ${report.schemaVersion.required}`);
    console.log(`    Installed: ${report.schemaVersion.installed ?? "(none)"}`);
    console.log("");
    console.log("  Run the upgraded SQL migration in Supabase SQL Editor.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`  Source: ${report.sourcePlanCount} plans`);
  console.log(`  Target: ${report.targetPlanCount} plans (BillingPlan)`);
  console.log(`  Diffs:  ${report.diffs.length} (${report.errors.length} errors)`);
  console.log(`  Time:   ${report.durationMs}ms`);
  console.log("");

  if (report.created.plans.length) console.log(`  [CREATE] plans:              ${report.created.plans.join(", ")}`);
  if (report.created.pricings.length) console.log(`  [CREATE] pricings:            ${report.created.pricings.join(", ")}`);
  if (report.created.revenueConfigs.length) console.log(`  [CREATE] revenue configs:     ${report.created.revenueConfigs.join(", ")}`);
  if (report.created.billingConfigs.length) console.log(`  [CREATE] billing configs:     ${report.created.billingConfigs.join(", ")}`);
  if (report.created.commissionPolicies.length) console.log(`  [CREATE] commission policies: ${report.created.commissionPolicies.join(", ")}`);

  if (report.updated.plans.length) console.log(`  [UPDATE] plans:              ${report.updated.plans.join(", ")}`);
  if (report.updated.pricings.length) console.log(`  [UPDATE] pricings:            ${report.updated.pricings.join(", ")}`);
  if (report.updated.revenueConfigs.length) console.log(`  [UPDATE] revenue configs:     ${report.updated.revenueConfigs.join(", ")}`);
  if (report.updated.billingConfigs.length) console.log(`  [UPDATE] billing configs:     ${report.updated.billingConfigs.join(", ")}`);
  if (report.updated.commissionPolicies.length) console.log(`  [UPDATE] commission policies: ${report.updated.commissionPolicies.join(", ")}`);

  if (report.deleted.plans.length) console.log(`  [DELETE] plans:              ${report.deleted.plans.join(", ")}`);
  if (report.deleted.pricings.length) console.log(`  [DELETE] pricings:            ${report.deleted.pricings.join(", ")}`);

  if (report.errors.length) {
    console.log("");
    console.log("  ERRORS:");
    for (const err of report.errors) console.log(`    - ${err}`);
  }

  if (report.diffs.length === 0 && report.errors.length === 0) {
    console.log("  Registry is in sync. No changes needed.");
  }

  await prisma.$disconnect();
  if (!dryRun && report.errors.length === 0) {
    console.log("");
    console.log("  Sync applied successfully.");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
