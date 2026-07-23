import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function census(label: string, count: number) {
  console.log(`  ${label.padEnd(30)} ${count}`);
}

async function main() {
  console.log("=== CreatorStore Database Cleanup v2.0 ===\n");

  // ── Phase 1: Census ──────────────────────────────────────────────────
  console.log("--- Pre-Cleanup Census ---");
  const models = [
    "analyticsEvent", "asset", "assetReference", "auditLog", "block",
    "billingAccount", "billingEvent", "billingInvoice", "billingSubscription",
    "contactSubmission", "contentFeedItem", "creatorImport",
    "creatorProvisionEvent", "creatorProvisionRun", "creatorProfile",
    "creatorIntelligence", "designTheme", "galleryImage", "game",
    "newsletterSubscriber", "offering", "page", "product", "productOrder",
    "providerAccount", "providerFetchLog", "purchase", "publishSnapshot",
    "section", "setting", "socialStats", "subscription",
    "agencySubscription", "agencyTenant", "timelineEvent", "workspaceMember",
    "workflow", "workflowExecution", "youTubeQuotaUsage",
  ] as const;

  const pre: Record<string, number> = {};
  for (const m of models) {
    try {
      const table = m as string;
      const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) FROM "${table}"`);
      pre[m] = Number(result[0]?.count ?? 0);
    } catch { pre[m] = 0; }
    census(m, pre[m]);
  }

  // ── Phase 2: Identify preserved records ─────────────────────────────
  console.log("\n--- Identifying Preserved Records ---");

  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, tenantId: true },
  });
  console.log(`  Super admins to preserve: ${superAdmins.length}`);
  for (const sa of superAdmins) console.log(`    ${sa.email}`);

  const preservedUserIds = superAdmins.map((u) => u.id);
  const preservedTenantIds = superAdmins.map((u) => u.tenantId).filter((id): id is string => id !== null);

  const billingPlanCount = await prisma.billingPlan.count();
  const billingFeatureCount = await prisma.billingFeature.count();
  const themeCount = await prisma.theme.count();
  console.log(`  Billing plans: ${billingPlanCount} (preserved)`);
  console.log(`  Billing features: ${billingFeatureCount} (preserved)`);
  console.log(`  System themes: ${themeCount} (preserved)`);

  // ── Phase 3: Deletion (FK-safe order) ───────────────────────────────
  console.log("\n--- Deleting Test/Demo/Generated Data ---");

  // Leaf tables first (no dependent children)
  console.log("\n  [1/6] Leaf entities (blocks, snapshots, child records)...");
  await prisma.block.deleteMany();
  await prisma.section.deleteMany();
  await prisma.publishSnapshot.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.publishStatus.deleteMany();

  // Non-essential independent entities
  console.log("\n  [2/6] Non-essential entities...");
  await prisma.analyticsEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.contactSubmission.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.socialStats.deleteMany();
  await prisma.contentFeedItem.deleteMany();
  await prisma.creatorProvisionEvent.deleteMany();
  await prisma.creatorProvisionRun.deleteMany();
  await prisma.creatorImport.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.creatorIntelligence.deleteMany();
  await prisma.providerFetchLog.deleteMany();
  await prisma.youTubeQuotaUsage.deleteMany();
  await prisma.providerAccount.deleteMany();
  await prisma.designTheme.deleteMany();
  await prisma.workflowExecution.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.assetReference.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.offering.deleteMany();
  await prisma.purchase.deleteMany();

  // Billing v2 (workspace-scoped)
  console.log("\n  [3/6] Billing v2 records...");
  await prisma.billingInvoice.deleteMany();
  await prisma.billingEvent.deleteMany();
  await prisma.billingSubscription.deleteMany();
  await prisma.billingAccount.deleteMany();

  // Content entities (tenant-scoped)
  console.log("\n  [4/6] Content entities...");
  await prisma.productOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.game.deleteMany();
  await prisma.affiliateLink.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.page.deleteMany();
  await prisma.website.deleteMany();

  // Workspace + membership
  console.log("\n  [5/6] Workspace + membership...");
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();

  // Legacy billing + tenant-adjacent
  await prisma.agencySubscription.deleteMany();
  await prisma.subscription.deleteMany();

  // Agencies + tenants + users (preserve super admins)
  console.log("\n  [6/6] Agencies, tenants, non-admin users...");
  await prisma.agencyTenant.deleteMany();
  await prisma.websiteAgency.deleteMany();

  if (preservedTenantIds.length > 0) {
    await prisma.tenant.deleteMany({ where: { id: { notIn: preservedTenantIds } } });
  } else {
    await prisma.tenant.deleteMany();
  }

  await prisma.user.deleteMany({ where: { id: { notIn: preservedUserIds } } });

  // ── Phase 4: Post-Cleanup Census ─────────────────────────────────────
  console.log("\n--- Post-Cleanup Census ---");
  const post: Record<string, number> = {};
  for (const m of models) {
    try {
      const table = m as string;
      const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT COUNT(*) FROM "${table}"`);
      post[m] = Number(result[0]?.count ?? 0);
    } catch { post[m] = 0; }
    census(m, post[m]);
  }

  // ── Phase 5: Verification ────────────────────────────────────────────
  console.log("\n--- Verification ---");

  const remainingSuperAdmins = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  console.log(`  Super admins remaining: ${remainingSuperAdmins} (expected: ${superAdmins.length})`);

  const remainingBillingPlans = await prisma.billingPlan.count();
  const remainingBillingFeatures = await prisma.billingFeature.count();
  const remainingThemes = await prisma.theme.count();
  console.log(`  Billing plans: ${remainingBillingPlans} (expected: ${billingPlanCount})`);
  console.log(`  Billing features: ${remainingBillingFeatures} (expected: ${billingFeatureCount})`);
  console.log(`  System themes: ${remainingThemes} (expected: ${themeCount})`);

  const orphanChecks: Array<{ label: string; query: string }> = [
    { label: "Orphaned Websites", query: `SELECT COUNT(*) FROM "Website" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT id FROM "Tenant")` },
    { label: "Orphaned Products", query: `SELECT COUNT(*) FROM "Product" WHERE "tenantId" NOT IN (SELECT id FROM "Tenant")` },
    { label: "Orphaned Workspaces", query: `SELECT COUNT(*) FROM "Workspace" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT id FROM "Tenant")` },
    { label: "Orphaned BillingSubscription", query: `SELECT COUNT(*) FROM "BillingSubscription" WHERE "workspaceId" IS NOT NULL AND "workspaceId" NOT IN (SELECT id FROM "Workspace")` },
  ];

  for (const check of orphanChecks) {
    try {
      const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(check.query);
      const count = Number(result[0]?.count ?? BigInt(0));
      console.log(`  ${check.label}: ${count} ${count > 0 ? "⚠️" : "✅"}`);
    } catch {
      console.log(`  ${check.label}: SKIP`);
    }
  }

  const totalPre = Object.values(pre).reduce((s, v) => s + (v ?? 0), 0);
  const totalPost = Object.values(post).reduce((s, v) => s + (v ?? 0), 0);
  console.log(`\n--- Summary ---`);
  console.log(`  Records before: ${totalPre}`);
  console.log(`  Records after:  ${totalPost}`);
  console.log(`  Records deleted: ${totalPre - totalPost}`);
  console.log(`\n=== Cleanup Complete ===`);
}

main()
  .catch((e) => { console.error("Cleanup failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
