import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const users = await prisma.user.findMany({ select: { email: true, password: true, role: true, tenantId: true } });
  const results = await Promise.all(users.map(async (u) => ({
    email: u.email, role: u.role, tenantId: u.tenantId,
    passwordMatch: await bcrypt.compare("TestPass123!", u.password).catch(() => false),
    passwordMatchAdmin: await bcrypt.compare("admin123", u.password).catch(() => false),
  })));
  return Response.json({ users: results });
}