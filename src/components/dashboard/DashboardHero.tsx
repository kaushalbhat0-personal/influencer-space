import { cn } from "@/lib/utils";
import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";

interface DashboardHeroProps {
  creatorName: string;
  websitePublished: boolean;
  productCount: number;
  hasCustomDomain: boolean;
  planName: string;
  storefrontUrl?: string;
}

export function DashboardHero({
  creatorName, websitePublished, productCount, hasCustomDomain, planName, storefrontUrl,
}: DashboardHeroProps) {
  const cta = !websitePublished
    ? { label: "Publish Website", href: "/builder", primary: true }
    : productCount === 0
    ? { label: "Add First Product", href: "/admin/products", primary: true }
    : !hasCustomDomain
    ? { label: "Connect Domain", href: "/admin/settings/domain", primary: false }
    : { label: "View Website", href: storefrontUrl ?? "#", primary: false, external: true };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-indigo-500/[0.04] to-transparent p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Welcome back</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">{creatorName}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
              websitePublished ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", websitePublished ? "bg-emerald-400" : "bg-amber-400")} />
              {websitePublished ? "Published" : "Draft"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 text-indigo-400 px-2.5 py-0.5 text-xs font-medium">
              {planName}
            </span>
          </div>
        </div>
        <Link
          href={cta.href}
          target={cta.external ? "_blank" : undefined}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all flex-shrink-0",
            cta.primary
              ? "btn-primary"
              : "btn-secondary"
          )}
        >
          {cta.primary && <Sparkles className="h-4 w-4" />}
          {cta.label}
          {cta.external && <ExternalLink className="h-3.5 w-3.5" />}
        </Link>
      </div>
    </div>
  );
}
