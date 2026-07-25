import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import { LayoutVariantSelector } from "./selector";
import type { BaseVariantStrategy } from "./base";
import { ALL_VARIANTS } from "./variants/all-variants";

export class LayoutVariantRegistry {
  private selector = new LayoutVariantSelector();

  constructor() {
    for (const v of ALL_VARIANTS) this.selector.register(v);
  }

  select(niche: string, graph: KnowledgeGraph): BaseVariantStrategy {
    return this.selector.select(niche, graph);
  }

  register(variant: BaseVariantStrategy): void {
    this.selector.register(variant);
  }

  getAll(): BaseVariantStrategy[] {
    return this.selector.getAll();
  }

  listNiches(): string[] {
    return this.selector.listNiches();
  }
}
