"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getDisplayPrice, getAnnualSavings, getTrialFraming, PARTNER_VALUE_POINTS, type PricingData, type PlanFamily } from "./data";
import { ComparisonMatrix } from "./comparison";
import { PricingFAQ } from "./faq";
import { Sparkles, BadgePercent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PARTNER_ADDON_UNIT_PRICE_INR } from "@/config/commerce/agency-addons";
import { isOneTimePlan } from "@/config/commerce/plans";

const TABS: { id: PlanFamily; label: string }[] = [
  { id: "creator", label: "For Creators" },
  { id: "agency", label: "For Partners" },
];

// RCCF-MKT-08-R1: family-aware trust line — paid Partner plans are ONE-TIME
// purchases (RCCF-73), so subscription vocabulary ("Cancel anytime") must not
// appear on the Partner tab. Creator items keep the recurring-trial framing.
const TRUST_ITEMS_CREATOR = ["No credit card required to start", "15-day free trial", "Cancel anytime", "Secure payments via Razorpay"];
const TRUST_ITEMS_PARTNER = ["No credit card required to start", "15-day free trial", "Paid plans are one-time purchases", "Secure payments via Razorpay"];

interface PricingProps {
  data: PricingData;
}

export function Pricing({ data }: PricingProps) {
  const [tab, setTab] = useState<PlanFamily>("creator");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = tab === "creator" ? data.creator : data.partner;
  const enterprise = tab === "creator" ? data.enterpriseCreator : data.enterprisePartner;
  const isPartner = tab === "agency";

  // RCCF-MKT-10 P3-B: WAI-ARIA tabs keyboard interaction — roving tabindex +
  // ArrowLeft/ArrowRight/Home/End with automatic activation, matching the
  // existing click behavior. Visual design is unchanged; the global
  // *:focus-visible ring provides focus visibility.
  const selectTab = (id: PlanFamily) => {
    setTab(id);
    document.getElementById(`pricing-tab-${id}`)?.focus();
  };
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length].id
      : e.key === "ArrowLeft" ? TABS[(i - 1 + TABS.length) % TABS.length].id
      : e.key === "Home" ? TABS[0].id
      : TABS[TABS.length - 1].id;
    selectTab(next);
  };

  return (
    <section id="pricing" className="relative px-4 py-20 sm:px-8 sm:py-28 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.06),transparent_60%)] bg-zinc-900/10 border-y border-white/[0.04]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">pricing</span>
          </h2>
          <p className="mt-3 text-zinc-500">Start with a free trial. Upgrade when you grow.</p>
        </div>

        {/* Tabs (RCCF-MKT-10 P3-B: full tab semantics — each tab is labelled,
            controls the shared panel, and the active tab is the only tab stop) */}
        <div className="mb-6 flex justify-center" role="tablist" aria-label="Pricing plans">
          <div className="inline-flex rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`pricing-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="pricing-panel"
                tabIndex={tab === t.id ? 0 : -1}
                onKeyDown={onTabKeyDown}
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
                  tab === t.id ? "bg-indigo-500 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                )}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Billing-cycle toggle (annual pricing derived from the runtime).
            RCCF-MKT-08-R1: Partner Solo/Scale are ONE-TIME purchases (RCCF-73)
            — the Monthly/Yearly selector is not rendered at all for Partners
            (no fake disabled control, no dead wrapper). Creators keep it
            because Creator Growth/Scale remain recurring subscriptions. */}
        {!isPartner && plans.some((p) => p.annualPrice) && (
          <div className="mb-8 flex items-center justify-center gap-3 text-sm" role="group" aria-label="Billing cycle">
            <span className={cn("text-sm", cycle === "monthly" ? "text-zinc-200" : "text-zinc-500")}>Monthly</span>
            <button
              type="button"
              role="switch"
              aria-checked={cycle === "yearly"}
              aria-label="Toggle yearly billing"
              onClick={() => setCycle((c) => (c === "monthly" ? "yearly" : "monthly"))}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                cycle === "yearly" ? "bg-indigo-500" : "bg-white/10"
              )}
            >
              <span className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                cycle === "yearly" ? "left-[22px]" : "left-0.5"
              )} />
            </button>
            <span className={cn("flex items-center gap-1.5 text-sm", cycle === "yearly" ? "text-zinc-200" : "text-zinc-500")}>
              Yearly
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                <BadgePercent className="h-3 w-3" aria-hidden="true" />
                Save ~17%
              </span>
            </span>
          </div>
        )}

        {/* RCCF-MKT-08-R1: the commercial model, stated truthfully.
            Partner Solo/Scale are one-time Razorpay orders (RCCF-73) — never
            described as monthly/recurring; the additional-client price is the
            canonical constant rendered ONE-TIME (never /month); commission has
            no fixed percentage and is scoped to eligible paid Partners. */}
        {isPartner && (
          <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-zinc-400" data-testid="how-partner-plans-work">
            <p className="font-medium text-zinc-200">How Partner plans work</p>
            <ol className="mt-2 space-y-1.5 text-xs text-zinc-500" role="list">
              {PARTNER_VALUE_POINTS.map((point, i) => (
                <li key={point} className="flex gap-2">
                  <span aria-hidden="true" className="text-zinc-600">{i + 1}.</span>
                  <span>{point}</span>
                </li>
              ))}
              {/* RCCF-61/RCCF-73: add-on economics — the canonical commercial
                  constant, charged as a single payment-gated order. */}
              <li className="flex gap-2 pt-1 text-zinc-600">
                <span aria-hidden="true" className="text-zinc-600">{PARTNER_VALUE_POINTS.length + 1}.</span>
                <span>
                  Need another client slot? Additional client capacity costs{" "}
                  <span className="text-zinc-300">₹{PARTNER_ADDON_UNIT_PRICE_INR.toLocaleString("en-IN")} one-time</span> — it is not a monthly charge.
                </span>
              </li>
            </ol>
          </div>
        )}

        {/* RCCF-MKT-10 P3-B: one stable tabpanel — both tabs control it, and
            its accessible label always follows the selected tab. */}
        <div role="tabpanel" id="pricing-panel" aria-labelledby={`pricing-tab-${tab}`}>
        {plans.length === 0 ? (
          <div className="text-center py-16"><p className="text-zinc-500">No plans available. Please check back later.</p></div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const price = getDisplayPrice(plan, cycle);
                const savings = getAnnualSavings(plan);
                const trial = getTrialFraming(plan);
                return (
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
                      {plan.targetAudience && <p className="mt-0.5 text-xs font-medium text-indigo-400">{plan.targetAudience}</p>}
                      {plan.marketingDescription && <p className="mt-1 text-sm text-zinc-500">{plan.marketingDescription}</p>}
                    </div>

                    <div className="mt-5">
                      {trial ? (
                        <div>
                          <span className="text-2xl font-bold text-white">{trial.title}</span>
                          <p className="mt-1 text-xs text-zinc-500">{trial.subtitle}</p>
                        </div>
                      ) : price === null ? (
                        <span className="text-2xl font-bold text-white">Custom</span>
                      ) : price === 0 ? (
                        <span className="text-4xl font-bold text-white">Free</span>
                      ) : isOneTimePlan(plan.code) ? (
                        /* RCCF-MKT-08-R1 / RCCF-73: one-time plans render a
                           single-payment label — never /month or billed-yearly. */
                        <div>
                          <span className="text-4xl font-bold text-white">{formatCurrency(price)}</span>
                          <span className="ml-1.5 rounded-full bg-indigo-500/10 px-2 py-0.5 align-middle text-xs font-medium uppercase tracking-wide text-indigo-300">
                            One-time
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-4xl font-bold text-white">{formatCurrency(price)}</span>
                          <span className="text-zinc-500">/{cycle === "yearly" ? "mo billed yearly" : "month"}</span>
                          {savings && cycle === "yearly" && (
                            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                              Save {savings}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <ul className="mt-6 flex-1 space-y-3" role="list">
                      {(plan.highlights.length > 0 ? plan.highlights : ["Configure in the builder", "Publish to your storefront"]).map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm text-zinc-300">
                          <span className="mt-0.5 text-emerald-400 flex-shrink-0">✓</span>
                          {feat}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      {plan.ctaType === "contact" ? (
                        <Link href="/contact" className="btn-secondary w-full">{plan.ctaLabel ?? "Contact Sales"}</Link>
                      ) : plan.ctaType === "checkout" ? (
                        /* RCCF-MKT-08-R1: the persona follows the plan's family —
                           Partner plans route into the partner signup flow
                           (persona=partner) instead of the hardcoded creator one. */
                        <Link href={`/signup?plan=${plan.code}&persona=${isPartner ? "partner" : "creator"}`} className="btn-primary w-full">{plan.ctaLabel ?? "Get Started"}</Link>
                      ) : (
                        /* RCCF-MKT-08-R1: free-trial/default CTAs carry the same
                           family-consistent persona as checkout CTAs (§12). */
                        <Link href={`/signup?plan=${plan.code}&persona=${isPartner ? "partner" : "creator"}`} className={cn(
                          "flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all",
                          plan.recommended ? "btn-primary" : "bg-white/10 text-white hover:bg-white/20"
                        )}>
                          {plan.recommended && <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />}
                          {plan.ctaLabel ?? "Start Free Trial"}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Enterprise — separate from the standard comparison */}
            {enterprise && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-8 sm:flex-row">
                <div className="max-w-xl">
                  <h3 className="text-lg font-bold text-white">{enterprise.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{enterprise.marketingDescription || enterprise.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-white">Custom pricing</span>
                  <Link href="/contact" className="btn-secondary">{enterprise.ctaLabel ?? "Contact Sales"}</Link>
                </div>
              </div>
            )}

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {(isPartner ? TRUST_ITEMS_PARTNER : TRUST_ITEMS_CREATOR).map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        <ComparisonMatrix plans={tab === "creator" ? data.creator : data.partner} family={tab} />
        </div>
        <PricingFAQ />
      </div>
    </section>
  );
}
