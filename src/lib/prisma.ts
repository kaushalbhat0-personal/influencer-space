import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    }),
    log: ["error"],
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always cache in global — prevents multi-instantiation on Vercel serverless cold starts
globalForPrisma.prisma = prisma;

export { prisma };
