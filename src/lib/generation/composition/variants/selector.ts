import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { BaseVariantStrategy } from "./base";

export class LayoutVariantSelector {
  private variants: BaseVariantStrategy[] = [];

  register(variant: BaseVariantStrategy): void {
    if (this.variants.some((v) => v.id === variant.id)) {
      throw new Error(`Variant already registered: ${variant.id}`);
    }
    this.variants.push(variant);
  }

  select(niche: string, graph: KnowledgeGraph): BaseVariantStrategy {
    const candidates = this.variants.filter((v) => v.niche === niche);
    if (candidates.length === 0) {
      const fallback = this.variants.find((v) => v.id === "default_creator");
      if (fallback) return fallback;
      return candidates[0]!;
    }

    let best = candidates[0]!;
    let bestScore = -1;

    for (const v of candidates) {
      const score = v.match(graph);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }

    return best;
  }

  getAll(): BaseVariantStrategy[] {
    return [...this.variants];
  }

  listNiches(): string[] {
    return Array.from(new Set(this.variants.map((v) => v.niche)));
  }
}
