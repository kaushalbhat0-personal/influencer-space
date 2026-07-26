"use client";

import { useState } from "react";
import { ShoppingBag, Package, Link2, Image as ImageIcon, MessageSquare, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/data/MetricCard";
import { MetricGrid, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuickStartGuide } from "@/components/dashboard/QuickStartGuide";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import type { DashboardData } from "../actions";

interface DashboardPageProps {
  initialData: DashboardData;
}

export function DashboardPage({ initialData }: DashboardPageProps) {
  const [data] = useState(initialData);
  const { metrics, activity, health, steps, storefrontUrl, creatorName } = data;

  return (
    <FeaturePage
      title={`Welcome back, ${creatorName}`}
      description="Here&apos;s what&apos;s happening with your store."
      actions={
        <>
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
            View Website
          </a>
          <a href="/builder" className="btn-primary text-xs">
            Open Builder
          </a>
        </>
      }
    >
      <div className="space-y-6">
        <MetricGrid>
          <MetricCard label="Products" value={metrics.productCount} icon={ShoppingBag} subtext={`${metrics.activeProductCount} active`} />
          <MetricCard label="Orders" value={metrics.orderCount} icon={Package} subtext={`₹${metrics.revenue.toLocaleString("en-IN")} revenue`} />
          <MetricCard label="Links" value={metrics.linkCount} icon={Link2} />
          <MetricCard label="Gallery" value={metrics.galleryCount} icon={ImageIcon} />
          <MetricCard label="Messages" value={metrics.messageCount} icon={MessageSquare} />
          <MetricCard
            label="Avg Order Value"
            value={metrics.orderCount > 0 ? `₹${Math.round(metrics.revenue / metrics.orderCount).toLocaleString("en-IN")}` : "—"}
            icon={TrendingUp}
            subtext={metrics.orderCount > 0 ? "per order" : "No orders yet"}
          />
        </MetricGrid>

        <DashboardGrid>
          <DashboardGridMain className="space-y-6">
            {steps.length > 0 && (
              <GlassCard>
                <QuickStartGuide steps={steps} />
              </GlassCard>
            )}

            <GlassCard className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Activity</h3>
              {activity.length > 0 ? (
                <div className="space-y-1">
                  {activity.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300">
                      <div className="h-2 w-2 rounded-full bg-s8ul-cyan" />
                      <span className="flex-1">{a.description}</span>
                      <span className="text-xs text-zinc-600">
                        {new Date(a.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No recent activity</p>
              )}
            </GlassCard>
          </DashboardGridMain>

          <DashboardGridSide className="space-y-6">
            <DashboardWidget
              title="Website Health"
              actions={
                <span className="text-lg font-bold font-display text-s8ul-cyan">
                  {Math.round(health.reduce((s, h) => s + h.score, 0) / Math.max(health.length, 1))}%
                </span>
              }
            >
              <div className="space-y-2">
                {health.map((check) => (
                  <a
                    key={check.label}
                    href={check.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${check.done ? "bg-emerald-500" : "bg-zinc-600"}`} />
                    <span className="flex-1 text-sm text-zinc-300">{check.label}</span>
                    <span className={`text-xs font-medium ${check.done ? "text-emerald-400" : "text-zinc-500"}`}>
                      {check.score}%
                    </span>
                  </a>
                ))}
              </div>
            </DashboardWidget>
          </DashboardGridSide>
        </DashboardGrid>
      </div>
    </FeaturePage>
  );
}
