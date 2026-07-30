import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  const checks: Record<string, number> = {
    "Super Admins": await prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
    "Users (total)": await prisma.user.count(),
    Tenants: await prisma.tenant.count(),
    Workspaces: await prisma.workspace.count(),
    Websites: await prisma.website.count(),
    "Billing Plans": await prisma.billingPlan.count(),
    "Commercial Pricing": await prisma.commercialPricing.count(),
    "Revenue Config": await prisma.revenueConfiguration.count(),
    "Billing Config": await prisma.billingConfiguration.count(),
    "Commission Policies": await prisma.commissionPolicy.count(),
    "Schema Version": 0,
    Products: await prisma.product.count(),
    Gallery: await prisma.galleryImage.count(),
    Links: await prisma.affiliateLink.count(),
    Pages: await prisma.page.count(),
    "Publish Snapshots": await prisma.publishSnapshot.count(),
    Themes: 0, // in-memory
    Templates: 0, // in-memory
  };

  const maxLen = Math.max(...Object.keys(checks).map((k) => k.length));
  let allOk = true;

  for (const [label, count] of Object.entries(checks)) {
    const status = count > 0 ? "✅" : count === 0 && !["Products", "Gallery", "Links", "Pages", "Publish Snapshots", "Themes", "Templates"].includes(label) ? "❌" : "⚠️";
    if (status === "❌" && ["Billing Plans", "Commercial Pricing", "Revenue Config", "Billing Config", "Commission Policies", "Super Admins"].includes(label)) {
      allOk = false;
    }
    console.log(`  ${status} ${label.padEnd(maxLen)} ${count}`);
  }

  console.log("");
  if (allOk) {
    console.log("  ✓ All critical platform data present.");
  } else {
    console.log("  ❌ Some critical platform data is missing.");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
