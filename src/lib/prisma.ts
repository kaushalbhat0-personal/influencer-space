import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  } as ConstructorParameters<typeof PrismaClient>[0]);

// Always cache in global — prevents multi-instantiation on Vercel serverless cold starts
globalForPrisma.prisma = prisma;

export { prisma };
