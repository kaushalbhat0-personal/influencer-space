import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { BaseLayoutStrategy } from "./base";
import { ALL_STRATEGIES } from "./strategies";
import { LayoutVariantRegistry } from "../variants/registry";

export class LayoutStrategyRegistry {
  private strategies = new Map<string, BaseLayoutStrategy>();
  private variantRegistry = new LayoutVariantRegistry();

  constructor() {
    for (const s of ALL_STRATEGIES) this.strategies.set(s.niche, s);
  }

  get(niche: string): BaseLayoutStrategy {
    return this.strategies.get(niche) ?? this.strategies.get("default")!;
  }

  register(strategy: BaseLayoutStrategy): void {
    if (this.strategies.has(strategy.niche)) {
      throw new Error(`Layout strategy already registered for niche: ${strategy.niche}`);
    }
    this.strategies.set(strategy.niche, strategy);
  }

  getAll(): BaseLayoutStrategy[] {
    return Array.from(this.strategies.values());
  }

  listNiches(): string[] {
    return Array.from(this.strategies.keys());
  }

  selectVariant(niche: string, graph: KnowledgeGraph) {
    return this.variantRegistry.select(niche, graph);
  }

  getVariantRegistry() {
    return this.variantRegistry;
  }
}
