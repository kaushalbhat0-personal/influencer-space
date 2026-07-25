import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ProductBlueprint } from "./types";

export class ProductComposer {
  compose(graph: KnowledgeGraph): ProductBlueprint[] {
    if (!graph.products || graph.products.length === 0) return [];

    return graph.products.map((p, i) => ({
      id: `product_${i + 1}`,
      name: p.name,
      type: p.type,
      category: p.category,
      description: p.description,
      priceRange: p.priceRange,
      featured: p.recommended && i < 2,
      imageUrl: null,
      order: i,
      metadata: {
        confidence: p.confidence,
        reason: p.reason,
      },
    }));
  }
}
