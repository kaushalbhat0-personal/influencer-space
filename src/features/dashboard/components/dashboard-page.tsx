"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ShoppingBag, Package, Link2, Image as ImageIcon, MessageSquare, UserCheck, Layout, Settings, BarChart3, Search, Palette, CreditCard, Activity, Calendar as CalendarIcon, Briefcase as BriefcaseIcon, BookOpen as BookOpenIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricGrid, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { GlassCard } from "@/components/ui/GlassCard";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { StorefrontStatusCard } from "@/components/dashboard/StorefrontStatusCard";
import { KnowledgeScoreCard } from "@/modules/knowledge-runtime/presentation/knowledge-score-card";
import { GoalDashboardCard } from "@/modules/goals-runtime/presentation/goal-dashboard-card";
import { applyCommerceOrder } from "@/modules/goals-runtime/application/commerce";
import { NextBestStepCard } from "@/modules/recommendation-runtime/presentation/next-best-step-card";
import { SuccessMilestonesCard } from "@/components/dashboard/SuccessMilestonesCard";
import type { DashboardData } from "../actions";

interface DashboardPageProps {
  initialData: DashboardData;
}

interface QuickCardItem {
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

const QUICK_CARDS: QuickCardItem[] = [
  { label: "Products", href: "/admin/products", icon: ShoppingBag, color: "text-emerald-400" },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarIcon, color: "text-sky-400" },
  { label: "Services", href: "/admin/services", icon: BriefcaseIcon, color: "text-violet-400" },
  { label: "Courses", href: "/admin/courses", icon: BookOpenIcon, color: "text-indigo-400" },
  { label: "Gallery", href: "/admin/gallery", icon: ImageIcon, color: "text-pink-400" },
  { label: "Testimonials", href: "/admin/testimonials", icon: UserCheck, color: "text-fuchsia-400" },
  { label: "Links", href: "/admin/links", icon: Link2, color: "text-cyan-400" },
  { label: "Orders", href: "/admin/orders", icon: Package, color: "text-yellow-400" },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare, color: "text-teal-400" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, color: "text-orange-400" },
  { label: "SEO", href: "/admin/seo", icon: Search, color: "text-amber-400" },
  { label: "Appearance", href: "/admin/appearance", icon: Palette, color: "text-purple-400" },
  { label: "Billing", href: "/admin/billing", icon: CreditCard, color: "text-rose-400" },
  { label: "Settings", href: "/admin/settings", icon: Settings, color: "text-zinc-400" },
];

function commerceSurfaceOf(href: string): "products" | "bookings" | "courses" | "services" | null {
  if (href === "/admin/products") return "products";
  if (href === "/admin/bookings") return "bookings";
  if (href === "/admin/courses") return "courses";
  if (href === "/admin/services") return "services";
  return null;
}

function MetricCard({ label, value, sub, subColor }: { label: string; value: string | number; sub?: string; subColor?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className={cn("text-[10px] mt-0.5", subColor ?? "text-zinc-600")}>{sub}</p>}
    </div>
  );
}

export function DashboardPage({ initialData }: DashboardPageProps) {
  const [data] = useState(initialData);
  const { metrics, activity, health, overallScore, steps, creatorName, knowledge, goals, recommendations, success } = data;

  // RCCF-INTEGRATION-01 Phase 6: goal-aware commerce ordering — booking-first
  // creators see Bookings first, products-first see Products first (no-op
  // without a goal profile).
  const quickCards = applyCommerceOrder(QUICK_CARDS, goals?.profile ?? null, (card) => commerceSurfaceOf(card.href));

  const checklistSteps = steps.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description ?? "",
    href: s.href,
    done: s.done,
    estimatedMinutes: s.estimatedMinutes,
  }));
  const checklistComplete = checklistSteps.every((s) => s.done);

  const avgOrder = metrics.orderCount > 0
    ? `₹${Math.round(metrics.revenue / metrics.orderCount).toLocaleString("en-IN")}`
    : "—";

  return (
    <FeaturePage
      title={`Welcome back, ${creatorName}`}
      description="See how your store is performing and find your next action."
      actions={
        <div className="flex gap-2">
          <Link href="/admin/website-ready" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            Website Status
          </Link>
          <Link href="/builder" className="btn-primary text-xs">
            <Layout className="h-3.5 w-3.5 mr-1.5 inline" />
            Open Builder
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {!checklistComplete && (
          <OnboardingChecklist steps={checklistSteps} creatorName={creatorName} />
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {quickCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.03] border border-white/5 px-2 py-3 text-center hover:bg-white/[0.06] hover:border-white/10 transition-all group"
            >
              <card.icon className={cn("h-5 w-5", card.color)} />
              <span className="text-[10px] font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                {card.label}
              </span>
            </Link>
          ))}
        </div>

        {metrics.productCount === 0 && metrics.bookingCount === 0 && metrics.orderCount === 0 ? (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Your website is live!</h3>
            <p className="text-xs text-zinc-400 mb-4">Here&apos;s your next task — your best next step is at the top of the page.</p>
            {success?.nextTask && !success.nextTask.done ? (
              <Link
                href={success.nextTask.href || "/admin/dashboard"}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-900/30 px-4 py-3 hover:bg-zinc-900/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full border-2 border-indigo-500" />
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{success.nextTask.label}</span>
                </div>
                <span className="text-[10px] text-indigo-400">{success.nextTask.action} →</span>
              </Link>
            ) : (
              <p className="text-xs text-zinc-500">Keep going — your next best step updates as you complete tasks.</p>
            )}
          </div>
        ) : (
        <MetricGrid>
          <MetricCard label="Products" value={metrics.productCount} sub={`${metrics.activeProductCount} active`} />
          <MetricCard label="Services" value={metrics.offeringCount} sub={`${metrics.totalOrders} orders`} />
          <MetricCard label="Orders" value={metrics.orderCount} sub={`₹${metrics.revenue.toLocaleString("en-IN")} revenue`} />
          <MetricCard label="Bookings" value={metrics.bookingCount} sub={metrics.bookingCount > 0 ? "appointments" : "No bookings yet"} />
          <MetricCard label="Gallery" value={metrics.galleryCount} />
          <MetricCard label="Avg Order" value={avgOrder} sub={metrics.orderCount > 0 ? "per order" : "No orders yet"} subColor={metrics.orderCount > 0 ? "text-zinc-500" : "text-zinc-600"} />
        </MetricGrid>
        )}

        <DashboardGrid>
          <DashboardGridMain className="space-y-6">
            {recommendations && (
              <NextBestStepCard
                initialRecommendation={recommendations.top}
                total={recommendations.total}
              />
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
                        {new Date(a.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Activity className="h-6 w-6 text-zinc-700" />
                  <p className="text-sm text-zinc-500">No recent activity</p>
                  <p className="text-xs text-zinc-600">Your actions will appear here</p>
                </div>
              )}
            </GlassCard>

            <DashboardWidget
              title="Website Health"
              actions={
                <span className="text-lg font-bold font-display text-s8ul-cyan">
                  {overallScore}%
                </span>
              }
            >
              <div className="space-y-1">
                {health.slice(0, 8).map((check) => (
                  <Link
                    key={check.label}
                    href={check.href}
                    className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
                  >
                    <div className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", check.done ? "bg-emerald-500" : "bg-zinc-600")} />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">{check.label}</span>
                        <span className={cn("text-xs font-medium ml-2", check.done ? "text-emerald-400" : "text-zinc-500")}>
                          {check.score}%
                        </span>
                      </span>
                      {!check.done && check.description && (
                        <span className="block text-[11px] text-zinc-600 mt-0.5">{check.description}</span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </DashboardWidget>
          </DashboardGridMain>

          <DashboardGridSide className="space-y-6">
            <StorefrontStatusCard
              storefrontUrl={metrics.storefrontUrl}
              publishState={metrics.publishState}
              publishedVersion={metrics.publishedVersion}
              publishedAt={metrics.publishedAt}
              recentVersions={metrics.recentVersions}
              hasProducts={metrics.publishedProductCount > 0}
              currentTheme={metrics.currentTheme}
            />
            {knowledge && (
              <KnowledgeScoreCard
                overall={knowledge.overall}
                confidence={knowledge.confidence}
                categories={knowledge.categories}
                missing={knowledge.missing}
                compact
              />
            )}
            {goals && <GoalDashboardCard dashboard={goals.dashboard} />}
            {success && <SuccessMilestonesCard success={success} />}
          </DashboardGridSide>
        </DashboardGrid>
      </div>
    </FeaturePage>
  );
}


