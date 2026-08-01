/**
 * IMPLEMENTATION-17 — Runtime Data Resolution Audit.
 *
 * Prints the five-way per-module counts (Database · Aggregate · Runtime ·
 * Builder · Storefront) plus the aggregate diagnostics (invalid asset ids,
 * skipped assets, module failures) for a creator. Exits non-zero on any
 * mismatch or any invalid asset id.
 *
 * Run:  npx tsx scripts/runtime-data-audit.ts [email]
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const email = process.argv[2] ?? process.env.E2E_CREATOR_EMAIL ?? "testcreator1@gmail.com";
  const url = process.env.DATABASE_URL || "";
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.tenantId) {
    console.error(`Creator ${email} not found`);
    process.exit(1);
  }
  const tenantId = user.tenantId;

  const parity = await import("../src/lib/observability/runtime-parity");
  const agg = await import("../src/modules/tenant/application/website-aggregate.service");

  console.log("==================================================");
  console.log("Runtime Data Resolution Audit");
  console.log("Creator:", email);
  console.log("Tenant: ", tenantId);
  console.log("==================================================");

  const audit = await parity.runtimeDataAudit(tenantId);
  console.log("\n— Per-module counts (DB | Aggregate | Runtime | Builder | Storefront) —");
  console.log("module       db    agg   run   bld   str   match");
  for (const row of audit.rows) {
    console.log(
      `${row.module.padEnd(12)} ${String(row.db).padStart(4)}  ${String(row.aggregate).padStart(4)}  ${String(row.runtime).padStart(4)}  ${String(row.builder).padStart(4)}  ${String(row.storefront).padStart(4)}  ${row.match ? "✓" : "✗ " + row.reason}`,
    );
  }

  const diag = await agg.websiteAggregateService.buildWithDiagnostics(tenantId);
  console.log("\n— Asset integrity diagnostics —");
  console.log("invalid asset ids:", diag.invalidAssetIds.length ? JSON.stringify(diag.invalidAssetIds) : 0);
  console.log("skipped assets:   ", diag.skippedAssets);
  console.log("module failures:  ", diag.moduleFailures.length ? diag.moduleFailures.join("; ") : 0);

  const runtime = await parity.runtimeParityReport(tenantId);
  console.log("\n— Builder vs Storefront parity —");
  console.log("Draft signature:      ", runtime.draftSignature);
  console.log("Published signature:  ", runtime.publishedSignature);
  console.log("Signatures match:     ", runtime.signaturesMatch ? "PASS" : "FAIL");

  const pass = audit.pass && runtime.signaturesMatch;
  console.log("\n==================================================");
  console.log(`RUNTIME DATA AUDIT: ${pass ? "PASS" : "FAIL"}`);
  console.log("==================================================");

  await prisma.$disconnect();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
