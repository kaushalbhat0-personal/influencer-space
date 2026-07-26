import type { StorefrontData, StorefrontSlot } from "../types";

export interface RendererContext {
  data: StorefrontData;
  tenantId: string;
  device: "desktop" | "tablet" | "mobile";
  preview?: boolean;
}

export function getSlotsForPage(data: StorefrontData, slug: string): StorefrontSlot[] {
  if (slug === "" || slug === "home") {
    const home = data.pages.find((p) => p.isHome) ?? data.pages[0];
    return home?.slots ?? [];
  }
  const page = data.pages.find((p) => p.slug === slug);
  return page?.slots ?? [];
}

export function resolveSlotConfig(slot: StorefrontSlot): Record<string, unknown> {
  return slot.config ?? {};
}

export function shouldRenderSlot(slot: StorefrontSlot): boolean {
  return Boolean(slot.moduleId);
}

export function createRendererContext(
  data: StorefrontData,
  tenantId: string,
  preview = false,
): RendererContext {
  return { data, tenantId, device: "desktop", preview };
}
