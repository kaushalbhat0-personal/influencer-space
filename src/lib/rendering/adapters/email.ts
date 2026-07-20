import type { RenderResult } from "../types";
import type { IRenderAdapter } from "./types";

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

export class EmailAdapter implements IRenderAdapter<EmailRenderOutput> {
  readonly surface = "email_template" as const;

  async render(result: RenderResult): Promise<EmailRenderOutput> {
    const sections: string[] = [];
    const textSections: string[] = [];

    for (const slot of result.slots) {
      if (!slot.visible || slot.state !== "loaded") continue;

      if (slot.data && typeof slot.data === "object") {
        const data = slot.data as Record<string, unknown>;
        if (typeof data.html === "string") {
          sections.push(String(data.html));
        }
        if (typeof data.text === "string") {
          textSections.push(String(data.text));
        }
      }
    }

    const tenantId = result.tenantId;
    const subject = `CreatorStore — ${tenantId}`;

    const wrapperStyle = "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;";

    return {
      subject,
      html: `<!DOCTYPE html><html><body style="${wrapperStyle}">${sections.join("\n")}</body></html>`,
      text: textSections.join("\n\n"),
    };
  }

  supportsStreaming(): boolean {
    return false;
  }

  getContentType(): string {
    return "text/html";
  }
}

export const emailAdapter = new EmailAdapter();
