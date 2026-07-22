import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { buildStorefrontUrl } from "@/lib/config/platform";

export const dynamic = "force-dynamic";

export default async function WebsiteSeoPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <p className="p-6 text-zinc-500">Access denied</p>;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subdomain: true, name: true },
  });

  const storefrontUrl = tenant ? buildStorefrontUrl(tenant.subdomain) : "#";

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">SEO</h1>
        <p className="mt-1 text-sm text-zinc-400">Search engine optimization settings for your storefront.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white">Storefront URL</h3>
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-s8ul-cyan hover:underline">
            {storefrontUrl}
          </a>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white">Site Name</h3>
          <p className="mt-1 text-sm text-zinc-400">{tenant?.name || "—"}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white">SEO Title</h3>
          <p className="mt-1 text-sm text-zinc-400">{tenant?.name ? `${tenant.name} — CreatorStore` : "—"}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8 text-center mt-6">
          <p className="text-sm text-zinc-500">Full SEO settings (meta descriptions, Open Graph, canonical URLs) are coming soon.</p>
          <Link href="/builder" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
            Open Builder
          </Link>
        </div>
      </div>
    </div>
  );
}
