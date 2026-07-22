import { publishSnapshotService } from "@/lib/publishing/snapshot";
import type { PublishSnapshotData } from "@/lib/publishing/snapshot";
import type { BuilderPage } from "@/lib/builder/types";
import { getPublicPageData } from "./public.service";
import type { PublicPageData } from "./public.service";

export interface PublishedPageResult {
  tenantId: string;
  snapshot: PublishSnapshotData | null;
  legacy: PublicPageData;
  fromSnapshot: boolean;
}

export async function getPublishedPageData(tenantId: string): Promise<PublishedPageResult> {
  const snapshot = await publishSnapshotService.getLive(tenantId);
  const legacy = await getPublicPageData(tenantId);

  if (snapshot) {
    return { tenantId, snapshot: snapshot.data, legacy, fromSnapshot: true };
  }
  return { tenantId, snapshot: null, legacy, fromSnapshot: false };
}

export function extractProfileFromPages(pages: BuilderPage[]): { name: string; tagline: string; bio: string; profileImage: string | null } {
  for (const page of pages) {
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
  return { name: "Creator", tagline: "", bio: "", profileImage: null };
}

export function extractSeoFromPages(pages: BuilderPage[]): { title: string; description: string } {
  const profile = extractProfileFromPages(pages);
  return {
    title: `${profile.name} — CreatorStore`,
    description: profile.tagline || profile.bio || "Creator storefront",
  };
}
