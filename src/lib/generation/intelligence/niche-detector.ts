import type { ContentSource } from "./types";
import { NICHE_KEYWORDS } from "./types";

export interface NicheResult {
  niche: string;
  score: number;
  /** Normalized 0..1 confidence in the detected niche. */
  confidence: number;
  /** True when the top two niches are too close to be certain. */
  ambiguous: boolean;
  /** True when confidence is below the auto-accept threshold → manual review. */
  requiresReview: boolean;
  altNiches: Array<{ niche: string; score: number }>;
}

/** Below this confidence the classification must be reviewed by the user. */
export const MIN_CONFIDENCE_FOR_AUTO_ACCEPT = 0.4;
/** Top two scores closer than this fraction of the top score → ambiguous. */
const AMBIGUITY_MARGIN = 0.25;

export class NicheDetector {
  detect(source: ContentSource): NicheResult {
    const scores = this.scoreAllNiches(source);
    const sorted = scores.sort((a, b) => b.score - a.score);

    const top = sorted[0];
    if (!top || top.score <= 0) {
      return {
        niche: "general",
        score: 0,
        confidence: 0,
        ambiguous: false,
        requiresReview: true,
        altNiches: [],
      };
    }

    const second = sorted[1];
    const confidence = Math.min(1, top.score / 40);
    const ambiguous = second
      ? top.score - second.score <= top.score * AMBIGUITY_MARGIN
      : false;

    return {
      niche: top.niche,
      score: top.score,
      confidence,
      ambiguous,
      requiresReview: confidence < MIN_CONFIDENCE_FOR_AUTO_ACCEPT || ambiguous,
      altNiches: sorted.slice(1, 4).map((s) => ({ niche: s.niche, score: s.score })),
    };
  }

  detectSubNiches(source: ContentSource): string[] {
    const result = this.detect(source);
    const keywords = NICHE_KEYWORDS[result.niche] ?? [];
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
        // Longer, more specific keywords are stronger signals.
        const weight = 5 + kw.length;
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Short keywords (e.g. "ai", "app") match inside unrelated words —
        // require a word boundary to avoid noise inflation.
        if (kw.length < 4) {
          if (new RegExp(`\\b${escaped}\\b`, "gi").test(lower)) score += weight;
        } else {
          const matches = lower.match(new RegExp(escaped, "gi"));
          if (matches) score += weight + matches.length * 1.5;
        }
      }

      if (source.categories?.some((c) => c.toLowerCase().includes(niche))) score += 12;
      if (source.bio?.toLowerCase().includes(niche)) score += 10;

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

export const nicheDetector = new NicheDetector();
