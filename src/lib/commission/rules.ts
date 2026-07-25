import type { CommissionRule, CommissionRuleQuery } from "./types";

export class RuleEngine {
  private rules: CommissionRule[] = [];

  addRule(rule: CommissionRule): void {
    this.rules = [...this.rules, rule].sort((a, b) => a.priority - b.priority);
  }

  removeRule(ruleId: string): boolean {
    const before = this.rules.length;
    this.rules = this.rules.filter((r) => r.id !== ruleId);
    return this.rules.length < before;
  }

  getRule(ruleId: string): CommissionRule | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }

  listRules(query?: CommissionRuleQuery): CommissionRule[] {
    let result = [...this.rules];
    if (query) {
      if (query.partnerId) result = result.filter((r) => r.partnerId === query.partnerId);
      if (query.type) result = result.filter((r) => r.type === query.type);
      if (query.status) result = result.filter((r) => r.status === query.status);
      if (query.effectiveAt) {
        const dt = new Date(query.effectiveAt);
        result = result.filter(
          (r) =>
            new Date(r.effectiveFrom) <= dt &&
            (!r.effectiveTo || new Date(r.effectiveTo) >= dt),
        );
      }
    }
    return result;
  }

  resolveRule(partnerId: string, planCode: string, at?: string): CommissionRule | null {
    const now = at ? new Date(at) : new Date();
    const active = this.rules.filter(
      (r) =>
        r.status === "active" &&
        new Date(r.effectiveFrom) <= now &&
        (!r.effectiveTo || new Date(r.effectiveTo) >= now),
    );

    const partnerRule = active.find((r) => r.partnerId === partnerId);
    if (partnerRule) return partnerRule;

    const planRule = active.find((r) => r.metadata?.planCode === planCode);
    if (planRule) return planRule;

    const defaultRule = active.find((r) => r.type === "default");
    if (defaultRule) return defaultRule;

    return null;
  }

  getAllRules(): CommissionRule[] {
    return [...this.rules];
  }

  clear(): void {
    this.rules = [];
  }
}

export const ruleEngine = new RuleEngine();
