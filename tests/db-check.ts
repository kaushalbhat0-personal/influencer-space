import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
async function main() {
  const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const r = await p.$queryRawUnsafe("SELECT 1 as test");
    console.log("DB connected:", JSON.stringify(r));
  } catch (e) {
    console.error("DB error:", (e as Error).message);
  }
  await p.$disconnect();
}
main();
