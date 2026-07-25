import type { ContentSource, CreatorIntelligence } from "./types";
import { NicheDetector } from "./niche-detector";

export class CreatorProfiler {
  constructor(private nicheDetector: NicheDetector) {}

  profile(source: ContentSource): CreatorIntelligence {
    const niche = this.nicheDetector.detect(source);
    const subNiches = this.nicheDetector.detectSubNiches(source);
    const frequency = this.detectFrequency(source);
    const confidence = this.calculateConfidence(source);

    return {
      name: source.displayName || source.username,
      username: source.username,
      bio: source.bio || "",
      niche: niche.niche,
      subNiche: subNiches,
      platform: source.platform,
      followers: source.followers,
      engagement: source.engagement,
      contentFrequency: frequency,
      verified: false,
      confidence,
    };
  }

  private detectFrequency(source: ContentSource): "daily" | "weekly" | "monthly" | "irregular" {
    const items = source.content ?? [];
    if (items.length < 2) return "irregular";

    const dates = items
      .map((i) => new Date(i.createdAt).getTime())
      .filter((t) => !isNaN(t))
      .sort();

    if (dates.length < 2) return "irregular";

    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push(dates[i]! - dates[i - 1]!);
    }

    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const days = avgGap / (1000 * 60 * 60 * 24);

    if (days <= 1.5) return "daily";
    if (days <= 8) return "weekly";
    if (days <= 35) return "monthly";
    return "irregular";
  }

  private calculateConfidence(source: ContentSource): number {
    let score = 0.3;
    if (source.followers > 0) score += 0.15;
    if (source.bio && source.bio.length > 20) score += 0.15;
    if ((source.content?.length ?? 0) >= 5) score += 0.2;
    if (source.engagement > 0) score += 0.1;
    if (source.posts > 0) score += 0.1;
    return Math.min(score, 1);
  }
}
