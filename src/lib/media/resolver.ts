import { prisma } from "@/lib/prisma";

export type VariantName = "original" | "thumbnail" | "medium" | "large";

export type ViewportSize = "mobile" | "tablet" | "desktop";

/** Simple viewport-based selection rules */
const VARIANT_RULES: Record<ViewportSize, VariantName[]> = {
  mobile: ["thumbnail", "medium", "original"],
  tablet: ["medium", "original", "large"],
  desktop: ["original", "large", "medium"],
};

/**
 * AssetResolver — resolves asset IDs to public URLs with variant selection.
 * Renderers depend only on this resolver, never on raw Asset DB access.
 */
export class AssetResolver {
  /** Resolve an asset ID to its public URL (best variant). */
  async resolve(assetId: string, viewport?: ViewportSize): Promise<string | null> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId, status: "ACTIVE" },
      select: { publicUrl: true, thumbnailUrl: true, mediumUrl: true, largeUrl: true },
    });
    if (!asset) return null;

    if (viewport) {
      return this.bestVariant(asset, viewport);
    }

    return asset.publicUrl || asset.mediumUrl || asset.thumbnailUrl || null;
  }

  /**
   * Select the best variant for a given viewport.
   * Falls back through the variant chain if preferred variant is unavailable.
   */
  bestVariant(
    asset: { publicUrl: string | null; thumbnailUrl: string | null; mediumUrl: string | null; largeUrl: string | null },
    viewport: ViewportSize,
  ): string | null {
    const preferences = VARIANT_RULES[viewport];
    for (const variant of preferences) {
      const url = this.getUrl(asset, variant);
      if (url) return url;
    }
    return null;
  }

  /** Get the URL for a specific variant name. */
  getUrl(asset: { publicUrl: string | null; thumbnailUrl: string | null; mediumUrl: string | null; largeUrl: string | null }, variant: VariantName): string | null {
    switch (variant) {
      case "original": return asset.publicUrl;
      case "thumbnail": return asset.thumbnailUrl ?? asset.publicUrl;
      case "medium": return asset.mediumUrl ?? asset.publicUrl;
      case "large": return asset.largeUrl ?? asset.publicUrl;
    }
  }
}

export const assetResolver = new AssetResolver();
