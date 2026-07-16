"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createSubscriptionCheckout } from "@/actions/billing.actions";
import type { BillingActionResult } from "@/actions/billing.actions";

interface SubscriptionRow {
  id: string;
  tenantId: string;
  razorpaySubscriptionId: string | null;
  status: string;
  plan: string;
  currentPeriodEnd: Date | null;
}

const plans = [
  {
    id: "STARTER",
    name: "Starter",
    price: "₹0",
    period: "/mo",
    badge: "Free",
    description: "Best for getting started",
    features: [
      { text: "10% transaction fee", included: true },
      { text: "Platform subdomain", included: true },
      { text: "Standard Support", included: true },
      { text: "Custom Domain Support", included: false },
      { text: "Dynamic API Integrations", included: false },
      { text: "No Platform Branding", included: false },
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₹999",
    period: "/mo",
    badge: "Popular",
    description: "For serious creators",
    features: [
      { text: "5% transaction fee", included: true },
      { text: "Platform subdomain", included: true },
      { text: "Standard Support", included: true },
      { text: "Custom Domain Support", included: true },
      { text: "Dynamic API Integrations", included: true },
      { text: "No Platform Branding", included: true },
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
];

export function BillingClient({ subscription }: { subscription: SubscriptionRow }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BillingActionResult | null>(null);

  const isPro = subscription.plan === "PRO";
  const currentPlanId = subscription.plan;

  async function handleUpgrade() {
    setLoading(true);
    setResult(null);
    const res = await createSubscriptionCheckout();
    setResult(res);
    setLoading(false);
    if (res.success && res.checkoutUrl && res.checkoutUrl !== "#") {
      window.location.href = res.checkoutUrl;
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="admin-gradient-text text-2xl font-bold font-display sm:text-3xl">
          Billing & Plans
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Choose the plan that fits your brand. Upgrade anytime to unlock more features.
        </p>
      </div>

      {isPro && subscription.currentPeriodEnd && (
        <div className="mb-8 rounded-xl border border-s8ul-cyan/20 bg-s8ul-cyan/5 px-5 py-4">
          <p className="text-sm text-s8ul-cyan">
            Your Pro plan renews on{" "}
            <span className="font-semibold">
              {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "long",
              }).format(new Date(subscription.currentPeriodEnd))}
            </span>
            .
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 max-w-4xl">
        {plans.map((plan, i) => {
          const isCurrent = currentPlanId === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${
                plan.highlight
                  ? "border-s8ul-cyan/30 bg-gradient-to-b from-s8ul-cyan/[0.04] to-transparent shadow-[0_0_40px_rgba(0,245,255,0.06)]"
                  : "border-white/10 bg-zinc-900/50"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-s8ul-cyan px-4 py-1 text-xs font-semibold text-black">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <p className="mt-1 text-sm text-gray-400">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-sm text-gray-400">{plan.period}</span>
              </div>

              <ul className="mb-8 space-y-3 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat.text} className="flex items-start gap-3 text-sm">
                    {feat.included ? (
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-s8ul-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={feat.included ? "text-gray-300" : "text-gray-600"}>
                      {feat.text}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full rounded-lg border border-s8ul-cyan/20 bg-s8ul-cyan/10 px-4 py-3 text-center text-sm font-medium text-s8ul-cyan">
                  {plan.id === "PRO" ? "Active" : "Current Plan"}
                </div>
              ) : plan.id === "PRO" ? (
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="admin-btn-cyan w-full py-3 text-sm font-medium"
                >
                  {loading ? "Processing..." : plan.cta}
                </button>
              ) : null}

              {result?.error && (
                <p className="mt-3 text-center text-sm text-red-400">{result.error}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
