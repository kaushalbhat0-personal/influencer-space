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
  let tenant = await prisma.tenant.findUnique({
    where: { subdomain: "snax" },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: "S8UL Snax", subdomain: "snax" },
    });
    console.log(`Tenant created: ${tenant.name} (${tenant.id})`);
  } else {
    console.log("Tenant already exists, skipping creation.");
  }

  const existing = await prisma.user.findFirst({
    where: { email: "admin@snaxgaming.com", tenantId: tenant.id },
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
      tenantId: tenant.id,
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
