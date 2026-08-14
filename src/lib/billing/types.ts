import type {
  PlanFamily, PlanCycle, SubscriptionStatus, InvoiceStatus,
  BillingProviderName, UsageMetric,
} from "./constants";

export interface BillingProviderCapabilities {
  supportsCheckout: boolean;
  supportsPaymentMethods: boolean;
  supportsCustomerCreation: boolean;
  supportsWebhooks: boolean;
  supportsRefunds: boolean;
}

export interface BillingPlan {
  code: string;
  family: PlanFamily;
  name: string;
  description: string;
  price: number;
  currency: string;
  cycle: PlanCycle;
  features: Record<string, number | boolean | string>;
  recommended: boolean;
  badge: string;
}

export interface BillingSubscription {
  id: string;
  accountId: string;
  workspaceId: string;
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  renewsAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  /** RCCF-33: server-derived — true only while the trial is active (status TRIALING and trialEndsAt in the future). */
  isTrialActive?: boolean;
}

export interface BillingInvoice {
  id: string;
  accountId: string;
  planCode: string;
  planName: string;
  amount: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt: string | null;
  dueAt: string | null;
  invoiceUrl: string | null;
  provider: string | null;
  providerReference: string | null;
  lineItems: BillingLineItem[];
}

export interface BillingLineItem {
  description: string;
  amount: number;
  quantity: number;
}

export interface PaymentMethod {
  id: string;
  type: "card" | "upi" | "netbanking";
  last4: string;
  brand: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

export interface UsageQuota {
  metric: UsageMetric;
  label: string;
  used: number;
  limit: number;
  unit: string;
}

export interface BillingDashboard {
  plan: BillingPlan;
  subscription: BillingSubscription;
  invoices: BillingInvoice[];
  paymentMethods: PaymentMethod[];
  usage: UsageQuota[];
  activeProducts: number;
  activeGallery: number;
  storageUsed: number;
  ordersProcessed: number;
  messagesSent: number;
}

export interface BillingEventPayload {
  accountId: string;
  planCode?: string;
  subscriptionId?: string;
  invoiceId?: string;
  providerReference?: string;
  amount?: number;
  currency?: string;
  previousStatus?: SubscriptionStatus;
  newStatus?: SubscriptionStatus;
}

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
  readonly name: BillingProviderName;
  readonly capabilities: BillingProviderCapabilities;
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  createCustomer(email: string, name?: string): Promise<{ id: string }>;
  listPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
  detachPaymentMethod(paymentMethodId: string): Promise<boolean>;
  health(): Promise<boolean>;
}

export interface InvoiceFilter {
  status?: InvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
