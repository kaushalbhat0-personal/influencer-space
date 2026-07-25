import type { ContentSource } from "./types";
import { NICHE_KEYWORDS } from "./types";

export interface NicheResult {
  niche: string;
  score: number;
}

export class NicheDetector {
  detect(source: ContentSource): NicheResult {
    const scores = this.scoreAllNiches(source);
    const sorted = scores.sort((a, b) => b.score - a.score);
    return sorted[0] ?? { niche: "lifestyle", score: 0.1 };
  }

  detectSubNiches(source: ContentSource): string[] {
    const niche = this.detect(source);
    const keywords = NICHE_KEYWORDS[niche.niche] ?? [];
    const text = this.getAllText(source).toLowerCase();

    return keywords
      .filter((kw) => text.includes(kw))
      .slice(0, 5);
  }

  scoreAllNiches(source: ContentSource): Array<{ niche: string; score: number }> {
    const text = this.getAllText(source);
    const lower = text.toLowerCase();

    return Object.entries(NICHE_KEYWORDS).map(([niche, keywords]) => {
      let score = 0;
      for (const kw of keywords) {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        const matches = lower.match(regex);
        if (matches) score += matches.length * 2;

        if (lower.includes(kw)) score += 5;
      }

      if (source.categories?.some((c) => c.toLowerCase().includes(niche))) score += 10;
      if (source.bio?.toLowerCase().includes(niche)) score += 8;

      return { niche, score };
    });
  }

  private getAllText(source: ContentSource): string {
    const parts: string[] = [source.bio ?? ""];
    for (const item of source.content ?? []) {
      parts.push(item.text ?? "");
      parts.push(...(item.hashtags ?? []));
    }
    return parts.join(" ");
  }
}
