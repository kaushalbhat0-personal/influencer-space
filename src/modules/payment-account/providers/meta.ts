// ── Payment Providers — Metadata (pure, client-safe) ────────
// RCCF-IMPLEMENTATION-74. Provider metadata only — no adapters, no SDK imports,
// safe to import from client components.

import type { PaymentProviderId } from "../domain/types";

export const PAYMENT_PROVIDERS: Array<{ id: PaymentProviderId; label: string; description: string; status: "active" | "future" }> = [
  { id: "razorpay", label: "Razorpay", description: "Creator's own Razorpay account — customer pays you directly via payment link.", status: "active" },
  { id: "stripe", label: "Stripe", description: "Creator's own Stripe account — supports international cards & wallets via Stripe Checkout.", status: "active" },
  { id: "phonepe", label: "PhonePe", description: "Future provider.", status: "future" },
  { id: "cashfree", label: "Cashfree", description: "Future provider.", status: "future" },
  { id: "payu", label: "PayU", description: "Future provider.", status: "future" },
  { id: "manual", label: "Manual", description: "Manual/offline collection — no provider call.", status: "future" },
];
