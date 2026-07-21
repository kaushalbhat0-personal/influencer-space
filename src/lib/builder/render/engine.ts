import type { RenderTree, RenderNode, RenderAdapter, RenderDiagnostics } from "./types";
import type { PreviewState } from "../preview";
import { previewRuntime } from "../preview";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export class RenderTreeBuilder {
  private treesBuilt = 0;
  private totalBuildMs = 0;
  private lastBuildMs = 0;

  build(state?: PreviewState): RenderTree {
    const start = performance.now();
    const ps = state ?? previewRuntime.getState();
    this.treesBuilt++;

    let totalNodes = 0;
    let totalSlots = 0;
    let totalSections = 0;

    const pageNodes: RenderNode[] = [];
    for (const page of ps.pages) {
      const sectionNodes: RenderNode[] = [];
      for (const section of page.sections) {
        if (!section.visible) continue;
        totalSections++;
        const slotNodes: RenderNode[] = [];
        for (const slot of section.slots) {
          if (!slot.visible) continue;
          totalSlots++;
          const slotNode: RenderNode = {
            id: slot.id, type: "slot", tag: "div",
            props: { "data-module": slot.moduleId, "data-slot": slot.id, "data-order": slot.order },
            styles: { ...slot.styles },
            classes: ["creatos-module", `creatos-${slot.moduleId.split(".").pop()}`, slot.visible ? "" : "creatos-hidden"].filter(Boolean),
            children: [],
            metadata: { moduleId: slot.moduleId },
          };
          totalNodes++;
          slotNodes.push(slotNode);
        }
        const sectionNode: RenderNode = {
          id: section.id, type: "section", tag: "section",
          props: { "data-section": section.id, "data-name": section.name },
          styles: {},
          classes: ["creatos-section"],
          children: slotNodes,
          metadata: { sectionName: section.name },
        };
        totalNodes++;
        sectionNodes.push(sectionNode);
      }
      const pageNode: RenderNode = {
        id: page.id, type: "page", tag: "main",
        props: { "data-page": page.id, "data-slug": page.slug },
        styles: { maxWidth: `${ps.device === "mobile" ? 375 : ps.device === "tablet" ? 768 : 1200}px` },
        classes: ["creatos-page", `creatos-${ps.device}`],
        children: sectionNodes,
        metadata: { pageSlug: page.slug },
      };
      totalNodes++;
      pageNodes.push(pageNode);
    }

    const root: RenderNode = {
      id: "root", type: "container", tag: "div",
      props: { "data-creatos-root": "true", "data-device": ps.device, "data-zoom": String(ps.zoom) },
      styles: Object.fromEntries(Object.entries(ps.theme).map(([k, v]) => [`--${k.replace(/\./g, "-")}`, v])),
      classes: ["creatos-root", "creatos-preview"],
      children: pageNodes,
      metadata: {},
    };
    totalNodes++;

    const duration = performance.now() - start;
    this.lastBuildMs = Math.round(duration * 100) / 100;
    this.totalBuildMs += duration;
    platformTelemetry.timer("builder.render.tree.build", duration);

    return {
      root,
      metadata: {
        pages: ps.pages.length, sections: totalSections, slots: totalSlots,
        nodes: totalNodes, themeTokens: Object.keys(ps.theme).length,
        builtAt: Date.now(), builderMs: this.lastBuildMs,
      },
    };
  }

  diagnostics(): RenderDiagnostics {
    return { treesBuilt: this.treesBuilt, lastBuildMs: this.lastBuildMs, avgBuildMs: this.treesBuilt > 0 ? Math.round((this.totalBuildMs / this.treesBuilt) * 100) / 100 : 0, totalNodes: 0, totalStyles: 0, adapterTimings: {} };
  }
}

export class HtmlAdapter implements RenderAdapter<string> {
  name = "HTML"; contentType = "text/html";
  render(tree: RenderTree): string {
    const start = performance.now();
    const html = this.renderNode(tree.root, 0);
    platformTelemetry.timer("builder.render.adapter.html", performance.now() - start);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CreatorOS Preview</title></head><body>${html}</body></html>`;
  }
  private renderNode(node: RenderNode, depth: number): string {
    const indent = "  ".repeat(depth);
    const styleStr = Object.entries(node.styles).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(";");
    const attrStr = Object.entries(node.props).filter(([, v]) => v).map(([k, v]) => `${k}="${String(v)}"`).join(" ");
    const classStr = node.classes.filter(Boolean).join(" ");
    const styleAttr = styleStr ? ` style="${styleStr}"` : "";
    const classAttr = classStr ? ` class="${classStr}"` : "";
    const children = node.children.map((c) => this.renderNode(c, depth + 1)).join("\n");
    return `${indent}<${node.tag}${classAttr}${styleAttr} ${attrStr}>${children ? "\n" + children + "\n" + indent : ""}</${node.tag}>`;
  }
}

export class ReactAdapter implements RenderAdapter<Record<string, unknown>> {
  name = "React"; contentType = "application/json";
  render(tree: RenderTree): Record<string, unknown> {
    const start = performance.now();
    const result = this.toSerializable(tree.root);
    platformTelemetry.timer("builder.render.adapter.react", performance.now() - start);
    return result;
  }
  private toSerializable(node: RenderNode): Record<string, unknown> {
    return {
      type: node.tag, props: { ...node.props, className: node.classes.filter(Boolean).join(" "), style: node.styles, "data-creatos-id": node.id }, children: node.children.map((c) => this.toSerializable(c)),
    };
  }
}

export class StaticExportAdapter implements RenderAdapter<string> {
  name = "Static"; contentType = "application/json";
  render(tree: RenderTree): string {
    const start = performance.now();
    const result = JSON.stringify({ pages: tree.metadata.pages, sections: tree.metadata.sections, slots: tree.metadata.slots, nodes: tree.metadata.nodes, themeTokens: tree.metadata.themeTokens, exportedAt: new Date().toISOString() }, null, 2);
    platformTelemetry.timer("builder.render.adapter.static", performance.now() - start);
    return result;
  }
}

export const renderTreeBuilder = new RenderTreeBuilder();
export const htmlAdapter = new HtmlAdapter();
export const reactAdapter = new ReactAdapter();
export const staticAdapter = new StaticExportAdapter();
