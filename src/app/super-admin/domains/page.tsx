import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VercelService } from "@/services/vercel.service";
import Link from "next/link";

export const dynamic = "force-dynamic";

const REGISTRAR_GUIDES = [
  { name: "GoDaddy", steps: ["Log in to GoDaddy → My Domains", "Select your domain → Manage DNS", "Add the DNS records shown below", "Save → Wait 5–30 minutes for propagation"] },
  { name: "Namecheap", steps: ["Log in to Namecheap → Domain List", "Click Manage → Advanced DNS", "Add new record → Choose type from Vercel records", "Save → Wait 5–30 minutes for propagation"] },
  { name: "Cloudflare", steps: ["Log in to Cloudflare → Select domain", "Go to DNS → Records", "Add the Vercel records with orange cloud OFF (DNS only)", "Save → Propagation is near-instant on Cloudflare"] },
  { name: "Hostinger", steps: ["Log in to Hostinger → Domains", "Select domain → DNS / Nameservers", "Go to DNS Records → Add new record", "Enter the Vercel records → Save"] },
  { name: "Generic", steps: ["Log in to your domain registrar's DNS management", "Add a CNAME record pointing to cname.vercel-dns.com", "Add any additional TXT records Vercel requires", "Save → Wait for DNS propagation (5–30 min)"] },
];

export default async function SuperAdminDomainsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;

  const tenants = await prisma.tenant.findMany({
    where: { customDomain: { not: null } },
    select: { id: true, name: true, subdomain: true, customDomain: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalDomains = tenants.length;
  const verifiedDomains: string[] = [];
  const pendingDomains: string[] = [];
  const failedDomains: string[] = [];

  if (totalDomains > 0) {
    const results = await Promise.allSettled(
      tenants.map(async (t) => {
        if (!t.customDomain) return null;
        try {
          const status = await VercelService.getDomainStatus(t.customDomain);
          return { tenantId: t.id, domain: t.customDomain, verified: status.verified, error: null };
        } catch (err) {
          return { tenantId: t.id, domain: t.customDomain, verified: false, error: err instanceof Error ? err.message : "unknown" };
        }
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        if (r.value.verified) verifiedDomains.push(r.value.domain);
        else if (r.value.error) failedDomains.push(r.value.domain);
        else pendingDomains.push(r.value.domain);
      }
    }
  }

  const agencyDomains = await prisma.websiteAgency.findMany({
    where: { customDomain: { not: null } },
    select: { id: true, name: true, customDomain: true },
  });

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-white">Domain Operations</h1><p className="mt-1 text-sm text-zinc-400">Custom domain management · Vercel-powered</p></div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Total Domains</p><p className="mt-1 text-xl font-bold text-white">{totalDomains}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Verified</p><p className="mt-1 text-xl font-bold text-emerald-400">{verifiedDomains.length}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Pending</p><p className="mt-1 text-xl font-bold text-amber-400">{pendingDomains.length}</p></div>
          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"><p className="text-xs text-zinc-500">Failed/Errors</p><p className={`mt-1 text-xl font-bold ${failedDomains.length > 0 ? "text-red-400" : "text-zinc-400"}`}>{failedDomains.length}</p></div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50">
          <div className="p-4 border-b border-white/5"><h2 className="text-sm font-semibold text-white">Creator Domains ({totalDomains})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-zinc-500"><th className="px-4 py-3 text-left">Creator</th><th className="px-4 py-3 text-left">Domain</th><th className="px-4 py-3 text-left">Subdomain</th><th className="px-4 py-3 text-left">Added</th></tr></thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No custom domains configured.</td></tr>
                ) : tenants.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 text-zinc-300 hover:bg-white/[0.02]">
                    <td className="px-4 py-3"><Link href={`/super-admin/tenants/${t.id}`} className="text-s8ul-cyan hover:underline">{t.name || t.id.slice(0, 8)}</Link></td>
                    <td className="px-4 py-3 font-mono text-xs">{t.customDomain}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{t.subdomain}</td>
                    <td className="px-4 py-3 text-zinc-500">{t.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {agencyDomains.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-zinc-900/50">
            <div className="p-4 border-b border-white/5"><h2 className="text-sm font-semibold text-white">Agency Domains ({agencyDomains.length})</h2></div>
            <table className="w-full text-xs">
              <thead><tr className="text-zinc-500"><th className="px-4 py-3 text-left">Agency</th><th className="px-4 py-3 text-left">Domain</th></tr></thead>
              <tbody>
                {agencyDomains.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 text-zinc-300">
                    <td className="px-4 py-3">{a.name || a.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.customDomain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">DNS Setup Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {REGISTRAR_GUIDES.map((guide) => (
              <div key={guide.name} className="rounded-lg border border-white/5 bg-zinc-800/30 p-3">
                <h3 className="text-xs font-semibold text-white mb-2">{guide.name}</h3>
                <ol className="space-y-1">
                  {guide.steps.map((step, i) => (
                    <li key={i} className="text-[11px] text-zinc-400 flex gap-2"><span className="text-zinc-600 font-mono">{i + 1}.</span>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
