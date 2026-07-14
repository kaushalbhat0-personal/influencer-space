import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const tables = [
    "GalleryImage", "TimelineEvent", "Game",
    "Product", "AffiliateLink", "ContactSubmission", "Setting", "User"
  ];
  const snakeTables = [
    "gallery_images", "timeline_events", "games",
    "Product", "AffiliateLink", "ContactSubmission", "Setting", "User"
  ];
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const sn = snakeTables[i];
    try {
      await prisma.$executeRawUnsafe(`SELECT 1 FROM "${sn}" LIMIT 1`);
      const model = (prisma as any)[t];
      let count: number;
      if (model && typeof model.count === "function") {
        count = await model.count();
      } else {
        count = -1;
      }
      console.log(`✅ ${t} (${sn}) — exists, ${count >= 0 ? count + " rows" : "unable to count"}`);
    } catch (e: any) {
      console.log(`❌ ${t} (${sn}) — ${e.message.includes("does not exist") ? "MISSING" : e.message}`);
    }
  }
  await prisma.$disconnect();
}
main();
