import type { CreatorImportAdapter, ImportAnalysisResult } from "@/lib/import/types";
import { DEMO_SEEDS } from "@/lib/demo/seeds";

export class DemoSeedAdapter implements CreatorImportAdapter {
  source = "demo_seed" as const;
  label = "Demo Seed";
  description = "Pre-built creator website from a template seed";

  validate(input: string): { valid: boolean; error?: string } {
    const seed = DEMO_SEEDS.find((s) => s.id === input);
    return seed ? { valid: true } : { valid: false, error: `Unknown seed "${input}".` };
  }

  async analyze(input: string): Promise<ImportAnalysisResult> {
    const seed = DEMO_SEEDS.find((s) => s.id === input);
    if (!seed) {
      return { confidence: 0, completeness: 0, warnings: ["Seed not found"], creatorProfile: this.emptyProfile() };
    }

    const filled = seed.products.filter((p) => p.name && p.price > 0).length;
    const total = seed.products.length;
    const completeness = Math.round(((filled / Math.max(total, 1)) * 50) + 25 + (seed.content.bio ? 10 : 0) + (seed.content.about ? 10 : 0) + (seed.content.seoTitle ? 5 : 0));

    return {
      confidence: 95,
      completeness: Math.min(completeness, 100),
      warnings: [],
      creatorProfile: {
        source: "demo_seed",
        creatorName: seed.brand.name,
        brandName: seed.brand.name,
        tagline: seed.brand.tagline,
        bio: seed.content.bio,
        heroTitle: seed.content.hero,
        aboutText: seed.content.about,
        tone: seed.brand.voice,
        niche: seed.industry,
        audience: seed.audience,
        products: seed.products,
        services: [],
        socialLinks: [],
        seoTitle: seed.content.seoTitle,
        seoDesc: seed.content.seoDesc,
        palette: seed.brand.palette,
        faq: seed.faq,
        testimonials: seed.testimonials,
        pages: seed.pages,
        isDemo: true,
        seedId: seed.id,
      },
    };
  }

  private emptyProfile() {
    return {
      source: "demo_seed" as const, creatorName: "", brandName: "", tagline: "", bio: "", heroTitle: "",
      aboutText: "", tone: "", niche: "", audience: "", products: [], services: [], socialLinks: [],
      seoTitle: "", seoDesc: "", palette: { primary: "#6366f1", secondary: "#a78bfa" },
      faq: [], testimonials: [], pages: [], isDemo: false,
    };
  }
}
