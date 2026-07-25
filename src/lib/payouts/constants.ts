export const PAYOUT_STATUSES = ["pending", "reserved", "processing", "completed", "failed", "cancelled", "reversed"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_PROVIDER_TYPES = ["manual", "razorpay_route", "bank_transfer", "stripe_connect", "wise"] as const;
export type PayoutProviderType = (typeof PAYOUT_PROVIDER_TYPES)[number];

export const PAYOUT_EVENTS = [
  "payout:created",
  "payout:reserved",
  "payout:processing",
  "payout:completed",
  "payout:failed",
  "payout:cancelled",
  "payout:reversed",
] as const;

export const MIN_PAYOUT_AMOUNT = 500_00;
export const IDEMPOTENCY_TTL_MS = 86_400_000;

export const PROVIDER_CAPABILITIES: Record<PayoutProviderType, {
  label: string;
  supportsAutomation: boolean;
  supportsInstant: boolean;
  supportsPartial: boolean;
  supportsReversal: boolean;
}> = {
  manual: { label: "Manual Transfer", supportsAutomation: false, supportsInstant: false, supportsPartial: true, supportsReversal: true },
  razorpay_route: { label: "Razorpay Route", supportsAutomation: true, supportsInstant: true, supportsPartial: false, supportsReversal: true },
  bank_transfer: { label: "Bank Transfer", supportsAutomation: false, supportsInstant: false, supportsPartial: false, supportsReversal: false },
  stripe_connect: { label: "Stripe Connect", supportsAutomation: true, supportsInstant: true, supportsPartial: false, supportsReversal: true },
  wise: { label: "Wise", supportsAutomation: true, supportsInstant: false, supportsPartial: false, supportsReversal: false },
};
