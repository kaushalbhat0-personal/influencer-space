// ── Payment Account — Provider Registry ─────────────────────
// RCCF-IMPLEMENTATION-74 Phase 2. Configuration-driven. Only adapters live
// here — checkout/orders/commerce never import a provider directly.

import type { PaymentProviderAdapter } from "./types";
import { PAYMENT_PROVIDERS } from "./meta";
import { RazorpayPaymentAdapter } from "./razorpay";

const ADAPTERS: Record<string, PaymentProviderAdapter> = {
  razorpay: new RazorpayPaymentAdapter(),
};

export { PAYMENT_PROVIDERS } from "./meta";

export function getPaymentProviderAdapter(id: string): PaymentProviderAdapter | null {
  return ADAPTERS[id] ?? null;
}

export function getPaymentProviderLabel(id: string): string {
  return PAYMENT_PROVIDERS.find((p) => p.id === id)?.label ?? id;
}
