"use client";

import { Fragment } from "react";
import { getFeatureInfo, getFeatureGroups } from "@/lib/capabilities";
import type { ResolvedPlan } from "@/modules/pricing/application/runtime";
import { Check, Minus } from "lucide-react";

interface ComparisonProps {
  plans: ResolvedPlan[];
}

function featureValue(features: Record<string, number | boolean | string> | undefined, key: string, valueType: string): number | boolean | string {
  const v = features?.[key];
  if (v === undefined) return valueType === "boolean" ? false : 0;
  return v;
}

/**
 * RCCF-IMPLEMENTATION-71: comparison matrix grouped by the canonical capability
 * groups, driven by the RUNTIME plans (BillingPlan + registry fallback). Values
 * come from each plan's effective feature map — Available / Limited / Unlimited
 * are derived, nothing is hand-maintained.
 */
export function ComparisonMatrix({ plans }: ComparisonProps) {
  if (plans.length === 0) return null;

  const groups = getFeatureGroups();

  return (
    <div className="mt-20" data-testid="comparison-matrix">
      <h3 className="text-center text-lg font-semibold text-white mb-2">Compare plans</h3>
      <p className="mb-6 text-center text-sm text-zinc-500">See exactly what&apos;s included at each tier.</p>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
        <table className="w-full text-sm" role="table" aria-label="Plan comparison">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="sticky left-0 z-10 bg-[#0a0a0a] py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider min-w-56">
                Feature
              </th>
              {plans.map((p) => (
                <th key={p.code} className="py-3 px-4 text-center text-xs font-medium text-zinc-400 min-w-28">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.group}>
                <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                  <td colSpan={plans.length + 1} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                    {group.label}
                  </td>
                </tr>
                {group.features.map((f) => {
                  const info = getFeatureInfo(f.id);
                  return (
                    <tr key={f.id} className="border-b border-white/[0.03]">
                      <td className="sticky left-0 z-10 bg-[#0a0a0a] py-2.5 px-4 text-zinc-400">{info.label}</td>
                      {plans.map((p) => {
                        const val = featureValue(p.features, f.id, info.valueType);
                        return (
                          <td key={p.code} className="py-2.5 px-4 text-center">
                            {info.valueType === "boolean" ? (
                              val ? (
                                <Check className="h-4 w-4 text-emerald-400 mx-auto" aria-label="Included" />
                              ) : (
                                <Minus className="h-4 w-4 text-zinc-700 mx-auto" aria-label="Not included" />
                              )
                            ) : val === -1 ? (
                              <span className="text-emerald-400 font-medium">Unlimited</span>
                            ) : val === 0 ? (
                              <Minus className="h-4 w-4 text-zinc-700 mx-auto" aria-label="Not available" />
                            ) : (
                              <span className="text-zinc-300">{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
