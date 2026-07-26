import type { BuilderPage } from "@/lib/builder/types";
import { createSnapshot } from "../snapshots";

export interface PublishResult {
  success: boolean;
  version: number | null;
  error?: string;
}

export async function publishPages(
  pages: BuilderPage[],
  theme: Record<string, unknown>,
  label?: string,
): Promise<PublishResult> {
  const snapshot = createSnapshot(pages, theme, label);
  const { publishWebsite } = await import("@/actions/builder.actions");
  const res = await publishWebsite(snapshot.pages);
  if (res.success) {
    return { success: true, version: snapshot.version };
  }
  return { success: false, version: null, error: res.error ?? "Publish failed" };
}

export async function validateBeforePublish(pages: BuilderPage[]): Promise<string[]> {
  const warnings: string[] = [];
  for (const page of pages) {
    if (!page.slug) warnings.push(`Page "${page.name}" has no slug`);
    if (page.sections.length === 0) warnings.push(`Page "${page.name}" has no sections`);
    const emptySlots = page.sections.filter((s) => s.slots.length === 0);
    for (const s of emptySlots) {
      warnings.push(`Section "${s.name}" in page "${page.name}" has no blocks`);
    }
  }
  return warnings;
}
