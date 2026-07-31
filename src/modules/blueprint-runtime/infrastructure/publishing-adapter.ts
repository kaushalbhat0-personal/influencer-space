import type { BlueprintRuntime } from "../domain/types";

export interface BlueprintPublishingData {
  tenantId: string;
  pages: Array<{ name: string; slug: string; isHome: boolean; order: number }>;
  sections: Array<{
    pageSlug: string; moduleId: string; order: number;
    config: Record<string, unknown>; visible: boolean;
  }>;
  navigation: Array<{ label: string; href: string; order: number }>;
  theme: { packageId: string; colors: Record<string, string> };
  seo: { title: string; description: string };
}

export class BlueprintPublishingAdapter {
  /** Translates resolved runtime into the legacy publishing data format. */
  toPublishingData(runtime: BlueprintRuntime): BlueprintPublishingData {
    const bp = runtime.blueprint;

    return {
      tenantId: bp.metadata.sourceInput || "",
      pages: bp.pages.map((p) => ({
        name: p.title,
        slug: p.slug,
        isHome: p.slug === "/",
        order: bp.pages.indexOf(p),
      })),
      sections: bp.pages.flatMap((page) =>
        page.sections.map((section) => ({
          pageSlug: page.slug,
          moduleId: section.type,
          order: section.order,
          config: section.configuration,
          visible: true,
        })),
      ),
      navigation: bp.navigation.items.map((item) => ({
        label: item.label,
        href: item.href,
        order: item.order,
      })),
      theme: {
        packageId: bp.theme.packageId,
        colors: {
          primary: bp.branding.primaryColor,
          secondary: bp.branding.secondaryColor,
        },
      },
      seo: {
        title: bp.seo.globalTitle,
        description: bp.seo.globalDescription,
      },
    };
  }
}

export const publishingAdapter = new BlueprintPublishingAdapter();
