export const PLAN_FAMILIES = ["creator", "agency"] as const;
export type PlanFamily = (typeof PLAN_FAMILIES)[number];

export const PLAN_CYCLES = ["monthly", "annual"] as const;
export type PlanCycle = (typeof PLAN_CYCLES)[number];

export const SUBSCRIPTION_STATUSES = ["DRAFT", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ["PENDING", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const BILLING_EVENT_TYPES = [
  "SUBSCRIPTION_CREATED", "CHECKOUT_STARTED", "PAYMENT_SUCCEEDED", "PAYMENT_FAILED",
  "SUBSCRIPTION_ACTIVATED", "SUBSCRIPTION_RENEWED", "SUBSCRIPTION_CANCELLED",
  "REFUND_CREATED", "REFUND_COMPLETED", "INVOICE_ISSUED", "INVOICE_PAID",
] as const;
export type BillingEventType = (typeof BILLING_EVENT_TYPES)[number];

export const BILLING_PROVIDERS = ["stripe", "lemon_squeezy", "paddle", "razorpay"] as const;
export type BillingProviderName = (typeof BILLING_PROVIDERS)[number];

export const USAGE_METRICS = [
  "products", "gallery", "storage", "orders", "messages",
] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$",
};

export const DEFAULT_CURRENCY = "INR";
