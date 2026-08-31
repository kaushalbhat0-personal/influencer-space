import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { legalService } from "@/lib/legal/service";
import { getStorefrontData, getCanonicalUrl } from "@/lib/storefront/storefront-loader";
import { StorefrontChrome } from "@/components/storefront/StorefrontChrome";

export const dynamic = "force-dynamic";

async function resolveTenantId(domain: string) {
  const t = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: domain }, { customDomain: domain }] }, select: { id: true, name: true } });
  return t;
}

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const tenant = await resolveTenantId(params.domain);
  if (!tenant) return {};
  const legal = await legalService.get(tenant.id, "refund");
  return {
    title: `${legal.title} — ${tenant.name}`,
    description: legal.content.slice(0, 160),
    robots: { index: true, follow: true },
    alternates: { canonical: `${getCanonicalUrl(params.domain)}/refund` },
  };
}

export default async function RefundPage({ params, searchParams }: { params: { domain: string }; searchParams: { preview?: string } }) {
  const isPreview = searchParams.preview === "true";
  const data = await getStorefrontData(params.domain, isPreview, { homepage: true });
  if (!data) notFound();
  const tenant = await resolveTenantId(params.domain);
  if (!tenant) notFound();
  const legal = await legalService.get(tenant.id, "refund");
  return (
    <StorefrontChrome data={data} isPreview={isPreview && data.previewAuthorized}>
      <article className="prose prose-invert mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-white">{legal.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">For {tenant.name}</p>
        <div className="mt-8 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{legal.content}</div>
        <p className="mt-8 text-xs text-zinc-500">These are general templates and should be reviewed and customized for your business and local requirements.</p>
      </article>
    </StorefrontChrome>
  );
}
