import type { BuilderPage, BuilderSection } from "@/lib/builder/types";

export interface LayerNode {
  id: string;
  type: "page" | "section" | "slot";
  name: string;
  visible: boolean;
  locked: boolean;
  collapsed: boolean;
  children: LayerNode[];
  depth: number;
}

export function buildLayerTree(pages: BuilderPage[], activePageId: string | null): LayerNode[] {
  const activePage = pages.find((p) => p.id === activePageId);
  if (!activePage) return [];

  return activePage.sections.map((section) => buildSectionNode(section, 0));
}

function buildSectionNode(section: BuilderSection, depth: number): LayerNode {
  return {
    id: section.id,
    type: "section",
    name: section.name,
    visible: section.visible,
    locked: section.locked,
    collapsed: false,
    depth,
    children: section.slots.map((slot) => ({
      id: slot.id,
      type: "slot" as const,
      name: slot.moduleId,
      visible: slot.visible,
      locked: slot.locked,
      collapsed: false,
      depth: depth + 1,
      children: [],
    })),
  };
}

export function reorderLayers(
  nodes: LayerNode[],
  sourceId: string,
  targetId: string,
  position: "before" | "after",
): LayerNode[] {
  const all = flattenNodes(nodes);
  const sourceIndex = all.findIndex((n) => n.id === sourceId);
  const targetIndex = all.findIndex((n) => n.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return nodes;

  const [moved] = all.splice(sourceIndex, 1);
  const adjustedTarget = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
  const insertAt = position === "before" ? adjustedTarget : adjustedTarget + 1;
  all.splice(insertAt, 0, moved);

  return rebuildTree(all);
}

function flattenNodes(nodes: LayerNode[]): LayerNode[] {
  const result: LayerNode[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...flattenNodes(node.children));
  }
  return result;
}

function rebuildTree(flat: LayerNode[]): LayerNode[] {
  const roots: LayerNode[] = [];
  const map = new Map<string, LayerNode>();
  for (const node of flat) {
    map.set(node.id, { ...node, children: [] });
  }
  for (const node of flat) {
    if (node.depth === 0) {
      roots.push(map.get(node.id)!);
    } else {
      const parent = flat.find((n) => n.depth === node.depth - 1 && isParentOf(n, node));
      if (parent) {
        map.get(parent.id)?.children.push(map.get(node.id)!);
      } else {
        roots.push(map.get(node.id)!);
      }
    }
  }
  return roots;
}

function isParentOf(parent: LayerNode, child: LayerNode): boolean {
  return parent.type === "section" && child.type === "slot";
}
