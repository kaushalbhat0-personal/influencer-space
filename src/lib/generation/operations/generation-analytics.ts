export interface AnalyticsReport {
  period: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  successRate: number;
  failureRate: number;
  retryRate: number;
  averageGenerationTimeMs: number;
  averageCostPerGeneration: number;
  totalCost: number;
  topNiches: Array<{ niche: string; count: number }>;
  topProviders: Array<{ provider: string; calls: number }>;
  providerUsage: Record<string, number>;
  dailyBreakdown: Array<{ date: string; count: number; cost: number }>;
}

export class GenerationAnalytics {
  async generateDailyReport(): Promise<AnalyticsReport> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endDate = now.toISOString();

    return this.buildReport("daily", startDate, endDate);
  }

  async generateWeeklyReport(): Promise<AnalyticsReport> {
    const now = new Date();
    const startDate = new Date(now.getTime() - 7 * 86400000).toISOString();
    const endDate = now.toISOString();

    return this.buildReport("weekly", startDate, endDate);
  }

  async generateMonthlyReport(): Promise<AnalyticsReport> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = now.toISOString();

    return this.buildReport("monthly", startDate, endDate);
  }

  async generateCustomReport(startDate: string, endDate: string): Promise<AnalyticsReport> {
    return this.buildReport("daily", startDate, endDate);
  }

  private async buildReport(period: AnalyticsReport["period"], startDate: string, endDate: string): Promise<AnalyticsReport> {
    const mockGenerations = 100;
    const mockSuccess = 92;
    const mockFailed = 8;
    const mockRetries = 5;

    return {
      period,
      startDate,
      endDate,
      totalGenerations: mockGenerations,
      successfulGenerations: mockSuccess,
      failedGenerations: mockFailed,
      successRate: mockSuccess / mockGenerations,
      failureRate: mockFailed / mockGenerations,
      retryRate: mockRetries / mockGenerations,
      averageGenerationTimeMs: 4500,
      averageCostPerGeneration: 0.05,
      totalCost: mockGenerations * 0.05,
      topNiches: [
        { niche: "fitness", count: 25 },
        { niche: "gaming", count: 20 },
        { niche: "education", count: 18 },
      ],
      topProviders: [
        { provider: "mock", calls: 80 },
        { provider: "deepseek", calls: 15 },
      ],
      providerUsage: { mock: 80, deepseek: 15 },
      dailyBreakdown: [
        { date: startDate, count: 20, cost: 0.01 },
        { date: endDate, count: 25, cost: 0.012 },
      ],
    };
  }
}
