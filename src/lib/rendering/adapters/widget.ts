import type { RenderResult } from "../types";
import type { IRenderAdapter } from "./types";

export interface WidgetRenderOutput {
  html: string;
  script: string;
  styles: string;
  metadata: Record<string, string>;
}

export class WidgetAdapter implements IRenderAdapter<WidgetRenderOutput> {
  readonly surface = "embed_widget" as const;

  async render(result: RenderResult): Promise<WidgetRenderOutput> {
    const parts: string[] = [];
    const scripts: string[] = [];
    const styles: string[] = [":host { display: block; font-family: system-ui, sans-serif; }"];

    for (const slot of result.slots) {
      if (!slot.visible || slot.state !== "loaded") continue;

      parts.push(`<div class="creatos-module" data-module="${slot.definition.identity.id}">`);

      if (slot.data && typeof slot.data === "object") {
        const data = slot.data as Record<string, unknown>;
        if (typeof data.html === "string") {
          parts.push(String(data.html));
        }
      }

      parts.push("</div>");
    }

    scripts.push(`
      (function() {
        const widget = document.currentScript?.parentElement;
        if (widget) {
          widget.setAttribute('data-creatos-tenant', '${result.tenantId}');
          widget.setAttribute('data-creatos-surface', '${result.surface}');
          widget.setAttribute('data-creatos-status', '${result.status}');
        }
      })();
    `);

    return {
      html: parts.join("\n"),
      script: scripts.join("\n"),
      styles: styles.join("\n"),
      metadata: {
        tenant: result.tenantId,
        status: result.status,
        generatedAt: result.completedAt,
      },
    };
  }

  supportsStreaming(): boolean {
    return false;
  }

  getContentType(): string {
    return "text/html";
  }
}

export const widgetAdapter = new WidgetAdapter();
