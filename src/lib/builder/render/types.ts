export type RenderNodeType = "page" | "section" | "slot" | "container" | "text" | "image" | "video" | "link" | "custom";

export interface RenderNode {
  id: string;
  type: RenderNodeType;
  tag: string;
  props: Record<string, unknown>;
  styles: Record<string, string>;
  classes: string[];
  children: RenderNode[];
  metadata: Record<string, unknown>;
}

export interface RenderTree {
  root: RenderNode;
  metadata: {
    pages: number;
    sections: number;
    slots: number;
    nodes: number;
    themeTokens: number;
    builtAt: number;
    builderMs: number;
  };
}

export interface RenderAdapter<TOutput = unknown> {
  name: string;
  contentType: string;
  render(tree: RenderTree): TOutput;
}

export interface RenderDiagnostics {
  treesBuilt: number;
  lastBuildMs: number;
  avgBuildMs: number;
  totalNodes: number;
  totalStyles: number;
  adapterTimings: Record<string, number>;
}
