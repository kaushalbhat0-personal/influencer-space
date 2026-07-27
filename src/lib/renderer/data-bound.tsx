import { ComponentRenderer } from "./index";

interface BoundSlot {
  moduleId: string;
  config: Record<string, unknown>;
}

/**
 * Server-side renderer bridge.
 * Passes config directly to ComponentRenderer.
 * All content data is already injected by LayoutEngine.
 */
export async function DataBoundRenderer({ slot }: { slot: BoundSlot }) {
  return <ComponentRenderer componentId={slot.moduleId} props={{ ...slot.config }} />;
}
