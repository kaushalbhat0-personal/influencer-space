import { builderStore } from "@/lib/builder/store";
import { builderCommands } from "@/lib/builder/commands";
import { builderEvents } from "@/lib/builder/events";
import { builderQuery } from "@/lib/builder/query";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

/**
 * Platform API — IMPLEMENTATION-14.
 *
 * There is exactly ONE runtime: BuilderStore → LayoutEngine → ComponentRegistry.
 * No separate preview runtime, no separate render tree. The builder canvas and
 * the storefront are the same renderer with different layout sources.
 */
export interface BuilderAPI {
  readonly store: typeof builderStore;
  readonly commands: typeof builderCommands;
  readonly events: typeof builderEvents;
  readonly query: typeof builderQuery;
}

export interface PlatformAPI {
  builder: BuilderAPI;
  telemetry: typeof platformTelemetry;
}

export const platformAPI: PlatformAPI = {
  builder: {
    get store() { return builderStore; },
    get commands() { return builderCommands; },
    get events() { return builderEvents; },
    get query() { return builderQuery; },
  },
  telemetry: platformTelemetry,
};
