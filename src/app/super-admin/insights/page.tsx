import { prisma } from "@/lib/prisma";
import { themeRegistry } from "@/lib/theme/registry-new";
import Link from "next/link";
import {
  AlertTriangle, AlertCircle, CheckCircle, Info, Globe, Ban,
  Clock, Upload, CreditCard, Activity, Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info" | "success";
  count: number;
  action: string;
  href: string;
}

function SeverityBadge({ severity }: { severity: Insight["severity"] }) {
  const colors = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    info: "bg-[var(--color-info-surface)] text-[var(--color-info)] border-[var(--color-info-border)]",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-medium border ${colors[severity]}`}>
      {severity}
    </span>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const icons = {
    critical: AlertCircle, warning: AlertTriangle, info: Info, success: CheckCircle,
  };
  const Icon = icons[insight.severity];
  const borderColors = {
    critical: "border-l-red-500/50", warning: "border-l-amber-500/50",
    info: "border-l-[var(--color-info)]/50", success: "border-l-emerald-500/50",
  };

  return (
    <div className={`rounded-xl border border-white/10 bg-zinc-900/50 border-l-4 ${borderColors[insight.severity]} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${
          insight.severity === "critical" ? "text-red-400" :
          insight.severity === "warning" ? "text-amber-400" :
          insight.severity === "info" ? "text-[var(--color-info)]" : "text-emerald-400"
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
            <SeverityBadge severity={insight.severity} />
            <span className="text-lg font-bold text-white ml-auto">{insight.count}</span>
          </div>
          <p className="text-xs text-zinc-500 mb-3">{insight.description}</p>
          <Link
            href={insight.href}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-[10px] font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {insight.action} →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function InsightsPage() {
  const [
    tenants, websites, publishStatuses, auditEvents, galleryCount,
    orderCount, productCount, linkCount, contentFeedCount, brands,
  ] = await Promise.all([
    prisma.tenant.findMany({ select: { id: true, name: true, customDomain: true, createdAt: true } }),
    prisma.website.findMany({ select: { id: true, tenantId: true, themePackageId: true } }),
    prisma.publishStatus.findMany({ select: { state: true, websiteId: true } }),
    prisma.auditLog.groupBy({ by: ["action"], _count: true, orderBy: { _count: { action: "desc" } }, take: 20 }),
    prisma.galleryImage.count(),
    prisma.productOrder.count(),
    prisma.product.count(),
    prisma.affiliateLink.count({ where: { isActive: true } }),
    prisma.contentFeedItem.count({ where: { hidden: false } }),
    prisma.brand.findMany({ select: { name: true } }),
  ]);

  const publishMap = new Map(publishStatuses.map((p) => [p.websiteId, p.state]));
  const websiteMap = new Map(websites.map((w) => [w.tenantId, w]));

  const neverPublished = websites.filter((w) => !publishMap.has(w.id) || publishMap.get(w.id) === "draft");
  const liveCount = websites.filter((w) => publishMap.get(w.id) === "live").length;

  const insights: Insight[] = [];

  if (neverPublished.length > 0) {
    insights.push({
      id: "never-published", severity: "warning",
      title: "Websites Never Published",
      description: "These websites have been created but never published to a live storefront.",
      count: neverPublished.length,
      action: "View Websites", href: "/super-admin/websites",
    });
  }

  const domainsMissing = tenants.filter((t) => !t.customDomain);
  if (domainsMissing.length > 0) {
    insights.push({
      id: "no-custom-domain", severity: "info",
      title: "Creators Without Custom Domain",
      description: "These creators are using a platform subdomain instead of a custom domain.",
      count: domainsMissing.length,
      action: "View Creators", href: "/super-admin/tenants",
    });
  }

  const failedPublishes = auditEvents.filter((e) => e.action.includes("publish") && (e.action.includes("fail")));
  const failedCount = failedPublishes.reduce((s, e) => s + e._count, 0);
  if (failedCount > 0) {
    insights.push({
      id: "failed-publishes", severity: "critical",
      title: "Failed Publishes",
      description: "Recent publishing failures that may require attention.",
      count: failedCount,
      action: "View Audit Log", href: "/super-admin/audit",
    });
  }

  const errorEvents = auditEvents.filter((e) => e.action.includes("error") || e.action.includes("fail"));
  const errorCount = errorEvents.reduce((s, e) => s + e._count, 0);
  if (errorCount > 0) {
    insights.push({
      id: "platform-errors", severity: "critical",
      title: "Platform Errors",
      description: "Errors detected across platform operations in recent audit events.",
      count: errorCount,
      action: "View Events", href: "/super-admin/events",
    });
  }

  const provisioningEvents = auditEvents.filter((e) => e.action.includes("provision"));
  const provisionFailCount = provisioningEvents
    .filter((e) => e.action.includes("fail"))
    .reduce((s, e) => s + e._count, 0);
  if (provisionFailCount > 0) {
    insights.push({
      id: "provisioning-failures", severity: "warning",
      title: "Provisioning Failures",
      description: "Creator provisioning attempts that did not complete successfully.",
      count: provisionFailCount,
      action: "View Operations", href: "/super-admin/operations",
    });
  }

  const inactiveCreators = tenants.filter((t) => {
    const daysSinceCreation = (Date.now() - t.createdAt.getTime()) / 86400000;
    return daysSinceCreation > 30 && !websiteMap.has(t.id);
  });
  if (inactiveCreators.length > 0) {
    insights.push({
      id: "inactive-creators", severity: "info",
      title: "Inactive Creators",
      description: "Creators who registered over 30 days ago but have no website.",
      count: inactiveCreators.length,
      action: "View Creators", href: "/super-admin/tenants",
    });
  }

  insights.push({
    id: "total-content", severity: "success",
    title: "Platform Content",
    description: `${productCount} products, ${galleryCount} gallery items, ${linkCount} links, ${contentFeedCount} feed items across ${tenants.length} creators.`,
    count: productCount + galleryCount + linkCount + contentFeedCount,
    action: "View Dashboard", href: "/super-admin",
  });

  insights.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, success: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Insights</h1>
        <p className="mt-1 text-sm text-zinc-400">Actionable insights across your entire platform.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Creators", value: tenants.length, icon: Activity, color: "text-[var(--brand-primary)]" },
          { label: "Live Websites", value: liveCount, icon: Globe, color: "text-emerald-400" },
          { label: "Total Products", value: productCount, icon: CreditCard, color: "text-amber-400" },
          { label: "Total Orders", value: orderCount, icon: Target, color: "text-purple-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-zinc-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
