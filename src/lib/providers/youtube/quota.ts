import { prisma } from "@/lib/prisma";

const DAILY_QUOTA_LIMIT = 10000; // YouTube Data API v3 standard daily quota

class YouTubeQuotaService {
  async track(units: number, latencyMs: number, status: "success" | "error"): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.youTubeQuotaUsage.findUnique({
      where: { date: today },
    });

    if (existing) {
      await prisma.youTubeQuotaUsage.update({
        where: { id: existing.id },
        data: {
          unitsUsed: existing.unitsUsed + units,
          calls: existing.calls + 1,
          failures: status === "error" ? existing.failures + 1 : existing.failures,
          avgLatencyMs: (existing.avgLatencyMs * existing.calls + latencyMs) / (existing.calls + 1),
        },
      });
    } else {
      await prisma.youTubeQuotaUsage.create({
        data: {
          date: today,
          unitsUsed: units,
          calls: 1,
          failures: status === "error" ? 1 : 0,
          avgLatencyMs: latencyMs,
        },
      });
    }
  }

  async getTodayUsage(): Promise<{ unitsUsed: number; calls: number; failures: number; avgLatencyMs: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.youTubeQuotaUsage.findUnique({
      where: { date: today },
    });

    return {
      unitsUsed: usage?.unitsUsed || 0,
      calls: usage?.calls || 0,
      failures: usage?.failures || 0,
      avgLatencyMs: usage?.avgLatencyMs || 0,
    };
  }

  async getUsageHistory(days = 30): Promise<{ date: Date; unitsUsed: number; calls: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await prisma.youTubeQuotaUsage.findMany({
      where: { date: { gte: since } },
      orderBy: { date: "asc" },
      select: { date: true, unitsUsed: true, calls: true },
    });

    return records;
  }

  async isQuotaAvailable(): Promise<boolean> {
    const { unitsUsed } = await this.getTodayUsage();
    return unitsUsed < DAILY_QUOTA_LIMIT * 0.95; // Warn at 95%
  }

  getDailyLimit(): number {
    return DAILY_QUOTA_LIMIT;
  }

  async getRecentlyImportedCreators(limit = 20): Promise<{ name: string; handle: string; fetchedAt: Date }[]> {
    const accounts = await prisma.providerAccount.findMany({
      where: { provider: "youtube" },
      orderBy: { fetchedAt: "desc" },
      take: limit,
      select: { name: true, handle: true, fetchedAt: true },
    });
    return accounts.map((a) => ({ name: a.name || "", handle: a.handle || "", fetchedAt: a.fetchedAt || new Date(0) }));
  }
}

export const youtubeQuota = new YouTubeQuotaService();
