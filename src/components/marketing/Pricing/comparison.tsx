"use client";

import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/billing/plan-catalog";
import { entitlement } from "@/lib/billing/entitlements";
import { FEATURES } from "@/lib/billing/plan-catalog";
import type { PlanFamily } from "@/lib/billing/types";
import { Check, Minus } from "lucide-react";

interface ComparisonProps {
  family: PlanFamily;
}

export function ComparisonMatrix({ family }: ComparisonProps) {
  const plans = PLANS.filter((p) => p.family === family);
  if (plans.length === 0) return null;

  const features = FEATURES.filter((f) => f.valueType !== "string");

  return (
    <div className="mt-20">
      <h3 className="text-center text-lg font-semibold text-white mb-6">Compare plans</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-48">
                Feature
              </th>
              {plans.map((p) => (
                <th key={p.code} className="py-3 px-4 text-center text-xs font-medium text-zinc-400">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={f.key} className={cn("border-b border-white/[0.03]", i % 2 === 0 && "bg-white/[0.01]")}>
                <td className="py-2.5 px-4 text-zinc-400">{f.description}</td>
                {plans.map((p) => {
                  const val = entitlement.limit(p.code, f.key);
                  const bool = entitlement.has(p.code, f.key);
                  return (
                    <td key={p.code} className="py-2.5 px-4 text-center">
                      {f.valueType === "boolean" ? (
                        bool ? (
                          <Check className="h-4 w-4 text-emerald-400 mx-auto" aria-label="Included" />
                        ) : (
                          <Minus className="h-4 w-4 text-zinc-700 mx-auto" aria-label="Not included" />
                        )
                      ) : val === -1 ? (
                        <span className="text-emerald-400 font-medium">Unlimited</span>
                      ) : (
                        <span className="text-zinc-300">{val}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
