/**
 * RCCF-SUBSCRIPTIONS-01 — Deprecate legacy BillingPlan rows.
 *
 * The canonical registry (`src/config/commerce/plans.ts`) defines the only
 * plans that may surface in runtime/marketing/super-admin surfaces. This script
 * marks any BillingPlan row whose code is not in that registry as DEPRECATED
 * (so the runtime + Pricing Center filters, which skip non-ACTIVE rows, never
 * expose it) and re-points any BillingSubscription still referencing a legacy
 * row to the canonical plan (via LEGACY_TO_CANONICAL).
 *
 * Idempotent and safe: it never deletes rows, never touches BillingInvoice,
 * and never changes prices/capabilities.
 *
 * Run:  npx tsx scripts/deprecate-legacy-plans.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";
import { COMMERCE_PLANS, LEGACY_TO_CANONICAL } from "../src/config/commerce/plans";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  const canonicalCodes = new Set(COMMERCE_PLANS.map((p) => p.code));

  const rows = await prisma.billingPlan.findMany({
    select: { id: true, code: true, name: true, status: true },
  });
  const legacy = rows.filter((r) => !canonicalCodes.has(r.code));

  if (legacy.length === 0) {
    console.log("No legacy BillingPlan rows found — nothing to do.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${legacy.length} legacy BillingPlan row(s) to deprecate:\n`);
  for (const row of legacy) {
    console.log(`  - ${row.code} (${row.name}) [status=${row.status}]`);
  }

  let repointed = 0;
  for (const row of legacy) {
    const canonicalCode = LEGACY_TO_CANONICAL[row.code];
    const subs = await prisma.billingSubscription.count({ where: { planId: row.id } });
    if (canonicalCode && subs > 0) {
      const canonicalRow = await prisma.billingPlan.findFirst({ where: { code: canonicalCode } });
      if (canonicalRow) {
        const res = await prisma.billingSubscription.updateMany({
          where: { planId: row.id },
          data: { planId: canonicalRow.id },
        });
        repointed += res.count;
        console.log(`  re-pointed ${res.count} subscription(s) ${row.code} -> ${canonicalCode}`);
      } else {
        console.warn(`  ! canonical plan ${canonicalCode} has no BillingPlan row — ${subs} subscription(s) left on ${row.code}`);
      }
    } else if (subs > 0) {
      console.warn(`  ! ${subs} subscription(s) reference ${row.code} and no canonical mapping exists — left as-is`);
    }
  }

  const res = await prisma.billingPlan.updateMany({
    where: { code: { in: legacy.map((r) => r.code) } },
    data: { status: "DEPRECATED" },
  });
  console.log(`\nMarked ${res.count} legacy BillingPlan row(s) as DEPRECATED.${repointed > 0 ? ` Re-pointed ${repointed} subscription(s).` : ""}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
