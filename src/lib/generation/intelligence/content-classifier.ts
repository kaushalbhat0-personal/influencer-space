import type { ContentSource } from "./types";
import { NicheDetector } from "./niche-detector";

export class ContentClassifier {
  constructor(private nicheDetector: NicheDetector) {}

  classify(source: ContentSource): { primaryType: string; subTypes: string[]; confidence: number } {
    const niche = this.nicheDetector.detect(source);
    const items = source.content ?? [];

    const typeCounts = new Map<string, number>();
    for (const item of items) {
      typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1);
    }
    const sorted = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
    const primaryType = sorted[0]?.[0] ?? "post";

    const subTypes = this.detectSubTypes(niche.niche);

    const confidence = items.length > 0 ? Math.min(0.4 + items.length * 0.01, 0.9) : 0.2;

    return { primaryType, subTypes, confidence };
  }

  private detectSubTypes(niche: string): string[] {
    const nichePatterns: Record<string, string[]> = {
      gaming: ["Let's Play", "Review", "Tutorial", "Stream Highlight", "News"],
      education: ["Tutorial", "Lecture", "Review", "Workshop", "Q&A"],
      fitness: ["Workout", "Nutrition Tip", "Progress", "Tutorial", "Motivation"],
      music: ["Original", "Cover", "Tutorial", "Live", "Behind the Scenes"],
      photography: ["Portrait", "Landscape", "Tutorial", "Edit", "Behind the Scenes"],
    };

    const types = nichePatterns[niche] ?? ["Post", "Story", "Update"];
    return types.slice(0, 3);
  }
}
