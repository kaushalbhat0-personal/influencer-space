"use client";

import { useMemo, useState } from "react";
import type { BusinessProfile } from "@/lib/acquisition/business-types";
import type { BusinessRecommendation } from "../domain/types";
import { generateRecommendations } from "../application/recommendation-engine";
import { Lightbulb, CheckCircle2, ArrowRight, Star, AlertTriangle, TrendingUp, FileText, Palette, Layout, Link2, ShoppingBag, Search, Zap } from "lucide-react";

export function RecommendationsPanel({
  profile,
  onApplyTheme,
  onApplyPages,
  onApplyOffers,
  onApplySeo,
}: {
  profile: BusinessProfile;
  onApplyTheme?: (family: string) => void;
  onApplyPages?: (pages: BusinessRecommendation["pages"]) => void;
  onApplyOffers?: (offers: BusinessRecommendation["offers"]) => void;
  onApplySeo?: (seo: { title: string; description: string }) => void;
}) {
  const recommendations = useMemo(() => generateRecommendations(profile), [profile]);
  const [acceptedTheme, setAcceptedTheme] = useState(false);
  const [acceptedOffers, setAcceptedOffers] = useState<Set<number>>(new Set());
  const [acceptedSeo, setAcceptedSeo] = useState(false);

  const health = recommendations.health;
  const healthColor = health.overall >= 80 ? "text-emerald-400" : health.overall >= 50 ? "text-amber-400" : "text-red-400";
  const healthBarColor = health.overall >= 80 ? "bg-emerald-500" : health.overall >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* Business Health Score */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Storefront Health</h3>
          </div>
          <span className={`text-lg font-bold ${healthColor}`}>{health.overall}%</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 mb-4">
          <div className={`h-full rounded-full ${healthBarColor} transition-all`} style={{ width: `${health.overall}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <HealthStat label="Brand" value={health.brandCompleteness} />
          <HealthStat label="Offers" value={health.offerCompleteness} />
          <HealthStat label="SEO" value={health.seoReadiness} />
          <HealthStat label="Visual" value={Math.round((profile.logoUrl ? 50 : 25) + (profile.palette.primary !== "#6366f1" ? 25 : 0))} />
          <HealthStat label="Conversion" value={health.conversionScore} />
          <HealthStat label="Quality" value={health.storefrontQuality} />
        </div>
        {health.criticalWarnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {health.criticalWarnings.map((w, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-red-400"><AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />{w}</p>
            ))}
          </div>
        )}
        {health.suggestions.length > 0 && (
          <div className="mt-2 space-y-1">
            {health.suggestions.slice(0, 3).map((s, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-zinc-500"><Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-400" />{s}</p>
            ))}
          </div>
        )}
      </div>

      {/* Theme Recommendation */}
      <RecommendationCard
        icon={Palette}
        title="Recommended Theme"
        description={recommendations.theme.reason}
        actionLabel={acceptedTheme ? "Applied" : "Apply Theme"}
        accepted={acceptedTheme}
        onAccept={() => { setAcceptedTheme(true); onApplyTheme?.(recommendations.theme.family); }}
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">
          <Star className="h-3 w-3" />{recommendations.theme.family}
        </span>
        <span className="text-xs text-zinc-500">{recommendations.theme.confidence}% confidence</span>
      </RecommendationCard>

      {/* Suggested Pages */}
      {recommendations.pages.length > 0 && (
        <RecommendationCard
          icon={Layout}
          title="Suggested Pages"
          description={`${recommendations.pages.length} page(s) recommended for your business type.`}
        >
          <div className="flex flex-wrap gap-2">
            {recommendations.pages.map((p, i) => (
              <span key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-zinc-300">{p.name}</span>
            ))}
          </div>
        </RecommendationCard>
      )}

      {/* Recommended Offers */}
      {recommendations.offers.length > 0 && (
        <RecommendationCard
          icon={ShoppingBag}
          title="Recommended Offers"
          description="Add these offer types to diversify your storefront."
        >
          <div className="space-y-2">
            {recommendations.offers.map((o, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{o.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{o.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-zinc-500">{o.priceHint}</span>
                  <button
                    onClick={() => {
                      const next = new Set(acceptedOffers);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      setAcceptedOffers(next);
                      if (!next.has(i)) return;
                      onApplyOffers?.([o]);
                    }}
                    className={`text-xs px-2 py-1 rounded ${acceptedOffers.has(i) ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-zinc-400 hover:text-white"}`}
                  >
                    {acceptedOffers.has(i) ? "Added" : "Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </RecommendationCard>
      )}

      {/* SEO Recommendation */}
      <RecommendationCard
        icon={Search}
        title="SEO Suggestion"
        description={recommendations.seo.reason}
        actionLabel={acceptedSeo ? "Applied" : "Apply SEO"}
        accepted={acceptedSeo}
        onAccept={() => { setAcceptedSeo(true); onApplySeo?.({ title: recommendations.seo.title, description: recommendations.seo.description }); }}
      >
        <div className="space-y-1 text-xs">
          <p className="text-zinc-400">Title: <span className="text-zinc-300">{recommendations.seo.title}</span></p>
          <p className="text-zinc-400">Description: <span className="text-zinc-300">{recommendations.seo.description}</span></p>
        </div>
      </RecommendationCard>
    </div>
  );
}

function HealthStat({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "text-emerald-400" : value >= 50 ? "text-amber-400" : "text-red-400";
  return (
    <div>
      <p className="text-zinc-500">{label}</p>
      <p className={`font-semibold ${color}`}>{value}%</p>
    </div>
  );
}

function RecommendationCard({
  icon: Icon, title, description, children, actionLabel, accepted, onAccept,
}: {
  icon: typeof Lightbulb; title: string; description: string; children?: React.ReactNode;
  actionLabel?: string; accepted?: boolean; onAccept?: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
            <Icon className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-white">{title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          </div>
        </div>
        {actionLabel && onAccept && (
          <button
            onClick={onAccept}
            disabled={accepted}
            className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              accepted ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
            }`}
          >
            {accepted ? <CheckCircle2 className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
