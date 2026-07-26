"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, ExternalLink, Layout, BarChart3, Timer, Users, Activity, AlertTriangle, Zap, Shield, Database, RefreshCw } from "lucide-react";
import { scoreToLabel, scoreToColor } from "@/lib/beta/scoring";
import type { BetaDashboardEntry } from "@/lib/beta/types";
import type { ReadinessScore } from "@/lib/observability/production-score";

interface BetaDashboardClientProps {
  initialData: {
    entries: BetaDashboardEntry[];
    stats: {
      total: number;
      completed: number;
      failed: number;
      running: number;
      averageHealthScore: number;
      averageDurationMs: number;
    };
  };
  performanceData: {
    performance: {
      averageGenerationDurationMs: number;
      averagePublishingDurationMs: number;
      averageTotalOnboardingMs: number;
      generationCount: number;
      publishCount: number;
      failedGenerationCount: number;
      failedPublishCount: number;
      generationSuccessRate: number;
      publishSuccessRate: number;
      storefrontResponseMs: number | null;
    };
    reliability: {
      retryCount: number;
      failedRetries: number;
      uniqueErrorCategories: Record<string, number>;
      dbLatencyMs: number;
      eventBusSize: number;
    };
    health: { status: string; uptime: number };
  };
  readinessScore: ReadinessScore;
}

function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "failed" || status === "cancelled" || status === "timed_out") return <XCircle className="h-4 w-4 text-red-400" />;
  return <Clock className="h-4 w-4 text-amber-400" />;
}

function StatusLabel({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    completed: { label: "Completed", color: "text-emerald-400" },
    failed: { label: "Failed", color: "text-red-400" },
    running: { label: "Running", color: "text-amber-400" },
    queued: { label: "Queued", color: "text-zinc-400" },
    cancelled: { label: "Cancelled", color: "text-zinc-500" },
    timed_out: { label: "Timed Out", color: "text-orange-400" },
    publishing: { label: "Publishing", color: "text-indigo-400" },
  };
  const config = map[status] ?? { label: status, color: "text-zinc-400" };
  return <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>;
}

export function BetaDashboardClient({ initialData, performanceData, readinessScore }: BetaDashboardClientProps) {
  const [data] = useState(initialData);
  const { entries, stats } = data;
  const perf = performanceData.performance;
  const rel = performanceData.reliability;
  const score = readinessScore;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Total Runs" value={stats.total} color="text-zinc-300" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="text-emerald-400" />
        <StatCard icon={XCircle} label="Failed" value={stats.failed} color="text-red-400" />
        <StatCard icon={Activity} label="Running" value={stats.running} color="text-amber-400" />
        <StatCard icon={BarChart3} label="Avg Health" value={`${stats.averageHealthScore}%`} color={scoreToColor(stats.averageHealthScore)} />
        <StatCard icon={Timer} label="Avg Duration" value={formatDuration(stats.averageDurationMs)} color="text-indigo-400" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <Th>Creator</Th>
              <Th>Stage</Th>
              <Th>Snapshot</Th>
              <Th>Version</Th>
              <Th>Duration</Th>
              <Th>Health</Th>
              <Th>Status</Th>
              <Th>Links</Th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No onboarding runs found. Complete a creator onboarding to see results here.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <Td>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={entry.status} />
                      <span className="font-medium text-white">{entry.creatorName}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-zinc-300 capitalize">{entry.currentStage.replace(/_/g, " ")}</span>
                  </Td>
                  <Td>
                    {entry.hasSnapshot ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-zinc-600" />
                    )}
                  </Td>
                  <Td>
                    {entry.publishVersion ? (
                      <span className="font-mono text-xs text-zinc-300">v{entry.publishVersion}</span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-zinc-400">{formatDuration(entry.durationMs)}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            entry.healthScore >= 75 ? "bg-emerald-500" : entry.healthScore >= 50 ? "bg-amber-500" : "bg-red-500",
                          )}
                          style={{ width: `${entry.healthScore}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-medium", scoreToColor(entry.healthScore))}>
                        {entry.healthScore}%
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <StatusLabel status={entry.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      {entry.storefrontUrl && (
                        <Link
                          href={entry.storefrontUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                          title="View storefront"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      {entry.tenantId && (
                        <Link
                          href="/builder"
                          className="rounded p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                          title="Open builder"
                        >
                          <Layout className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Has snapshot</span>
        <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-zinc-600" /> No snapshot</span>
        <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Storefront link</span>
        <span className="flex items-center gap-1"><Layout className="h-3 w-3" /> Builder link</span>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Performance Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Zap} label="Avg Onboarding" value={formatDuration(perf.averageTotalOnboardingMs)} color="text-indigo-400" />
          <StatCard icon={Timer} label="Avg Publish" value={formatDuration(perf.averagePublishingDurationMs)} color="text-purple-400" />
          <StatCard icon={BarChart3} label="Gen Success" value={`${perf.generationSuccessRate}%`} color={perf.generationSuccessRate >= 80 ? "text-emerald-400" : "text-red-400"} />
          <StatCard icon={BarChart3} label="Publish Success" value={`${perf.publishSuccessRate}%`} color={perf.publishSuccessRate >= 80 ? "text-emerald-400" : "text-red-400"} />
          <StatCard icon={Database} label="DB Latency" value={rel.dbLatencyMs >= 0 ? `${rel.dbLatencyMs}ms` : "—"} color={rel.dbLatencyMs <= 20 ? "text-emerald-400" : "text-amber-400"} />
          <StatCard icon={RefreshCw} label="Retries" value={rel.retryCount} color={rel.retryCount === 0 ? "text-emerald-400" : "text-amber-400"} />
        </div>
      </div>

      {/* Production Readiness Score */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300">Production Readiness Score</h2>
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-bold font-display", scoreToColor(score.overall))}>{score.overall}</span>
            <span className="text-xs text-zinc-500">/ 100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {Object.entries(score.categories).map(([key, value]) => (
            <div key={key} className="rounded-lg bg-white/[0.02] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <span className={cn("text-xs font-bold", scoreToColor(value))}>{value}</span>
              </div>
              <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div className={cn("h-full rounded-full", value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 text-xs">
          {score.blockers.length > 0 && score.blockers[0] !== "No critical blockers detected" && (
            <div>
              <p className="font-semibold text-red-400 mb-1">Critical Blockers</p>
              {score.blockers.map((b, i) => <p key={i} className="text-zinc-400">• {b}</p>)}
            </div>
          )}
          {score.highPriority.length > 0 && score.highPriority[0] !== "No high-priority issues detected" && (
            <div>
              <p className="font-semibold text-amber-400 mb-1">High Priority</p>
              {score.highPriority.map((h, i) => <p key={i} className="text-zinc-400">• {h}</p>)}
            </div>
          )}
          {score.blockers.length === 0 || score.blockers[0] === "No critical blockers detected" ? (
            <p className="text-emerald-400">No critical blockers detected — system is healthy</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className={cn("text-lg font-bold", color)}>{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}
