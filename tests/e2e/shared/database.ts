import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export async function getDb(): Promise<PrismaClient> {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function disconnectDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
  agencyId: string | null;
}

export async function getSuperAdmin(): Promise<DbUser | null> {
  const db = await getDb();
  const user = await db.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, name: true, role: true, tenantId: true, agencyId: true },
  });
  return user;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const db = await getDb();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, tenantId: true, agencyId: true },
  });
  return user;
}

export async function countUsers(): Promise<number> {
  const db = await getDb();
  return db.user.count();
}
