"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, RotateCcw, ExternalLink, Loader2 } from "lucide-react";
import { publishWebsite, rollbackWebsite, validateBeforePublish } from "@/actions/publish.actions";
import type { PublishStatus } from "@/lib/publishing/service";

interface PublishPanelProps {
  className?: string;
}

export function PublishPanel({ className }: PublishPanelProps) {
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [rollbacking, setRollbacking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    import("@/actions/publish.actions").then((mod) =>
      mod.getPublishStatus().then((r) => {
        if (r.success && r.status) setStatus(r.status);
      })
    );
  }, []);

  useEffect(() => {
    validateBeforePublish().then((r) => {
      if (r.issues) setIssues(r.issues);
    });
  }, [status]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setError(null);
    try {
      const result = await publishWebsite();
      if (result.success && result.status) {
        setStatus(result.status);
      } else {
        setError(result.error ?? "Publish failed");
      }
    } catch {
      setError("Publish failed");
    } finally {
      setPublishing(false);
    }
  }, []);

  const handleRollback = useCallback(async () => {
    setRollbacking(true);
    setError(null);
    try {
      const result = await rollbackWebsite();
      if (result.success) {
        setStatus((prev) => prev ? { ...prev, state: "draft" } : null);
      } else {
        setError(result.error ?? "Rollback failed");
      }
    } catch {
      setError("Rollback failed");
    } finally {
      setRollbacking(false);
    }
  }, []);

  const isPublished = status?.state === "published";

  return (
    <div className={cn("p-4 space-y-4", className)}>
      {!isPublished && (
        <div className="text-center space-y-4">
          <div className="rounded-full bg-amber-500/20 p-3 w-fit mx-auto">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Ready to publish?</p>
            <p className="text-xs text-zinc-500 mt-1">
              {status?.state === "draft" ? "Your website is in draft mode." : "Preview your changes before going live."}
            </p>
          </div>
          {issues.length > 0 && (
            <div className="admin-card p-3 text-left space-y-1">
              <p className="text-xs font-medium text-amber-400">Issues to fix:</p>
              {issues.map((issue) => (
                <p key={issue} className="text-xs text-zinc-400">• {issue}</p>
              ))}
            </div>
          )}
          <button onClick={handlePublish} disabled={publishing} className="admin-btn-cyan w-full flex items-center justify-center gap-2">
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            {publishing ? "Publishing..." : "Publish Website"}
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {isPublished && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="rounded-full bg-green-500/20 p-3 w-fit mx-auto">
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            </div>
            <p className="text-white font-semibold">Published!</p>
            <p className="text-xs text-zinc-500">Your website is live.</p>
          </div>

          <div className="admin-card p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Status</span>
              <span className="text-green-400 font-medium">Live</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Version</span>
              <span className="text-zinc-300 font-mono">v{status.version}</span>
            </div>
            {status.storefrontUrl && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Storefront</span>
                <a href={status.storefrontUrl} className="text-s8ul-cyan hover:underline flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {status.previewUrl && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Preview</span>
                <a href={status.previewUrl} className="text-s8ul-cyan hover:underline flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                  Preview <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <button onClick={handleRollback} disabled={rollbacking} className="admin-btn-outline w-full flex items-center justify-center gap-2 text-sm">
            {rollbacking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <RotateCcw className="h-3.5 w-3.5" /> Rollback
          </button>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
      )}
    </div>
  );
}
