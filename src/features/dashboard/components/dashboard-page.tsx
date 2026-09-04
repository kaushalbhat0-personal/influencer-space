"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ShoppingBag, Package, Link2, Image as ImageIcon, MessageSquare, UserCheck, Layout, Settings, BarChart3, Search, Palette, CreditCard, Activity, Calendar as CalendarIcon, Briefcase as BriefcaseIcon, BookOpen as BookOpenIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricGrid, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import { MetricCard } from "@/components/data/MetricCard";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { StorefrontStatusCard } from "@/components/dashboard/StorefrontStatusCard";
import { KnowledgeScoreCard } from "@/modules/knowledge-runtime/presentation/knowledge-score-card";
import { GoalDashboardCard } from "@/modules/goals-runtime/presentation/goal-dashboard-card";
import { applyCommerceOrder } from "@/modules/goals-runtime/application/commerce";
import { NextBestStepCard } from "@/modules/recommendation-runtime/presentation/next-best-step-card";
import { BusinessHealthHero } from "@/modules/business-health/presentation/business-health-hero";
import { SuccessJourneyCard } from "@/modules/customer-success/presentation/success-journey-card";
import { EvolutionFeedCard } from "@/modules/website-evolution/presentation/evolution-feed-card";
import { SuccessMilestonesCard } from "@/components/dashboard/SuccessMilestonesCard";
import type { DashboardData, InitialDashboardData, DeferredDashboardData } from "../actions";
import { getDeferredDashboardData } from "../actions";
import { formatCurrency } from "@/lib/utils";

interface DashboardPageProps {
  initialData: InitialDashboardData;
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
  { label: "Settings", href: "/admin/settings", icon: Settings, color: "text-[var(--text-muted)]" },
];

function commerceSurfaceOf(href: string): "products" | "bookings" | "courses" | "services" | null {
  if (href === "/admin/products") return "products";
  if (href === "/admin/bookings") return "bookings";
  if (href === "/admin/courses") return "courses";
  if (href === "/admin/services") return "services";
  return null;
}

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="platform-section-label">
      {children}
    </h2>
  );
}

function DeferredSkeleton({ height = 120 }: { height?: number }) {
  return <div className="animate-pulse rounded-[var(--radius-card-elevated)] border border-[var(--border)] bg-[var(--surface-card)]" style={{ height }} aria-hidden />;
}

export function DashboardPage({ initialData }: DashboardPageProps) {
  const [deferred, setDeferred] = useState<DeferredDashboardData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deferredError, setDeferredError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch deferred if initialData doesn't already contain it (backward compat for tests that pass full DashboardData)
    if ((initialData as unknown as { health?: unknown }).health) return;
    getDeferredDashboardData()
      .then((d) => setDeferred(d))
      .catch((e) => setDeferredError(e instanceof Error ? e.message : String(e)));
  }, [initialData]);

  // Merge initial + deferred; deferred overwrites where present, initial is critical path
  const hasDeferredInInitial = !!(initialData as unknown as { health?: unknown }).health;
  const isDeferredLoading = !deferred && !hasDeferredInInitial && !deferredError;
  const data = { ...initialData, ...(deferred ?? {}) } as unknown as DashboardData & InitialDashboardData & DeferredDashboardData;
  const { metrics, activity, health, overallScore, steps, creatorName, knowledge, goals, recommendations, success, successJourney, businessHealth, evolution, launchAllowance } = data as unknown as DashboardData;

  // RCCF-72.15B — Launch core-content allowance, displayed only for Launch and
  // only from the server-derived value (never a hardcoded UI counter).
  const launch = launchAllowance
    ? { used: launchAllowance.used, limit: launchAllowance.limit, remaining: Math.max(0, launchAllowance.limit - launchAllowance.used) }
    : null;

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
    ? formatCurrency(Math.round(metrics.revenue / metrics.orderCount))
    : "—";

  const emptyStore = metrics.productCount === 0 && metrics.bookingCount === 0 && metrics.orderCount === 0;

  return (
    <FeaturePage
      title={`Welcome back, ${creatorName}`}
      description="See how your store is performing and find your next action."
      actions={
        <div className="flex gap-2">
          <Link href="/admin/website-ready" className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
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
        <section aria-labelledby="dashboard-storefront" className="space-y-3">
          <SectionLabel id="dashboard-storefront">Storefront</SectionLabel>
          <StorefrontStatusCard
            storefrontUrl={metrics.storefrontUrl}
            publishState={metrics.publishState}
            publishedVersion={metrics.publishedVersion}
            publishedAt={metrics.publishedAt}
            recentVersions={metrics.recentVersions}
            hasProducts={metrics.publishedProductCount > 0}
            currentTheme={metrics.currentTheme}
          />
        </section>

        {launch && (
          <section aria-labelledby="dashboard-launch-allowance" className="space-y-3">
            <SectionLabel id="dashboard-launch-allowance">Core Content Allowance</SectionLabel>
            <div className="platform-card-secondary p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{launch.used} / {launch.limit}</span> used
                {launch.remaining > 0 ? (
                  <span className="text-[var(--text-muted)]"> · {launch.remaining} remaining</span>
                ) : (
                  <span className="text-[var(--color-warning)]"> · limit reached</span>
                )}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Products, services, courses and games count toward one shared limit on your plan.
              </p>
            </div>
          </section>
        )}

        <section aria-labelledby="dashboard-quick-actions" className="space-y-3">
          <SectionLabel id="dashboard-quick-actions">Quick Actions</SectionLabel>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {quickCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="flex flex-col items-center gap-1.5 rounded-[var(--radius-card)] bg-[var(--surface-card)] border border-[var(--border-subtle)] px-2 py-3 text-center hover:bg-[var(--surface-hover)] hover:border-[var(--border)] transition-colors group"
              >
                <card.icon className={cn("h-5 w-5", card.color)} />
                <span className="text-[11px] font-medium tracking-wide text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                  {card.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {isDeferredLoading ? (
          <DeferredSkeleton height={120} />
        ) : businessHealth ? (
          <BusinessHealthHero health={businessHealth.health} trend={businessHealth.trend} />
        ) : null}

        {isDeferredLoading ? (
          <DeferredSkeleton height={220} />
        ) : (
          <SuccessJourneyCard initialData={{ success: successJourney!.success, timeline: successJourney!.timeline }} />
        )}

        {!checklistComplete && (
          <OnboardingChecklist steps={checklistSteps} creatorName={creatorName} />
        )}

        {emptyStore ? (
          <div className="platform-card-contextual p-6">
            <h3 className="font-display text-sm font-semibold tracking-tight text-[var(--text-primary)] mb-1">Let&apos;s set up your store</h3>
            <p className="text-xs leading-relaxed text-[var(--text-muted)] mb-4">Here&apos;s your next task — your best next step is at the top of the page.</p>
            {success?.nextTask && !success.nextTask.done ? (
              <Link
                href={success.nextTask.href || "/admin/dashboard"}
                className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3 hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full border-2 border-[var(--brand-primary)]" />
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{success.nextTask.label}</span>
                </div>
                <span className="text-[11px] font-medium text-[var(--brand-primary)]">{success.nextTask.action} →</span>
              </Link>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">Keep going — your next best step updates as you complete tasks.</p>
            )}
          </div>
        ) : (
        <MetricGrid>
          <MetricCard label="Products" value={metrics.productCount} subtext={`${metrics.activeProductCount} active`} icon={ShoppingBag} />
          <MetricCard label="Services" value={metrics.offeringCount} subtext={`${metrics.totalOrders} orders`} icon={BriefcaseIcon} />
          <MetricCard label="Orders" value={metrics.orderCount} subtext={`${formatCurrency(metrics.revenue)} revenue`} icon={Package} />
          <MetricCard label="Bookings" value={metrics.bookingCount} subtext={metrics.bookingCount > 0 ? "appointments" : "No bookings yet"} icon={CalendarIcon} />
          <MetricCard label="Gallery" value={metrics.galleryCount} icon={ImageIcon} />
          <MetricCard label="Avg Order" value={avgOrder} subtext={metrics.orderCount > 0 ? "per order" : "No orders yet"} icon={CreditCard} />
        </MetricGrid>
        )}

        <DashboardGrid>
          <DashboardGridMain className="space-y-6">
            {isDeferredLoading ? (
              <DeferredSkeleton height={140} />
            ) : recommendations ? (
              <NextBestStepCard
                initialRecommendation={recommendations.top}
                total={recommendations.total}
              />
            ) : null}

            {isDeferredLoading ? (
              <DeferredSkeleton height={120} />
            ) : evolution ? (
              <EvolutionFeedCard initial={evolution.opportunities} />
            ) : null}

            <DashboardWidget
              title="Recent Activity"
              icon={Activity}
            >
              {activity.length > 0 ? (
                <div className="space-y-1">
                  {activity.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                      <div className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                      <span className="flex-1">{a.description}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {new Date(a.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Activity className="h-6 w-6 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">No recent activity</p>
                  <p className="text-xs text-[var(--text-muted)]">Your actions will appear here</p>
                </div>
              )}
            </DashboardWidget>

            {isDeferredLoading ? (
              <DeferredSkeleton height={200} />
            ) : (
              <DashboardWidget
                title="Website Health"
                actions={
                  <span className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
                    {overallScore}%
                  </span>
                }
              >
                <div className="space-y-1">
                  {health!.slice(0, 8).map((check) => (
                    <Link
                      key={check.label}
                      href={check.href}
                      className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", check.done ? "bg-emerald-500" : "bg-[var(--border-strong)]")} />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between">
                          <span className="text-sm text-[var(--text-secondary)]">{check.label}</span>
                          <span className={cn("text-xs font-medium ml-2", check.done ? "text-emerald-400" : "text-[var(--text-muted)]")}>
                            {check.score}%
                          </span>
                        </span>
                        {!check.done && check.description && (
                          <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">{check.description}</span>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </DashboardWidget>
            )}
          </DashboardGridMain>

          <DashboardGridSide className="space-y-6">
            {isDeferredLoading ? (
              <DeferredSkeleton height={160} />
            ) : knowledge ? (
              <KnowledgeScoreCard
                overall={knowledge.overall}
                confidence={knowledge.confidence}
                categories={knowledge.categories}
                missing={knowledge.missing}
                compact
              />
            ) : null}
            {isDeferredLoading ? (
              <DeferredSkeleton height={120} />
            ) : goals ? (
              <GoalDashboardCard dashboard={goals.dashboard} />
            ) : null}
            {isDeferredLoading ? (
              <DeferredSkeleton height={180} />
            ) : success ? (
              <SuccessMilestonesCard success={success} />
            ) : null}
          </DashboardGridSide>
        </DashboardGrid>
      </div>
    </FeaturePage>
  );
}