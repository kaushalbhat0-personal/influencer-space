"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getCreatorPlans, getAgencyPlans, getEnterprisePlan, getEnterpriseHighlights } from "./data";
import { ComparisonMatrix } from "./comparison";
import { PricingFAQ } from "./faq";
import { Sparkles } from "lucide-react";

type PlanFamily = "creator" | "agency";

const TABS: { id: PlanFamily; label: string }[] = [
  { id: "creator", label: "For Creators" },
  { id: "agency", label: "For Agencies" },
];

export function Pricing() {
  const [tab, setTab] = useState<PlanFamily>("creator");
  const [annual, setAnnual] = useState(false);

  const plans = tab === "creator" ? getCreatorPlans() : getAgencyPlans();
  const enterprise = getEnterprisePlan();
  const entHighlights = getEnterpriseHighlights();

  return (
    <section id="pricing" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">pricing</span>
          </h2>
          <p className="mt-3 text-zinc-500">Start free. Upgrade when you grow.</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex justify-center" role="tablist" aria-label="Pricing plans">
          <div className="inline-flex rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
                  tab === t.id
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Annual Toggle (UI only) */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className={cn("text-sm transition-colors", !annual ? "text-white" : "text-zinc-500")}>Monthly</span>
          <button
            role="switch"
            aria-checked={annual}
            aria-label="Annual billing — coming soon"
            disabled
            onClick={() => setAnnual(!annual)}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-800 cursor-not-allowed opacity-60"
          >
            <span className="inline-block h-4 w-4 rounded-full bg-zinc-600 translate-x-1" />
          </button>
          <span className="text-sm text-zinc-600">Annual (Coming Soon)</span>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500">No plans available. Please check back later.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map(({ plan }) => (
              <div
                key={plan.code}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-8 transition-all",
                  plan.recommended
                    ? "border-indigo-500/30 bg-gradient-to-b from-indigo-500/[0.04] to-transparent shadow-[0_0_40px_rgba(99,102,241,0.08)]"
                    : "border-white/[0.06] bg-[var(--surface-base)]/50 hover:border-white/[0.12]"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-4 py-0.5 text-xs font-semibold text-white">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  {plan.targetAudience && (
                    <p className="mt-0.5 text-xs font-medium text-indigo-400">{plan.targetAudience}</p>
                  )}
                  {plan.description && (
                    <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>
                  )}
                </div>

                <div className="mt-5">
                  {plan.price === 0 && plan.ctaType !== "contact" ? (
                    <span className="text-4xl font-bold text-white">Free</span>
                  ) : plan.price > 0 ? (
                    <>
                      <span className="text-4xl font-bold text-white">₹{plan.price.toLocaleString("en-IN")}</span>
                      <span className="text-zinc-500">/{plan.cycle}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-white">Custom</span>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-3" role="list">
                  {(plan.code === "creator_free" || plan.code === "creator_pro" || plan.code === "creator_elite"
                    ? ["AI website generator", "Digital products", "UPI checkout", "Social feed sync", "Analytics dashboard"]
                    : ["Multi-tenant dashboard", "Client workspaces", "Revenue splitting", "Permission controls", "Team management"]
                  ).map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-emerald-400 flex-shrink-0">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {plan.ctaType === "contact" ? (
                    <Link href="/contact" className="btn-secondary w-full">
                      {plan.ctaLabel ?? "Contact Sales"}
                    </Link>
                  ) : plan.ctaType === "checkout" ? (
                    <Link href="/signup" className="btn-primary w-full">
                      {plan.ctaLabel ?? "Get Started"}
                    </Link>
                  ) : (
                    <Link href={`/signup?plan=${plan.code}`} className={cn("flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all",
                      plan.recommended
                        ? "btn-primary"
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}>
                      {plan.recommended && <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />}
                      {plan.ctaLabel ?? "Start Free"}
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {/* Enterprise pseudo-plan (agency tab only) */}
            {tab === "agency" && (
              <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-8">
                <div>
                  <h3 className="text-xl font-bold text-white">{enterprise.name}</h3>
                  <p className="mt-0.5 text-xs font-medium text-violet-400">{enterprise.targetAudience}</p>
                  <p className="mt-1 text-sm text-zinc-500">{enterprise.description}</p>
                </div>
                <div className="mt-5">
                  <span className="text-2xl font-bold text-white">Custom</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3" role="list">
                  {entHighlights.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-emerald-400 flex-shrink-0">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/contact" className="btn-secondary w-full">{enterprise.ctaLabel ?? "Contact Sales"}</Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comparison Matrix */}
        <ComparisonMatrix family={tab} />

        {/* FAQ */}
        <PricingFAQ />
      </div>
    </section>
  );
}
