// ── StorefrontDocument ────────────────────────────────────
// Output of LayoutEngine. Pure data — no runtime objects.
// The storefront page renders this document directly.

export interface StorefrontDocument {
  version: number;

  metadata: {
    title: string;
    description: string;
    canonicalUrl: string;
    openGraph: Record<string, string>;
    twitter: Record<string, string>;
  };

  theme: Record<string, string>;

  navigation: Array<{
    id: string;
    label: string;
    enabled: boolean;
  }>;

  jsonLd: Array<Record<string, unknown>>;

  pages: Array<{
    id: string;
    name: string;
    slug: string;
    isHome: boolean;
    sections: Array<{
      id: string;
      moduleId: string;
      config: Record<string, unknown>;
      order: number;
      visible: boolean;
    }>;
  }>;

  renderingHints: {
    sectionVisibility?: Record<string, "visible" | "hidden" | "auto">;
    responsive?: Record<string, { mobile?: boolean; tablet?: boolean; desktop?: boolean }>;
    animations?: Record<string, { id: string; duration?: number }>;
    customCss?: string;
  };
}
