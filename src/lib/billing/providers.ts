import type { BillingProvider, BillingProviderCapabilities, CheckoutParams, CheckoutResult } from "./types";
import type { BillingProviderName } from "./constants";
import type { PaymentMethod } from "./types";
import { billingProviderRegistry } from "./provider-registry";

abstract class BaseBillingProvider implements BillingProvider {
  abstract readonly name: BillingProviderName;
  abstract readonly capabilities: BillingProviderCapabilities;
  abstract createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  abstract createCustomer(email: string, name?: string): Promise<{ id: string }>;
  abstract listPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
  abstract detachPaymentMethod(paymentMethodId: string): Promise<boolean>;
  abstract health(): Promise<boolean>;
}

interface StripeLike {
  checkout: { sessions: { create: (opts: Record<string, unknown>) => Promise<Record<string, unknown>> } };
  customers: { create: (opts: Record<string, unknown>) => Promise<Record<string, unknown>> };
  paymentMethods: { list: (opts: Record<string, unknown>) => Promise<Record<string, unknown>>; detach: (id: string) => Promise<unknown> };
}

class StripeProvider extends BaseBillingProvider {
  readonly name: BillingProviderName = "stripe";
  readonly capabilities: BillingProviderCapabilities = {
    supportsCheckout: true,
    supportsPaymentMethods: true,
    supportsCustomerCreation: true,
    supportsWebhooks: true,
    supportsRefunds: true,
  };

  private async getStripe(): Promise<StripeLike | null> {
    try {
      const modName = "stripe";
      const mod = await import(modName) as Record<string, unknown>;
      const Stripe = (mod.default || mod) as new (key: string) => unknown;
      return new Stripe(process.env.STRIPE_SECRET_KEY ?? "") as StripeLike;
    } catch {
      return null;
    }
  }

  async health(): Promise<boolean> {
    return !!(await this.getStripe());
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const stripe = await this.getStripe();
      if (!stripe) return { success: false, error: "Stripe SDK not available" };
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: params.planCode, quantity: 1 }],
        customer_email: params.email,
        success_url: params.successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=1`,
        cancel_url: params.cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?canceled=1`,
      } as Record<string, unknown>);
      return { success: true, checkoutUrl: (session.url as string) ?? undefined, orderId: session.id as string };
    } catch (e) {
      return { success: false, error: `Stripe error: ${e instanceof Error ? e.message : "Unknown"}` };
    }
  }

  async createCustomer(email: string, name?: string): Promise<{ id: string }> {
    const stripe = await this.getStripe();
    if (!stripe) return { id: email };
    const customer = await stripe.customers.create({ email, name } as Record<string, unknown>);
    return { id: customer.id as string };
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const stripe = await this.getStripe();
    if (!stripe) return [];
    const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card" } as Record<string, unknown>);
    const data = (methods as Record<string, unknown>).data as Record<string, unknown>[];
    return data.map((pm: Record<string, unknown>) => {
      const card = (pm.card ?? {}) as Record<string, unknown>;
      return {
        id: pm.id as string,
        type: "card" as const,
        last4: (card.last4 as string) ?? "0000",
        brand: (card.brand as string) ?? "unknown",
        expMonth: (card.exp_month as number) ?? null,
        expYear: (card.exp_year as number) ?? null,
        isDefault: false,
      };
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<boolean> {
    const stripe = await this.getStripe();
    if (!stripe) return false;
    await stripe.paymentMethods.detach(paymentMethodId);
    return true;
  }
}

class LemonSqueezyProvider extends BaseBillingProvider {
  readonly name: BillingProviderName = "lemon_squeezy";
  readonly capabilities: BillingProviderCapabilities = {
    supportsCheckout: true,
    supportsPaymentMethods: false,
    supportsCustomerCreation: false,
    supportsWebhooks: true,
    supportsRefunds: true,
  };

  async health(): Promise<boolean> {
    return !!process.env.LEMON_SQUEEZY_API_KEY;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          data: {
            type: "checkouts",
            attributes: {
              product_options: { enabled_variants: [params.planCode] },
              checkout_data: { email: params.email },
              success_url: params.successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=1`,
              cancel_url: params.cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?canceled=1`,
            },
          },
        }),
      });

      const data = await response.json();
      return { success: true, checkoutUrl: data.data?.attributes?.url, orderId: data.data?.id };
    } catch (e) {
      return { success: false, error: `LemonSqueezy error: ${e instanceof Error ? e.message : "Unknown"}` };
    }
  }

  async createCustomer(email: string): Promise<{ id: string }> {
    return { id: email };
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    return [];
  }

  async detachPaymentMethod(): Promise<boolean> {
    return true;
  }
}

class PaddleProvider extends BaseBillingProvider {
  readonly name: BillingProviderName = "paddle";
  readonly capabilities: BillingProviderCapabilities = {
    supportsCheckout: true,
    supportsPaymentMethods: false,
    supportsCustomerCreation: false,
    supportsWebhooks: true,
    supportsRefunds: true,
  };

  async health(): Promise<boolean> {
    return !!process.env.PADDLE_API_KEY;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const response = await fetch("https://vendors.paddle.com/api/2.0/subscription/users", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PADDLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: params.planCode,
          email: params.email,
          passthrough: JSON.stringify({ accountId: params.accountId }),
          return_url: params.successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=1`,
        }),
      });

      const data = await response.json();
      return { success: true, checkoutUrl: data.response?.url, orderId: data.response?.id };
    } catch (e) {
      return { success: false, error: `Paddle error: ${e instanceof Error ? e.message : "Unknown"}` };
    }
  }

  async createCustomer(email: string): Promise<{ id: string }> {
    return { id: email };
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    return [];
  }

  async detachPaymentMethod(): Promise<boolean> {
    return true;
  }
}

class RazorpayProvider extends BaseBillingProvider {
  readonly name: BillingProviderName = "razorpay";
  readonly capabilities: BillingProviderCapabilities = {
    supportsCheckout: true,
    supportsPaymentMethods: false,
    supportsCustomerCreation: false,
    supportsWebhooks: true,
    supportsRefunds: true,
  };

  async health(): Promise<boolean> {
    return !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const plan = await getPlanPrice(params.planCode);
      return {
        success: true,
        checkoutUrl: `https://checkout.razorpay.com/v1/checkout.js?key_id=${process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID}&amount=${plan * 100}&order_id=${params.planCode}`,
        orderId: params.planCode,
      };
    } catch (e) {
      return { success: false, error: `Razorpay error: ${e instanceof Error ? e.message : "Unknown"}` };
    }
  }

  async createCustomer(email: string): Promise<{ id: string }> {
    return { id: email };
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    return [];
  }

  async detachPaymentMethod(): Promise<boolean> {
    return true;
  }
}

import { getPlan } from "@/lib/capabilities";

async function getPlanPrice(planCode: string): Promise<number> {
  return getPlan(planCode)?.price ?? 0;
}

function initProviders(): void {
  const providers: BaseBillingProvider[] = [
    new StripeProvider(),
    new LemonSqueezyProvider(),
    new PaddleProvider(),
    new RazorpayProvider(),
  ];

  const priorityOrder: Record<string, number> = {
    razorpay: 10,
    stripe: 8,
    paddle: 5,
    lemon_squeezy: 3,
  };

  for (const provider of providers) {
    billingProviderRegistry.registerProvider(provider, priorityOrder[provider.name] ?? 0);
  }
}

initProviders();

export { BaseBillingProvider };
