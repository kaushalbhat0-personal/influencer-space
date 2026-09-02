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

import { createHash } from "crypto";

loadEnvConfig(process.cwd());
const DATABASE_URL = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

// Canonical E2E test password. Documented repo-wide (prisma/seed.ts,
// tests/reset-pw.ts, docs/recovery-03-certification.md). Overridable for CI.
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "admin123";

async function hashPassword() {
  return bcrypt.hash(PASSWORD, 12);
}

// Deterministic v5 UUIDs so the fixed IDs are valid for @db.Uuid columns AND
// repeatable across runs (the seed's stated purpose).
const NAMESPACE_UUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
function uuidv5(name: string): string {
  const hash = createHash("sha1").update(NAMESPACE_UUID + name, "utf8").digest();
  const b = Buffer.from(hash.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const TEST_IDS = {
  superAdmin: uuidv5("test-super-admin"),
  agency: uuidv5("test-agency-001"),
  creatorTenant: uuidv5("test-tenant-creator"),
  product1: uuidv5("test-product-001"),
  product2: uuidv5("test-product-002"),
  order1: uuidv5("test-order-001"),
  coupon: "LAUNCH10",
} as const;

const TEST_GALLERY_ID = uuidv5("test-gallery-001");

const NAMESPACE_EMAILS = [
  "admin@creatorstore.test",
  "agency@creatorstore.test",
  "creator@creatorstore.test",
];

/**
 * Reset pass — removes ONLY the deterministic E2E namespace (fixed IDs +
 * @creatorstore.test identities). Never touches records outside the namespace.
 * Idempotent: safe to run before every seed.
 */
async function resetNamespace() {
  const tenant = await prisma.tenant.findUnique({ where: { id: TEST_IDS.creatorTenant } });
  const tenantId = tenant?.id ?? null;

  // Children of the namespace tenant (deleted explicitly before the tenant so
  // FK constraints are satisfied regardless of per-model onDelete settings).
  if (tenantId) {
    await prisma.analyticsEvent.deleteMany({ where: { tenantId } });
    await prisma.assetReference.deleteMany({ where: { tenantId } });
    await prisma.asset.deleteMany({ where: { tenantId } });
    await prisma.booking.deleteMany({ where: { tenantId } });
    await prisma.purchase.deleteMany({ where: { tenantId } });
    await prisma.offering.deleteMany({ where: { tenantId } });
    await prisma.setting.deleteMany({ where: { tenantId } });
    await prisma.subscription.deleteMany({ where: { tenantId } });
    await prisma.galleryImage.deleteMany({ where: { tenantId } });
    await prisma.productOrder.deleteMany({ where: { tenantId } });
    await prisma.product.deleteMany({ where: { tenantId } });
    await prisma.clientAssignment.deleteMany({ where: { tenantId } });
    // Website cascades Brand, PublishStatus, PublishSnapshot, Page -> Section -> Block.
    await prisma.website.deleteMany({ where: { tenantId } });
  }

  // Agency namespace (Workspace cascades WorkspaceMember; invitations deleted
  // explicitly). ClientAssignments were already removed by tenantId above.
  await prisma.workspace.deleteMany({ where: { agencyId: TEST_IDS.agency } });
  await prisma.agencyTeamInvitation.deleteMany({ where: { agencyId: TEST_IDS.agency } });
  await prisma.websiteAgency.deleteMany({ where: { id: TEST_IDS.agency } });

  // Namespace users last.
  await prisma.user.deleteMany({ where: { email: { in: NAMESPACE_EMAILS } } });

  // Namespace tenant last (children already removed).
  await prisma.tenant.deleteMany({ where: { id: TEST_IDS.creatorTenant } });

  console.log(`   Reset: removed namespace (users, tenant ${TEST_IDS.creatorTenant}, agency ${TEST_IDS.agency})`);
}

async function main() {
  console.log("🌱 Seeding test database...");
  await resetNamespace();

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
    where: { id: TEST_GALLERY_ID },
    update: {},
    create: {
      id: TEST_GALLERY_ID,
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
  // R2.3: canonical QA plan is creator_grow (Growth) so resolveActivePlan
  // yields advanced_builder + premium theme caps via existing entitlement
  // architecture (no bypass). Using canonical code, not legacy PRO.
  await prisma.subscription.upsert({
    where: { tenantId: TEST_IDS.creatorTenant },
    update: { plan: "creator_grow", status: "ACTIVE" },
    create: {
      tenantId: TEST_IDS.creatorTenant,
      plan: "creator_grow",
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

  // ── Website (lifecycle READY) ────────────────────────────────────────────
  // RCCF-LIFECYCLE-01B: testcreator must be READY (hasWebsite true) so
  // DB lifecycle matches token lifecycle and /admin/dashboard does not
  // bounce to /onboarding. Minimal singleton, idempotent via tenantId unique.
  await prisma.website.upsert({
    where: { tenantId: TEST_IDS.creatorTenant },
    update: {},
    create: {
      tenantId: TEST_IDS.creatorTenant,
      themePackageId: "neon-dark",
    },
  });

  console.log("✅ Test database seeded successfully");
  console.log("   Super Admin: admin@creatorstore.test");
  console.log("   Agency:      agency@creatorstore.test");
  console.log("   Creator:     creator@creatorstore.test");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
