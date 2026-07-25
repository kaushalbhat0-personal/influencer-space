import type { ContentSource, CreatorIntelligence, SEOIntelligence } from "./types";
import { NicheDetector } from "./niche-detector";
import { KeywordExtractor } from "./keyword-extractor";
import { CreatorProfiler } from "./creator-profiler";

export class SEOGenerator {
  constructor(
    private nicheDetector: NicheDetector,
    private keywordExtractor: KeywordExtractor,
    private creatorProfiler: CreatorProfiler,
  ) {}

  generate(source: ContentSource): SEOIntelligence {
    const profile = this.creatorProfiler.profile(source);
    const niche = this.nicheDetector.detect(source);
    const keywords = this.keywordExtractor.extract(source);
    const displayName = source.displayName || source.username;

    const pageTitle = this.generatePageTitle(displayName, niche.niche, source);
    const metaDesc = this.generateMetaDescription(profile, displayName, niche.niche);
    const focusPhrase = this.generateFocusPhrase(displayName, niche.niche);
    const slug = this.generateSlug(displayName);

    return {
      pageTitle,
      metaDescription: metaDesc,
      keywords,
      focusPhrase,
      slug,
      canonical: `https://${slug}.creatorstore.com`,
      confidence: keywords.length > 0 ? 0.7 : 0.3,
    };
  }

  private generatePageTitle(name: string, niche: string, source: ContentSource): string {
    const bio = source.bio ?? "";
    if (bio && bio.length < 100) return `${name} - ${bio.slice(0, 60)}`;
    return `${name} | Official ${this.capitalize(niche)} Creator Store`;
  }

  private generateMetaDescription(profile: CreatorIntelligence, name: string, niche: string): string {
    const followers = profile.followers > 0 ? `${this.formatNumber(profile.followers)}+ followers` : "";
    const base = `Shop official ${name} merchandise, digital products, and exclusive content.`;
    if (followers) return `${base} Join ${followers} on this ${niche} journey.`;
    return base;
  }

  private generateFocusPhrase(name: string, niche: string): string {
    return `${name} ${niche} store`;
  }

  private generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  }
}
