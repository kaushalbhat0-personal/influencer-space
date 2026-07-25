export const COMMISSION_RULE_TYPES = ["default", "partner_override", "promotional", "enterprise"] as const;
export type CommissionRuleType = (typeof COMMISSION_RULE_TYPES)[number];

export const COMMISSION_RULE_STATUSES = ["active", "inactive", "expired", "pending"] as const;
export type CommissionRuleStatus = (typeof COMMISSION_RULE_STATUSES)[number];

export const LEDGER_ENTRY_TYPES = [
  "commission_created",
  "commission_adjusted",
  "refund",
  "chargeback",
  "manual_credit",
  "manual_debit",
  "reversal",
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const BALANCE_TYPES = ["pending", "available", "paid", "lifetime"] as const;
export type BalanceType = (typeof BALANCE_TYPES)[number];

export const COMMISSION_EVENTS = [
  "commission:created",
  "commission:adjusted",
  "refund:applied",
  "chargeback:applied",
  "balance:updated",
] as const;

export const CALCULATION_VERSION = 1;

export const PRECISION = 2;

export const MINOR_UNIT_MULTIPLIER = 100;

export function toMinorUnits(amount: number): number {
  return Math.round(amount * MINOR_UNIT_MULTIPLIER);
}

export function fromMinorUnits(amount: number): number {
  return amount / MINOR_UNIT_MULTIPLIER;
}
