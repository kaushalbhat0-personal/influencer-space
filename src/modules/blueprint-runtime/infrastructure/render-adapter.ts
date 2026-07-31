import type { BlueprintRuntime, ResolvedPage } from "../domain/types";

export interface StorefrontRenderData {
  pages: ResolvedPage[];
  navigation: Array<{ label: string; href: string; order: number }>;
  theme: { packageId: string; colors: Record<string, string> };
  globalSections: Array<{ moduleId: string; config: Record<string, unknown> }>;
  metadata: { title: string; description: string };
}

export class BlueprintRenderAdapter {
  /** Translates resolved runtime into the legacy storefront render format. */
  toRenderData(runtime: BlueprintRuntime): StorefrontRenderData {
    const bp = runtime.blueprint;

    return {
      pages: runtime.resolved.pages,
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
      globalSections: runtime.resolved.globalSections.map((s) => ({
        moduleId: s.type,
        config: s.configuration,
      })),
      metadata: {
        title: bp.seo.globalTitle,
        description: bp.seo.globalDescription,
      },
    };
  }
}

export const renderAdapter = new BlueprintRenderAdapter();
