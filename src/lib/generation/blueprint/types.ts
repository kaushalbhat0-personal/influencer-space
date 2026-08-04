/**
 * Website Blueprint types — IMPLEMENTATION-37.
 */
import type { BlueprintTemplate, SectionPlan } from "./config";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  order: number;
}

export interface WebsiteBlueprint {
  version: number;
  entity: string | null;
  layout: string;
  sections: SectionPlan[];
  /** Sections that will actually render (required + recommended + optional). */
  visibleSections: string[];
  navigation: NavigationItem[];
  cta: { primary: string; secondary: string };
  theme: {
    family: string;
    typography: string;
    spacing: string;
    animationDensity: string;
    visualTone: string;
    colorDirection: string;
  };
  seo: BlueprintTemplate["seo"];
  analytics: string[];
  monetization: string[];
  integrations: string[];
  publishing: {
    title: string;
    description: string;
    subdomain: string;
  };
  evidence: {
    entity: string | null;
    niches: string[];
    businessModels: string[];
    audience: string[];
    relationshipChains: string[];
    reinforcedEntities: string[];
    brands: string[];
  };
  diagnostics: {
    sectionCount: number;
    visibleCount: number;
    integrationCount: number;
    monetizationCount: number;
  };
}
