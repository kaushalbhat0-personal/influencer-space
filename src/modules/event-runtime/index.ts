// ── Runtime Event Runtime (RCCF-INTEGRATION-01 Phase 9) ─────
// Canonical internal event layer. Every runtime emits typed events that become
// future inputs for Insights, Automation and Business Health runtimes.

export {
  INTELLIGENCE_EVENT_TYPES,
  type IntelligenceEventType,
  type RuntimeEvent,
  type RuntimeEventSubscriber,
} from "./domain/types";
export { runtimeEventBus } from "./application/bus";
export { emitEvent } from "./application/emitters";
