/**
 * Billing v2 — Core Types
 *
 * Account aggregate, Plan catalog, Feature definitions, Subscription states.
 * Payment → Billing Event → Subscription State → Feature Gate
 */

// ── ACCOUNT ───────────────────────────────────────────────────────────────────

export type AccountType = "tenant" | "agency";

export interface BillingAccount {
  id: string;
  accountType: AccountType;
  accountId: string;
}

// ── PLAN ──────────────────────────────────────────────────────────────────────

export type PlanFamily = "creator" | "agency";
export type PlanCycle = "monthly" | "annual";
export type PlanStatus = "ACTIVE" | "DEPRECATED" | "GRANDFATHERED";

export interface PlanDefinition {
  code: string;
  family: PlanFamily;
  name: string;
  price: number;
  currency: string;
  cycle: PlanCycle;
  features: Record<string, number | boolean | string>;
  // ── UI Metadata (drives pricing cards, routing, badges) ──
  description?: string;
  targetAudience?: string;
  ctaLabel?: string;
  ctaType?: "signup" | "checkout" | "contact";
  recommended?: boolean;
  badge?: string;
}

// ── FEATURE ───────────────────────────────────────────────────────────────────

export type FeatureValueType = "integer" | "boolean" | "string";

export interface FeatureDefinition {
  key: string;
  description: string;
  valueType: FeatureValueType;
}

export interface FeatureValue {
  key: string;
  value: number | boolean | string;
  valueType: FeatureValueType;
}

// ── SUBSCRIPTION ──────────────────────────────────────────────────────────────

export type SubscriptionStatus = "DRAFT" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface SubscriptionState {
  id: string;
  accountId: string;
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  renewsAt: Date | null;
}

// ── ENTITLEMENT ───────────────────────────────────────────────────────────────

export interface EntitlementCheck {
  allowed: boolean;
  limit?: number;
  reason?: string;
}

// ── BILLING PROVIDER ──────────────────────────────────────────────────────────

export interface CheckoutParams {
  planCode: string;
  accountId: string;
  email?: string;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  orderId?: string;
  providerOrderId?: string;
  error?: string;
}

export interface BillingProvider {
  readonly name: string;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  handleWebhook(payload: unknown): Promise<{ success: boolean }>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}
