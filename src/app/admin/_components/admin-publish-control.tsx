"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Rocket, Loader2, AlertCircle, ArrowUpRight } from "lucide-react";
import { PublishStatusBadge, type PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { publishWebsite, getPublishStatus } from "@/actions/publish.actions";
import { getPublishFailurePresentation, type PublishFailurePresentation } from "@/lib/publishing/publish-error-messages";
import { cn } from "@/lib/utils";

/**
 * RCCF-70.6.5.1/70.6.5.3 — unified admin topbar publish control.
 *
 * Renders the canonical PublishStatusBadge plus a single Publish button wired to
 * the SAME server action the Builder/Dashboard use (publishWebsite). No second
 * publish system, no new server action, no new dirty state, no client quota
 * counting. Failures are translated through the shared presentation helper
 * (RCCF-70.6.5.3) so quota, trial-expiry, known product and technical failures
 * all surface consistent creator-facing copy with a next step when the server
 * result provides one. When the site is live the button is hidden; after a
 * successful publish the server layout is refreshed so the fresh persisted
 * status drives the re-render.
 */

interface AdminPublishControlProps {
  status: PublishStatusValue;
  size?: "sm" | "md";
}

export function AdminPublishControl({ status, size = "md" }: AdminPublishControlProps) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [publishing, setPublishing] = useState(false);
  const [presentation, setPresentation] = useState<PublishFailurePresentation | null>(null);

  const handlePublish = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setPublishing(true);
    setPresentation(null);
    try {
      const res = await publishWebsite();
      if (res.success) {
        await getPublishStatus();
        router.refresh();
        return;
      }
      setPresentation(getPublishFailurePresentation(res));
    } catch (e) {
      setPresentation(getPublishFailurePresentation({ success: false, error: e instanceof Error ? e.message : undefined }));
    }
    busyRef.current = false;
    setPublishing(false);
  };

  const isLive = status === "published";
  const upgradeAction = !isLive ? presentation?.action : undefined;

  return (
    <div className="flex items-center gap-2">
      <PublishStatusBadge status={status} size={size} showLabel={size === "md"} />
      {!isLive && !presentation?.action && (
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing}
          aria-label={size === "sm" ? (publishing ? "Publishing website" : "Publish website") : undefined}
          title={size === "sm" ? (publishing ? "Publishing..." : "Publish") : undefined}
          className={cn(
            "flex items-center justify-center rounded-lg transition-colors",
            size === "md"
              ? "gap-1.5 bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60"
              : "p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-60",
          )}
        >
          {publishing ? (
            <Loader2 className={cn("animate-spin", size === "md" ? "h-3.5 w-3.5" : "h-5 w-5")} aria-hidden="true" />
          ) : (
            <Rocket className={cn(size === "md" ? "h-3.5 w-3.5" : "h-5 w-5")} aria-hidden="true" />
          )}
          {size === "md" && <span>{publishing ? "Publishing..." : "Publish"}</span>}
        </button>
      )}
      {upgradeAction && (
        <Link
          href={upgradeAction.href}
          aria-label={size === "sm" ? upgradeAction.label : undefined}
          title={size === "sm" ? upgradeAction.label : undefined}
          className={cn(
            "flex items-center justify-center rounded-lg transition-colors",
            size === "md"
              ? "gap-1.5 bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
              : "p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white",
          )}
        >
          <ArrowUpRight className={cn(size === "md" ? "h-3.5 w-3.5" : "h-5 w-5")} aria-hidden="true" />
          {size === "md" && <span>{upgradeAction.label}</span>}
        </Link>
      )}
      {presentation && (
        <span
          role="alert"
          title={presentation.message}
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            presentation.severity === "warning" ? "text-amber-400" : "text-red-400",
            size === "md" ? "max-w-56" : "max-w-8",
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className={cn("truncate", size === "md" ? "hidden sm:inline-block" : "sr-only")}>{presentation.message}</span>
        </span>
      )}
    </div>
  );
}