/**
 * Deterministic Test Seed v1.0.0
 *
 * Creates a consistent database state for E2E testing.
 * Every entity has a fixed ID for repeatable assertions.
 * Run: npx tsx tests/fixtures/test-seed.ts
 */

import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());
const DATABASE_URL = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

async function hashPassword() {
  return bcrypt.hash("TestPass123!", 12);
}

export const TEST_IDS = {
  superAdmin: "test-super-admin",
  agency: "test-agency-001",
  creatorTenant: "test-tenant-creator",
  product1: "test-product-001",
  product2: "test-product-002",
  order1: "test-order-001",
  coupon: "LAUNCH10",
} as const;

async function main() {
  console.log("🌱 Seeding test database...");

  // ── Super Admin ──────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@creatorstore.test" },
    update: {},
    create: {
      id: TEST_IDS.superAdmin,
      email: "admin@creatorstore.test",
      password: await hashPassword(),
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });

  // ── Agency ───────────────────────────────────────────────────────────
  await prisma.websiteAgency.upsert({
    where: { id: TEST_IDS.agency },
    update: {},
    create: {
      id: TEST_IDS.agency,
      name: "Test Agency",
      subdomain: "testagency",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "agency@creatorstore.test" },
    update: {},
    create: {
      email: "agency@creatorstore.test",
      password: await hashPassword(),
      name: "Agency Admin",
      role: "AGENCY_ADMIN",
      agencyId: TEST_IDS.agency,
    },
  });

  // ── Creator Tenant ───────────────────────────────────────────────────
  await prisma.tenant.upsert({
    where: { subdomain: "testcreator" },
    update: {},
    create: {
      id: TEST_IDS.creatorTenant,
      name: "Test Creator",
      subdomain: "testcreator",
    },
  });

  await prisma.user.upsert({
    where: { email: "creator@creatorstore.test" },
    update: {},
    create: {
      email: "creator@creatorstore.test",
      password: await hashPassword(),
      name: "Test Creator",
      role: "ADMIN",
      tenantId: TEST_IDS.creatorTenant,
    },
  });

  // ── Products ─────────────────────────────────────────────────────────
  await prisma.product.upsert({
    where: { id: TEST_IDS.product1 },
    update: {},
    create: {
      id: TEST_IDS.product1,
      tenantId: TEST_IDS.creatorTenant,
      name: "Test Product - Gaming Chair",
      description: "A comfortable gaming chair",
      price: 4999,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { id: TEST_IDS.product2 },
    update: {},
    create: {
      id: TEST_IDS.product2,
      tenantId: TEST_IDS.creatorTenant,
      name: "Test Product - Merch Tee",
      description: "Official merchandise T-shirt",
      price: 599,
      isActive: true,
    },
  });

  // ── Gallery ──────────────────────────────────────────────────────────
  await prisma.galleryImage.upsert({
    where: { id: "test-gallery-001" },
    update: {},
    create: {
      id: "test-gallery-001",
      tenantId: TEST_IDS.creatorTenant,
      title: "Hero Shot",
      imageUrl: "https://placehold.co/800x600/09090b/00f5ff?text=Hero",
      mediaType: "image",
    },
  });

  // ── Order ────────────────────────────────────────────────────────────
  await prisma.productOrder.upsert({
    where: { id: TEST_IDS.order1 },
    update: {},
    create: {
      id: TEST_IDS.order1,
      tenantId: TEST_IDS.creatorTenant,
      productId: TEST_IDS.product1,
      amount: 4999,
      status: "COMPLETED",
      razorpayOrderId: "order_test_001",
      razorpayPaymentId: "pay_test_001",
      fanEmail: "fan@example.com",
    },
  });

  // ── Subscription ─────────────────────────────────────────────────────
  await prisma.subscription.upsert({
    where: { tenantId: TEST_IDS.creatorTenant },
    update: {},
    create: {
      tenantId: TEST_IDS.creatorTenant,
      plan: "PRO",
      status: "ACTIVE",
    },
  });

  // ── Settings ─────────────────────────────────────────────────────────
  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId: TEST_IDS.creatorTenant, key: "hero" } },
    update: {},
    create: {
      tenantId: TEST_IDS.creatorTenant,
      key: "hero",
      value: { title: "Welcome", subtitle: "Test Creator Store" },
    },
  });

  console.log("✅ Test database seeded successfully");
  console.log("   Super Admin: admin@creatorstore.test / TestPass123!");
  console.log("   Agency:      agency@creatorstore.test / TestPass123!");
  console.log("   Creator:     creator@creatorstore.test / TestPass123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
