import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clientHealthEngine } from "@/lib/client/health";
import { agencyBranding } from "@/lib/client/branding";
import { themeRegistry } from "@/lib/theme/registry-new";
import { assertAgencyOwnsTenant } from "@/modules/partner/application/authorization";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";
import { Globe, Palette, CheckCircle, Activity, ShoppingBag, Building2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ params }: { params: { tenantId: string } }) {
  // VALIDATION-02 H1: the session agency must own this tenant (IDOR guard).
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) notFound();
  const owned = await assertAgencyOwnsTenant(session!.user.id, agencyId, params.tenantId);
  if (!owned.ok) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: { id: true, name: true, subdomain: true, customDomain: true },
  });
  if (!tenant) notFound();

  const agencyTenant = await prisma.agencyTenant.findFirst({
    where: { tenantId: tenant.id },
    select: { agencyId: true },
  });

  const [website, publishStatus, health, brand] = await Promise.all([
    prisma.website.findUnique({ where: { tenantId: tenant.id }, select: { themePackageId: true } }),
    prisma.publishStatus.findFirst({ where: { website: { tenantId: tenant.id } }, select: { state: true, liveVersion: true, publishedAt: true } }),
    clientHealthEngine.evaluate(tenant.id).catch(() => null),
    agencyTenant ? agencyBranding.getBrand(agencyTenant.agencyId) : null,
  ]);

  const themeName = website?.themePackageId ? themeRegistry.getById(website.themePackageId)?.name ?? website.themePackageId : "Default";
  const cssVars = brand ? agencyBranding.cssVars(brand) : {};

  return (
    <div className="min-h-screen bg-zinc-950" style={cssVars as React.CSSProperties}>
      {/* Branded Header */}
      <header className="border-b border-white/10 bg-zinc-900/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {brand?.logoUrl ? (
              <img src={brand.logoUrl} alt="" className="h-8 w-auto" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: brand?.primaryColor ?? "#6366F1" }}>
                <span className="text-sm font-bold text-white">{tenant.name[0]}</span>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{tenant.name}</p>
              {brand?.footerText && <p className="text-[10px] text-zinc-500">{brand.footerText}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>Powered by {brand?.footerText ?? "Creatos"}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Health */}
        {health && (
          <div className="mb-8 rounded-xl border border-white/10 bg-zinc-900/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Website Health</h2>
              <span className={`text-3xl font-bold ${
                health.overallScore >= 80 ? "text-emerald-400" : health.overallScore >= 50 ? "text-amber-400" : "text-red-400"
              }`}>
                {health.overallScore}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Website", value: health.websiteScore },
                { label: "Publishing", value: health.publishingScore },
                { label: "Content", value: health.contentScore },
                { label: "SEO", value: health.seoScore },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-zinc-800/50 px-4 py-3">
                  <p className="text-xs text-zinc-500">{s.label}</p>
                  <p className={`text-lg font-bold ${
                    s.value != null && s.value >= 80 ? "text-emerald-400" : s.value != null && s.value >= 50 ? "text-amber-400" : "text-zinc-400"
                  }`}>
                    {s.value != null ? `${s.value}%` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/${tenant.subdomain}`}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 p-6 hover:border-white/20 transition-all text-center"
          >
            <Globe className="h-6 w-6 text-s8ul-cyan" />
            <span className="text-sm font-medium text-white">View Website</span>
            <span className="text-xs text-zinc-500">See your live site</span>
          </Link>
          <Link
            href="/builder"
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 p-6 hover:border-white/20 transition-all text-center"
          >
            <Activity className="h-6 w-6 text-s8ul-cyan" />
            <span className="text-sm font-medium text-white">Open Builder</span>
            <span className="text-xs text-zinc-500">Edit your layout</span>
          </Link>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
            <Palette className="h-6 w-6 text-zinc-500" />
            <span className="text-sm font-medium text-white">{themeName}</span>
            <span className="text-xs text-zinc-500">Current theme</span>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center">
            <CheckCircle className={`h-6 w-6 ${publishStatus?.state === "live" ? "text-emerald-400" : "text-zinc-500"}`} />
            <span className="text-sm font-medium text-white">
              {publishStatus?.state === "live" ? "Published" : "Draft"}
            </span>
            <span className="text-xs text-zinc-500">
              {publishStatus?.liveVersion ? `v${publishStatus.liveVersion}` : "Not yet published"}
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Domain</h3>
            <p className="text-lg font-mono text-zinc-300">{tenant.customDomain ?? buildStorefrontUrlWithTenant(null, tenant.subdomain)}</p>
            <p className="text-xs text-zinc-500 mt-1">{tenant.customDomain ? "Custom domain" : "Platform subdomain"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Support</h3>
            {brand?.supportEmail ? (
              <p className="text-sm text-zinc-300">{brand.supportEmail}</p>
            ) : (
              <p className="text-sm text-zinc-500">Contact your agency for support</p>
            )}
            {brand?.supportPhone && <p className="text-xs text-zinc-500 mt-1">{brand.supportPhone}</p>}
          </div>
        </div>
      </main>

      {/* Branded Footer */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-xs text-zinc-600">
          {brand?.footerText ?? "Powered by Creatos"}
        </p>
      </footer>
    </div>
  );
}
