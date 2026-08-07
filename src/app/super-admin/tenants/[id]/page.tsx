import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { websiteHealthEngine } from "@/lib/platform/health/engine";
import { themeRegistry } from "@/lib/theme/registry-new";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { resolvePlan } from "@/lib/capabilities/plan-resolution";
import { billingMigrationRegistry } from "@/modules/billing/application/migration-registry";
import { isTenantAgencyManaged } from "@/modules/billing/application/plan-restriction";
import { isAgencyRestrictedPlan } from "@/config/commerce/plans";
import { MetricCard } from "@/components/data/MetricCard";
import { TenantOrdersTable } from "./_components/tenant-orders-table";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import { IntelligenceConsole } from "@/modules/runtime-context/presentation/intelligence-console";
import { Building2, ShoppingBag, Image, Activity, Palette, CheckCircle, Clock, Shield, CreditCard, User } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, subdomain: true, customDomain: true, createdAt: true },
  });
  if (!tenant) notFound();

  const [productCount, galleryCount, orderCount, website, publishStatus, health, users, subscription, recentActivity, linkCount, managedByPartner] = await Promise.all([
    prisma.product.count({ where: { tenantId: tenant.id } }),
    prisma.galleryImage.count({ where: { tenantId: tenant.id } }),
    prisma.productOrder.count({ where: { tenantId: tenant.id } }),
    prisma.website.findUnique({ where: { tenantId: tenant.id }, select: { themePackageId: true, id: true } }),
    prisma.publishStatus.findFirst({ where: { website: { tenantId: tenant.id } }, select: { state: true, liveVersion: true, publishedAt: true } }),
    websiteHealthEngine.evaluate(tenant.id).catch(() => null),
    prisma.user.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true, email: true, role: true } }),
    // IMPLEMENTATION-39: Billing v2 is the only runtime source of truth.
    resolveActivePlan(undefined, tenant.id),
    prisma.auditLog.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, action: true, createdAt: true, metadata: true } }),
    prisma.affiliateLink.count({ where: { tenantId: tenant.id, isActive: true } }),
    // IMPLEMENTATION-42 Phase 5/16: partner-managed + restriction diagnostics.
    isTenantAgencyManaged(tenant.id),
  ]);

  const themeName = website?.themePackageId ? themeRegistry.getById(website.themePackageId)?.name ?? website.themePackageId : "None";
  const planLabel = subscription?.code ? resolvePlan(subscription.code).displayName : "Free";
  const partnerManaged = managedByPartner;
  const restricted = partnerManaged && (subscription?.code ? isAgencyRestrictedPlan(subscription.code) : true);
  billingMigrationRegistry.markMigrated("tenant-detail");

  const orders = await prisma.productOrder.findMany({
    where: { tenantId: tenant.id },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const orderRows = orders.map((o) => ({
    id: o.id,
    productName: o.product?.name ?? "Unknown",
    amount: o.amount,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));

  // RCCF-INTEGRATION-01 Phase 8: the Super Admin intelligence console reads the
  // shared RuntimeContext (markShown=false so viewing a tenant never mutates
  // its recommendation history).
  let intelligence: React.ComponentProps<typeof IntelligenceConsole>["intelligence"] = {
    knowledge: null, storefront: null, goalAlignment: null, success: null, recommendations: null,
  };
  try {
    const context = await runtimeContextBuilder.build(tenant.id, { markShown: false });
    intelligence = {
      knowledge: { overall: context.knowledge.score.overall, confidence: context.knowledge.score.confidence },
      storefront: { overall: context.storefrontScore.overall },
      goalAlignment: { overall: context.goals.alignment.overall },
      success: context.success ? { completionPercent: context.success.completionPercent } : null,
      recommendations: {
        active: context.recommendations.length,
        top: context.recommendations[0]?.title ?? null,
      },
    };
  } catch {
    // intelligence is best-effort — the rest of the tenant page still renders
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/super-admin/tenants" className="text-zinc-500 hover:text-zinc-300 text-sm">← Creators</Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
        <span className="text-xs text-zinc-600">Created {new Date(tenant.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <MetricCard label="Products" value={productCount} icon={ShoppingBag} />
        <MetricCard label="Gallery" value={galleryCount} icon={Image} />
        <MetricCard label="Links" value={linkCount} icon={Activity} />
        <MetricCard label="Orders" value={orderCount} icon={Activity} />
        <MetricCard label="Domain" value={tenant.customDomain ?? "—"} icon={Building2} subtext={tenant.customDomain ? "Custom" : tenant.subdomain} />
        <MetricCard label="Theme" value={themeName} icon={Palette} />
        <MetricCard label="Health" value={health ? `${health.overallScore}%` : "—"} icon={CheckCircle} subtext={health ? `${health.checks.filter((c) => c.done).length}/${health.checks.length}` : undefined} />
      </div>

      <IntelligenceConsole intelligence={intelligence} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {/* Subscription & Plan */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Subscription</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-white">{planLabel}</span>
              {subscription && (
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                  subscription.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                }`}>{subscription.status}</span>
              )}
            </div>
          </div>
          {/* IMPLEMENTATION-42 Phase 5/16: partner-managed + restriction diagnostics */}
          <div className="mt-2 space-y-1 text-xs text-zinc-500" data-testid="tenant-partner-restriction">
            <p>partner-managed: <span data-testid="tenant-partner-managed">{String(partnerManaged)}</span> · plan origin: <span data-testid="tenant-plan-origin">{subscription?.origin ?? "none"}</span></p>
            {partnerManaged && (
              <p className={restricted ? "text-amber-400" : "text-emerald-400"} data-testid="tenant-restriction-state">
                {restricted ? "Launch not available — minimum Creator Grow" : "Meets agency minimum (Creator Grow or higher)"}
              </p>
            )}
          </div>
          {users.length > 0 && (
            <div className="mt-3 space-y-1">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-xs text-zinc-400">
                  <User className="h-3 w-3" />
                  <span>{u.name ?? u.email}</span>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{u.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Publishing Status */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Publishing</p>
          {publishStatus ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-zinc-500" />
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                  publishStatus.state === "live" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                }`}>{publishStatus.state}</span>
                {publishStatus.liveVersion && <span className="text-xs text-zinc-500">v{publishStatus.liveVersion}</span>}
              </div>
              {publishStatus.publishedAt && (
                <p className="text-xs text-zinc-600">Last published {new Date(publishStatus.publishedAt).toLocaleDateString()}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Not yet published</p>
          )}
        </div>
      </div>

      {/* Health improvements */}
      {health && health.checks.filter((c) => !c.done).length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold text-amber-400 mb-2">Improvements Needed</p>
          <div className="flex flex-wrap gap-2">
            {health.checks.filter((c) => !c.done).slice(0, 8).map((c) => (
              <span key={c.id} className="rounded bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400">{c.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            Activity Timeline
          </h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 divide-y divide-white/5">
          {recentActivity.length > 0 ? recentActivity.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="h-2 w-2 rounded-full bg-s8ul-cyan shrink-0" />
              <span className="flex-1 text-sm text-zinc-300">{a.action.replace(/_/g, " ")}</span>
              <span className="text-xs text-zinc-600">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          )) : (
            <div className="px-4 py-6 text-center text-sm text-zinc-600">No recent activity</div>
          )}
        </div>
      </div>

      {/* Orders */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
        <div className="flex gap-2">
          <Link href={`/super-admin/websites`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            View Website
          </Link>
          <Link href={`/${tenant.subdomain}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            Open Storefront
          </Link>
        </div>
      </div>
      <TenantOrdersTable data={orderRows} />
    </div>
  );
}
