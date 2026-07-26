import { prisma } from "@/lib/prisma";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import type { SnapshotData } from "@/lib/publishing/snapshot";
import type { BuilderPage } from "@/lib/builder/types";
import { getPublicPageData } from "./public.service";
import type { PublicPageData } from "./public.service";

export interface PublishedPageResult {
  tenantId: string;
  websiteId: string;
  snapshot: SnapshotData | null;
  legacy: PublicPageData;
  fromSnapshot: boolean;
}

export async function getPublishedPageData(tenantId: string): Promise<PublishedPageResult> {
  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: { id: true },
  });

  if (!website) {
    console.error(`[published-service] Website not found for tenantId=${tenantId}`);
    const legacy = await getPublicPageData(tenantId);
    return { tenantId, websiteId: "", snapshot: null, legacy, fromSnapshot: false };
  }

  const snapshot = await publishSnapshotService.getLive(website.id);
  const legacy = await getPublicPageData(tenantId);

  if (snapshot) {
    return { tenantId, websiteId: website.id, snapshot: snapshot.data, legacy, fromSnapshot: true };
  }
  return { tenantId, websiteId: website.id, snapshot: null, legacy, fromSnapshot: false };
}

export function extractProfileFromPages(snapshot: SnapshotData): { name: string; tagline: string; bio: string; profileImage: string | null } {
  if ("themePackageId" in snapshot) {
    const legacy = snapshot as { pages: BuilderPage[] };
    for (const page of legacy.pages) {
      for (const section of page.sections) {
        for (const slot of section.slots) {
          const config = slot.config as Record<string, string>;
          if (slot.moduleId.startsWith("hero.") && config.title) {
            return { name: config.title, tagline: config.subtitle || "", bio: config.subtitle || "", profileImage: null };
          }
          if (slot.moduleId === "about.default" && config.title) {
            return { name: config.title.replace("About ", ""), tagline: "", bio: config.content || "", profileImage: config.imageUrl || null };
          }
        }
      }
    }
  } else {
    const artifact = snapshot as { sections: Array<{ type: string; props: Record<string, unknown> }> };
    for (const section of artifact.sections) {
      const props = section.props as Record<string, string>;
      if (section.type === "hero" && props.headline) {
        return { name: props.headline, tagline: props.subheadline || "", bio: props.subheadline || "", profileImage: null };
      }
      if (section.type === "about" && props.title) {
        return { name: (props.title as string).replace("About ", ""), tagline: "", bio: props.bio || "", profileImage: null };
      }
    }
  }
  return { name: "Creator", tagline: "", bio: "", profileImage: null };
}

export function extractSeoFromPages(snapshot: SnapshotData): { title: string; description: string } {
  if ("seo" in snapshot && !("themePackageId" in snapshot)) {
    const artifact = snapshot as { seo?: { title?: string; description?: string } };
    if (artifact.seo) {
      return { title: artifact.seo.title || "CreatorStore", description: artifact.seo.description || "Creator storefront" };
    }
  }
  const profile = extractProfileFromPages(snapshot);
  return {
    title: `${profile.name} — CreatorStore`,
    description: profile.tagline || profile.bio || "Creator storefront",
  };
}
