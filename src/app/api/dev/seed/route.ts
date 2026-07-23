import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    const password = await bcrypt.hash("TestPass123!", 12);
    const adminPass = await bcrypt.hash("admin123", 12);

    await prisma.user.deleteMany({ where: { email: { in: ["admin@creatorstore.test", "agency@creatorstore.test", "admin@snaxgaming.com", "creator@creatorstore.test"] } } });
    await prisma.websiteAgency.deleteMany({ where: { subdomain: "testagency-e2e" } });
    await prisma.tenant.deleteMany({ where: { subdomain: { in: ["snax", "testcreator"] } } });

    await prisma.user.create({ data: { email: "admin@creatorstore.test", password, name: "Super Admin", role: "SUPER_ADMIN" } });
    const agency = await prisma.websiteAgency.create({ data: { name: "Test Agency", subdomain: "testagency-e2e", status: "ACTIVE" } });
    await prisma.user.create({ data: { email: "agency@creatorstore.test", password, name: "Agency Admin", role: "AGENCY_ADMIN", agencyId: agency.id } });
    const snax = await prisma.tenant.create({ data: { name: "Snax Gaming", subdomain: "snax" } });
    await prisma.user.create({ data: { email: "admin@snaxgaming.com", password: adminPass, name: "Snax Admin", role: "ADMIN", tenantId: snax.id } });
    const tc = await prisma.tenant.create({ data: { name: "Test Creator", subdomain: "testcreator" } });
    await prisma.user.create({ data: { email: "creator@creatorstore.test", password, name: "Test Creator", role: "ADMIN", tenantId: tc.id } });
    await prisma.product.createMany({ data: [
      { tenantId: tc.id, name: "Test Product - Gaming Chair", description: "A comfortable gaming chair", price: 4999, isActive: true },
      { tenantId: tc.id, name: "Test Product - Merch Tee", description: "Official merchandise T-shirt", price: 599, isActive: true },
      { tenantId: snax.id, name: "Snax Product", description: "Snax exclusive product", price: 2999, isActive: true },
    ] });
    await prisma.galleryImage.create({ data: { tenantId: tc.id, title: "Hero Shot", imageUrl: "https://placehold.co/800x600/09090b/00f5ff?text=Hero", mediaType: "image" } });
    const prod = await prisma.product.findFirst({ where: { tenantId: tc.id, name: { contains: "Gaming Chair" } } });
    if (prod) await prisma.productOrder.create({ data: { tenantId: tc.id, productId: prod.id, amount: 4999, status: "COMPLETED", razorpayOrderId: "order_test_001", razorpayPaymentId: "pay_test_001", fanEmail: "fan@example.com" } });
    await prisma.subscription.upsert({ where: { tenantId: tc.id }, update: {}, create: { tenantId: tc.id, plan: "PRO", status: "ACTIVE" } });
    await prisma.setting.upsert({ where: { tenantId_key: { tenantId: tc.id, key: "hero" } }, update: {}, create: { tenantId: tc.id, key: "hero", value: { title: "Welcome", subtitle: "Test Creator Store" } } });

    return Response.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}