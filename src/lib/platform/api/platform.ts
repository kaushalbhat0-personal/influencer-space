import type { PreviewState } from "@/lib/builder/preview";
import { builderStore } from "@/lib/builder/store";
import { builderCommands } from "@/lib/builder/commands";
import { builderEvents } from "@/lib/builder/events";
import { builderQuery } from "@/lib/builder/query";
import { previewRuntime } from "@/lib/builder/preview";
import { renderTreeBuilder, htmlAdapter, reactAdapter, staticAdapter } from "@/lib/builder/render";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export interface BuilderAPI {
  readonly store: typeof builderStore;
  readonly commands: typeof builderCommands;
  readonly events: typeof builderEvents;
  readonly query: typeof builderQuery;
}

export interface PreviewAPI {
  readonly runtime: typeof previewRuntime;
  render(): PreviewState;
  getState(): PreviewState;
}

export interface PlatformAPI {
  builder: BuilderAPI;
  preview: PreviewAPI;
  telemetry: typeof platformTelemetry;
  render: {
    treeBuilder: typeof renderTreeBuilder;
    htmlAdapter: typeof htmlAdapter;
    reactAdapter: typeof reactAdapter;
    staticAdapter: typeof staticAdapter;
  };
}

export const platformAPI: PlatformAPI = {
  builder: {
    get store() { return builderStore; },
    get commands() { return builderCommands; },
    get events() { return builderEvents; },
    get query() { return builderQuery; },
  },
  preview: {
    get runtime() { return previewRuntime; },
    render: () => previewRuntime.render(),
    getState: () => previewRuntime.getState(),
  },
  telemetry: platformTelemetry,
  render: {
    treeBuilder: renderTreeBuilder,
    htmlAdapter,
    reactAdapter,
    staticAdapter,
  },
};
