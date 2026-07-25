export interface RateLimitConfig {
  maxGenerationsPerMinute: number;
  maxGenerationsPerHour: number;
  maxGenerationsPerDay: number;
  maxConcurrentGenerations: number;
}

export interface RateLimitStatus {
  currentGenerationsPerMinute: number;
  currentGenerationsPerHour: number;
  currentGenerationsPerDay: number;
  currentConcurrent: number;
  limited: boolean;
  reason: string | null;
}

export class GenerationRateControl {
  private minuteCounts = new Map<string, number>();
  private hourCounts = new Map<string, number>();
  private dayCounts = new Map<string, number>();
  private concurrent = new Set<string>();

  constructor(private config: RateLimitConfig = {
    maxGenerationsPerMinute: 5,
    maxGenerationsPerHour: 50,
    maxGenerationsPerDay: 200,
    maxConcurrentGenerations: 10,
  }) {}

  checkLimit(_creatorId: string): RateLimitStatus {
    void _creatorId;
    const minuteKey = this.timeKey("minute");
    const hourKey = this.timeKey("hour");
    const dayKey = this.timeKey("day");

    const minuteCount = this.minuteCounts.get(minuteKey) ?? 0;
    const hourCount = this.hourCounts.get(hourKey) ?? 0;
    const dayCount = this.dayCounts.get(dayKey) ?? 0;
    const concurrentCount = this.concurrent.size;

    if (minuteCount >= this.config.maxGenerationsPerMinute) {
      return { currentGenerationsPerMinute: minuteCount, currentGenerationsPerHour: hourCount, currentGenerationsPerDay: dayCount, currentConcurrent: concurrentCount, limited: true, reason: "Minute rate limit exceeded" };
    }
    if (hourCount >= this.config.maxGenerationsPerHour) {
      return { currentGenerationsPerMinute: minuteCount, currentGenerationsPerHour: hourCount, currentGenerationsPerDay: dayCount, currentConcurrent: concurrentCount, limited: true, reason: "Hourly rate limit exceeded" };
    }
    if (dayCount >= this.config.maxGenerationsPerDay) {
      return { currentGenerationsPerMinute: minuteCount, currentGenerationsPerHour: hourCount, currentGenerationsPerDay: dayCount, currentConcurrent: concurrentCount, limited: true, reason: "Daily rate limit exceeded" };
    }
    if (concurrentCount >= this.config.maxConcurrentGenerations) {
      return { currentGenerationsPerMinute: minuteCount, currentGenerationsPerHour: hourCount, currentGenerationsPerDay: dayCount, currentConcurrent: concurrentCount, limited: true, reason: "Max concurrent generations exceeded" };
    }

    return { currentGenerationsPerMinute: minuteCount, currentGenerationsPerHour: hourCount, currentGenerationsPerDay: dayCount, currentConcurrent: concurrentCount, limited: false, reason: null };
  }

  increment(creatorId: string): void {
    void creatorId;
    const minuteKey = this.timeKey("minute");
    const hourKey = this.timeKey("hour");
    const dayKey = this.timeKey("day");

    this.minuteCounts.set(minuteKey, (this.minuteCounts.get(minuteKey) ?? 0) + 1);
    this.hourCounts.set(hourKey, (this.hourCounts.get(hourKey) ?? 0) + 1);
    this.dayCounts.set(dayKey, (this.dayCounts.get(dayKey) ?? 0) + 1);
    this.concurrent.add(creatorId);
  }

  decrement(creatorId: string): void {
    this.concurrent.delete(creatorId);
  }

  reset(): void {
    this.minuteCounts.clear();
    this.hourCounts.clear();
    this.dayCounts.clear();
    this.concurrent.clear();
  }

  private timeKey(unit: "minute" | "hour" | "day"): string {
    const now = Date.now();
    if (unit === "minute") return String(Math.floor(now / 60000));
    if (unit === "hour") return String(Math.floor(now / 3600000));
    return String(Math.floor(now / 86400000));
  }
}
