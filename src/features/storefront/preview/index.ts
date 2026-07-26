import type { StorefrontData, PreviewToken } from "../types";

export type PreviewMode = "draft" | "published" | "compare" | "builder";

export interface PreviewState {
  active: boolean;
  mode: PreviewMode;
  token: string | null;
  compareVersion: number | null;
}

let _previewState: PreviewState = { active: false, mode: "draft", token: null, compareVersion: null };

export function getPreviewState(): PreviewState {
  return { ..._previewState };
}

export function setPreviewState(state: Partial<PreviewState>): void {
  _previewState = { ..._previewState, ...state };
}

export function resetPreviewState(): void {
  _previewState = { active: false, mode: "draft", token: null, compareVersion: null };
}

export function generatePreviewToken(tenantId: string, version?: number): PreviewToken {
  const token = `preview_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const expiresAt = new Date(Date.now() + 3600000);
  return { token, tenantId, version: version ?? null, expiresAt };
}

export function validatePreviewToken(token: string, stored: PreviewToken): boolean {
  if (token !== stored.token) return false;
  if (new Date() > stored.expiresAt) return false;
  return true;
}

export async function getPreviewData(
  tenantId: string,
  mode: PreviewMode,
  version?: number,
): Promise<StorefrontData | null> {
  const { storefrontService } = await import("../service");

  if (mode === "published") {
    return storefrontService.getStorefrontData(tenantId);
  }
  if (mode === "draft" || mode === "builder") {
    return storefrontService.getStorefrontData(tenantId, version);
  }
  if (mode === "compare" && version) {
    const published = await storefrontService.getStorefrontData(tenantId);
    const draft = await storefrontService.getStorefrontData(tenantId, version);
    return draft ?? published;
  }
  return storefrontService.getStorefrontData(tenantId);
}

export function getPreviewUrl(domain: string, mode: PreviewMode, token?: string): string {
  const base = `https://${domain}`;
  const params = new URLSearchParams();
  params.set("preview", mode);
  if (token) params.set("token", token);
  return `${base}?${params.toString()}`;
}
