export interface BudgetEntry {
  creatorId: string;
  dailySpend: number;
  weeklySpend: number;
  monthlySpend: number;
  dailyLimit: number;
  monthlyLimit: number;
  softLimitExceeded: boolean;
  hardLimitExceeded: boolean;
}

export interface BudgetAlert {
  creatorId: string;
  type: "soft_limit" | "hard_limit" | "daily_limit" | "monthly_limit";
  currentSpend: number;
  limit: number;
  timestamp: string;
}

export class GenerationBudgetMonitor {
  private budgets = new Map<string, BudgetEntry>();
  private alerts: BudgetAlert[] = [];

  trackSpend(creatorId: string, amount: number): void {
    const entry = this.getOrCreate(creatorId);
    entry.dailySpend += amount;
    entry.weeklySpend += amount;
    entry.monthlySpend += amount;

    if (entry.dailySpend >= entry.dailyLimit && !entry.softLimitExceeded) {
      entry.softLimitExceeded = true;
      this.alerts.push({
        creatorId,
        type: "daily_limit",
        currentSpend: entry.dailySpend,
        limit: entry.dailyLimit,
        timestamp: new Date().toISOString(),
      });
    }

    if (entry.monthlySpend >= entry.monthlyLimit) {
      entry.hardLimitExceeded = true;
      this.alerts.push({
        creatorId,
        type: "hard_limit",
        currentSpend: entry.monthlySpend,
        limit: entry.monthlyLimit,
        timestamp: new Date().toISOString(),
      });
    }
  }

  getBudget(creatorId: string): BudgetEntry | null {
    return this.budgets.get(creatorId) ?? null;
  }

  getAllBudgets(): BudgetEntry[] {
    return Array.from(this.budgets.values());
  }

  getAlerts(): BudgetAlert[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  resetDaily(creatorId?: string): void {
    if (creatorId) {
      const entry = this.budgets.get(creatorId);
      if (entry) {
        entry.dailySpend = 0;
        entry.softLimitExceeded = false;
      }
    } else {
      for (const entry of Array.from(this.budgets.values())) {
        entry.dailySpend = 0;
        entry.softLimitExceeded = false;
      }
    }
  }

  setLimits(creatorId: string, dailyLimit: number, monthlyLimit: number): void {
    const entry = this.getOrCreate(creatorId);
    entry.dailyLimit = dailyLimit;
    entry.monthlyLimit = monthlyLimit;
  }

  private getOrCreate(creatorId: string): BudgetEntry {
    let entry = this.budgets.get(creatorId);
    if (!entry) {
      entry = {
        creatorId,
        dailySpend: 0,
        weeklySpend: 0,
        monthlySpend: 0,
        dailyLimit: 100,
        monthlyLimit: 1000,
        softLimitExceeded: false,
        hardLimitExceeded: false,
      };
      this.budgets.set(creatorId, entry);
    }
    return entry;
  }
}
