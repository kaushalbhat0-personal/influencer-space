import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  const statements: string[] = [
    // _PlatformRuntimeSchema
    `CREATE TABLE IF NOT EXISTS "_PlatformRuntimeSchema" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "version" TEXT NOT NULL,
        "upgradedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `INSERT INTO "_PlatformRuntimeSchema" ("version")
     SELECT '1.0.0'
     WHERE NOT EXISTS (SELECT 1 FROM "_PlatformRuntimeSchema" WHERE "version" = '1.0.0')`,
    // CommercialPricing
    `CREATE TABLE IF NOT EXISTS "CommercialPricing" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "planCode" TEXT NOT NULL,
        "workspaceType" TEXT NOT NULL, "monthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "yearlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'INR',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE', "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "effectiveTo" TIMESTAMPTZ, "version" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "CommercialPricing_planCode_version_key" ON "CommercialPricing" ("planCode", "version")`,
    `CREATE INDEX IF NOT EXISTS "CommercialPricing_planCode_status_idx" ON "CommercialPricing" ("planCode", "status")`,
    // RevenueConfiguration
    `CREATE TABLE IF NOT EXISTS "RevenueConfiguration" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "defaultCurrency" TEXT NOT NULL DEFAULT 'INR', "defaultTrialDays" INTEGER NOT NULL DEFAULT 14,
        "gracePeriodDays" INTEGER NOT NULL DEFAULT 7, "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
        "autoRenew" BOOLEAN NOT NULL DEFAULT true, "refundWindowDays" INTEGER NOT NULL DEFAULT 30,
        "prorationEnabled" BOOLEAN NOT NULL DEFAULT true, "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "effectiveTo" TIMESTAMPTZ, "version" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS "RevenueConfiguration_status_version_idx" ON "RevenueConfiguration" ("status", "version" DESC)`,
    // CommissionPolicy
    `CREATE TABLE IF NOT EXISTS "CommissionPolicy" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "agencyClientPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
        "platformPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
        "referralPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
        "creatorDefaultShare" DOUBLE PRECISION NOT NULL DEFAULT 70,
        "agencyDefaultShare" DOUBLE PRECISION NOT NULL DEFAULT 30,
        "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(), "effectiveTo" TIMESTAMPTZ,
        "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS "CommissionPolicy_status_version_idx" ON "CommissionPolicy" ("status", "version" DESC)`,
    // BillingConfiguration
    `CREATE TABLE IF NOT EXISTS "BillingConfiguration" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "taxMode" TEXT NOT NULL DEFAULT 'exclusive', "cancellationPolicy" TEXT NOT NULL DEFAULT 'immediate',
        "defaultRegion" TEXT NOT NULL DEFAULT 'IN', "effectiveFrom" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "effectiveTo" TIMESTAMPTZ, "version" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )`,
    `CREATE INDEX IF NOT EXISTS "BillingConfiguration_status_version_idx" ON "BillingConfiguration" ("status", "version" DESC)`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`  OK: ${sql.split("\n")[0].trim().slice(0, 70)}...`);
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "P2010" && (e.message || "").includes("already exists")) {
        console.log(`  Skip (exists): ${sql.split("\n")[0].trim().slice(0, 60)}...`);
      } else {
        console.log(`  ERROR: ${e.message?.slice(0, 100)}`);
      }
    }
  }

  await prisma.$disconnect();
  console.log("\n  Runtime schema check complete.");
}

main().catch(console.error);
