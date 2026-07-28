import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrl } from "@/lib/config/platform";
import { getPublishedPageData } from "@/services/published.service";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { DataBoundRenderer } from "@/lib/renderer/data-bound";
import { ComponentErrorBoundary } from "@/components/ui/ComponentErrorBoundary";
import { StorefrontNav } from "@/components/storefront/StorefrontNav";

export const revalidate = 60;

async function getSnapshotData(slug: string, preview?: boolean) {
  const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
  if (!tenant) return null;
  const mode = preview ? "preview" : "live";
  const published = await getPublishedPageData(tenant.id, mode);
  return { tenantId: published.tenantId, snapshot: published.snapshot };
}

function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const data = await getSnapshotData(params.domain);
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
  const data = await getSnapshotData(params.domain, isPreview);
  if (!data?.snapshot) notFound();

  const doc = layoutEngine.resolve(data.snapshot as unknown as Parameters<typeof layoutEngine.resolve>[0]);
  const { theme, navigation, jsonLd, pages } = doc;

  const allSections = pages.flatMap((p) => p.sections);

  return (
    <>
      <SkipLink />
      <StorefrontNav sections={navigation} />
      {isPreview && (
        <div
          className="sticky top-0 z-50 bg-amber-900/80 backdrop-blur-sm text-center py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200"
          role="alert"
        >
          Preview Mode — changes are not public
        </div>
      )}
      <main id="main-content" className="min-h-screen text-white pb-20 md:pb-0" style={theme as React.CSSProperties}>
        {jsonLd.map((ld: Record<string, unknown>, i: number) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        ))}
        <div className="mx-auto max-w-2xl px-4 pt-4">
          {allSections.map((section, i) => (
            <section
              key={`${section.id}-${i}`}
              id={section.moduleId?.split(".")[0] ?? `section-${i}`}
            >
              <ComponentErrorBoundary componentId={section.moduleId}>
                <DataBoundRenderer slot={{ moduleId: section.moduleId, config: section.config }} />
              </ComponentErrorBoundary>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-s8ul-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
    >
      Skip to main content
    </a>
  );
}
