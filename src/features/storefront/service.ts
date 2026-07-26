import type { StorefrontData, StorefrontPage, StorefrontSlot } from "./types";

export function convertSnapshotToData(tenantId: string, snapshot: unknown): StorefrontData {
  const s = snapshot as Record<string, unknown>;
  const pages: StorefrontPage[] = [];

  if ("pages" in s && Array.isArray(s.pages)) {
    for (const page of s.pages as Array<Record<string, unknown>>) {
      const sections = (page.sections ?? []) as Array<Record<string, unknown>>;
      const slots: StorefrontSlot[] = sections.flatMap((sec) => {
        const secSlots = (sec.slots ?? []) as Array<Record<string, unknown>>;
        return secSlots.map((sl) => ({
          id: sl.id as string,
          moduleId: sl.moduleId as string,
          config: (sl.config ?? {}) as Record<string, unknown>,
          sectionOrder: sec.order as number,
        }));
      });
      pages.push({
        id: page.id as string,
        slug: page.slug as string,
        isHome: (page.isHome ?? false) as boolean,
        slots,
        seo: { title: "", description: "" },
      });
    }
  } else if ("sections" in s && Array.isArray(s.sections)) {
    const themeRecord = (s.theme ?? {}) as Record<string, string>;
    return {
      tenantId,
      pages: [{
        id: "home", slug: "home", isHome: true,
        slots: (s.sections as Array<Record<string, unknown>>).map((sec, i) => ({
          id: (sec.id as string) ?? `sec-${i}`,
          moduleId: sec.type as string,
          config: (sec.props ?? {}) as Record<string, unknown>,
        })),
        seo: {
          title: ((s.seo as Record<string, string> | undefined)?.title) ?? "",
          description: ((s.seo as Record<string, string> | undefined)?.description) ?? "",
        },
      }],
      theme: {
        primary: themeRecord.primary ?? "#6366F1",
        secondary: themeRecord.secondary ?? "#818CF8",
        accent: themeRecord.accent ?? "#A5B4FC",
        mode: (themeRecord.mode === "dark" ? "dark" : "light") as "dark" | "light",
        fonts: { heading: "Inter", body: "Inter" },
      },
      navigation: [],
    };
  }

  const themeData = (s.theme ?? s.themeColors ?? {}) as Record<string, string>;
  return {
    tenantId,
    pages,
    theme: {
      primary: themeData.primary ?? "#6366F1",
      secondary: themeData.secondary ?? "#818CF8",
      accent: themeData.accent ?? "#A5B4FC",
      mode: "dark",
      fonts: { heading: "Inter", body: "Inter" },
    },
    navigation: [],
  };
}

export function convertLegacyToData(tenantId: string, legacy: unknown): StorefrontData {
  const l = legacy as Record<string, unknown>;
  const profile = (l.profile ?? {}) as Record<string, unknown>;
  const products = (l.products ?? []) as Array<Record<string, unknown>>;
  const gallery = (l.gallery ?? []) as Array<Record<string, unknown>>;

  return {
    tenantId,
    pages: [{
      id: "home", slug: "home", isHome: true,
      slots: [
        ...(profile.name ? [{ id: "hero", moduleId: "hero.default", config: { title: profile.name, subtitle: profile.tagline } as Record<string, unknown> }] : []),
        ...(products.length > 0 ? [{ id: "products", moduleId: "products.grid", config: { items: products } }] : []),
        ...(gallery.length > 0 ? [{ id: "gallery", moduleId: "gallery.grid", config: { images: gallery } }] : []),
      ],
      seo: {
        title: (profile.name as string) ?? "CreatorStore",
        description: (profile.tagline as string) ?? "",
      },
    }],
    theme: {
      primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC",
      mode: "dark", fonts: { heading: "Inter", body: "Inter" },
    },
    navigation: [],
  };
}

export const storefrontService = {
  async getStorefrontData(tenantId: string, version?: number): Promise<StorefrontData | null> {
    const { getPublishedPageData } = await import("@/services/published.service");
    const { publishSnapshotService } = await import("@/lib/publishing/snapshot");
    const { prisma } = await import("@/lib/prisma");

    if (version) {
      const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
      if (!website) return null;
      const snap = await publishSnapshotService.get(website.id, version);
      if (!snap) return null;
      return convertSnapshotToData(tenantId, snap);
    }

    const published = await getPublishedPageData(tenantId);
    if (!published) return null;
    if (published.fromSnapshot && published.snapshot) {
      return convertSnapshotToData(tenantId, published.snapshot);
    }
    return convertLegacyToData(tenantId, published.legacy);
  },
};
