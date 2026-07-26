export interface BillingData {
  plan: BillingPlan;
  subscription: BillingSubscription;
  invoices: BillingInvoice[];
  usage: BillingUsage[];
}

export interface BillingPlan {
  code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: Record<string, unknown>;
  recommended: boolean;
}

export interface BillingSubscription {
  id: string;
  status: string;
  planCode: string;
  trialEndsAt: Date | null;
  renewsAt: Date | null;
  cancelledAt: Date | null;
}

export interface BillingInvoice {
  id: string;
  amount: number;
  status: string;
  issuedAt: Date;
  paidAt: Date | null;
  invoiceUrl: string | null;
}

export interface BillingUsage {
  metric: string;
  used: number;
  limit: number;
}
