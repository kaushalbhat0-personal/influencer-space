export interface AnalyticsData {
  visitors: number;
  pageViews: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
  topPages: TopPage[];
  trafficSources: TrafficSource[];
  recentGenerations: RecentGeneration[];
}

export interface TopPage {
  path: string;
  views: number;
}

export interface TrafficSource {
  source: string;
  visits: number;
}

export interface RecentGeneration {
  id: string;
  status: string;
  score: number | null;
  createdAt: Date;
}
