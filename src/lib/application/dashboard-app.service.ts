/**
 * Dashboard Application Service v1.0.0
 *
 * Cross-module aggregation for the creator dashboard.
 * Orchestrates stats from Products, Gallery, Affiliates, and Games.
 */

import { prisma } from "@/lib/prisma";
import { BaseAppService } from "./base";
import type { ServiceResult } from "./types";
import type { DashboardStatsDTO } from "./dtos/dashboard";

export class DashboardApplicationService extends BaseAppService {
  constructor() {
    super("DashboardApplicationService");
  }

  async getStats(tenantId: string): Promise<ServiceResult<DashboardStatsDTO>> {
    return this.wrapAsync(async () => {
      const [products, affiliateData, galleryCount, gamesCount] =
        await Promise.all([
          prisma.product.findMany({
            where: { tenantId },
            select: { isActive: true },
          }),
          prisma.affiliateLink.findMany({
            where: { tenantId },
            select: { clicks: true },
          }),
          prisma.galleryImage.count({ where: { tenantId } }),
          prisma.game.count({ where: { tenantId } }),
        ]);

      return {
        productCount: products.length,
        activeProductCount: products.filter((p) => p.isActive).length,
        affiliateCount: affiliateData.length,
        totalClicks: affiliateData.reduce((s, a) => s + a.clicks, 0),
        galleryCount,
        gamesCount,
      };
    }, "Dashboard");
  }
}

export const dashboardAppService = new DashboardApplicationService();
