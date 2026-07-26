import type { ContentSource, BrandIntelligence } from "./types";

export class BrandExtractor {
  extract(source: ContentSource): BrandIntelligence {
    const text = this.getAllText(source);
    const lower = text.toLowerCase();

    const name = this.extractBrandName(source);
    const tagline = this.generateTagline(source);
    const colors = this.extractColors(text);
    const existingBranding = this.hasExistingBranding(source);

    const humorousCheck = /lol|lmao|funny|hilarious|joke|meme/i;
    const inspirationalCheck = /inspire|motivate|dream|believe|journey|purpose|passion/i;
    const educationalCheck = /learn|teach|guide|tutorial|lesson|tip|trick|knowledge/i;
    const professionalCheck = /business|expert|professional|consultant|specialist|official/i;

    let brandVoice: BrandIntelligence["brandVoice"] = "casual";
    if (professionalCheck.test(lower)) brandVoice = "professional";
    else if (educationalCheck.test(lower)) brandVoice = "educational";
    else if (inspirationalCheck.test(lower)) brandVoice = "inspirational";
    else if (humorousCheck.test(lower)) brandVoice = "humorous";

    const confidence = this.calculateConfidence(source, existingBranding);

    return {
      name,
      tagline,
      description: source.bio ?? "",
      colors,
      logo: null,
      existingBranding,
      brandVoice,
      confidence,
    };
  }

  private extractBrandName(source: ContentSource): string {
    if (source.displayName && source.displayName !== source.username) {
      return source.displayName;
    }
    return source.username.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private generateTagline(source: ContentSource): string {
    if (source.bio && source.bio.length > 30) {
      const sentences = source.bio.split(/[.!?]/).filter((s) => s.trim().length > 10);
      if (sentences.length > 0) return sentences[0]!.trim();
    }
    return `Welcome to ${source.displayName || source.username}'s official store`;
  }

  private extractColors(text: string): string[] {
    const colorMap: Record<string, string> = {
      red: "#EF4444", blue: "#3B82F6", green: "#22C55E", yellow: "#EAB308",
      purple: "#A855F7", pink: "#EC4899", orange: "#F97316", teal: "#14B8A6",
      cyan: "#06B6D4", indigo: "#6366F1", emerald: "#10B981", rose: "#F43F5E",
      amber: "#F59E0B", violet: "#8B5CF6", fuchsia: "#D946EF", lime: "#84CC16",
      slate: "#64748B", gray: "#6B7280", black: "#000000", white: "#FFFFFF",
    };

    const found: string[] = [];
    for (const [color, hex] of Object.entries(colorMap)) {
      const regex = new RegExp(`\\b${color}\\b`, "i");
      if (regex.test(text) && !found.includes(hex)) found.push(hex);
    }
    return found.slice(0, 3);
  }

  private hasExistingBranding(source: ContentSource): boolean {
    return source.bio?.toLowerCase().includes("official")
      || source.bio?.toLowerCase().includes("brand")
      || source.bio?.toLowerCase().includes("shop")
      || source.bio?.toLowerCase().includes("store")
      || source.bio?.toLowerCase().includes("merch")
      || source.links?.length > 0;
  }

  private calculateConfidence(source: ContentSource, hasBranding: boolean): number {
    let score = 0.3;
    if (source.bio && source.bio.length > 50) score += 0.2;
    if (hasBranding) score += 0.2;
    if (source.followers > 10000) score += 0.15;
    if (source.displayName) score += 0.15;
    return Math.min(score, 1);
  }

  private getAllText(source: ContentSource): string {
    const parts: string[] = [source.bio ?? ""];
    for (const item of source.content ?? []) {
      parts.push(item.text ?? "");
    }
    return parts.join(" ");
  }
}
