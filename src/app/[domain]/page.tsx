import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { getStorefrontData, getCanonicalUrl } from "@/lib/storefront/storefront-loader";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";

// IMPLEMENTATION-16: no ISR/content cache on the storefront. Content is ALWAYS
// live (websiteAggregate.build on every request); a cached page would show
// stale content and diverge from the Builder. The page is dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const data = await getStorefrontData(params.domain, false, { homepage: true });
  if (!data?.snapshot) return {};

  const doc = layoutEngine.resolve(data.snapshot as unknown as Parameters<typeof layoutEngine.resolve>[0]);
  const { metadata } = doc;

  return {
    title: metadata.title,
    description: metadata.description,
    robots: { index: true, follow: true },
    alternates: { canonical: metadata.canonicalUrl || getCanonicalUrl(params.domain) },
    openGraph: metadata.openGraph,
    twitter: metadata.twitter,
    other: {
      "application/ld+json": doc.jsonLd.map((j) => JSON.stringify(j)).join("\n"),
    },
  };
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: { domain: string };
  searchParams: { preview?: string };
}) {
  const isPreview = searchParams.preview === "true";
  const data = await getStorefrontData(params.domain, isPreview, { homepage: true });
  if (!data) notFound();

  return (
    <StorefrontPage data={data} domain={params.domain} isPreview={data.previewAuthorized} pageSlug={null} />
  );
}
