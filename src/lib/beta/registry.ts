import type { Scenario, ScenarioCategory } from "./types";

class ScenarioRegistry {
  private scenarios = new Map<string, Scenario>();

  register(scenario: Scenario): void {
    if (this.scenarios.has(scenario.id)) {
      console.warn(`[Beta] Scenario "${scenario.id}" already registered. Overwriting.`);
    }
    this.scenarios.set(scenario.id, scenario);
  }

  get(id: string): Scenario | undefined {
    return this.scenarios.get(id);
  }

  list(): Scenario[] {
    return Array.from(this.scenarios.values());
  }

  listByCategory(category: ScenarioCategory): Scenario[] {
    return this.list().filter((s) => s.category === category);
  }

  count(): number {
    return this.scenarios.size;
  }
}

export const scenarioRegistry = new ScenarioRegistry();
