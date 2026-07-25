import type { ValidationRuleConfig, SEOValidationResult } from "./types";
import type { RuleCategory } from "./constants";

interface RuleEntry {
  config: ValidationRuleConfig;
}

export class ValidationRuleRegistry {
  private entries = new Map<string, RuleEntry>();

  registerRule(config: ValidationRuleConfig): void {
    this.entries.set(config.id, { config });
  }

  registerRules(configs: ValidationRuleConfig[]): void {
    for (const config of configs) {
      this.registerRule(config);
    }
  }

  unregisterRule(id: string): boolean {
    return this.entries.delete(id);
  }

  enableRule(id: string): void {
    const entry = this.entries.get(id);
    if (entry) entry.config.enabled = true;
  }

  disableRule(id: string): void {
    const entry = this.entries.get(id);
    if (entry) entry.config.enabled = false;
  }

  isEnabled(id: string): boolean {
    return this.entries.get(id)?.config.enabled ?? false;
  }

  get(id: string): ValidationRuleConfig | undefined {
    return this.entries.get(id)?.config;
  }

  getByCategory(category: RuleCategory): ValidationRuleConfig[] {
    return Array.from(this.entries.values())
      .filter((e) => e.config.category === category && e.config.enabled)
      .map((e) => e.config)
      .sort((a, b) => a.priority - b.priority);
  }

  getAll(): ValidationRuleConfig[] {
    return Array.from(this.entries.values())
      .filter((e) => e.config.enabled)
      .map((e) => e.config)
      .sort((a, b) => a.priority - b.priority);
  }

  getEnabled(): ValidationRuleConfig[] {
    return this.getAll();
  }

  getDisabled(): ValidationRuleConfig[] {
    return Array.from(this.entries.values())
      .filter((e) => !e.config.enabled)
      .map((e) => e.config);
  }

  validateField(ruleId: string, value: string, context?: Record<string, unknown>): SEOValidationResult {
    const rule = this.entries.get(ruleId)?.config;
    if (!rule) return { field: ruleId, value, rule: ruleId, passed: true, severity: "info", message: "No validation rule found", recommendation: "" };
    return rule.validate(value, context);
  }

  validatePage(settings: Record<string, string>, context?: Record<string, unknown>): SEOValidationResult[] {
    const results: SEOValidationResult[] = [];
    const rules = this.getEnabled();

    for (const rule of rules) {
      const value = settings[rule.field] ?? "";
      results.push(rule.validate(value, context));
    }

    return results;
  }
}
