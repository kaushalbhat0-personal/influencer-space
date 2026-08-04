"use server";

/**
 * Read-only support search (IMPLEMENTATION-41) — SUPER_ADMIN, SUPPORT and
 * READ_ONLY roles only. No mutations.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function searchSupport(query: string): Promise<{ success: boolean; data?: { users: Array<{ id: string; email: string; name: string | null; role: string }>; tenants: Array<{ id: string; name: string; subdomain: string }>; agencies: Array<{ id: string; name: string; subdomain: string }> }; error?: string }> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN" && role !== "SUPPORT" && role !== "READ_ONLY") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const q = query.trim();
    const [users, tenants, agencies] = await Promise.all([
      prisma.user.findMany({
        where: { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] },
        select: { id: true, email: true, name: true, role: true },
        take: 20,
      }),
      prisma.tenant.findMany({
        where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { subdomain: { contains: q, mode: "insensitive" } }] },
        select: { id: true, name: true, subdomain: true },
        take: 20,
      }),
      prisma.websiteAgency.findMany({
        where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { subdomain: { contains: q, mode: "insensitive" } }] },
        select: { id: true, name: true, subdomain: true },
        take: 20,
      }),
    ]);

    await logAction("system", "support:search", { query: q, actor: session?.user?.email ?? "support" }).catch(() => {});
    return { success: true, data: { users, tenants, agencies } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}
