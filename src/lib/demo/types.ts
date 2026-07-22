/**
 * Demo Factory — Type System
 *
 * Every demo is generated from a DemoSeed — a complete content blueprint.
 * Seeds are versioned. Generated demos carry seedVersion + generatorVersion.
 */

export type DemoStatus = "pending" | "generating" | "published" | "failed" | "archived";

export interface DemoSeed {
  id: string;
  industry: string;
  persona: string;
  audience: string;
  brand: {
    name: string;
    tagline: string;
    voice: string;
    palette: { primary: string; secondary: string; };
  };
  content: {
    bio: string; hero: string; about: string; seoTitle: string; seoDesc: string;
  };
  products: { name: string; price: number; description: string; }[];
  testimonials: { name: string; text: string; }[];
  faq: { q: string; a: string; }[];
  pages: string[];
}

export interface DemoGenerationResult {
  seedId: string;
  status: DemoStatus;
  tenantId: string;
  storefrontUrl: string;
  productCount: number;
  seedVersion: string;
  generatorVersion: string;
  generatedAt: string;
  generatedBy: string;
  error?: string;
}

export interface DemoLibraryEntry extends DemoGenerationResult {
  industry: string;
  persona: string;
}
