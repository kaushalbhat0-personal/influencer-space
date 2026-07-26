import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

async function main() {
  if (!url) { console.error("No database URL available"); process.exit(1); }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  await prisma.$connect();

  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Product'
  `) as { column_name: string }[];
  const existing = new Set(rows.map(r => r.column_name));

  const addCol = async (name: string, def: string) => {
    if (!existing.has(name)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN ${def}`);
      console.log(`  Added: ${name}`);
    }
  };

  await addCol("images", `"images" JSONB DEFAULT '[]'::jsonb NOT NULL`);
  await addCol("slug", `"slug" TEXT`);
  await addCol("status", `"status" TEXT DEFAULT 'PUBLISHED' NOT NULL`);
  await addCol("seoTitle", `"seoTitle" TEXT`);
  await addCol("seoDescription", `"seoDescription" TEXT`);
  await addCol("order", `"order" INTEGER DEFAULT 0 NOT NULL`);
  await addCol("isActive", `"isActive" BOOLEAN DEFAULT true NOT NULL`);
  await addCol("isFeatured", `"isFeatured" BOOLEAN DEFAULT false NOT NULL`);
  await addCol("archivedAt", `"archivedAt" TIMESTAMP(3)`);

  await prisma.$disconnect();
  console.log("Product schema sync complete");
}

main().catch((e) => { console.error("Failed:", e); process.exit(1); });
