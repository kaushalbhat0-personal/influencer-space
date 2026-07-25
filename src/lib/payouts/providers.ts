import type { PayoutProviderResult, PayoutProviderCapabilities, PayoutProviderCapabilityFields } from "./types";
import type { PayoutProviderType } from "./constants";
import { PROVIDER_CAPABILITIES } from "./constants";

function buildCapabilities(type: PayoutProviderType): PayoutProviderCapabilities {
  const base = PROVIDER_CAPABILITIES[type] as PayoutProviderCapabilityFields;
  return { ...base, type };
}

export interface IPayoutProvider {
  readonly type: PayoutProviderType;
  readonly capabilities: PayoutProviderCapabilities;

  health(): Promise<{ ok: boolean; latencyMs: number }>;

  createPayout(batch: { id: string; total: number; currency: string; entries: string[] }): Promise<PayoutProviderResult>;

  cancelPayout(providerReference: string): Promise<PayoutProviderResult>;

  getStatus(providerReference: string): Promise<{
    status: string;
    settledAt?: string;
    failureReason?: string;
  }>;
}

export class ManualPayoutProvider implements IPayoutProvider {
  readonly type: PayoutProviderType = "manual";
  readonly capabilities = buildCapabilities("manual");

  async health(): Promise<{ ok: boolean; latencyMs: number }> {
    return { ok: true, latencyMs: 0 };
  }

  async createPayout(params: { id: string; total: number; currency: string; entries: string[] }): Promise<PayoutProviderResult> {
    void params;
    return { success: true, providerReference: `manual_${Date.now()}` };
  }

  async cancelPayout(providerReference: string): Promise<PayoutProviderResult> {
    void providerReference;
    return { success: true };
  }

  async getStatus(providerReference: string): Promise<{ status: string; settledAt?: string; failureReason?: string }> {
    void providerReference;
    return { status: "completed" };
  }
}

export class RazorpayRouteProvider implements IPayoutProvider {
  readonly type: PayoutProviderType = "razorpay_route";
  readonly capabilities = buildCapabilities("razorpay_route");

  async health(): Promise<{ ok: boolean; latencyMs: number }> {
    return { ok: true, latencyMs: 0 };
  }

  async createPayout(batch: { id: string; total: number; currency: string; entries: string[] }): Promise<PayoutProviderResult> {
    return { success: true, providerReference: `rzp_route_${batch.id}_${Date.now()}` };
  }

  async cancelPayout(providerReference: string): Promise<PayoutProviderResult> {
    return { success: true, providerReference };
  }

  async getStatus(providerReference: string): Promise<{ status: string; settledAt?: string; failureReason?: string }> {
    void providerReference;
    return { status: "processing" };
  }
}

export class BankTransferProvider implements IPayoutProvider {
  readonly type: PayoutProviderType = "bank_transfer";
  readonly capabilities = buildCapabilities("bank_transfer");

  async health(): Promise<{ ok: boolean; latencyMs: number }> {
    return { ok: true, latencyMs: 0 };
  }

  async createPayout(params: { id: string; total: number; currency: string; entries: string[] }): Promise<PayoutProviderResult> {
    void params;
    return { success: true, providerReference: `bank_${Date.now()}` };
  }

  async cancelPayout(providerReference: string): Promise<PayoutProviderResult> {
    void providerReference;
    return { success: false, error: "Bank transfers cannot be cancelled once initiated" };
  }

  async getStatus(providerReference: string): Promise<{ status: string; settledAt?: string; failureReason?: string }> {
    void providerReference;
    return { status: "completed" };
  }
}
