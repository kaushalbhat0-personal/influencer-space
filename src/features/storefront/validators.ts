import type { StorefrontData, StorefrontSlot, StorefrontPage } from "./types";

export function validateStorefrontData(data: unknown): data is StorefrontData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.tenantId !== "string") return false;
  if (!Array.isArray(d.pages)) return false;
  for (const page of d.pages) {
    if (!validatePage(page)) return false;
  }
  return true;
}

export function validatePage(page: unknown): page is StorefrontPage {
  if (!page || typeof page !== "object") return false;
  const p = page as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.slug !== "string") return false;
  if (!Array.isArray(p.slots)) return false;
  for (const slot of p.slots) {
    if (!validateSlot(slot)) return false;
  }
  return true;
}

export function validateSlot(slot: unknown): slot is StorefrontSlot {
  if (!slot || typeof slot !== "object") return false;
  const s = slot as Record<string, unknown>;
  return typeof s.id === "string" && typeof s.moduleId === "string";
}

export function validatePreviewToken(token: unknown): token is { token: string; tenantId: string } {
  if (!token || typeof token !== "object") return false;
  const t = token as Record<string, unknown>;
  return typeof t.token === "string" && typeof t.tenantId === "string";
}
