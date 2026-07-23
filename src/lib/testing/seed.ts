import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const SEED_TENANTS = [
  { subdomain: "snax", name: "Snax Gaming" },
  { subdomain: "testcreator", name: "Test Creator" },
];

const SEED_USERS = [
  { email: "admin@creatorstore.test", password: "TestPass123!", name: "Super Admin", role: "SUPER_ADMIN" as const },
  { email: "agency@creatorstore.test", password: "TestPass123!", name: "Agency Admin", role: "AGENCY_ADMIN" as const, agency: true },
  { email: "admin@snaxgaming.com", password: "admin123", name: "Snax Admin", role: "ADMIN" as const, tenant: "snax" },
  { email: "creator@creatorstore.test", password: "TestPass123!", name: "Test Creator", role: "ADMIN" as const, tenant: "testcreator" },
];

const SEED_PRODUCTS: Array<{ tenant: string; name: string; description: string; price: number }> = [
  { tenant: "testcreator", name: "Gaming Chair", description: "A comfortable gaming chair", price: 4999 },
  { tenant: "testcreator", name: "Merch Tee", description: "Official merchandise T-shirt", price: 599 },
  { tenant: "snax", name: "Snax Exclusive", description: "Snax exclusive product", price: 2999 },
];

export async function seedDatabase() {
  const testPassHash = await bcrypt.hash("TestPass123!", 12);
  const adminHash = await bcrypt.hash("admin123", 12);

  const testEmails = SEED_USERS.map((u) => u.email);
  const testSubdomains = SEED_TENANTS.map((t) => t.subdomain);

  await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
  await prisma.websiteAgency.deleteMany({ where: { subdomain: "testagency-e2e" } });
  await prisma.tenant.deleteMany({ where: { subdomain: { in: testSubdomains } } });

  const agency = await prisma.websiteAgency.create({ data: { name: "Test Agency", subdomain: "testagency-e2e", status: "ACTIVE" } });
  await prisma.user.create({ data: { email: "agency@creatorstore.test", password: testPassHash, name: "Agency Admin", role: "AGENCY_ADMIN", agencyId: agency.id } });
  await prisma.user.create({ data: { email: "admin@creatorstore.test", password: testPassHash, name: "Super Admin", role: "SUPER_ADMIN" } });

  const tenantMap: Record<string, string> = {};
  for (const t of SEED_TENANTS) {
    const created = await prisma.tenant.create({ data: { name: t.name, subdomain: t.subdomain } });
    tenantMap[t.subdomain] = created.id;
  }

  await prisma.user.create({ data: { email: "admin@snaxgaming.com", password: adminHash, name: "Snax Admin", role: "ADMIN", tenantId: tenantMap["snax"] } });
  await prisma.user.create({ data: { email: "creator@creatorstore.test", password: testPassHash, name: "Test Creator", role: "ADMIN", tenantId: tenantMap["testcreator"] } });

  await prisma.product.createMany({ data: SEED_PRODUCTS.map((p) => ({ tenantId: tenantMap[p.tenant], name: p.name, description: p.description, price: p.price, isActive: true })) });

  const tcId = tenantMap["testcreator"];
  await prisma.galleryImage.create({ data: { tenantId: tcId, title: "Hero Shot", imageUrl: "https://placehold.co/800x600/09090b/00f5ff?text=Hero", mediaType: "image" } });
  const prod = await prisma.product.findFirst({ where: { tenantId: tcId, name: { contains: "Gaming" } } });
  if (prod) {
    await prisma.productOrder.create({ data: { tenantId: tcId, productId: prod.id, amount: 4999, status: "COMPLETED", razorpayOrderId: "order_test_001", razorpayPaymentId: "pay_test_001", fanEmail: "fan@example.com" } });
  }
  await prisma.subscription.upsert({ where: { tenantId: tcId }, update: {}, create: { tenantId: tcId, plan: "PRO", status: "ACTIVE" } });
  const tcWorkspace = await prisma.workspace.findUnique({ where: { tenantId: tcId } });
  if (tcWorkspace) {
    const proPlan = await prisma.billingPlan.findFirst({ where: { code: "creator_pro" } });
    if (proPlan) {
      await prisma.billingSubscription.upsert({
        where: { workspaceId: tcWorkspace.id },
        update: { planId: proPlan.id, status: "ACTIVE" },
        create: { workspaceId: tcWorkspace.id, accountId: tcWorkspace.id, planId: proPlan.id, status: "ACTIVE" },
      });
    }
  }
  await prisma.setting.upsert({ where: { tenantId_key: { tenantId: tcId, key: "hero" } }, update: {}, create: { tenantId: tcId, key: "hero", value: { title: "Welcome", subtitle: "Test Creator Store" } } });

  return { ok: true };
}
