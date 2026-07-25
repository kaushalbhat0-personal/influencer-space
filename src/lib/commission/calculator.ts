import type { CommissionRule, CommissionCalculation } from "./types";
import { validatePercent } from "./validation";

export interface CalculationInput {
  gross: number;
  currency: string;
  rule: CommissionRule;
  tax?: number;
  discount?: number;
  transactionFee?: number;
}

export function calculateCommission(input: CalculationInput): CommissionCalculation {
  const { gross, rule, tax = 0, discount = 0, transactionFee } = input;

  if (!validatePercent(rule.platformSharePercent)) {
    throw new Error(`Invalid platform share percent: ${rule.platformSharePercent}`);
  }
  if (!validatePercent(rule.partnerSharePercent)) {
    throw new Error(`Invalid partner share percent: ${rule.partnerSharePercent}`);
  }

  if (rule.platformSharePercent + rule.partnerSharePercent !== 100) {
    throw new Error(`Shares must total 100: platform=${rule.platformSharePercent}, partner=${rule.partnerSharePercent}`);
  }

  const grossMinor = Math.round(gross);
  const taxMinor = Math.round(tax);
  const discountMinor = Math.round(discount);
  const feeMinor = transactionFee !== undefined ? Math.round(transactionFee) : 0;

  const netAmount = grossMinor - discountMinor;

  const platformShare = Math.floor((netAmount * rule.platformSharePercent) / 100);
  const partnerShare = netAmount - platformShare - feeMinor;

  return {
    gross: grossMinor,
    platformShare,
    partnerShare: Math.max(0, partnerShare),
    platformPercent: rule.platformSharePercent,
    partnerPercent: rule.partnerSharePercent,
    tax: taxMinor,
    discount: discountMinor,
    transactionFee: feeMinor > 0 ? feeMinor : undefined,
    net: netAmount,
    currency: input.currency,
  };
}

export function computeBalanceImpact(calculation: CommissionCalculation): {
  pending: number;
  available: number;
  lifetime: number;
} {
  return {
    pending: calculation.partnerShare,
    available: 0,
    lifetime: calculation.partnerShare,
  };
}
