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
export async function DataBoundRenderer({
  slot,
  previewMode = false,
}: {
  slot: BoundSlot;
  /** RCCF-67.2: threads the storefront preview flag so commerce renderers stay
   * inert on the public `?preview=true` route (mirrors the Builder canvas). */
  previewMode?: boolean;
}) {
  return <ComponentRenderer componentId={slot.moduleId} props={{ ...slot.config }} previewMode={previewMode} />;
}
