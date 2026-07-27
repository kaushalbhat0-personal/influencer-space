/* eslint-disable @typescript-eslint/no-explicit-any */
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

async function getSnapshotData(slug: string) {
  const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
  if (!tenant) return null;
  const published = await getPublishedPageData(tenant.id);
  return { tenantId: published.tenantId, snapshot: published.snapshot };
}

function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const data = await getSnapshotData(params.domain);
  if (!data?.snapshot) return {};

  const doc = layoutEngine.resolve(data.snapshot as any);
  const { metadata, jsonLd } = doc;

  return {
    title: metadata.title,
    description: metadata.description,
    robots: { index: true, follow: true },
    alternates: { canonical: metadata.canonicalUrl || getCanonicalUrl(params.domain) },
    openGraph: metadata.openGraph as any,
    twitter: metadata.twitter as any,
    other: {
      "application/ld+json": jsonLd.map((j: any) => JSON.stringify(j)).join("\n"),
    },
  };
}

export default async function PublicPage({ params }: { params: { domain: string } }) {
  const data = await getSnapshotData(params.domain);
  if (!data?.snapshot) notFound();

  const doc = layoutEngine.resolve(data.snapshot as any);
  const { theme, navigation, jsonLd, pages } = doc;

  const allSections = pages.flatMap((p) => p.sections);

  return (
    <main className="min-h-screen text-white pb-20 md:pb-0" style={theme as React.CSSProperties}>
      <StorefrontNav sections={navigation} />
      {jsonLd.map((ld: any, i: number) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <div className="mx-auto max-w-2xl px-4 pt-4">
        {allSections.map((section, i) => (
          <ComponentErrorBoundary key={`${section.id}-${i}`} componentId={section.moduleId}>
            <DataBoundRenderer slot={{ moduleId: section.moduleId, config: section.config }} />
          </ComponentErrorBoundary>
        ))}
      </div>
    </main>
  );
}
