import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SectionPresentationManager } from "./_components/section-presentation-manager";
import type { SectionPresentation } from "@/modules/section-presentation";
import { componentRegistry } from "@/lib/registry/components";
import { resolveModuleId, moduleIdToDisplayName, isDeprecatedSection } from "@/lib/registry/resolve-module";

export const dynamic = "force-dynamic";

interface BlockRow {
  id: string;
  moduleId: string;
  displayName: string;
  order: number;
  visible: boolean;
  presentation: SectionPresentation | null;
}

interface SectionRow {
  id: string;
  name: string;
  order: number;
  blocks: BlockRow[];
}

interface PageRow {
  id: string;
  name: string;
  slug: string;
  isHome: boolean;
  sections: SectionRow[];
}

export default async function WebsiteSectionsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <p className="p-6 text-zinc-500">Access denied</p>;

  const website = await prisma.website.findUnique({
    where: { tenantId },
    include: {
      pages: {
        orderBy: { order: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { blocks: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  const pages: PageRow[] = (website?.pages ?? []).map((page) => ({
    id: page.id,
    name: page.name,
    slug: page.slug,
    isHome: page.isHome,
    sections: page.sections
      .map((section) => ({
        id: section.id,
        name: section.name,
        order: section.order,
        blocks: section.blocks
          .filter((b) => !isDeprecatedSection(b.moduleId))
          .map((block) => {
            const definition = componentRegistry.get(resolveModuleId(block.moduleId));
            const config = (block.config ?? {}) as Record<string, unknown>;
            const presentation = (config.presentation as SectionPresentation | undefined) ?? null;
            return {
              id: block.id,
              moduleId: block.moduleId,
              displayName: definition?.name ?? moduleIdToDisplayName(block.moduleId),
              order: block.order,
              visible: block.visible,
              presentation,
            };
          }),
      }))
      .filter((section) => section.blocks.length > 0),
  }));

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Section Headings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Edit how each section&apos;s heading is shown on your storefront — its title,
          description and visibility. These are the same settings as the Builder&apos;s
          presentation panel. Changes appear after you publish.
        </p>
      </div>

      <SectionPresentationManager initialPages={pages} />
    </div>
  );
}
