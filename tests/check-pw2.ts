import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const user = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true, email: true, password: true, role: true, name: true } });
  console.log(JSON.stringify(user, null, 2));
  if (user) {
    const match = await bcrypt.compare("admin123", user.password);
    console.log("Password match:", match);
  }
  await prisma.$disconnect();
}
main();
