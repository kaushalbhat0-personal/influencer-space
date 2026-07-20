import type { RenderResult } from "../types";
import type { IRenderAdapter } from "./types";

export interface ReactClientPayload {
  slots: Array<{
    moduleId: string;
    moduleName: string;
    data: unknown;
    interactive: boolean;
    rendererPath: string;
  }>;
  tokens: Record<string, string>;
  theme: { name: string; version: string } | null;
}

export class ReactClientAdapter implements IRenderAdapter<ReactClientPayload> {
  readonly surface = "website" as const;

  async render(result: RenderResult): Promise<ReactClientPayload> {
    const flatTokens: Record<string, string> = {};
    for (const [path, value] of Object.entries(result.tokens)) {
      flatTokens[path] = typeof value === "string" ? value : (value as { default?: string }).default ?? "";
    }

    return {
      slots: result.slots
        .filter((s) => s.visible && s.state === "loaded")
        .map((s) => ({
          moduleId: s.moduleId,
          moduleName: s.definition.identity.name,
          data: s.data,
          interactive: s.definition.surfaces.supported.some((sf) => sf.interactive),
          rendererPath: s.definition.surfaces.supported.find((sf) => sf.surfaceId === "website")?.rendererPath ?? "",
        })),
      tokens: flatTokens,
      theme: null,
    };
  }

  supportsStreaming(): boolean {
    return true;
  }

  getContentType(): string {
    return "application/json";
  }
}

export const reactClientAdapter = new ReactClientAdapter();
