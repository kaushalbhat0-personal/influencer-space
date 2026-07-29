import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { clientHealthEngine } from "@/lib/client/health";
import { clientService } from "@/lib/client/service";
import { themeRegistry } from "@/lib/theme/registry-new";
import { Building2, Globe, Palette, CheckCircle, Activity, ShoppingBag, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, subdomain: true, customDomain: true, createdAt: true },
  });
  if (!tenant) notFound();

  const [website, publishStatus, productCount, health, activity] = await Promise.all([
    prisma.website.findUnique({ where: { tenantId: tenant.id }, select: { themePackageId: true, id: true } }),
    prisma.publishStatus.findFirst({ where: { website: { tenantId: tenant.id } }, select: { state: true, liveVersion: true, publishedAt: true } }),
    prisma.product.count({ where: { tenantId: tenant.id } }),
    clientHealthEngine.evaluate(tenant.id).catch(() => null),
    clientService.getActivity(tenant.id, 10),
  ]);

  const themeName = website?.themePackageId ? themeRegistry.getById(website.themePackageId)?.name ?? website.themePackageId : "None";

  return (
    <ContentContainer>
      <PageHeader
        title={tenant.name}
        description={`Client since ${new Date(tenant.createdAt).toLocaleDateString()}`
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/agency" },
          { label: "Clients", href: "/agency/clients" },
          { label: tenant.name },
        ]}
        actions={
          <div className="flex gap-2">
            <Link href={`/${tenant.subdomain}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
              View Website
            </Link>
            <Link href={`/builder`} className="rounded-lg bg-s8ul-cyan px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90">
              Open Builder
            </Link>
          </div>
        }
      />

      {/* Client Health */}
      {health && (
        <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Client Health</h3>
            <span className={`text-2xl font-bold ${
              health.overallScore >= 80 ? "text-emerald-400" : health.overallScore >= 50 ? "text-amber-400" : "text-red-400"
            }`}>
              {health.overallScore}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Website", value: health.websiteScore },
              { label: "Publishing", value: health.publishingScore },
              { label: "Content", value: health.contentScore },
              { label: "SEO", value: health.seoScore },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-zinc-800/50 px-3 py-2">
                <p className="text-[10px] text-zinc-500">{s.label}</p>
                <p className={`text-sm font-bold ${s.value != null && s.value >= 80 ? "text-emerald-400" : s.value != null && s.value >= 50 ? "text-amber-400" : "text-zinc-400"}`}>
                  {s.value != null ? `${s.value}%` : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Website" value={website ? "Active" : "None"} icon={Globe} />
        <MetricCard label="Theme" value={themeName} icon={Palette} />
        <MetricCard label="Products" value={productCount} icon={ShoppingBag} />
        <MetricCard label="Domain" value={tenant.customDomain ?? tenant.subdomain} icon={Building2} subtext={tenant.customDomain ? "Custom" : "Subdomain"} />
      </div>

      {/* Publishing Status */}
      {publishStatus && (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className={`h-5 w-5 ${publishStatus.state === "live" ? "text-emerald-400" : "text-zinc-500"}`} />
              <div>
                <p className="text-sm text-white">
                  {publishStatus.state === "live" ? "Published" : "Not Published"}
                </p>
                {publishStatus.publishedAt && (
                  <p className="text-xs text-zinc-500">
                    v{publishStatus.liveVersion} · {new Date(publishStatus.publishedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/${tenant.subdomain}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
                View Live
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          Activity Timeline
        </h3>
        <div className="divide-y divide-white/5">
          {activity.length > 0 ? activity.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 py-2">
              <div className="h-2 w-2 rounded-full bg-s8ul-cyan mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300">{ev.action.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-zinc-600">{new Date(ev.timestamp).toLocaleString()}</p>
              </div>
            </div>
          )) : (
            <p className="text-sm text-zinc-600 py-4 text-center">No activity recorded</p>
          )}
        </div>
      </div>
    </ContentContainer>
  );
}
