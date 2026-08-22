import { prisma } from "@/lib/prisma";
import type { AnalyticsData, TopPage } from "./types";

export const analyticsService = {
  async getData(tenantId: string): Promise<AnalyticsData> {
    const [orders, sessions] = await Promise.all([
      prisma.productOrder.findMany({
        where: { tenantId },
        select: { amount: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.analyticsEvent.findMany({
        where: { tenantId, eventType: "page_view" },
        orderBy: { occurredAt: "desc" },
        take: 1000,
      }),
    ]);

    // RCCF-72.18D.5.2-A: "PAID" was dead ProductOrder vocabulary (never
    // written); COMPLETED is the canonical paid state.
    const paidOrders = orders.filter((o) => o.status === "COMPLETED");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);
    const conversions = paidOrders.length;
    const totalVisitors = sessions.length;
    const conversionRate = totalVisitors > 0 ? (conversions / totalVisitors) * 100 : 0;

    const pageCounts = new Map<string, number>();
    for (const s of sessions) {
      const page = (s.payload as Record<string, unknown>)?.page as string ?? "/";
      pageCounts.set(page, (pageCounts.get(page) ?? 0) + 1);
    }
    const topPages: TopPage[] = Array.from(pageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));

    const generationSessions = await prisma.generationSession.findMany({
      where: { workspaceId: (await this.getWorkspaceId(tenantId)) ?? undefined },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: { id: true, status: true, evaluationScore: true, startedAt: true },
    });

    return {
      visitors: totalVisitors,
      pageViews: sessions.length,
      clicks: orders.length,
      conversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalRevenue,
      topPages,
      trafficSources: [],
      recentGenerations: generationSessions.map((gs) => ({
        id: gs.id,
        status: gs.status,
        score: gs.evaluationScore,
        createdAt: gs.startedAt,
      })),
    };
  },

  async getWorkspaceId(tenantId: string): Promise<string | null> {
    const ws = await prisma.workspace.findUnique({ where: { tenantId }, select: { id: true } });
    return ws?.id ?? null;
  },
};
