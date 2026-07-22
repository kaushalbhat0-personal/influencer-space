import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();
  if (!q) return NextResponse.json({ results: [] });

  const results: Array<{ type: string; id: string; label: string; sublabel: string; href: string }> = [];

  // Search users by email or name
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, role: true, tenantId: true },
    take: 5,
  });

  for (const u of users) {
    results.push({
      type: "user", id: u.id, label: u.name || u.email, sublabel: `${u.role} · ${u.email}`,
      href: u.tenantId ? `/super-admin/tenants/${u.tenantId}` : "/super-admin/users",
    });
  }

  // Search tenants by name, subdomain, or custom domain
  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { subdomain: { contains: q, mode: "insensitive" } },
        { customDomain: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, subdomain: true, customDomain: true },
    take: 5,
  });

  for (const t of tenants) {
    results.push({
      type: "tenant", id: t.id, label: t.name, sublabel: t.customDomain || `${t.subdomain}.creatorspace.app`,
      href: `/super-admin/tenants/${t.id}`,
    });
  }

  // Search agencies
  const agencies = await prisma.websiteAgency.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { subdomain: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, subdomain: true },
    take: 3,
  });

  for (const a of agencies) {
    results.push({
      type: "agency", id: a.id, label: a.name, sublabel: a.subdomain,
      href: `/super-admin/agencies/${a.id}`,
    });
  }

  // Search orders by ID
  const orders = await prisma.productOrder.findMany({
    where: { id: { contains: q, mode: "insensitive" } },
    select: { id: true, amount: true, status: true },
    take: 3,
  });

  for (const o of orders) {
    results.push({
      type: "order", id: o.id, label: `Order ${o.id.slice(0, 12)}...`, sublabel: `₹${o.amount} · ${o.status}`,
      href: `/super-admin/payments`,
    });
  }

  return NextResponse.json({ results });
}
