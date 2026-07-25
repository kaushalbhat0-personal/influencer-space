import type { ContentSource } from "./types";
import { ContentAnalyzer } from "./content-analyzer";

export class KeywordExtractor {
  constructor(private contentAnalyzer: ContentAnalyzer) {}

  extract(source: ContentSource): string[] {
    const analysis = this.contentAnalyzer.analyze(source);
    const text = this.getAllText(source).toLowerCase();

    const nicheKeywords = this.extractNicheKeywords(text);
    const hashtagKeywords = analysis.commonHashtags.map((h) => h.replace(/^#/, ""));
    const topicKeywords = analysis.commonTopics;

    const combined = new Set<string>();
    for (const kw of [...nicheKeywords, ...hashtagKeywords, ...topicKeywords]) {
      combined.add(kw.toLowerCase().trim());
    }

    return Array.from(combined).filter((kw) => kw.length > 2).slice(0, 20);
  }

  extractNicheKeywords(text: string): string[] {
    const nichePatterns: Record<string, RegExp> = {
      gaming: /gaming|game|play|stream|esports|twitch|console|pc gaming/i,
      education: /learn|teach|course|tutorial|study|education|lesson/i,
      tech: /tech|software|app|code|programming|developer|ai|digital/i,
      fitness: /fitness|workout|gym|exercise|health|training|yoga/i,
      music: /music|song|album|concert|band|guitar|piano|producer/i,
      food: /food|cook|recipe|baking|cuisine|restaurant|kitchen/i,
      travel: /travel|trip|vacation|adventure|explore|wanderlust|journey/i,
      photography: /photo|camera|photography|edit|portrait|landscape/i,
      fashion: /fashion|style|outfit|wear|dress|clothing|beauty/i,
      business: /business|entrepreneur|startup|marketing|revenue|growth/i,
    };

    const keywords: string[] = [];
    for (const [, pattern] of Object.entries(nichePatterns)) {
      const matches = text.match(pattern);
      if (matches) keywords.push(...matches.map((m) => m.toLowerCase()));
    }

    const counts = new Map<string, number>();
    for (const kw of keywords) counts.set(kw, (counts.get(kw) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([kw]) => kw);
  }

  extractCommonPhrases(source: ContentSource): string[] {
    const items = source.content ?? [];
    const phrases = new Map<string, number>();

    for (const item of items) {
      const words = item.text?.split(/\s+/) ?? [];
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]!.toLowerCase()} ${words[i + 1]!.toLowerCase()}`;
        if (phrase.length > 3 && !phrase.includes("http")) {
          phrases.set(phrase, (phrases.get(phrase) ?? 0) + 1);
        }
      }
    }

    return Array.from(phrases.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase);
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
