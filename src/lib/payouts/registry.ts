import type { IPayoutProvider } from "./providers";
import type { PayoutProviderType } from "./constants";
import { ManualPayoutProvider, RazorpayRouteProvider, BankTransferProvider } from "./providers";

export class PayoutProviderRegistry {
  private providers = new Map<PayoutProviderType, IPayoutProvider>();

  constructor() {
    this.register(new ManualPayoutProvider());
    this.register(new RazorpayRouteProvider());
    this.register(new BankTransferProvider());
  }

  register(provider: IPayoutProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type: PayoutProviderType): IPayoutProvider | undefined {
    return this.providers.get(type);
  }

  getOrThrow(type: PayoutProviderType): IPayoutProvider {
    const provider = this.providers.get(type);
    if (!provider) throw new Error(`No payout provider registered for type: ${type}`);
    return provider;
  }

  list(): IPayoutProvider[] {
    return Array.from(this.providers.values());
  }

  listCapabilities(): Array<{ type: PayoutProviderType; label: string; supportsAutomation: boolean }> {
    return this.list().map((p) => ({
      type: p.type,
      label: p.capabilities.label,
      supportsAutomation: p.capabilities.supportsAutomation,
    }));
  }

  async healthCheckAll(): Promise<Record<string, { ok: boolean; latencyMs: number }>> {
    const results: Record<string, { ok: boolean; latencyMs: number }> = {};
    for (const provider of this.list()) {
      results[provider.type] = await provider.health();
    }
    return results;
  }
}

export const payoutProviderRegistry = new PayoutProviderRegistry();
