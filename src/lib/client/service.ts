import { prisma } from "@/lib/prisma";
import { websiteHealthEngine } from "@/lib/platform/health/engine";
import { clientHealthEngine } from "./health";
import type { ClientData, ClientSummary, ClientStatus } from "./types";

export interface ClientActivityItem {
  id: string;
  action: string;
  timestamp: Date;
  tenantId: string;
}

export class ClientService {
  async listByAgency(agencyId: string): Promise<ClientData[]> {
    const agencyTenants = await prisma.agencyTenant.findMany({
      where: { agencyId },
      include: {
        tenant: {
          include: {
            website: { include: { publishStatus: true } },
            users: { take: 1, select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const results: ClientData[] = [];

    for (const at of agencyTenants) {
      const tenant = at.tenant;
      const website = tenant.website;
      const publishState = website?.publishStatus?.state ?? null;
      const healthScore = website ? await this.getHealthScoreShort(tenant.id) : null;

      results.push({
        id: at.id,
        tenantId: tenant.id,
        businessName: tenant.name,
        contactName: tenant.users[0]?.name ?? null,
        email: null,
        status: (at.status?.toLowerCase() as ClientStatus) ?? "active",
        note: null,
        createdAt: tenant.createdAt,
        websiteCount: website ? 1 : 0,
        healthScore,
        publishState,
        assignedUserId: tenant.users[0]?.id ?? null,
        assignedUserName: tenant.users[0]?.name ?? null,
      });
    }

    return results;
  }

  async getSummary(agencyId: string): Promise<ClientSummary> {
    const clients = await this.listByAgency(agencyId);
    const activeClients = clients.filter((c) => c.status === "active");
    const publishedWebsites = clients.filter((c) => c.publishState === "live").length;
    const healthScores = clients.filter((c) => c.healthScore !== null).map((c) => c.healthScore!);
    const averageHealth = healthScores.length > 0
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : 0;

    const needingAttention = clients.filter(
      (c) => c.healthScore != null && c.healthScore < 50
    ).length;

    const unpublished = clients.filter(
      (c) => c.publishState !== "live"
    ).length;

    return {
      totalClients: clients.length,
      activeClients: activeClients.length,
      publishedWebsites,
      averageHealth,
      recentClients: clients.slice(0, 5),
      needingAttention,
      unpublished,
    };
  }

  async getActivity(tenantId: string, limit = 20): Promise<ClientActivityItem[]> {
    const events = await prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, action: true, createdAt: true, tenantId: true },
    });
    return events.map((e) => ({
      id: e.id,
      action: e.action,
      timestamp: e.createdAt,
      tenantId: e.tenantId ?? "",
    }));
  }

  async getRecentActivity(agencyId: string, limit = 10): Promise<ClientActivityItem[]> {
    const tenantIds = await prisma.agencyTenant.findMany({
      where: { agencyId },
      select: { tenantId: true },
    });

    const ids = tenantIds.map((t) => t.tenantId);
    if (ids.length === 0) return [];

    const events = await prisma.auditLog.findMany({
      where: { tenantId: { in: ids } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, action: true, createdAt: true, tenantId: true },
    });

    return events.map((e) => ({
      id: e.id,
      action: e.action,
      timestamp: e.createdAt,
      tenantId: e.tenantId ?? "",
    }));
  }

  async search(agencyId: string, query: string): Promise<ClientData[]> {
    const clients = await this.listByAgency(agencyId);
    const q = query.toLowerCase();
    return clients.filter(
      (c) =>
        c.businessName.toLowerCase().includes(q) ||
        (c.contactName?.toLowerCase() ?? "").includes(q) ||
        c.status.includes(q)
    );
  }

  private async getHealthScoreShort(tenantId: string): Promise<number | null> {
    try {
      const health = await websiteHealthEngine.evaluate(tenantId);
      return health.overallScore;
    } catch {
      return null;
    }
  }
}

export const clientService = new ClientService();
