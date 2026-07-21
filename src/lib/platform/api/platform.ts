import type { TelemetrySnapshot } from "@/lib/telemetry/types";
import type { PreviewState, PreviewDiagnostics } from "@/lib/builder/preview";
import type { RenderTree, RenderDiagnostics } from "@/lib/builder/render/types";
import type { PluginManifest, SandboxDiagnostics } from "@/lib/plugin/types";

import { builderStore } from "@/lib/builder/store";
import { builderCommands } from "@/lib/builder/commands";
import { builderEvents } from "@/lib/builder/events";
import { builderQuery } from "@/lib/builder/query";
import { interactionPolicy } from "@/lib/builder/policy";
import { constraintEngine } from "@/lib/builder/constraints";
import { documentValidator } from "@/lib/builder/validation";
import { themeRegistry, themeResolver, themeSerializer, themeDiagnostics, themeQuery, themeTransaction, themePresets, themePackageValidator } from "@/lib/builder/theme";
import { previewRuntime } from "@/lib/builder/preview";
import { renderTreeBuilder, htmlAdapter, reactAdapter, staticAdapter } from "@/lib/builder/render";
import { pluginSandbox } from "@/lib/plugin/sandbox";
import { platformTelemetry } from "@/lib/telemetry/telemetry";
import { registryFacade } from "@/lib/registry/facade";
import { contentAPI } from "@/lib/content/api";
import type { ContentAPI } from "@/lib/content/api";

export interface BuilderAPI {
  readonly store: typeof builderStore;
  readonly commands: typeof builderCommands;
  readonly events: typeof builderEvents;
  readonly query: typeof builderQuery;
  readonly policy: typeof interactionPolicy;
  readonly constraints: typeof constraintEngine;
  readonly validator: typeof documentValidator;
}

export interface ThemeAPI {
  readonly registry: typeof themeRegistry;
  readonly resolver: typeof themeResolver;
  readonly serializer: typeof themeSerializer;
  readonly diagnostics: typeof themeDiagnostics;
  readonly query: typeof themeQuery;
  readonly transaction: typeof themeTransaction;
  readonly presets: typeof themePresets;
  readonly validator: typeof themePackageValidator;
}

export interface PreviewAPI {
  readonly runtime: typeof previewRuntime;
  render(): PreviewState;
  getState(): PreviewState;
  diagnostics(): PreviewDiagnostics;
}

export interface RenderingAPI {
  buildTree(state?: PreviewState): RenderTree;
  renderHtml(tree?: RenderTree): string;
  renderReact(tree?: RenderTree): Record<string, unknown>;
  renderStatic(tree?: RenderTree): string;
  diagnostics(): RenderDiagnostics;
}

export interface PluginAPI {
  readonly sandbox: typeof pluginSandbox;
  register(manifest: PluginManifest): { success: boolean; error?: string };
  list(): PluginManifest[];
  diagnostics(): SandboxDiagnostics;
}

export interface TelemetryAPI {
  counter(name: string, value?: number, labels?: Record<string, string>): void;
  timer(name: string, durationMs: number, labels?: Record<string, string>): void;
  histogram(name: string, value: number, buckets?: number[]): void;
  snapshot(): TelemetrySnapshot;
  reset(): void;
}

export interface PlatformDiagnosticsReport {
  theme: { tokens: number; groups: number; errors: string[] };
  builder: { pages: number; sections: number; slots: number };
  preview: PreviewDiagnostics;
  rendering: RenderDiagnostics;
  plugins: SandboxDiagnostics;
  registry: { themes: number; modules: number; surfaces: number };
  events: { listenerCount: number };
}

export class CreatorOSPlatform {
  readonly builder: BuilderAPI = {
    store: builderStore, commands: builderCommands, events: builderEvents,
    query: builderQuery, policy: interactionPolicy, constraints: constraintEngine,
    validator: documentValidator,
  };

  readonly theme: ThemeAPI = {
    registry: themeRegistry, resolver: themeResolver, serializer: themeSerializer,
    diagnostics: themeDiagnostics, query: themeQuery, transaction: themeTransaction,
    presets: themePresets, validator: themePackageValidator,
  };

  readonly preview: PreviewAPI = {
    runtime: previewRuntime,
    render: () => previewRuntime.render(),
    getState: () => previewRuntime.getState(),
    diagnostics: () => previewRuntime.diagnostics(),
  };

  readonly rendering: RenderingAPI = {
    buildTree: (s) => renderTreeBuilder.build(s),
    renderHtml: (t) => htmlAdapter.render(t ?? renderTreeBuilder.build()),
    renderReact: (t) => reactAdapter.render(t ?? renderTreeBuilder.build()),
    renderStatic: (t) => staticAdapter.render(t ?? renderTreeBuilder.build()),
    diagnostics: () => renderTreeBuilder.diagnostics(),
  };

  readonly plugins: PluginAPI = {
    sandbox: pluginSandbox,
    register: (m) => pluginSandbox.register(m),
    list: () => pluginSandbox.list(),
    diagnostics: () => pluginSandbox.diagnostics(),
  };

  readonly telemetry: TelemetryAPI = {
    counter: (n, v, l) => platformTelemetry.counter(n, v, l),
    timer: (n, d, l) => platformTelemetry.timer(n, d, l),
    histogram: (n, v, b) => platformTelemetry.histogram(n, v, b),
    snapshot: () => platformTelemetry.snapshot(),
    reset: () => platformTelemetry.reset(),
  };

  readonly content: ContentAPI = contentAPI;

  diagnostics(): PlatformDiagnosticsReport {
    const themeDiag = themeDiagnostics.run();
    const hierarchy = builderQuery.getCanvasHierarchy();
    return {
      theme: { tokens: themeRegistry.size, groups: themeRegistry.groupCount, errors: themeDiag.invalidReferences.map((r) => `${r.key}→${r.reference}`) },
      builder: { pages: hierarchy.page ? 1 : 0, sections: hierarchy.sections.length, slots: hierarchy.slots.length },
      preview: previewRuntime.diagnostics(),
      rendering: renderTreeBuilder.diagnostics(),
      plugins: pluginSandbox.diagnostics(),
      registry: { themes: registryFacade.theme.size, modules: registryFacade.module.size, surfaces: registryFacade.surface.size },
      events: { listenerCount: builderEvents.listenerCount() },
    };
  }
}

export const platform = new CreatorOSPlatform();
