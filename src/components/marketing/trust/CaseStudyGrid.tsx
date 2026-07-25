import Link from "next/link";
import { ArrowUpRight, Clock, Package, TrendingUp, Percent } from "lucide-react";
import type { TrustCaseStudy } from "@/lib/marketing/trust/types";

interface CaseStudyGridProps {
  readonly caseStudies: readonly TrustCaseStudy[];
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
      <span className="flex-shrink-0 text-indigo-400">{icon}</span>
      <div>
        <p className="text-[11px] text-zinc-500">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

export function CaseStudyGrid({ caseStudies }: CaseStudyGridProps) {
  if (caseStudies.length === 0) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {caseStudies.map((cs) => (
        <div
          key={cs.id}
          className="flex flex-col rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6 transition-all hover:border-white/[0.12]"
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
              {cs.creatorName.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {cs.title}
              </h3>
              <p className="text-sm text-zinc-500">
                {cs.creatorName} · {cs.creatorPlatform}
              </p>
            </div>
          </div>

          {/* Before/After */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-red-500/[0.04] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                Before
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {cs.before}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/[0.04] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                After
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {cs.after}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatBox
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Time Saved"
              value={cs.timeSaved}
            />
            <StatBox
              icon={<Package className="h-3.5 w-3.5" />}
              label="Products Launched"
              value={String(cs.productsLaunched)}
            />
            <StatBox
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Traffic Increase"
              value={cs.trafficIncrease}
            />
            <StatBox
              icon={<Percent className="h-3.5 w-3.5" />}
              label="Conversion Improvement"
              value={cs.conversionImprovement}
            />
          </div>

          {/* Revenue */}
          {cs.revenueIncrease && (
            <div className="mt-3 rounded-lg bg-indigo-500/[0.04] p-3 text-center">
              <p className="text-[11px] text-zinc-500">Revenue Increase</p>
              <p className="text-lg font-bold text-indigo-400">
                {cs.revenueIncrease}
              </p>
            </div>
          )}

          {/* Quote */}
          <blockquote className="mt-4 border-l-2 border-indigo-500/30 pl-4 text-sm italic leading-relaxed text-zinc-400">
            &ldquo;{cs.quote}&rdquo;
          </blockquote>

          {/* CTA */}
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
            <Link
              href={cs.ctaHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              {cs.cta}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
