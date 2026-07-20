import type { RenderResult } from "../types";
import type { IRenderAdapter } from "./types";

export interface ReactServerRenderOutput {
  html: string;
  head: string;
  scripts: string[];
  styles: string[];
}

export class ReactServerAdapter implements IRenderAdapter<ReactServerRenderOutput> {
  readonly surface = "website" as const;

  async render(result: RenderResult): Promise<ReactServerRenderOutput> {
    const parts: string[] = [];

    for (const slot of result.slots) {
      if (!slot.visible || slot.state !== "loaded") continue;

      const moduleName = slot.definition.identity.name;
      parts.push(`<!-- ${moduleName} -->`);

      if (slot.data && typeof slot.data === "object" && "html" in slot.data) {
        parts.push(String((slot.data as Record<string, unknown>).html));
      } else if (typeof slot.data === "string") {
        parts.push(slot.data);
      } else {
        parts.push(`<section id="module-${slot.moduleId}" data-module="${moduleName}"></section>`);
      }
    }

    return {
      html: parts.join("\n"),
      head: `<style>${result.tokens ? this.generateInlineCss(result) : ""}</style>`,
      scripts: [],
      styles: [],
    };
  }

  supportsStreaming(): boolean {
    return true;
  }

  getContentType(): string {
    return "text/html";
  }

  private generateInlineCss(result: RenderResult): string {
    const vars: string[] = [];
    for (const [path, value] of Object.entries(result.tokens)) {
      const cssVar = `--${path.replace(/\./g, "-")}`;
      const resolved = typeof value === "string" ? value : (value as { default?: string }).default ?? "";
      if (resolved) vars.push(`${cssVar}: ${resolved};`);
    }
    return `:root { ${vars.join(" ")} }`;
  }
}

export const reactServerAdapter = new ReactServerAdapter();
