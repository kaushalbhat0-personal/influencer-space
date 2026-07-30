import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true, email: true } });
  if (existing) {
    const hashed = await bcrypt.hash("admin123", 12);
    await prisma.user.update({ where: { id: existing.id }, data: { password: hashed } });
    console.log(`Password reset for ${existing.email}`);
  } else {
    console.log("No Super Admin found");
  }
  await prisma.$disconnect();
}
main();
