import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@snaxgaming.com" },
  });

  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  const password = await bcrypt.hash("admin123", 12);

  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@snaxgaming.com",
      password,
    },
  });

  console.log("Admin user created: admin@snaxgaming.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
