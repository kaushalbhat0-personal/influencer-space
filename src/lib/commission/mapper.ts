import type { CommissionCalculation, CommissionRule, PartnerBalance } from "./types";
import { formatMinorUnits } from "@/lib/utils";

export { formatMinorUnits, formatMinorUnits as formatMoney };

export function formatCommissionSummary(calc: CommissionCalculation): {
  gross: string; platformShare: string; partnerShare: string; net: string; tax: string; discount: string;
} {
  return {
    gross: formatMinorUnits(calc.gross), platformShare: formatMinorUnits(calc.platformShare),
    partnerShare: formatMinorUnits(calc.partnerShare), net: formatMinorUnits(calc.net),
    tax: formatMinorUnits(calc.tax), discount: formatMinorUnits(calc.discount),
  };
}

export function formatPercent(percent: number): string { return `${percent}%`; }

export function balanceToSummary(balance: PartnerBalance): { pending: string; available: string; paid: string; lifetime: string } {
  return {
    pending: formatMinorUnits(balance.pending), available: formatMinorUnits(balance.available),
    paid: formatMinorUnits(balance.paid), lifetime: formatMinorUnits(balance.lifetime),
  };
}

export function ruleToLabel(rule: CommissionRule): string {
  return rule.label || `${rule.type}: ${rule.platformSharePercent}/${rule.partnerSharePercent}`;
}

export function defaultRule(params: { platformSharePercent: number; partnerSharePercent: number; label?: string }): CommissionRule {
  const now = new Date().toISOString();
  return { id: `default_${Date.now()}`, type: "default", status: "active", platformSharePercent: params.platformSharePercent, partnerSharePercent: params.partnerSharePercent, effectiveFrom: now, priority: 100, label: params.label ?? "Default Rule", createdAt: now };
}
