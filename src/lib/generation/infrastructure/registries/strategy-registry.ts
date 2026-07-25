import type { GenerationStrategy, StrategyFactory } from "@/lib/generation/contracts";
import type { StrategyType } from "@/lib/generation/contracts";

export class StrategyRegistry implements StrategyFactory {
  private factories = new Map<StrategyType, () => GenerationStrategy>();
  private locked = false;

  register(type: StrategyType, factory: () => GenerationStrategy): void {
    if (this.locked) throw new Error("StrategyRegistry is locked after bootstrap");
    if (this.factories.has(type)) throw new Error(`Strategy already registered: ${type}`);
    this.factories.set(type, factory);
  }

  unregister(type: StrategyType): void {
    if (this.locked) throw new Error("StrategyRegistry is locked after bootstrap");
    this.factories.delete(type);
  }

  has(type: StrategyType): boolean {
    return this.factories.has(type);
  }

  get(type: StrategyType): (() => GenerationStrategy) | undefined {
    return this.factories.get(type);
  }

  create(type: StrategyType): GenerationStrategy {
    const factory = this.factories.get(type);
    if (!factory) throw new Error(`Unknown strategy: ${type}`);
    return factory();
  }

  list(): StrategyType[] {
    return Array.from(this.factories.keys());
  }

  lock(): void {
    this.locked = true;
  }

  isLocked(): boolean {
    return this.locked;
  }
}
