"use client";

import { useState } from "react";

export interface DashboardStats {
  productCount: number;
  activeProductCount: number;
  affiliateCount: number;
  totalClicks: number;
  galleryCount: number;
  gamesCount: number;
  loading: boolean;
  error: string | null;
}

interface UseDashboardStatsOptions {
  productCount: number;
  activeProductCount: number;
  affiliateCount: number;
  totalClicks: number;
  galleryCount: number;
  gamesCount: number;
}

export function useDashboardStats(initial: UseDashboardStatsOptions): DashboardStats {
  const [stats] = useState<DashboardStats>({
    ...initial,
    loading: false,
    error: null,
  });

  return stats;
}
