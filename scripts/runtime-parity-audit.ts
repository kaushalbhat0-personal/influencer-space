/**
 * IMPLEMENTATION-16 — Runtime Parity Audit.
 *
 * Prints the Aggregate Parity report (DB vs Aggregate vs Layout vs Rendered
 * per module) and the Builder-vs-Storefront Runtime Signature comparison for a
 * creator.
 *
 * Run:  npx tsx scripts/runtime-parity-audit.ts [email]
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

  console.log("==================================================");
  console.log("Runtime Parity Audit");
  console.log("Creator:", email);
  console.log("Tenant: ", tenantId);
  console.log("==================================================");

  const report = await parity.aggregateParityReport(tenantId);
  console.log("\n— Aggregate Parity (DB | Aggregate = items, Layout | Rendered = sections) —");
  console.log("module       db    agg   lay   ren   status");
  for (const row of report.modules) {
    console.log(
      `${row.module.padEnd(12)} ${String(row.db).padStart(4)}  ${String(row.aggregate).padStart(4)}  ${String(row.layout).padStart(4)}  ${String(row.rendered).padStart(4)}  ${row.status}`,
    );
  }
  console.log(`\nAggregate parity: ${report.aggregateMatches ? "PASS" : "FAIL"}`);

  const runtime = await parity.runtimeParityReport(tenantId);
  console.log("\n— Builder (Draft) vs Storefront (Published) —");
  console.log("Theme:               ", runtime.theme);
  console.log("Draft sections:      ", runtime.draftSections);
  console.log("Published sections:  ", runtime.publishedSections);
  console.log("Sections match:      ", runtime.sectionsMatch ? "PASS" : "FAIL");
  console.log("Draft signature:     ", runtime.draftSignature);
  console.log("Published signature: ", runtime.publishedSignature);
  console.log("Signatures match:    ", runtime.signaturesMatch ? "PASS" : "FAIL");

  const allPass = report.aggregateMatches && runtime.signaturesMatch && runtime.sectionsMatch;
  console.log("\n==================================================");
  console.log(`OVERALL RUNTIME PARITY: ${allPass ? "PASS" : "FAIL"}`);
  console.log("==================================================");

  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
