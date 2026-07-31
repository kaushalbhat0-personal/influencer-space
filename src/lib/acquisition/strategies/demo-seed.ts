import type { CreatorAcquisitionAdapter, AcquisitionResult } from "@/lib/acquisition/types";
import type { BusinessProfile } from "@/lib/acquisition/business-types";
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
        businessName: seed.brand.name,
        ownerName: seed.brand.name,
        category: seed.industry,
        industry: seed.industry,
        tagline: seed.brand.tagline,
        description: seed.content.bio || seed.content.about,
        audience: seed.audience,
        goals: "",
        tone: seed.brand.voice,
        offers: seed.products.map((p: { name: string; price: number; description: string }) => ({ id: p.name.replace(/\s+/g, "_").toLowerCase(), type: "digital_download", name: p.name, description: p.description, price: p.price, currency: "INR" })),
        socialLinks: [],
        palette: seed.brand.palette,
        pages: seed.pages,
      } as BusinessProfile,
    };
  }

  private emptyProfile(): BusinessProfile {
    return {
      businessName: "", ownerName: "", category: "", industry: "",
      tagline: "", description: "", audience: "", goals: "", tone: "",
      offers: [], socialLinks: [],
      palette: { primary: "#6366f1", secondary: "#a78bfa" },
      pages: [],
    };
  }
}
