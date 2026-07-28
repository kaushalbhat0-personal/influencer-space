"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { websiteRepository } from "@/modules/tenant/infrastructure/website-repository";

const FONT_MAP: Record<string, { heading: string; body: string }> = {
  geist: { heading: "Geist, system-ui, sans-serif", body: "Geist, system-ui, sans-serif" },
  inter: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
  plex: { heading: "'IBM Plex Sans', system-ui, sans-serif", body: "'IBM Plex Sans', system-ui, sans-serif" },
  mono: { heading: "'JetBrains Mono', monospace", body: "'JetBrains Mono', monospace" },
};

export async function updateTheme(
  tenantId: string,
  updates: {
    primary?: string;
    secondary?: string;
    accent?: string;
    font?: string;
    borderRadius?: string;
    layoutDensity?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || session.user.tenantId !== tenantId) {
      return { success: false, error: "Unauthorized" };
    }

    const existing = await websiteRepository.findTheme(tenantId);
    if (!existing) return { success: false, error: "Website not found" };

    const themeColors = (existing.themeColors ?? {}) as Record<string, string>;
    const themeFonts = (existing.themeFonts ?? {}) as Record<string, string>;
    const themeConfig = (existing.themeConfig ?? {}) as Record<string, string>;

    if (updates.primary !== undefined) themeColors.primary = updates.primary;
    if (updates.secondary !== undefined) themeColors.secondary = updates.secondary;
    if (updates.accent !== undefined) themeColors.accent = updates.accent;
    if (updates.borderRadius !== undefined) themeConfig.borderRadius = updates.borderRadius;
    if (updates.layoutDensity !== undefined) themeConfig.layoutDensity = updates.layoutDensity;

    if (updates.font !== undefined) {
      const resolved = FONT_MAP[updates.font];
      if (resolved) {
        themeFonts.heading = resolved.heading;
        themeFonts.body = resolved.body;
      }
    }

    await websiteRepository.updateTheme(existing.id, { themeColors, themeFonts, themeConfig });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Theme update failed" };
  }
}
