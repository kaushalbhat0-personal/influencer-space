import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// RCCF-70.6.6 data backfill: historic "Build Manually" creators provisioned a
// Tenant + Website + Workspace via createManualWebsite but never had the
// `onboarding_completed` Setting written (the action lacked the
// markOnboardingComplete call). The DB-backed requireTenant
// (lib/lifecycle/service.ts) therefore keeps them in ONBOARDING and fresh
// logins loop /admin/dashboard ↔ /onboarding.
//
// Idempotent: only tenants that (1) have a Website row, (2) do NOT already
// have a Setting { key: "onboarding_completed" }, and (3) are owned by a
// User with role === "ADMIN" are touched. Writes exactly the same Setting
// row that markOnboardingComplete writes (prisma.setting.upsert, value
// { completedAt }). No User/Tenant/Website/Workspace rows are modified and
// no schema/migration change is performed.
async function main() {
  const websites = await prisma.website.findMany({
    select: { tenantId: true },
  });
  const tenantIds = [...new Set(websites.map((w) => w.tenantId))];
  console.log(`RCCF-70.6.6 backfill: ${tenantIds.length} tenant(s) with a Website`);

  let written = 0;
  let skipped = 0;

  for (const tenantId of tenantIds) {
    const existing = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const admin = await prisma.user.findFirst({
      where: { tenantId, role: "ADMIN" },
      select: { id: true },
    });
    if (!admin) {
      skipped++;
      console.log(`  skip ${tenantId}: no ADMIN owner`);
      continue;
    }

    const value = { completedAt: new Date().toISOString() };
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
      update: { value },
      create: { tenantId, key: "onboarding_completed", value },
    });
    written++;
    console.log(`  ✓ ${tenantId}`);
  }

  console.log(`Backfill done: ${written} written, ${skipped} skipped`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());