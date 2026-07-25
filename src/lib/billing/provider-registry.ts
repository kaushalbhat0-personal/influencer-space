import type { BillingProvider, BillingProviderCapabilities, CheckoutParams, CheckoutResult } from "./types";
import type { BillingProviderName } from "./constants";

interface ProviderEntry {
  provider: BillingProvider;
  priority: number;
  healthy: boolean;
}

export class ProviderRegistry {
  private providers = new Map<BillingProviderName, ProviderEntry>();
  private fallbackChain: BillingProviderName[] = [];

  registerProvider(
    provider: BillingProvider,
    priority = 0,
  ): void {
    this.providers.set(provider.name, { provider, priority, healthy: true });
    this.rebuildFallbackChain();
  }

  unregisterProvider(name: BillingProviderName): void {
    this.providers.delete(name);
    this.rebuildFallbackChain();
  }

  getProvider(name?: BillingProviderName): BillingProvider | undefined {
    const resolved = name ?? (process.env.NEXT_PUBLIC_BILLING_PROVIDER as BillingProviderName) ?? "razorpay";
    const entry = this.providers.get(resolved);
    return entry?.provider;
  }

  getActiveProvider(name?: BillingProviderName): BillingProvider | undefined {
    const resolved = name ?? (process.env.NEXT_PUBLIC_BILLING_PROVIDER as BillingProviderName) ?? "razorpay";
    const entry = this.providers.get(resolved);
    if (entry?.healthy) return entry.provider;

    for (const fallbackName of this.fallbackChain) {
      if (fallbackName === resolved) continue;
      const fallback = this.providers.get(fallbackName);
      if (fallback?.healthy) return fallback.provider;
    }
    return undefined;
  }

  async healthCheck(name: BillingProviderName): Promise<boolean> {
    const entry = this.providers.get(name);
    if (!entry) return false;
    try {
      entry.healthy = await entry.provider.health();
      return entry.healthy;
    } catch {
      entry.healthy = false;
      return false;
    }
  }

  async healthCheckAll(): Promise<Map<BillingProviderName, boolean>> {
    const results = new Map<BillingProviderName, boolean>();
    const checks = Array.from(this.providers.entries()).map(async ([name]) => {
      const ok = await this.healthCheck(name);
      results.set(name, ok);
    });
    await Promise.all(checks);
    return results;
  }

  hasCapability(name: BillingProviderName, capability: keyof BillingProviderCapabilities): boolean {
    const provider = this.providers.get(name)?.provider;
    return provider?.capabilities?.[capability] ?? false;
  }

  listProviders(): BillingProviderName[] {
    return Array.from(this.providers.keys());
  }

  async createCheckoutWithFallback(
    params: CheckoutParams,
  ): Promise<CheckoutResult> {
    const resolved = (process.env.NEXT_PUBLIC_BILLING_PROVIDER as BillingProviderName) ?? "razorpay";
    const primary = this.providers.get(resolved);
    if (primary?.healthy) {
      const result = await primary.provider.createCheckout(params);
      if (result.success) return result;
    }

    for (const fallbackName of this.fallbackChain) {
      if (fallbackName === resolved) continue;
      const fallback = this.providers.get(fallbackName);
      if (!fallback?.healthy) continue;
      const result = await fallback.provider.createCheckout(params);
      if (result.success) return result;
    }

    return { success: false, error: "All payment providers unavailable" };
  }

  private rebuildFallbackChain(): void {
    this.fallbackChain = Array.from(this.providers.entries())
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([name]) => name);
  }
}

export const billingProviderRegistry = new ProviderRegistry();
