export interface CheckoutInput {
  offeringId: string;
  tenantId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  provider: string;
}

export interface PaymentResult {
  providerPaymentId: string;
  status: "completed" | "failed" | "pending";
  amount: number;
  currency: string;
}

/**
 * Abstract checkout provider.
 * Commerce Platform depends only on this interface.
 */
export interface CheckoutProvider {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyPayment(sessionId: string): Promise<PaymentResult>;
}
