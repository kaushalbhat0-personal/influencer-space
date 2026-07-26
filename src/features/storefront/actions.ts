"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getStorefrontData(domain: string) {
  const { prisma } = await import("@/lib/prisma");
  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ subdomain: domain }, { customDomain: domain }] },
    select: { id: true },
  });
  if (!tenant) return null;

  const { storefrontService } = await import("./service");
  return storefrontService.getStorefrontData(tenant.id);
}

export async function getVersions() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const { prisma } = await import("@/lib/prisma");
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  if (!website) return [];

  const { listVersions } = await import("./versions");
  return listVersions(website.id);
}

export async function getVersionDetail(version: number) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const { prisma } = await import("@/lib/prisma");
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  if (!website) return null;

  const { getVersion } = await import("./versions");
  return getVersion(website.id, version);
}

export async function rollbackTo(version: number) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const { prisma } = await import("@/lib/prisma");
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  if (!website) return false;

  const { rollbackToVersion } = await import("./versions");
  return rollbackToVersion(website.id, version);
}
