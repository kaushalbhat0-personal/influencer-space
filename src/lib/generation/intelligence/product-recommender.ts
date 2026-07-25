import type { ContentSource, ProductIntelligence } from "./types";
import { NicheDetector } from "./niche-detector";
import { PRODUCT_RECOMMENDATIONS } from "./types";

export class ProductRecommender {
  constructor(private nicheDetector: NicheDetector) {}

  recommend(source: ContentSource): ProductIntelligence[] {
    const niche = this.nicheDetector.detect(source);
    const products = PRODUCT_RECOMMENDATIONS[niche.niche] ?? PRODUCT_RECOMMENDATIONS.lifestyle;

    return products.map((p, i) => ({
      name: p.name,
      type: p.type as ProductIntelligence["type"],
      category: p.category,
      description: this.generateDescription(p.name, p.category),
      priceRange: p.priceRange,
      recommended: i < 2,
      reason: this.generateReason(p.name, niche.niche, i),
      confidence: Math.max(0.9 - i * 0.2, 0.3),
    }));
  }

  private generateDescription(name: string, category: string): string {
    const descs: Record<string, string> = {
      Apparel: `High-quality ${name.toLowerCase()} featuring premium materials and exclusive designs.`,
      Education: `Comprehensive ${name.toLowerCase()} designed to help you master new skills.`,
      Coaching: `Personalized ${name.toLowerCase()} tailored to your specific goals and needs.`,
      "Digital Art": `Exclusive ${name.toLowerCase()} created for true fans and collectors.`,
      Guides: `Curated ${name.toLowerCase()} packed with insider knowledge and tips.`,
      Tools: `Professional-grade ${name.toLowerCase()} to streamline your workflow.`,
      Software: `Powerful ${name.toLowerCase()} built for modern creators and businesses.`,
      Nutrition: `Science-backed ${name.toLowerCase()} designed for optimal results.`,
      Music: `Original ${name.toLowerCase()} crafted with passion and precision.`,
      Photography: `Stunning ${name.toLowerCase()} captured through a unique creative lens.`,
      Resources: `Essential ${name.toLowerCase()} for creators at every level.`,
      Kitchen: `Premium ${name.toLowerCase()} for the modern kitchen enthusiast.`,
      Media: `Curated ${name.toLowerCase()} delivering value with every edition.`,
      Advertising: `Strategic ${name.toLowerCase()} solutions for brand growth.`,
      Productivity: `Thoughtfully designed ${name.toLowerCase()} to boost your daily output.`,
      Fitness: `Effective ${name.toLowerCase()} built for real results.`,
      Art: `Unique ${name.toLowerCase()} showcasing original creative expression.`,
      "Developer Tools": `Essential ${name.toLowerCase()} for modern development workflows.`,
      "Developer Resources": `Curated ${name.toLowerCase()} to accelerate your development.`,
    };
    return descs[category] ?? `Premium ${name.toLowerCase()} for dedicated fans.`;
  }

  private generateReason(name: string, niche: string, index: number): string {
    const reasons = [
      `Most ${niche} creators successfully sell ${name.toLowerCase()}`,
      `High demand product in the ${niche} category`,
      `Recommended based on your audience size and engagement`,
    ];
    return reasons[Math.min(index, reasons.length - 1)]!;
  }
}
