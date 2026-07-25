import type { ContentSource, ContentItem, ContentIntelligence } from "./types";

export class ContentAnalyzer {
  analyze(source: ContentSource): ContentIntelligence {
    const items = source.content ?? [];
    const textItems = items.filter((i) => i.text && i.text.length > 0);

    const typeCounts = this.countByType(items);
    const topContentTypes = this.getTopTypes(typeCounts);

    const hashtags = this.extractAllHashtags(items);
    const commonHashtags = this.getTopHashtags(hashtags, 10);

    const avgLength = textItems.length > 0
      ? textItems.reduce((sum, i) => sum + i.text.length, 0) / textItems.length
      : 0;

    const schedule = this.detectPostingSchedule(items);
    const quality = this.assessContentQuality(items, source.engagement);
    const topics = this.extractCommonTopics(textItems);
    const readTime = avgLength > 0 ? Math.ceil(avgLength / 200) : 0;

    const confidence = this.calculateConfidence(items.length, textItems.length);

    return {
      topContentTypes,
      averagePostLength: Math.round(avgLength),
      commonHashtags,
      commonTopics: topics.slice(0, 8),
      postingSchedule: schedule,
      contentQuality: quality,
      estimatedReadTime: readTime,
      confidence,
    };
  }

  private countByType(items: ContentItem[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.type] = (counts[item.type] ?? 0) + 1;
    }
    return counts;
  }

  private getTopTypes(counts: Record<string, number>): string[] {
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  private extractAllHashtags(items: ContentItem[]): string[] {
    const tags: string[] = [];
    for (const item of items) {
      tags.push(...(item.hashtags ?? []));
    }
    return tags;
  }

  private getTopHashtags(tags: string[], limit: number): string[] {
    const counts = new Map<string, number>();
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  private detectPostingSchedule(items: ContentItem[]): string {
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

    const avgGapMs = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    const avgGapDays = avgGapMs / (1000 * 60 * 60 * 24);

    if (avgGapDays <= 1.5) return "daily";
    if (avgGapDays <= 8) return "weekly";
    if (avgGapDays <= 35) return "monthly";
    return "irregular";
  }

  private assessContentQuality(items: ContentItem[], engagement: number): "low" | "medium" | "high" {
    const withText = items.filter((i) => i.text && i.text.length > 50);
    const ratio = items.length > 0 ? withText.length / items.length : 0;

    if (ratio > 0.7 && engagement > 0.05) return "high";
    if (ratio > 0.3 || engagement > 0.02) return "medium";
    return "low";
  }

  private extractCommonTopics(items: ContentItem[]): string[] {
    const stopWords = new Set(["the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "is", "it", "this", "that", "with", "from", "by", "be", "are", "was", "were", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "need", "dare", "ought", "used", "just", "not", "no", "nor", "so", "if", "or", "as", "but", "about", "up", "out", "off", "over", "all", "each", "every", "some", "any", "both", "few", "more", "most", "other", "into", "than", "then", "also", "very", "too", "really", "actually", "still", "already", "even", "well", "back", "down", "here", "there", "when", "where", "why", "how", "what", "which", "who", "whom"]);

    const wordCounts = new Map<string, number>();
    for (const item of items) {
      const words = item.text.toLowerCase()
        .replace(/[^a-z0-9\s#]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w) && !w.startsWith("#"));

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
      }
    }

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  private calculateConfidence(totalItems: number, textItems: number): number {
    if (totalItems === 0) return 0;
    let score = Math.min(totalItems / 50, 0.6);
    if (textItems / totalItems > 0.3) score += 0.2;
    if (totalItems >= 10) score += 0.1;
    if (totalItems >= 50) score += 0.1;
    return Math.min(score, 1);
  }
}
