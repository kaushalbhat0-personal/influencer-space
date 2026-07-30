import type { CreatorAcquisitionAdapter, AcquisitionStrategy } from "./types";

export class AcquisitionRegistry {
  private strategies = new Map<AcquisitionStrategy, CreatorAcquisitionAdapter>();

  register(adapter: CreatorAcquisitionAdapter): void {
    if (this.strategies.has(adapter.id)) {
      throw new Error(`Acquisition strategy "${adapter.id}" is already registered`);
    }
    this.strategies.set(adapter.id, adapter);
  }

  get(id: AcquisitionStrategy): CreatorAcquisitionAdapter | undefined {
    return this.strategies.get(id);
  }

  getAll(): CreatorAcquisitionAdapter[] {
    return Array.from(this.strategies.values());
  }

  exists(id: AcquisitionStrategy): boolean {
    return this.strategies.has(id);
  }
}

export const acquisitionRegistry = new AcquisitionRegistry();
