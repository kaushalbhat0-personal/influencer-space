import { prisma } from "@/lib/prisma";
import type { Workspace } from "@/generated/prisma/client";

export interface AgencyWorkspaceData {
  id: string;
  workspaceId: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  status: string;
  platformFeePercent: number;
  clientCount: number;
  teamMemberCount: number;
}

export interface AgencyClientData {
  tenantId: string;
  tenantName: string;
  subdomain: string | null;
  status: string;
  products: number;
}

export async function getWorkspaceByAgencyId(agencyId: string): Promise<Workspace | null> {
  return prisma.workspace.findUnique({ where: { agencyId } });
}

export async function getAgencyWorkspaceData(agencyId: string): Promise<AgencyWorkspaceData | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { agencyId },
    include: {
      _count: { select: { members: true } },
    },
  });
  if (!workspace) return null;

  const agency = await prisma.websiteAgency.findUnique({
    where: { id: agencyId },
    select: { platformFeePercent: true },
  });

  const clientCount = await prisma.agencyTenant.count({ where: { agencyId } });

  return {
    id: agencyId,
    workspaceId: workspace.id,
    name: workspace.name,
    subdomain: workspace.slug,
    customDomain: null,
    status: workspace.status,
    platformFeePercent: agency?.platformFeePercent ?? 0,
    clientCount,
    teamMemberCount: workspace._count.members,
  };
}

export async function getAgencyClients(agencyId: string): Promise<AgencyClientData[]> {
  const agencyTenants = await prisma.agencyTenant.findMany({
    where: { agencyId },
    include: {
      tenant: {
        select: {
          id: true, name: true, subdomain: true,
          _count: { select: { products: true } },
        },
      },
    },
  });

  return agencyTenants.map((at) => ({
    tenantId: at.tenant.id,
    tenantName: at.tenant.name,
    subdomain: at.tenant.subdomain,
    status: at.status,
    products: at.tenant._count.products,
  }));
}

export async function getWorkspaceIdByWebsiteId(websiteId: string): Promise<string | null> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { tenantId: true },
  });
  if (!website) return null;
  const workspace = await prisma.workspace.findUnique({
    where: { tenantId: website.tenantId },
    select: { id: true },
  });
  return workspace?.id ?? null;
}

export async function resolveWorkspaceBilling(workspaceId: string) {
  return prisma.billingSubscription.findUnique({
    where: { workspaceId },
    include: { plan: true, account: true },
  });
}
