"use client";

import Link from "next/link";
import { Layout, ExternalLink, Sparkles, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import type { HealthCheck } from "@/lib/platform/health/engine";

interface Props {
  creatorName: string;
  themeName: string;
  templateName: string;
  healthScore: number;
  healthChecks: HealthCheck[];
  topRecommendations: HealthCheck[];
  publishState: string;
  publishedVersion: number | null;
  storefrontUrl: string;
}

export function WebsiteReadyClient({
  creatorName, themeName, templateName, healthScore,
  healthChecks, publishState, storefrontUrl,
}: Props) {
  const isLive = publishState === "live";
  const doneCount = healthChecks.filter((c) => c.done).length;
  const totalCount = healthChecks.length;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-900/30">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Your Website is Ready!</h1>
        <p className="mt-2 text-zinc-400">
          Hi {creatorName}, your site has been generated and is ready to go.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Template</p>
          <p className="mt-1 text-lg font-semibold text-white">{templateName}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Theme</p>
          <p className="mt-1 text-lg font-semibold text-white">{themeName}</p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Website Health</p>
          <span className="text-2xl font-bold text-s8ul-cyan">{healthScore}%</span>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-s8ul-cyan to-emerald-400 transition-all"
            style={{ width: `${healthScore}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500">{doneCount} of {totalCount} checks complete</p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Link
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 hover:border-white/30 hover:text-white transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          View Website
        </Link>
        <Link
          href="/builder"
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 hover:border-white/30 hover:text-white transition-colors"
        >
          <Layout className="h-4 w-4" />
          Open Builder
        </Link>
        <Link
          href={isLive ? storefrontUrl : "/admin/dashboard"}
          className="flex items-center justify-center gap-2 rounded-lg bg-s8ul-cyan px-4 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
        >
          {isLive ? (
            <>
              <ExternalLink className="h-4 w-4" />
              Visit Live Site
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Publish Website
            </>
          )}
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Improvement Suggestions</p>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
        </div>
        <div className="space-y-1">
          {healthChecks.filter((c) => !c.done).slice(0, 5).map((check) => (
            <Link
              key={check.id}
              href={check.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5 transition-colors"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="flex-1 text-zinc-300">{check.label}</span>
              <span className="text-xs text-zinc-500">{check.description}</span>
            </Link>
          ))}
          {healthChecks.filter((c) => !c.done).length === 0 && (
            <p className="py-4 text-center text-sm text-emerald-400">
              Everything looks great! Your website is fully set up.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/admin/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          Go to Dashboard &rarr;
        </Link>
      </div>
    </div>
  );
}
