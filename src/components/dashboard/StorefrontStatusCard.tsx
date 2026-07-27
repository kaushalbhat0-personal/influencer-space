"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExternalLink, Layout, Globe, CheckCircle2, Clock, AlertTriangle, Rocket, Loader2, History } from "lucide-react";
import { PublishStatusBadge, type PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { publishWebsite } from "@/actions/publish.actions";

interface VersionEntry {
  version: number;
  createdAt: string;
}

interface StorefrontStatusCardProps {
  storefrontUrl: string;
  publishState: string | null;
  publishedVersion: number | null;
  publishedAt: string | null;
  recentVersions: VersionEntry[];
  hasProducts: boolean;
  className?: string;
}

export function StorefrontStatusCard({
  storefrontUrl,
  publishState,
  publishedVersion,
  publishedAt,
  recentVersions,
  hasProducts,
  className,
}: StorefrontStatusCardProps) {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);

  const hasLiveVersion = !!publishedVersion && publishedVersion > 0;
  const isLive = publishState === "live" && hasLiveVersion;
  const hasUnpublishedChanges = !isLive && hasLiveVersion;
  const neverPublished = !publishState || (!hasLiveVersion && publishState !== "preview");
  const status: PublishStatusValue = isLive ? "published" : hasUnpublishedChanges ? "outdated" : publishState === "preview" ? "preview" : "draft";

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await publishWebsite();
      if (res.success) {
        window.location.reload();
      } else {
        setPublishError(res.error || "Publishing failed");
      }
    } catch {
      setPublishError("Publishing failed");
    }
    setPublishing(false);
  };

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
            isLive ? "text-emerald-400" : hasUnpublishedChanges ? "text-amber-400" : publishState === "preview" ? "text-blue-400" : "text-amber-400",
          )}>
            {isLive ? "Live" : hasUnpublishedChanges ? "Changes pending" : publishState === "preview" ? "Preview" : "Draft"}
          </span>
        </div>

        {publishedVersion && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Last published</span>
            <span className="text-zinc-300 font-mono">v{publishedVersion}</span>
          </div>
        )}

        {publishedAt && isLive && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Published at</span>
            <span className="text-zinc-400 text-xs">{new Date(publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}

        {status === "draft" && !hasProducts && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">Add products before publishing</p>
          </div>
        )}

        {neverPublished && hasProducts && (
          <div className="flex items-start gap-2 rounded-lg bg-indigo-500/10 p-2.5">
            <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-300">Ready to publish — go live in one click</p>
          </div>
        )}

        {hasUnpublishedChanges && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">You have unpublished changes. Publish to update your storefront.</p>
          </div>
        )}

        {isLive && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300">Your storefront is live</p>
          </div>
        )}

        {publishError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{publishError}</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
        {(neverPublished || hasUnpublishedChanges) && hasProducts && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 mb-2"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {publishing ? "Publishing..." : (hasUnpublishedChanges ? "Publish Changes" : "Publish Now")}
          </button>
        )}
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
        <Link
          href={`${storefrontUrl}?preview=true`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
        >
          <Globe className="h-4 w-4" />
          <span className="flex-1">Preview Draft</span>
          <span className="text-[10px] text-zinc-600">new tab</span>
        </Link>
        {recentVersions.length > 0 && (
          <>
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
            >
              <History className="h-4 w-4" />
              <span className="flex-1">Version History</span>
              <span className="text-[10px] text-zinc-600">{showVersions ? "hide" : `${recentVersions.length} versions`}</span>
            </button>
            {showVersions && (
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 space-y-1">
                {recentVersions.map((v) => (
                  <div key={v.version} className="flex items-center justify-between px-2 py-1.5 text-xs">
                    <span className="text-zinc-300 font-mono">v{v.version}</span>
                    <span className="text-zinc-500">{new Date(v.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
