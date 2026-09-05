import { getNavigation } from "@/actions/navigation.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavigationManager } from "./_components/navigation-manager";

export const dynamic = "force-dynamic";

export default async function WebsiteNavigationPage() {
  const result = await getNavigation();

  // RCCF-IMPLEMENTATION-09B (Phase 4): the nav manager can add internal/page
  // items that link to real storefront pages. Available page slugs come from
  // the tenant's builder pages (non-home), so nav never links to a dead route.
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  const website = tenantId
    ? await prisma.website.findUnique({
        where: { tenantId },
        select: {
          pages: {
            where: { isHome: false },
            select: { slug: true, name: true },
            orderBy: { order: "asc" },
          },
        },
      })
    : null;
  const pages = (website?.pages ?? [])
    .map((p) => ({ slug: p.slug.replace(/^\/+/, ""), name: p.name }))
    .filter((p) => p.slug.length > 0);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="platform-display">Navigation</h1>
        <p className="platform-body mt-1.5">Manage your website&apos;s navigation menu. Changes are saved immediately and included in the next publish.</p>
      </div>
      <NavigationManager initialItems={result.success ? result.data ?? [] : []} availablePages={pages} />
    </div>
  );
}
