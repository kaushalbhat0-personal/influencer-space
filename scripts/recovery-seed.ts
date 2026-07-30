import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL || process.env.DIRECT_URL || "";

async function main() {
  console.log("  Recovery Seed");
  console.log("  ─────────────");
  console.log(`  ${new Date().toISOString()}`);
  console.log("");

  if (!url) {
    console.error("  FAILED: No database URL. Set DIRECT_URL or DATABASE_URL.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  // ── Step 1: Create Super Admin ──────────────────────────────────────────
  console.log("  Step 1/4 — Create Super Admin");

  const existingAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existingAdmin) {
    console.log(`  Super Admin already exists: ${existingAdmin.email}`);
  } else {
    const password = "admin123";
    const hashed = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        email: "admin@creatorspace.app",
        name: "Super Admin",
        password: hashed,
        role: "SUPER_ADMIN",
      },
    });
    console.log(`  Created: ${admin.email} (password: ${password})`);
  }
  console.log("  STATUS: OK");

  // ── Step 2: Create Runtime Tables if Missing ────────────────────────────
  console.log("");
  console.log("  Step 2/4 — Create Runtime Tables");

  const requiredTables = ["CommercialPricing", "RevenueConfiguration", "BillingConfiguration", "CommissionPolicy"];
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const r = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}') as "exists"`,
      );
      const rows = r as Record<string, unknown>[];
      if (!rows[0]?.exists) missingTables.push(table);
    } catch {
      missingTables.push(table);
    }
  }

  if (missingTables.length > 0) {
    console.log(`  Missing tables: ${missingTables.join(", ")}`);
    console.log("  Creating runtime tables via SQL...");

    const sql = `
      CREATE TABLE IF NOT EXISTS "_PlatformRuntimeSchema" (
          "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "version"    TEXT NOT NULL,
          "upgradedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      INSERT INTO "_PlatformRuntimeSchema" ("version")
      SELECT '1.0.0' WHERE NOT EXISTS (SELECT 1 FROM "_PlatformRuntimeSchema" WHERE "version" = '1.0.0');

      CREATE TABLE IF NOT EXISTS "CommercialPricing" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "planCode" TEXT NOT NULL,
          "workspaceType" TEXT NOT NULL, "monthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "yearlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'INR',
          "status" TEXT NOT NULL DEFAULT 'ACTIVE', "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "effectiveTo" TIMESTAMPTZ, "version" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "CommercialPricing_planCode_version_key" ON "CommercialPricing" ("planCode", "version");
      CREATE INDEX IF NOT EXISTS "CommercialPricing_planCode_status_idx" ON "CommercialPricing" ("planCode", "status");

      CREATE TABLE IF NOT EXISTS "RevenueConfiguration" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "defaultCurrency" TEXT NOT NULL DEFAULT 'INR', "defaultTrialDays" INTEGER NOT NULL DEFAULT 14,
          "gracePeriodDays" INTEGER NOT NULL DEFAULT 7, "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
          "autoRenew" BOOLEAN NOT NULL DEFAULT true, "refundWindowDays" INTEGER NOT NULL DEFAULT 30,
          "prorationEnabled" BOOLEAN NOT NULL DEFAULT true, "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "effectiveTo" TIMESTAMPTZ, "version" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "RevenueConfiguration_status_version_idx" ON "RevenueConfiguration" ("status", "version" DESC);

      CREATE TABLE IF NOT EXISTS "CommissionPolicy" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "agencyClientPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
          "platformPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
          "referralPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
          "creatorDefaultShare" DOUBLE PRECISION NOT NULL DEFAULT 70,
          "agencyDefaultShare" DOUBLE PRECISION NOT NULL DEFAULT 30,
          "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(), "effectiveTo" TIMESTAMPTZ,
          "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "CommissionPolicy_status_version_idx" ON "CommissionPolicy" ("status", "version" DESC);

      CREATE TABLE IF NOT EXISTS "BillingConfiguration" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "taxMode" TEXT NOT NULL DEFAULT 'exclusive', "cancellationPolicy" TEXT NOT NULL DEFAULT 'immediate',
          "defaultRegion" TEXT NOT NULL DEFAULT 'IN', "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "effectiveTo" TIMESTAMPTZ, "version" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "BillingConfiguration_status_version_idx" ON "BillingConfiguration" ("status", "version" DESC);
    `;

    const statements = sql.split(";").filter((s) => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt + ";");
        console.log(`  Executed: ${stmt.trim().split("\n")[0].trim().slice(0, 60)}...`);
      } catch (err) {
        console.error(`  SQL error:`, err);
      }
    }
    console.log("  Runtime tables created.");
  } else {
    console.log("  All runtime tables already exist.");
  }
  console.log("  STATUS: OK");

  // ── Step 3: Seed Billing Plans ──────────────────────────────────────────
  console.log("");
  console.log("  Step 3/4 — Seed Billing Plans");

  const existingPlans = await prisma.billingPlan.count();
  if (existingPlans > 0) {
    console.log(`  ${existingPlans} billing plans already exist.`);
  } else {
    const plans = [
      { code: "creator-free", family: "creator", name: "Free", price: 0, currency: "INR", cycle: "monthly" },
      { code: "creator-pro", family: "creator", name: "Pro", price: 299, currency: "INR", cycle: "monthly" },
      { code: "creator-pro-annual", family: "creator", name: "Pro Annual", price: 2999, currency: "INR", cycle: "annual" },
      { code: "agency-starter", family: "agency", name: "Starter", price: 999, currency: "INR", cycle: "monthly" },
      { code: "agency-growth", family: "agency", name: "Growth", price: 2499, currency: "INR", cycle: "monthly" },
      { code: "agency-growth-annual", family: "agency", name: "Growth Annual", price: 24990, currency: "INR", cycle: "annual" },
      { code: "agency-scale", family: "agency", name: "Scale", price: 4999, currency: "INR", cycle: "monthly" },
      { code: "agency-enterprise", family: "agency", name: "Enterprise", price: 0, currency: "INR", cycle: "monthly" },
    ];

    for (const plan of plans) {
      await prisma.billingPlan.create({ data: plan });
      console.log(`  Created plan: ${plan.code} (₹${plan.price}/${plan.cycle})`);
    }
  }
  console.log("  STATUS: OK");

  // ── Step 4: Seed Pricing, Configs, and Policies ─────────────────────────
  console.log("");
  console.log("  Step 4/4 — Seed Pricing & Configurations");

  const existingPricings = await prisma.commercialPricing.count();
  if (existingPricings === 0) {
    const pricings = [
      { planCode: "creator-free", workspaceType: "creator", monthlyPrice: 0, yearlyPrice: 0 },
      { planCode: "creator-pro", workspaceType: "creator", monthlyPrice: 299, yearlyPrice: 2999 },
      { planCode: "agency-starter", workspaceType: "agency", monthlyPrice: 999, yearlyPrice: 9990 },
      { planCode: "agency-growth", workspaceType: "agency", monthlyPrice: 2499, yearlyPrice: 24990 },
      { planCode: "agency-scale", workspaceType: "agency", monthlyPrice: 4999, yearlyPrice: 49990 },
    ];
    for (const p of pricings) {
      await prisma.commercialPricing.create({ data: p });
      console.log(`  Created pricing: ${p.planCode}`);
    }
  } else {
    console.log(`  ${existingPricings} pricings already exist.`);
  }

  const existingRevenueConfig = await prisma.revenueConfiguration.findFirst({ where: { status: "ACTIVE" } });
  if (!existingRevenueConfig) {
    await prisma.revenueConfiguration.create({
      data: { status: "ACTIVE", defaultCurrency: "INR", defaultTrialDays: 14, gracePeriodDays: 7, autoRenew: true, refundWindowDays: 30, prorationEnabled: true },
    });
    console.log("  Created revenue configuration.");
  } else {
    console.log("  Revenue configuration already exists.");
  }

  const existingBillingConfig = await prisma.billingConfiguration.findFirst({ where: { status: "ACTIVE" } });
  if (!existingBillingConfig) {
    await prisma.billingConfiguration.create({
      data: { status: "ACTIVE", taxMode: "exclusive", cancellationPolicy: "immediate", defaultRegion: "IN" },
    });
    console.log("  Created billing configuration.");
  } else {
    console.log("  Billing configuration already exists.");
  }

  const existingCommissionPolicy = await prisma.commissionPolicy.findFirst({ where: { status: "ACTIVE" } });
  if (!existingCommissionPolicy) {
    await prisma.commissionPolicy.create({
      data: { status: "ACTIVE", agencyClientPercent: 20, platformPercent: 10, referralPercent: 5, creatorDefaultShare: 70, agencyDefaultShare: 30 },
    });
    console.log("  Created commission policy.");
  } else {
    console.log("  Commission policy already exists.");
  }

  console.log("  STATUS: OK");

  await prisma.$disconnect();

  console.log("");
  console.log("  ✓ Recovery seed complete.");
  console.log("  ─────────────────────────");
  console.log(`  Super Admin: admin@creatorspace.app`);
  console.log(`  Password: admin123`);
  console.log("");
}

main().catch((e) => {
  console.error("  FATAL:", e);
  process.exit(1);
});
