import type { RenderResult } from "../types";
import type { IRenderAdapter } from "./types";

export interface PdfRenderOutput {
  html: string;
  metadata: {
    title: string;
    author: string;
    createdAt: string;
  };
}

export class PdfAdapter implements IRenderAdapter<PdfRenderOutput> {
  readonly surface = "pdf_export" as const;

  async render(result: RenderResult): Promise<PdfRenderOutput> {
    const sections: string[] = [];

    for (const slot of result.slots) {
      if (!slot.visible || slot.state !== "loaded") continue;

      const name = slot.definition.identity.name;
      sections.push(`<section class="module-${slot.moduleId}"><h2>${name}</h2>`);

      if (slot.data && typeof slot.data === "object") {
        const data = slot.data as Record<string, unknown>;
        if (typeof data.html === "string") {
          sections.push(String(data.html));
        } else {
          sections.push("<p>No renderable content</p>");
        }
      }

      sections.push("</section>");
    }

    const style = `
      <style>
        body { font-family: 'Helvetica', sans-serif; color: #111; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
        h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 32px; }
        section { page-break-inside: avoid; margin-bottom: 24px; }
      </style>
    `;

    return {
      html: `<!DOCTYPE html><html><head>${style}</head><body>${sections.join("\n")}</body></html>`,
      metadata: {
        title: `CreatorStore — ${result.tenantId}`,
        author: "CreatorOS",
        createdAt: result.startedAt,
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

export const pdfAdapter = new PdfAdapter();
