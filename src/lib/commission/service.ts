import { ruleEngine } from "./rules";
import { calculateCommission } from "./calculator";
import { commissionLedger } from "./ledger";
import { buildCommissionSummary } from "./queries";
import { validateCreateRule, validateCommissionEntry } from "./validation";
import { platformEventBus } from "@/lib/events";
import type { CommissionRuleType, CommissionRuleStatus, LedgerEntryType } from "./constants";
import type { CommissionRule } from "./types";
import type { CommissionEntry, CommissionCalculation, CommissionSummary, PartnerBalance, CommissionRuleQuery, CommissionEntryQuery } from "./types";

export class CommissionService {
  createRule(params: { platformSharePercent: number; partnerSharePercent: number; type?: CommissionRuleType; status?: CommissionRuleStatus; partnerId?: string; label?: string; description?: string; priority?: number; metadata?: Record<string, string> }): CommissionRule | { errors: string[] } {
    const errors = validateCreateRule({ platformSharePercent: params.platformSharePercent, partnerSharePercent: params.partnerSharePercent, type: params.type, label: params.label });
    if (errors.length > 0) return { errors };
    const now = new Date().toISOString();
    const rule: CommissionRule = { id: `rule_${Date.now()}`, type: params.type ?? "default", status: params.status ?? "active", partnerId: params.partnerId, platformSharePercent: params.platformSharePercent, partnerSharePercent: params.partnerSharePercent, effectiveFrom: now, priority: params.priority ?? this.nextPriority(), label: params.label ?? "Commission Rule", description: params.description, metadata: params.metadata, createdAt: now };
    ruleEngine.addRule(rule);
    return rule;
  }

  removeRule(ruleId: string): boolean { return ruleEngine.removeRule(ruleId); }
  getRule(ruleId: string): CommissionRule | undefined { return ruleEngine.getRule(ruleId); }
  listRules(query?: CommissionRuleQuery): CommissionRule[] { return ruleEngine.listRules(query); }
  resolveRule(partnerId: string, planCode: string, at?: string): CommissionRule | null { return ruleEngine.resolveRule(partnerId, planCode, at); }

  calculate(input: { gross: number; currency: string; rule: CommissionRule; tax?: number; discount?: number; transactionFee?: number }): CommissionCalculation {
    const errors = validateCommissionEntry({ gross: input.gross, currency: input.currency });
    if (errors.length > 0) throw new Error(errors.join("; "));
    return calculateCommission(input);
  }

  createEntry(params: { invoiceId: string; partnerId: string; subscriptionId: string; planCode: string; amount: CommissionCalculation; ruleId: string; type?: LedgerEntryType; description?: string }): CommissionEntry {
    const rule = ruleEngine.getRule(params.ruleId);
    if (!rule) throw new Error(`Rule not found: ${params.ruleId}`);
    const audit = commissionLedger.buildAudit({ ruleId: params.ruleId, ruleType: rule.type, platformPercent: rule.platformSharePercent, partnerPercent: rule.partnerSharePercent, invoiceId: params.invoiceId, partnerId: params.partnerId });
    const entry: CommissionEntry = { id: `ce_${Date.now()}`, invoiceId: params.invoiceId, partnerId: params.partnerId, subscriptionId: params.subscriptionId, planCode: params.planCode, amount: params.amount, ruleId: params.ruleId, type: params.type ?? "commission_created", status: "pending", description: params.description ?? `Commission for invoice ${params.invoiceId}`, audit, createdAt: new Date().toISOString() };
    commissionLedger.addEntry(entry);
    platformEventBus.publish("CommissionCreated", { partnerId: params.partnerId, invoiceId: params.invoiceId, amount: params.amount.gross, partnerShare: params.amount.partnerShare, platformShare: params.amount.platformShare, planCode: params.planCode });
    return entry;
  }

  getEntry(entryId: string): CommissionEntry | undefined { return commissionLedger.getEntry(entryId); }
  queryEntries(query: CommissionEntryQuery) { return commissionLedger.queryEntries(query); }
  getEntriesByInvoice(invoiceId: string): CommissionEntry[] { return commissionLedger.getEntriesByInvoice(invoiceId); }
  getEntriesByPartner(partnerId: string): CommissionEntry[] { return commissionLedger.getEntriesByPartner(partnerId); }
  clearEntry(entryId: string): boolean { return commissionLedger.clearEntry(entryId); }
  reverseEntry(entryId: string, reason: string): CommissionEntry | null { return commissionLedger.reverseEntry(entryId, reason); }
  getBalance(partnerId: string): PartnerBalance { return commissionLedger.getBalance(partnerId); }

  getSummary(partnerId: string, periodStart: string, periodEnd: string): CommissionSummary {
    return buildCommissionSummary(commissionLedger.getAllEntries(), partnerId, periodStart, periodEnd);
  }

  processCommission(params: { invoiceId: string; partnerId: string; subscriptionId: string; planCode: string; gross: number; currency: string; tax?: number; discount?: number; transactionFee?: number }): { entry: CommissionEntry; balance: PartnerBalance } {
    const rule = this.resolveRule(params.partnerId, params.planCode);
    if (!rule) throw new Error(`No active commission rule for partner ${params.partnerId}`);
    const calculation = this.calculate({ gross: params.gross, currency: params.currency, rule, tax: params.tax, discount: params.discount, transactionFee: params.transactionFee });
    const entry = this.createEntry({ invoiceId: params.invoiceId, partnerId: params.partnerId, subscriptionId: params.subscriptionId, planCode: params.planCode, amount: calculation, ruleId: rule.id, description: `Commission for ${params.planCode} subscription` });
    const balance = this.getBalance(params.partnerId);
    return { entry, balance };
  }

  private nextPriority(): number { const rules = ruleEngine.getAllRules(); if (rules.length === 0) return 100; return Math.max(...rules.map((r) => r.priority)) + 10; }
}

export const commissionService = new CommissionService();
