// ── Website Evolution Runtime (RCCF-EPIC-09) ────────────────
// Generated websites continuously evolve based on creator growth. The runtime
// NEVER edits websites automatically — it produces evolution opportunities the
// creator previews and approves. Consumes the Runtime Context only.

// Domain
export { EVOLUTION_REGISTRY, getEvolution, isKnownEvolution, capLift } from "./domain/registry";
export type {
  EvolutionStatus,
  EvolutionLift,
  EvolutionChangeManifest,
  EvolutionDefinition,
  EvolutionBeforeAfter,
  EvolutionOpportunity,
  ChangePreview,
  EvolutionHistory,
  EvolutionHistoryEntry,
  WebsiteVersionInfo,
  PlatformEvolutionReport,
} from "./domain/types";

// Application
export { detectOpportunities } from "./application/detector";
export {
  websiteEvolutionRuntime,
  type WebsiteEvolutionRuntime as WebsiteEvolutionRuntimeClass,
} from "./application/runtime";
export { websiteVersioning } from "./application/versioning";

// Infrastructure
export { evolutionHistoryStore, EVOLUTION_HISTORY_SETTING_KEY } from "./infrastructure/history-store";
