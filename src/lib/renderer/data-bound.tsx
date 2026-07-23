import { dataResolver } from "@/lib/data/resolver";
import { ComponentRenderer } from "./index";

interface BoundSlot {
  moduleId: string;
  config: Record<string, unknown>;
  tenantId?: string;
}

function logResolverError(entityType: unknown, moduleId: string, error: unknown): void {
  console.error(
    JSON.stringify({
      event: "resolver.failed",
      entityType,
      moduleId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Server-side data resolver + ComponentRenderer.
 * Resolves dashboard domain data (products, gallery, timeline, etc.)
 * before passing props to the registry renderer.
 */
export async function DataBoundRenderer({ slot, tenantId }: { slot: BoundSlot; tenantId?: string }) {
  const merged = { ...slot.config };

  // If entityType is specified, resolve real data from dashboard modules
  if (slot.config.entityType && tenantId) {
    try {
      const resolved = await dataResolver.resolve(slot.config, tenantId);
      if (!resolved.empty && resolved.items) {
        merged.resolvedData = resolved.items;
        merged.resolvedTitle = resolved.title;
      }
    } catch (error) {
      logResolverError(slot.config.entityType, slot.moduleId, error);
    }
  }

  merged.tenantId = tenantId;

  return <ComponentRenderer componentId={slot.moduleId} props={merged} />;
}
