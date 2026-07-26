import type { BuilderPage } from "@/lib/builder/types";
import type { DeviceType } from "../responsive";

export interface PreviewFrame {
  pages: BuilderPage[];
  device: DeviceType;
  activePageId: string | null;
}

export function createPreviewFrame(
  pages: BuilderPage[],
  device: DeviceType,
  activePageId: string | null,
): PreviewFrame {
  return {
    pages: JSON.parse(JSON.stringify(pages)),
    device,
    activePageId,
  };
}

export function getPreviewUrl(tenantSubdomain: string, pageSlug: string, version?: number): string {
  const base = `https://${tenantSubdomain}.creatorsite.com`;
  const path = pageSlug === "home" ? "" : `/${pageSlug}`;
  const query = version ? `?preview=${version}` : "?preview=1";
  return `${base}${path}${query}`;
}
