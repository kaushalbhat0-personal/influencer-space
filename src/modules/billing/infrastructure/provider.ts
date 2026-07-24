/**
 * Billing v2 — BillingProvider Interface
 *
 * Adapter pattern for payment gateways.
 * Application code depends on this interface, never on Razorpay SDK directly.
 *
 * Phase 1: Interface only. RazorpayProvider implementation in Phase 2.
 */

import type { BillingProvider, CheckoutParams, CheckoutResult } from "../domain/types";

export type { BillingProvider, CheckoutParams, CheckoutResult };

/**
 * Registry for billing providers.
 * Phase 2+: Register RazorpayProvider, StripeProvider, etc.
 */
class BillingProviderRegistry {
  private providers = new Map<string, BillingProvider>();

  register(provider: BillingProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): BillingProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(): BillingProvider | undefined {
    // Return first registered provider
    return this.providers.values().next().value;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const billingProviders = new BillingProviderRegistry();
