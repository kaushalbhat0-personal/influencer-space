"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExternalLink, Layout, Globe, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PublishStatusBadge, type PublishStatusValue } from "@/components/publish/PublishStatusBadge";

interface StorefrontStatusCardProps {
  storefrontUrl: string;
  publishState: string | null;
  publishedVersion: number | null;
  hasProducts: boolean;
  className?: string;
}

export function StorefrontStatusCard({
  storefrontUrl,
  publishState,
  publishedVersion,
  hasProducts,
  className,
}: StorefrontStatusCardProps) {
  const status: PublishStatusValue = publishState === "live" ? "published" : publishState === "preview" ? "preview" : "draft";
  const isLive = publishState === "live";

  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/[0.03] p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Storefront</h3>
        <PublishStatusBadge status={status} size="sm" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Status</span>
          <span className={cn(
            "font-medium",
            isLive ? "text-emerald-400" : publishState === "preview" ? "text-blue-400" : "text-amber-400",
          )}>
            {isLive ? "Live" : publishState === "preview" ? "Preview" : "Draft"}
          </span>
        </div>

        {publishedVersion && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Version</span>
            <span className="text-zinc-300 font-mono">v{publishedVersion}</span>
          </div>
        )}

        {status === "draft" && !hasProducts && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">Add products before publishing</p>
          </div>
        )}

        {status === "draft" && hasProducts && (
          <div className="flex items-start gap-2 rounded-lg bg-indigo-500/10 p-2.5">
            <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-300">Ready to publish — go live in one click</p>
          </div>
        )}

        {isLive && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300">Your storefront is live</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
        <Link
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="flex-1">Visit website</span>
          <span className="text-[10px] text-zinc-600">new tab</span>
        </Link>
        <Link
          href="/builder"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
        >
          <Layout className="h-4 w-4" />
          <span className="flex-1">Open builder</span>
          <span className="text-[10px] text-zinc-600">{isLive ? "edit" : "design"}</span>
        </Link>
        {status !== "published" && (
          <Link
            href="/admin/preview"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span className="flex-1">Preview</span>
          </Link>
        )}
      </div>
    </div>
  );
}
