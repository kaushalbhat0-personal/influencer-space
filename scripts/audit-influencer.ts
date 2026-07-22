import { prisma } from "../src/lib/prisma";

async function main() {
  const settings = await prisma.setting.findMany({
    where: { key: "influencer_data" },
    include: { tenant: { select: { name: true } } },
  });

  for (const s of settings) {
    const v = JSON.stringify(s.value);
    console.log(`${s.tenant?.name}: ${v.slice(0, 300)}`);
  }

  // Also check hero_data
  console.log("\n--- hero_data ---");
  const heroSettings = await prisma.setting.findMany({
    where: { key: "hero_data" },
    include: { tenant: { select: { name: true } } },
  });
  for (const s of heroSettings) {
    const v = JSON.stringify(s.value);
    console.log(`${s.tenant?.name}: ${v.slice(0, 300)}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
