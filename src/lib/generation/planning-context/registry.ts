import type { ContextStrategy } from "./strategies/base";

export class ContextStrategyRegistry {
  private strategies = new Map<string, ContextStrategy>();

  register(strategy: ContextStrategy): void {
    if (this.strategies.has(strategy.id)) {
      throw new Error(`Context strategy already registered: ${strategy.id}`);
    }
    this.strategies.set(strategy.id, strategy);
  }

  get(id: string): ContextStrategy | undefined {
    return this.strategies.get(id);
  }

  getAll(): ContextStrategy[] {
    return Array.from(this.strategies.values());
  }

  listIds(): string[] {
    return Array.from(this.strategies.keys());
  }
}
