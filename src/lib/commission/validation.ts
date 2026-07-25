import type { CommissionRuleType, CommissionRuleStatus, LedgerEntryType } from "./constants";
import { COMMISSION_RULE_TYPES, COMMISSION_RULE_STATUSES, LEDGER_ENTRY_TYPES } from "./constants";

export function validateRuleType(value: string): value is CommissionRuleType {
  return (COMMISSION_RULE_TYPES as readonly string[]).includes(value);
}

export function validateRuleStatus(value: string): value is CommissionRuleStatus {
  return (COMMISSION_RULE_STATUSES as readonly string[]).includes(value);
}

export function validateLedgerEntryType(value: string): value is LedgerEntryType {
  return (LEDGER_ENTRY_TYPES as readonly string[]).includes(value);
}

export function validatePercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export function validateCurrency(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

export function validateMinorUnits(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function validateCreateRule(data: {
  platformSharePercent: number;
  partnerSharePercent: number;
  type?: string;
  label?: string;
}): string[] {
  const errors: string[] = [];
  if (!validatePercent(data.platformSharePercent)) errors.push("platformSharePercent must be 0-100");
  if (!validatePercent(data.partnerSharePercent)) errors.push("partnerSharePercent must be 0-100");
  if (data.platformSharePercent + data.partnerSharePercent !== 100) {
    errors.push("platformSharePercent + partnerSharePercent must equal 100");
  }
  if (data.type && !validateRuleType(data.type)) errors.push(`Invalid rule type: ${data.type}`);
  if (data.label && data.label.length > 200) errors.push("label must be under 200 characters");
  return errors;
}

export function validateCommissionEntry(data: {
  gross: number;
  currency: string;
}): string[] {
  const errors: string[] = [];
  if (!validateMinorUnits(data.gross)) errors.push("gross must be a non-negative integer (minor units)");
  if (!validateCurrency(data.currency)) errors.push("currency must be a valid ISO 4217 code");
  return errors;
}
