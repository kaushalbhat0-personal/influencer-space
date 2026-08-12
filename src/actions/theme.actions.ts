"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { websiteRepository } from "@/modules/tenant/infrastructure/website-repository";
import { publishingService } from "@/lib/publishing/service";
import { normalizeThemeId } from "@/lib/theme";
import { themeRegistry } from "@/lib/theme/registry-new";
import { getThemeTier } from "@/lib/theme/tiers";
import { themeEntitlementDecision } from "@/lib/theme/entitlement";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { entitlementService } from "@/lib/capabilities";

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

    // RCCF-11: the Appearance surface is premium (Growth+). The page gate is
    // cosmetic — enforce the canonical premium_themes entitlement here so a
    // Launch user cannot invoke the mutation directly.
    const resolved = await resolveActivePlan(undefined, tenantId);
    if (!entitlementService.has(resolved.code, "premium_themes")) {
      return { success: false, error: "Custom appearance requires a Creator Grow subscription or higher." };
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

    // Theme is presentation — flag the snapshot as stale so the dashboard
    // shows "changes pending" until the creator publishes.
    await publishingService.markChangesPending(tenantId).catch(() => {});

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Theme update failed" };
  }
}

export async function applyThemePackage(
  tenantId: string,
  themePackageId: string,
): Promise<{ success: boolean; themeId?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || session.user.tenantId !== tenantId) {
      return { success: false, error: "Unauthorized" };
    }

    const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
    if (!website) return { success: false, error: "Website not found" };

    const canonicalId = normalizeThemeId(themePackageId);

    // IMPLEMENTATION-33: server-side entitlement is authoritative. Client locks
    // are visual only. Premium themes require premium_themes capability.
    const theme = themeRegistry.getById(canonicalId);
    const tier = theme ? getThemeTier(theme) : "free";
    if (tier !== "free") {
      const resolved = await resolveActivePlan(undefined, tenantId);
      const decision = themeEntitlementDecision(tier, resolved.code);
      if (!decision.allowed) {
        return { success: false, error: "This theme requires an upgraded plan." };
      }
    }

    await prisma.website.update({
      where: { id: website.id },
      data: { themePackageId: canonicalId },
    });

    await publishingService.markChangesPending(tenantId).catch(() => {});

    return { success: true, themeId: canonicalId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Theme apply failed" };
  }
}
