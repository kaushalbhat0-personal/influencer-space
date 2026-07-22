import type { CreatorImportAdapter, ImportAnalysisResult } from "@/lib/import/types";

export class ManualAdapter implements CreatorImportAdapter {
  source = "manual" as const;
  label = "Manual Creator";
  description = "Enter creator details by hand";

  validate(input: string): { valid: boolean; error?: string } {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, error: "Name is required." };
    if (trimmed.length < 2) return { valid: false, error: "Name must be at least 2 characters." };
    return { valid: true };
  }

  async analyze(input: string): Promise<ImportAnalysisResult> {
    const name = input.trim();
    return {
      confidence: 30,
      completeness: 10,
      warnings: [
        "No products detected — add at least one before publishing.",
        "Brand color could not be inferred.",
        "SEO fields are empty.",
      ],
      creatorProfile: {
        source: "manual",
        creatorName: name,
        brandName: name,
        tagline: "",
        bio: "",
        heroTitle: `Welcome to ${name}`,
        aboutText: "",
        tone: "",
        niche: "",
        audience: "",
        products: [],
        services: [],
        socialLinks: [],
        seoTitle: name,
        seoDesc: `Official storefront of ${name}`,
        palette: { primary: "#6366f1", secondary: "#a78bfa" },
        faq: [],
        testimonials: [],
        pages: ["home", "products", "about", "contact"],
        isDemo: false,
      },
    };
  }
}
