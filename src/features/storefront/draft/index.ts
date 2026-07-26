import type { StorefrontData, PreviewToken } from "../types";

const DRAFT_PREFIX = "draft_";

export function createDraftToken(tenantId: string): PreviewToken {
  const raw = `${DRAFT_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const token = Buffer.from(raw).toString("base64url");
  return {
    token,
    tenantId,
    version: null,
    expiresAt: new Date(Date.now() + 86400000),
  };
}

export function validateDraftToken(token: string, stored: PreviewToken): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    if (!decoded.startsWith(DRAFT_PREFIX)) return false;
    if (new Date() > stored.expiresAt) return false;
    return stored.token === token;
  } catch {
    return false;
  }
}

export function isDraftRequest(searchParams: URLSearchParams): boolean {
  return searchParams.get("preview") === "draft" && !!searchParams.get("token");
}

export async function getDraftData(
  tenantId: string,
  token: string,
  stored: PreviewToken,
): Promise<StorefrontData | null> {
  if (!validateDraftToken(token, stored)) return null;
  const { storefrontService } = await import("../service");
  return storefrontService.getStorefrontData(tenantId, stored.version ?? undefined);
}

export function getDraftPreviewUrl(domain: string, token: string): string {
  const base = `https://${domain}`;
  return `${base}?preview=draft&token=${encodeURIComponent(token)}`;
}
