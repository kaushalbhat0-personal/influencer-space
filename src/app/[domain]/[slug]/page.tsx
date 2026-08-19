import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { getStorefrontData, getCanonicalUrl, normalizePageSlug } from "@/lib/storefront/storefront-loader";
import { buildPageSeoDefaults } from "@/lib/storefront/page-resolver";
import { getRegisteredPageBySlug } from "@/lib/pages/registry";
import { StorefrontPage } from "@/components/storefront/StorefrontPage";

// IMPLEMENTATION-16: no ISR/content cache on the storefront — content is always
// live. Independent pages are equally dynamic.
export const dynamic = "force-dynamic";

/**
 * RCCF-IMPLEMENTATION-09B (Phase 2) — Independent public page.
 * Resolves a page from the published snapshot by slug and renders its sections
 * through the exact same ExperienceSection + DataBoundRenderer path as the
 * homepage. No new page framework — the generic Page + Section + registry
 * renderer architecture is reused verbatim.
 */
export async function generateMetadata({ params }: { params: { domain: string; slug: string } }): Promise<Metadata> {
  const data = await getStorefrontData(params.domain);
  if (!data?.snapshot) return {};
  const doc = layoutEngine.resolve(data.snapshot as unknown as Parameters<typeof layoutEngine.resolve>[0]);
  const normalized = normalizePageSlug(params.slug);
  const page = doc.pages.find((p) => normalizePageSlug(p.slug) === normalized);
  if (!page) return {};

  const { metadata } = doc;
  const base = getCanonicalUrl(params.domain);
  const canonical = `${base}/${normalized}`;

  // RCCF-IMPLEMENTATION-09B (Phase 5): page-level SEO from PAGE_REGISTRY
  // defaults ({creatorName} substituted) when a registered page matches the
  // slug; otherwise the page name + site title. Canonical points at the page.
  const registered = getRegisteredPageBySlug(normalized);
  const creatorName = doc.metadata.title.split("—")[0]?.trim() || "";
  const seo = buildPageSeoDefaults(
    registered,
    page.name,
    metadata.title,
    creatorName,
  );
  const title = seo.title || page.name || metadata.title;

  return {
    title,
    description: seo.description || metadata.description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      ...metadata.openGraph,
      title,
      description: seo.description || metadata.description,
      url: canonical,
    },
    twitter: {
      ...metadata.twitter,
      title,
      description: seo.description || metadata.description,
    },
  };
}

export default async function StorefrontSlugPage({
  params,
  searchParams,
}: {
  params: { domain: string; slug: string };
  searchParams: { preview?: string };
}) {
  const isPreview = searchParams.preview === "true";
  const data = await getStorefrontData(params.domain, isPreview);
  if (!data) notFound();

  return (
    <StorefrontPage data={data} domain={params.domain} isPreview={data.previewAuthorized} pageSlug={normalizePageSlug(params.slug)} />
  );
}
