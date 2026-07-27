export interface PublishedSnapshot {
  metadata: SnapshotMetadata;
  layout: LayoutSnapshot;
  content: Record<string, unknown>;
  renderingHints: RenderingHints;
}

export interface SnapshotMetadata {
  version: number;
  publishedAt: string;
  previousVersion: number | null;
  correlationId: string;
  generatedBy: "dashboard" | "onboarding";
}

export interface LayoutSnapshot {
  pages: Array<{
    id: string;
    name: string;
    slug: string;
    isHome: boolean;
    order: number;
    sections: Array<{
      id: string;
      type: string;
      config: Record<string, unknown>;
      order: number;
      visible: boolean;
    }>;
  }>;
  theme: {
    packageId: string;
    colors: Record<string, string>;
    fonts: Record<string, string>;
  };
}

export interface RenderingHints {
  sectionVisibility?: Record<string, "visible" | "hidden" | "auto">;
  responsive?: Record<string, { mobile?: boolean; tablet?: boolean; desktop?: boolean }>;
  animations?: Record<string, { id: string; duration?: number }>;
  customCss?: string;
}
