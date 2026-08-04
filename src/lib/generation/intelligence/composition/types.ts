/**
 * Storefront Composition types — IMPLEMENTATION-38.
 */
import type { SectionDecision } from "@/lib/generation/blueprint/config";

export interface SectionComposition {
  id: string;
  label: string;
  decision: SectionDecision;
  type: string; // artifact SectionType (resolveModuleId-compatible)
  moduleId: string; // existing registry component
  order: number;
  props: Record<string, unknown>;
  mapping: "exact" | "closest";
  reason: string;
}

export interface BuilderDraft {
  /** builder_artifact shape (buildBuilderArtifactData-compatible). */
  artifact: {
    sections: Array<{ id: string; type: string; props: Record<string, unknown> }>;
    navigation: Array<{ id: string; label: string; href: string }>;
    theme: string;
    metadata: Record<string, unknown>;
  };
  pages: Array<{
    id: string;
    name: string;
    slug: string;
    order: number;
    isHome: boolean;
    theme: string;
    sections: Array<{
      id: string;
      name: string;
      order: number;
      visible: boolean;
      locked: boolean;
      slots: Array<{ id: string; moduleId: string; parentId: string | null; order: number; visible: boolean; locked: boolean; config: Record<string, unknown> }>;
    }>;
  }>;
}

export interface StorefrontComposition {
  version: number;
  blueprintVersion: number;
  entity: string | null;
  theme: { themeId: string; themeFamily: string | null };
  layout: string;
  sections: SectionComposition[];
  visibleSections: string[];
  navigation: Array<{ id: string; label: string; href: string }>;
  seo: {
    title: string;
    description: string;
    keywords: string[];
    structuredDataType: string;
    openGraphType: string;
    canonical: string;
  };
  analytics: string[];
  publishing: { title: string; description: string; subdomain: string };
  media: { hero: { resolvedMedia: string; mediaUrl: string | null; mediaPoster: string | null; rendererDecision: string } };
  builder: BuilderDraft;
  diagnostics: {
    sectionCount: number;
    visibleCount: number;
    unmappedSections: string[];
    themeMapping: string;
    heroVariant: string;
    deterministicSignature: string;
  };
}
