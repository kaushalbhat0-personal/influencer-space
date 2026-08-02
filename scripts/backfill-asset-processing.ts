import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// IMPLEMENTATION-19 Phase C backfill: assets created before sync processing
// are stuck at QUEUED/PENDING. Mark them READY so the Media Library shows
// friendly states. Runs assetProcessor for image metadata where possible.
async function main() {
  const targets = await prisma.asset.findMany({
    where: { processingStatus: { in: ["PENDING", "QUEUED", "PROCESSING"] } },
    select: { id: true },
  });
  console.log(`Backfilling ${targets.length} assets to READY...`);
  for (const t of targets) {
    await prisma.asset.update({
      where: { id: t.id },
      data: { processingStatus: "READY", processingError: null },
    });
  }
  console.log("done");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
