import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const user = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { email: true, password: true, role: true } });
  console.log(JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}
main();
