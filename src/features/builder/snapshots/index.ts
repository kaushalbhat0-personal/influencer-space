import type { BuilderPage } from "@/lib/builder/types";

export interface BuilderSnapshot {
  id: string;
  version: number;
  pages: BuilderPage[];
  theme: Record<string, unknown>;
  createdAt: string;
  label: string;
}

let snapshotCounter = 0;

export function createSnapshot(
  pages: BuilderPage[],
  theme: Record<string, unknown>,
  label?: string,
): BuilderSnapshot {
  snapshotCounter++;
  return {
    id: `snap_${Date.now()}_${snapshotCounter}`,
    version: snapshotCounter,
    pages: JSON.parse(JSON.stringify(pages)),
    theme: JSON.parse(JSON.stringify(theme)),
    createdAt: new Date().toISOString(),
    label: label ?? `Snapshot ${snapshotCounter}`,
  };
}

export function diffSnapshots(a: BuilderSnapshot, b: BuilderSnapshot): string[] {
  const changes: string[] = [];
  if (a.pages.length !== b.pages.length) {
    changes.push("page-count");
  }
  for (let i = 0; i < Math.min(a.pages.length, b.pages.length); i++) {
    const pa = a.pages[i];
    const pb = b.pages[i];
    if (pa.slug !== pb.slug) changes.push(`page[${i}].slug`);
    if (pa.sections.length !== pb.sections.length) changes.push(`page[${i}].section-count`);
    for (let j = 0; j < Math.min(pa.sections.length, pb.sections.length); j++) {
      const sa = pa.sections[j];
      const sb = pb.sections[j];
      if (sa.name !== sb.name) changes.push(`page[${i}].section[${j}].name`);
      if (sa.visible !== sb.visible) changes.push(`page[${i}].section[${j}].visible`);
    }
  }
  return changes;
}

export function validateSnapshot(snapshot: BuilderSnapshot | null | undefined): boolean {
  if (!snapshot || !snapshot.id || !snapshot.version) return false;
  if (!Array.isArray(snapshot.pages)) return false;
  for (const page of snapshot.pages) {
    if (!page.id || !page.slug) return false;
    if (!Array.isArray(page.sections)) return false;
    for (const section of page.sections) {
      if (!section.id) return false;
    }
  }
  return true;
}
