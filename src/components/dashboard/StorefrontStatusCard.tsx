"use client";

import { useEffect, useState } from "react";

/** IMPLEMENTATION-44: deterministic date (no locale-dependent hydration mismatch). */
const fmtDateTime = (v: string | Date) => new Date(v).toISOString().replace("T", " ").slice(0, 16);
const fmtDate = (v: string | Date | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ExternalLink, Layout, Globe, CheckCircle2, Clock, AlertTriangle, Rocket, Loader2, History, ArrowUpRight } from "lucide-react";
import { PublishStatusBadge, type PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { publishWebsite, rollbackWebsite, getCreatorPublishUsage } from "@/actions/publish.actions";
import type { PublishUsage } from "@/lib/publishing/publish-usage";
import { getPublishFailurePresentation, type PublishFailureAction } from "@/lib/publishing/publish-error-messages";

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
  currentTheme?: string | null;
  className?: string;
}

export function StorefrontStatusCard({
  storefrontUrl,
  publishState,
  publishedVersion,
  publishedAt,
  recentVersions,
  hasProducts,
  currentTheme,
  className,
}: StorefrontStatusCardProps) {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [upgradeAction, setUpgradeAction] = useState<PublishFailureAction | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [usage, setUsage] = useState<PublishUsage | null>(null);
  const router = useRouter();

  // RCCF-32: authoritative publish-usage display (server-derived; refreshed on
  // the full reload after a successful publish).
  useEffect(() => {
    getCreatorPublishUsage()
      .then((res) => { if (res.success && res.usage) setUsage(res.usage); })
      .catch(() => { /* non-fatal — the publish flow still works */ });
  }, []);

  const hasLiveVersion = !!publishedVersion && publishedVersion > 0;
  const isLive = publishState === "live" && hasLiveVersion;
  const hasUnpublishedChanges = !isLive && hasLiveVersion;
  const neverPublished = !publishState || (!hasLiveVersion && publishState !== "preview");
  const status: PublishStatusValue = isLive ? "published" : hasUnpublishedChanges ? "outdated" : publishState === "preview" ? "preview" : "draft";

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    setUpgradeAction(null);
    try {
      const res = await publishWebsite();
      if (res.success) {
        window.location.reload();
      } else {
        const presentation = getPublishFailurePresentation(res);
        setPublishError(presentation.message);
        setUpgradeAction(presentation.action ?? null);
      }
    } catch {
      setPublishError("Publishing failed");
      setUpgradeAction(null);
    }
    setPublishing(false);
  };

  const handleRestoreVersion = async (version: number) => {
    if (!window.confirm(`Restore draft to v${version}? The live site stays unchanged until you publish.`)) return;
    setRestoringVersion(version);
    setPublishError(null);
    setUpgradeAction(null);
    try {
      const res = await rollbackWebsite(version);
      if (!res.success) {
        setPublishError(res.error || "Restore failed");
      } else {
        router.refresh();
      }
    } catch {
      setPublishError("Restore failed");
    }
    setRestoringVersion(null);
  };

  // Preview opens the Builder Runtime full-page: the storefront renders the
  // CURRENT DRAFT layout + live CMS content through the same LayoutEngine and
  // registry renderers as the builder canvas and the published site. No preview
  // snapshot is created — there is exactly one runtime.
  const handlePreview = () => {
    window.open(`${storefrontUrl}?preview=true`, "_blank", "noopener,noreferrer");
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

        {usage?.trialExpired && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">
              Your Launch trial has ended. Your website remains live, but publishing new changes requires an active subscription.
              <Link href="/billing" className="ml-1 underline text-red-200 hover:text-red-100">Upgrade to Growth</Link> to continue publishing.
            </p>
          </div>
        )}

        {publishedVersion && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Last published</span>
            <span className="text-zinc-300 font-mono">v{publishedVersion}</span>
          </div>
        )}

        {currentTheme && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Current theme</span>
            <span className="text-zinc-400 text-xs">{currentTheme}</span>
          </div>
        )}

        {publishedAt && isLive && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Published at</span>
            <span className="text-zinc-400 text-xs">{fmtDateTime(publishedAt)}</span>
          </div>
        )}

        {usage && usage.mode === "unlimited" && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Publish allowance</span>
            <span className="text-zinc-300 text-xs">Unlimited</span>
          </div>
        )}

        {usage && usage.mode !== "unlimited" && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Publish allowance</span>
            <span className="text-zinc-300 text-xs">
              {usage.used} of {usage.limit} used
              {usage.mode === "monthly"
                ? ` · resets ${fmtDate(usage.periodEnd)}`
                : usage.mode === "lifetime"
                  ? " · lifetime"
                  : ""}
              {usage.isExhausted ? " · exhausted" : ` · ${usage.remaining} remaining`}
            </span>
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
        {upgradeAction && (
          <Link
            href={upgradeAction.href}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-s8ul-cyan px-3 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
          >
            <ArrowUpRight className="h-4 w-4" />
            {upgradeAction.label}
          </Link>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
        {(neverPublished || hasUnpublishedChanges) && hasProducts && !usage?.trialExpired && (
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
        {hasLiveVersion && (
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
        )}
        <Link
          href="/builder"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
        >
          <Layout className="h-4 w-4" />
          <span className="flex-1">Open builder</span>
          <span className="text-[10px] text-zinc-600">{isLive ? "edit" : "design"}</span>
        </Link>
        {(hasLiveVersion || publishState === "preview") && (
          <button
            onClick={handlePreview}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span className="flex-1">Preview Draft</span>
            <span className="text-[10px] text-zinc-600">new tab</span>
          </button>
        )}
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
                  <div key={v.version} className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                    <span className="text-zinc-300 font-mono">v{v.version}</span>
                    <span className="flex-1 text-right text-zinc-500">{fmtDateTime(v.createdAt)}</span>
                    <button
                      onClick={() => handleRestoreVersion(v.version)}
                      disabled={restoringVersion === v.version}
                      className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-zinc-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {restoringVersion === v.version ? "Restoring..." : "Restore"}
                    </button>
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
