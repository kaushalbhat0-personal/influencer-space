import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function count(label: string, count: number) {
  console.log(`  ${label}: ${count}`);
}

async function main() {
  console.log("=== CreatorStore Database Cleanup ===\n");

  // Phase 1: Census
  console.log("--- Pre-Cleanup Census ---");
  const pre: Record<string, number> = {};
  const entities = [
    "tenant", "user", "website", "page", "section", "block",
    "publishSnapshot", "product", "galleryImage", "timelineEvent",
    "affiliateLink", "game", "setting", "contactSubmission",
    "newsletterSubscriber", "socialStats", "productOrder",
    "contentFeedItem", "asset", "offering", "purchase",
    "workflow", "workflowExecution",
  ] as const;

  for (const e of entities) {
    pre[e] = await (prisma[e as keyof typeof prisma] as unknown as { count: () => Promise<number> }).count();
    count(e, pre[e]);
  }

  // Phase 2: Identify super admins to preserve
  console.log("\n--- Preserving Super Admins ---");
  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, tenantId: true },
  });
  for (const sa of superAdmins) {
    console.log(`  ${sa.email} (tenantId: ${sa.tenantId || "none"})`);
  }

  const superAdminTenantIds = superAdmins
    .map((sa) => sa.tenantId)
    .filter((id): id is string => id !== null);

  // Phase 3: Delete non-super-admin users
  const deletedUsers = await prisma.user.deleteMany({
    where: { role: { not: "SUPER_ADMIN" } },
  });
  console.log(`\nDeleted non-super-admin users: ${deletedUsers.count}`);

  // Phase 4: Delete creator tenants (cascade handles related data)
  const tenantsToDelete = superAdminTenantIds.length > 0
    ? await prisma.tenant.deleteMany({
        where: { id: { notIn: superAdminTenantIds } },
      })
    : await prisma.tenant.deleteMany({});
  console.log(`Deleted creator tenants: ${tenantsToDelete.count}`);

  // Phase 5: Clean orphan agency-tenant links
  const remainingTenantIds = (await prisma.tenant.findMany({ select: { id: true } })).map((t) => t.id);
  if (remainingTenantIds.length > 0) {
    const orphanCount = await prisma.agencyTenant.deleteMany({
      where: { tenantId: { notIn: remainingTenantIds } },
    });
    if (orphanCount.count > 0) {
      console.log(`Deleted orphan agency-tenant links: ${orphanCount.count}`);
    }
  } else {
    const allAgencyTenants = await prisma.agencyTenant.count();
    if (allAgencyTenants > 0) {
      await prisma.agencyTenant.deleteMany();
      console.log(`Deleted all agency-tenant links: ${allAgencyTenants}`);
    }
  }

  // Phase 6: Post-cleanup verification
  console.log("\n--- Post-Cleanup Census ---");
  const post: Record<string, number> = {};
  for (const e of entities) {
    post[e] = await (prisma[e as keyof typeof prisma] as unknown as { count: () => Promise<number> }).count();
    count(e, post[e]);
  }

  // Phase 7: Verify preserved system records
  console.log("\n--- Preserved System Records ---");
  const preserved = {
    superAdmins: await prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
    billingPlans: await prisma.billingPlan.count(),
    billingFeatures: await prisma.billingFeature.count(),
    billingAccounts: await prisma.billingAccount.count(),
    themes: await prisma.theme.count(),
    designThemes: await prisma.designTheme.count(),
    websiteAgencies: await prisma.websiteAgency.count(),
    agencySubscriptions: await prisma.agencySubscription.count(),
  };
  for (const [k, v] of Object.entries(preserved)) {
    console.log(`  ${k}: ${v}`);
  }

  const totalPre = Object.values(pre).reduce((s, v) => s + v, 0);
  const totalPost = Object.values(post).reduce((s, v) => s + v, 0);
  console.log(`\n=== Cleanup Complete ===`);
  console.log(`Records before: ${totalPre}`);
  console.log(`Records after:  ${totalPost}`);
  console.log(`Records deleted: ${totalPre - totalPost}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
