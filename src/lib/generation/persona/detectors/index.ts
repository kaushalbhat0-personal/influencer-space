import type { PersonaRegistry } from "../registry";
import { ALL_DETECTORS } from "./all-detectors";

export function registerPersonaDetectors(registry: PersonaRegistry): void {
  for (const d of ALL_DETECTORS) {
    registry.register(d);
  }
}

export { ALL_DETECTORS } from "./all-detectors";
export type { PersonaDetector } from "./base";
export { createDetector } from "./base";
