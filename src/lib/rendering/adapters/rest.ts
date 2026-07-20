import type { RenderResult } from "../types";
import type { IRenderAdapter } from "./types";

export interface RestApiResponse {
  ok: boolean;
  status: string;
  surface: string;
  tenantId: string;
  data: Array<{
    moduleId: string;
    moduleName: string;
    data: unknown;
  }>;
  meta: {
    totalModules: number;
    loadedModules: number;
    failedModules: number;
    durationMs: number;
  };
}

export class RestAdapter implements IRenderAdapter<RestApiResponse> {
  readonly surface = "api_rest" as const;

  async render(result: RenderResult): Promise<RestApiResponse> {
    return {
      ok: result.status === "complete" || result.status === "partial",
      status: result.status,
      surface: result.surface,
      tenantId: result.tenantId,
      data: result.slots
        .filter((s) => s.visible)
        .map((s) => ({
          moduleId: s.moduleId,
          moduleName: s.definition.identity.name,
          data: s.data,
        })),
      meta: {
        totalModules: result.slots.length,
        loadedModules: result.slots.filter((s) => s.state === "loaded").length,
        failedModules: result.slots.filter((s) => s.state === "failed").length,
        durationMs: result.totalDurationMs,
      },
    };
  }

  supportsStreaming(): boolean {
    return false;
  }

  getContentType(): string {
    return "application/json";
  }
}

export const restAdapter = new RestAdapter();
