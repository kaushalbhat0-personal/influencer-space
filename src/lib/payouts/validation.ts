import type { PayoutStatus, PayoutProviderType } from "./constants";
import { PAYOUT_STATUSES, PAYOUT_PROVIDER_TYPES, MIN_PAYOUT_AMOUNT } from "./constants";

export function validatePayoutStatus(value: string): value is PayoutStatus {
  return (PAYOUT_STATUSES as readonly string[]).includes(value);
}

export function validateProviderType(value: string): value is PayoutProviderType {
  return (PAYOUT_PROVIDER_TYPES as readonly string[]).includes(value);
}

export function validateMinorUnits(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function validateIdempotencyKey(key: string): boolean {
  return typeof key === "string" && key.length >= 8 && key.length <= 128;
}

export function canTransitionStatus(current: PayoutStatus, target: PayoutStatus): boolean {
  const transitions: Record<PayoutStatus, PayoutStatus[]> = {
    pending: ["reserved", "cancelled"],
    reserved: ["processing", "cancelled"],
    processing: ["completed", "failed"],
    completed: ["reversed"],
    failed: ["pending", "cancelled"],
    cancelled: [],
    reversed: [],
  };
  return transitions[current]?.includes(target) ?? false;
}

export function validateCreatePayout(data: {
  partnerId: string;
  provider: string;
  currency: string;
  total: number;
  entryIds: string[];
  idempotencyKey: string;
}): string[] {
  const errors: string[] = [];
  if (!data.partnerId?.trim()) errors.push("partnerId is required");
  if (!validateProviderType(data.provider)) errors.push(`Invalid provider: ${data.provider}`);
  if (!/^[A-Z]{3}$/.test(data.currency)) errors.push("currency must be a valid ISO 4217 code");
  if (!validateMinorUnits(data.total)) errors.push("total must be a non-negative integer (minor units)");
  if (data.total < MIN_PAYOUT_AMOUNT) errors.push(`total must be at least ${MIN_PAYOUT_AMOUNT} (minor units)`);
  if (!data.entryIds?.length) errors.push("at least one entry ID is required");
  if (!validateIdempotencyKey(data.idempotencyKey)) errors.push("idempotencyKey must be 8-128 characters");
  return errors;
}
