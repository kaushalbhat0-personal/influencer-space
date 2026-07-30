import type { CreatorAcquisitionAdapter, AcquisitionResult } from "@/lib/acquisition/types";
import { Grid } from "lucide-react";
import { DEMO_SEEDS } from "@/lib/demo/seeds";

export class DemoSeedAcquisitionAdapter implements CreatorAcquisitionAdapter {
  id = "demo_seed" as const;
  label = "Demo Seed";
  description = "Pre-built creator website from a template seed";
  icon = Grid;
  requiresManualReview = false;
  typicalConfidence = 95;

  validate(input: string): { valid: boolean; error?: string } {
    const seed = DEMO_SEEDS.find((s) => s.id === input);
    return seed ? { valid: true } : { valid: false, error: `Unknown seed "${input}".` };
  }

  async acquire(input: string): Promise<AcquisitionResult> {
    const seed = DEMO_SEEDS.find((s) => s.id === input);
    if (!seed) {
      return {
        strategy: "demo_seed",
        rawInput: input,
        confidence: 0,
        completeness: 0,
        warnings: ["Seed not found"],
        requiresManualReview: true,
        profile: this.emptyProfile(),
      };
    }

    const filled = seed.products.filter((p) => p.name && p.price > 0).length;
    const total = seed.products.length;
    const completeness = Math.round(((filled / Math.max(total, 1)) * 50) + 25 + (seed.content.bio ? 10 : 0) + (seed.content.about ? 10 : 0) + (seed.content.seoTitle ? 5 : 0));

    return {
      strategy: "demo_seed",
      rawInput: input,
      confidence: 95,
      completeness: Math.min(completeness, 100),
      warnings: [],
      requiresManualReview: false,
      providerMetadata: { seedId: seed.id },
      profile: {
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
      },
    };
  }

  private emptyProfile() {
    return {
      creatorName: "", brandName: "", tagline: "", bio: "", heroTitle: "",
      aboutText: "", tone: "", niche: "", audience: "", products: [], services: [], socialLinks: [],
      seoTitle: "", seoDesc: "", palette: { primary: "#6366f1", secondary: "#a78bfa" },
      faq: [], testimonials: [], pages: [],
    };
  }
}
