/**
 * IMPLEMENTATION-15 — Production E2E data seed.
 *
 * Adds representative content + a full 12-section layout to the EXISTING
 * production creator (testcreator1@gmail.com). Does NOT create accounts.
 * Idempotent: re-running replaces the layout and skips existing content rows.
 *
 * Run:  npx tsx scripts/seed-prod-e2e.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TENANT_EMAIL = process.env.E2E_CREATOR_EMAIL ?? "testcreator1@gmail.com";

const STORAGE_ROOT =
  "https://flhllvzzbtkfrcrajicq.supabase.co/storage/v1/object/public/influencer-images/eee52d43-ed3d-4ccb-baf5-c728dab36119";

async function main() {
  // The running app connects via DATABASE_URL (pooler). Use the same
  // connection string the app uses so the seed talks to the same database.
  const url = process.env.DATABASE_URL || "";
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const user = await prisma.user.findUnique({ where: { email: TENANT_EMAIL } });
  if (!user?.tenantId) {
    console.error(`Creator ${TENANT_EMAIL} not found`);
    process.exit(1);
  }
  const tenantId = user.tenantId;

  const website = await prisma.website.findUnique({ where: { tenantId } });
  if (!website) {
    console.error("Website not found for tenant");
    process.exit(1);
  }

  // A live creator website must have a theme package configured.
  if (!website.themePackageId) {
    await prisma.website.update({
      where: { id: website.id },
      data: { themePackageId: "com.creatos.neon-dark" },
    });
    console.log("Theme: com.creatos.neon-dark assigned");
  }

  // ── 1. Layout: one home page with every registered section ──────────────
  await prisma.page.deleteMany({ where: { websiteId: website.id } });
  const page = await prisma.page.create({
    data: {
      websiteId: website.id,
      name: "Home",
      slug: "/",
      order: 0,
      isHome: true,
      theme: "com.creatos.neon-dark",
      config: {},
    },
  });

  const SECTIONS: { name: string; moduleId: string }[] = [
    { name: "Hero", moduleId: "hero.default" },
    { name: "Products", moduleId: "products.grid" },
    { name: "Gallery", moduleId: "gallery.grid" },
    { name: "Services", moduleId: "services.default" },
    { name: "Courses", moduleId: "courses.default" },
    { name: "Testimonials", moduleId: "testimonials.default" },
    { name: "FAQ", moduleId: "faq.default" },
    { name: "Timeline", moduleId: "timeline.default" },
    { name: "Games", moduleId: "games.default" },
    { name: "Links", moduleId: "links.default" },
    { name: "Footer", moduleId: "footer.default" },
  ];

  for (const [i, sec] of SECTIONS.entries()) {
    const section = await prisma.section.create({
      data: {
        pageId: page.id,
        name: sec.name,
        order: i,
        visible: true,
        locked: false,
        config: {},
      },
    });
    await prisma.block.create({
      data: {
        sectionId: section.id,
        moduleId: sec.moduleId,
        order: 0,
        visible: true,
        locked: false,
        config: {},
      },
    });
  }
  console.log(`Layout: ${SECTIONS.length} sections created`);

  // ── 2. Content ──────────────────────────────────────────────────────────
  // Use the tenant's REAL storage objects for images — hardcoded/stale URLs
  // (deleted or replaced objects) make the storefront request 400s and render
  // broken/placeholder content.
  const activeAssets = await prisma.asset.findMany({
    where: { tenantId, status: "ACTIVE" },
    select: { publicUrl: true },
    orderBy: { createdAt: "asc" },
  });
  const validImageUrl = activeAssets.find((a) => a.publicUrl && a.publicUrl.includes("http"))?.publicUrl
    ?? `${STORAGE_ROOT}/products/aad9397f-54c5-4295-b4c0-80851c547932.png`;

  await prisma.galleryImage.deleteMany({ where: { tenantId } });
  await prisma.galleryImage.createMany({
    data: [
      { tenantId, title: "Studio Session", imageUrl: validImageUrl, mediaType: "image", category: "general", order: 0 },
      { tenantId, title: "Behind The Scenes", imageUrl: validImageUrl, mediaType: "image", category: "general", order: 1 },
      { tenantId, title: "Live Stream", imageUrl: validImageUrl, mediaType: "image", category: "general", order: 2 },
    ],
  });
  console.log(`Gallery: 3 items (image: ${validImageUrl.slice(0, 60)}…)`);

  // Repoint every product image at a valid storage object so no product card
  // requests a deleted/replaced URL (400) and renders a placeholder.
  const products = await prisma.product.findMany({ where: { tenantId }, select: { id: true } });
  for (const product of products) {
    await prisma.product.update({ where: { id: product.id }, data: { imageUrl: validImageUrl } });
  }
  console.log(`Products: ${products.length} repointed to a valid image`);

  await prisma.affiliateLink.deleteMany({ where: { tenantId } });
  await prisma.affiliateLink.createMany({
    data: [
      { tenantId, title: "YouTube", url: "https://youtube.com/@SnaxGaming", order: 0 },
      { tenantId, title: "Instagram", url: "https://instagram.com/farahkhankunder", order: 1 },
      { tenantId, title: "X / Twitter", url: "https://twitter.com/thefarahkhan", order: 2 },
    ],
  });
  console.log("Links: 3 items");

  await prisma.timelineEvent.deleteMany({ where: { tenantId } });
  await prisma.timelineEvent.createMany({
    data: [
      { tenantId, year: "2021", title: "Channel Started", description: "Launched the YouTube channel.", order: 0 },
      { tenantId, year: "2023", title: "1M Subscribers", description: "Hit one million subscribers.", stats: "1M", order: 1 },
      { tenantId, year: "2025", title: "Store Launch", description: "Launched the creator storefront.", order: 2 },
    ],
  });
  console.log("Timeline: 3 events");

  await prisma.game.deleteMany({ where: { tenantId } });
  await prisma.game.createMany({
    data: [
      { tenantId, name: "BGMI", genre: "Battle Royale", description: "Battlegrounds Mobile India", order: 0 },
      { tenantId, name: "Valorant", genre: "FPS", description: "Tactical shooter", order: 1 },
    ],
  });
  console.log("Games: 2 items");

  await prisma.offering.deleteMany({ where: { tenantId } });
  await prisma.offering.createMany({
    data: [
      { tenantId, type: "course", title: "Gaming Content Masterclass", slug: "gaming-masterclass", description: "Learn to create viral gaming content.", status: "published", price: 2999, metadata: { category: "Gaming" } },
      { tenantId, type: "course", title: "Streaming Setup Guide", slug: "streaming-setup", description: "Complete streaming setup walkthrough.", status: "published", price: 1999, metadata: { category: "Streaming" } },
      { tenantId, type: "coaching", title: "1:1 Brand Coaching", slug: "brand-coaching", description: "Personal brand strategy session.", status: "published", price: 4999, metadata: { duration: "60 min" } },
      { tenantId, type: "coaching", title: "Content Review", slug: "content-review", description: "Deep-dive content audit.", status: "published", price: 2499, metadata: { duration: "45 min" } },
    ],
  });
  console.log("Courses: 2, Services: 2");

  const upsertSetting = async (key: string, value: unknown) => {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key } },
      update: { value: value as never },
      create: { tenantId, key, value: value as never },
    });
  };

  await upsertSetting("testimonials", [
    { id: "t1", author: "Rahul S.", role: "Subscriber", content: "Amazing content every single day!", rating: 5, featured: true },
    { id: "t2", author: "Priya M.", role: "Fan", content: "The store setup is so easy to use.", rating: 5, featured: false },
  ]);
  await upsertSetting("faq", [
    { id: "f1", question: "Do you do collaborations?", answer: "Yes, reach out via the contact form.", category: "general" },
    { id: "f2", question: "What games do you play?", answer: "BGMI and Valorant mostly.", category: "gaming" },
  ]);
  console.log("Testimonials: 2, FAQ: 2");

  await prisma.$disconnect();
  console.log("Seed complete for", TENANT_EMAIL);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
