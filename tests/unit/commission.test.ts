import { describe, it, expect, beforeEach } from "vitest";
import { commissionService, commissionLedger, ruleEngine, calculateCommission, computeBalanceImpact, validatePercent, validateCurrency, validateMinorUnits, validateCreateRule, formatMoney, formatPercent, balanceToSummary, defaultRule, buildCommissionSummary, aggregateByStatus, COMMISSION_RULE_TYPES, COMMISSION_RULE_STATUSES, LEDGER_ENTRY_TYPES, CALCULATION_VERSION, toMinorUnits } from "@/lib/commission";

beforeEach(() => { ruleEngine.clear(); commissionLedger.clear(); });

describe("Commission — Constants", () => {
  it("should define rule types", () => { expect(COMMISSION_RULE_TYPES).toContain("default"); });
  it("should define rule statuses", () => { expect(COMMISSION_RULE_STATUSES).toContain("active"); });
  it("should have calculation version", () => { expect(CALCULATION_VERSION).toBe(1); });
});

describe("Commission — Validation", () => {
  it("should validate percentages", () => { expect(validatePercent(50)).toBe(true); expect(validatePercent(101)).toBe(false); });
  it("should validate currency codes", () => { expect(validateCurrency("INR")).toBe(true); expect(validateCurrency("inr")).toBe(false); });
  it("should validate minor units", () => { expect(validateMinorUnits(100)).toBe(true); expect(validateMinorUnits(-1)).toBe(false); });
  it("should validate create rule input", () => { expect(validateCreateRule({ platformSharePercent: 30, partnerSharePercent: 70 }).length).toBe(0); });
});

describe("Commission — Rules", () => {
  it("should add and retrieve rules", () => { ruleEngine.addRule(defaultRule({ platformSharePercent: 30, partnerSharePercent: 70 })); expect(ruleEngine.getAllRules().length).toBe(1); });
  it("should resolve default rule", () => { ruleEngine.addRule(defaultRule({ platformSharePercent: 30, partnerSharePercent: 70 })); expect(ruleEngine.resolveRule("p1", "creator_pro")).not.toBeNull(); });
});

describe("Commission — Calculator", () => {
  it("should calculate 70/30 split", () => { const r = calculateCommission({ gross: 10000, currency: "INR", rule: defaultRule({ platformSharePercent: 30, partnerSharePercent: 70 }) }); expect(r.partnerShare).toBe(7000); expect(r.platformShare).toBe(3000); });
  it("should handle discount", () => { const r = calculateCommission({ gross: 10000, currency: "INR", rule: defaultRule({ platformSharePercent: 30, partnerSharePercent: 70 }), discount: 1000 }); expect(r.net).toBe(9000); });
  it("should handle transaction fee", () => { const r = calculateCommission({ gross: 10000, currency: "INR", rule: defaultRule({ platformSharePercent: 30, partnerSharePercent: 70 }), transactionFee: 500 }); expect(r.partnerShare).toBe(6500); });
  it("should compute balance impact", () => { const c = calculateCommission({ gross: 10000, currency: "INR", rule: defaultRule({ platformSharePercent: 30, partnerSharePercent: 70 }) }); const i = computeBalanceImpact(c); expect(i.pending).toBe(7000); });
});

describe("Commission — Service", () => {
  it("should create rule via service", () => { const r = commissionService.createRule({ platformSharePercent: 30, partnerSharePercent: 70, label: "Test" }); expect(r).not.toHaveProperty("errors"); });
  it("should throw on invalid rule", () => { const r = commissionService.createRule({ platformSharePercent: 50, partnerSharePercent: 60 }); expect(r).toHaveProperty("errors"); });
  it("should get balance", () => { const b = commissionLedger.getBalance("p1"); expect(b.lifetime).toBe(0); });
  it("should get summary", () => { const s = buildCommissionSummary([], "p1", "2024-01-01", "2026-12-31"); expect(s.entryCount).toBe(0); });
});

function createTestEntry(partnerId: string, invoiceId: string, subscriptionId: string, planCode: string) {
  return { id: `ce_test_${partnerId}_${invoiceId}`, invoiceId, partnerId, subscriptionId, planCode, amount: { gross: 10000, platformShare: 3000, partnerShare: 7000, platformPercent: 30, partnerPercent: 70, tax: 0, discount: 0, net: 10000, currency: "INR" }, ruleId: "test_rule", type: "commission_created" as const, status: "pending" as const, description: "Test commission", audit: { calculationVersion: 1, ruleUsed: "test_rule", ruleType: "default" as const, platformPercent: 30, partnerPercent: 70, invoiceReference: invoiceId, partnerReference: partnerId, calculatedAt: "2024-06-15T00:00:00.000Z" }, createdAt: "2024-06-15T00:00:00.000Z" };
}
