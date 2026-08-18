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
import { FONT_MAP, HEADING_WEIGHT_VALUES } from "@/lib/theme/font-options";
import {
  BACKGROUND_PRESETS,
  SURFACE_PRESETS,
  requiredCapabilitiesForBackground,
  requiredCapabilitiesForSurface,
} from "@/modules/theme/runtime/experience";
import { HERO_TEXT_ALIGN_VALUES, HERO_CONTENT_WIDTH_VALUES, HERO_OVERLAY_VALUES } from "@/lib/hero/presentation-options";
import { isSafeAssetUrl, isValidImageOpacity } from "@/modules/theme/runtime/experience";

export async function updateTheme(
  tenantId: string,
  updates: {
    primary?: string;
    secondary?: string;
    accent?: string;
    font?: string;
    borderRadius?: string;
    layoutDensity?: string;
    /**
     * RCCF-71.2: creator appearance controls. `experienceBackground` /
     * `experienceSurface` are validated against the existing Experience preset
     * registries; `headingWeight` against the canonical heading-weight presets.
     */
    experienceBackground?: string;
    experienceSurface?: string;
    headingWeight?: string;
    /**
     * RCCF-71.3: HERO PRESENTATION presets. Persisted into Website.themeConfig
      * (advanced_builder gated like the rest of the custom Appearance surface) and merged
     * onto snapshot.content.hero by buildRuntimeSnapshot / the canvas. Unknown
     * values are ignored — never stored, never rendered.
     */
    heroTextAlign?: string;
    heroContentWidth?: string;
    heroOverlay?: string;
    /**
     * RCCF-71.6.4: background IMAGE (Growth/Scale). The URL/assetId/opacity are
     * gated server-side behind the same capability set as the `image` background
     * preset (theme_background_image) — a direct mutation without the capability
     * is rejected, exactly like the preset itself. Unsafe URLs are never stored.
     */
    experienceBackgroundImage?: string;
    experienceBackgroundImageAssetId?: string;
    experienceBackgroundImageOpacity?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || session.user.tenantId !== tenantId) {
      return { success: false, error: "Unauthorized" };
    }

    const resolved = await resolveActivePlan(undefined, tenantId);
    const requires = (capabilities: string[]): string | null => {
      for (const capability of capabilities) {
        if (!entitlementService.has(resolved.code, capability)) return capability;
      }
      return null;
    };
    const rejectMissing = (capabilities: string[]): { success: false; error: string } | null => {
      const missing = requires(capabilities);
      return missing ? { success: false, error: `Theme capability required: ${missing}` } : null;
    };

    const existing = await websiteRepository.findTheme(tenantId);
    if (!existing) return { success: false, error: "Website not found" };

    const themeColors = (existing.themeColors ?? {}) as Record<string, string>;
    const themeFonts = (existing.themeFonts ?? {}) as Record<string, string>;
    const themeConfig = (existing.themeConfig ?? {}) as Record<string, string>;

    if (updates.primary !== undefined || updates.secondary !== undefined || updates.accent !== undefined || updates.font !== undefined || updates.headingWeight !== undefined || updates.borderRadius !== undefined || updates.layoutDensity !== undefined || updates.heroTextAlign !== undefined || updates.heroContentWidth !== undefined || updates.heroOverlay !== undefined) {
      const denied = rejectMissing(["advanced_builder"]);
      if (denied) return denied;
    }

    if (updates.primary !== undefined) themeColors.primary = updates.primary;
    if (updates.secondary !== undefined) themeColors.secondary = updates.secondary;
    if (updates.accent !== undefined) themeColors.accent = updates.accent;
    if (updates.borderRadius !== undefined) {
      const radius = Number.parseFloat(updates.borderRadius);
      if (Number.isFinite(radius) && radius >= 0 && radius <= 24) {
        themeConfig.borderRadius = String(radius);
      }
    }
    if (updates.layoutDensity !== undefined && ["compact", "comfortable", "spacious"].includes(updates.layoutDensity)) {
      themeConfig.layoutDensity = updates.layoutDensity;
    }

    // RCCF-71.2: background/surface/heading-weight overrides persist into the
    // SAME Website.themeConfig JSON the canonical pipeline already threads.
    // Values are validated against the existing preset registries — an unknown
    // value is ignored (never stored, never rendered).
    if (updates.experienceBackground !== undefined && BACKGROUND_PRESETS[updates.experienceBackground]) {
      const denied = rejectMissing(requiredCapabilitiesForBackground(BACKGROUND_PRESETS[updates.experienceBackground].background));
      if (denied) return denied;
      themeConfig.experienceBackground = updates.experienceBackground;
    }
    if (updates.experienceSurface !== undefined && SURFACE_PRESETS[updates.experienceSurface]) {
      const denied = rejectMissing(requiredCapabilitiesForSurface(SURFACE_PRESETS[updates.experienceSurface].surface));
      if (denied) return denied;
      themeConfig.experienceSurface = updates.experienceSurface;
    }
    if (updates.headingWeight !== undefined && HEADING_WEIGHT_VALUES.has(updates.headingWeight)) {
      themeConfig.headingWeight = updates.headingWeight;
    }

    // RCCF-71.3: HERO PRESENTATION — textAlign/contentWidth/overlay persist in
    // Website.themeConfig under the same premium_themes entitlement gate above.
    // Validated against the canonical registries; invalid values are ignored.
    if (updates.heroTextAlign !== undefined && HERO_TEXT_ALIGN_VALUES.has(updates.heroTextAlign)) {
      themeConfig.heroTextAlign = updates.heroTextAlign;
    }
    if (updates.heroContentWidth !== undefined && HERO_CONTENT_WIDTH_VALUES.has(updates.heroContentWidth)) {
      themeConfig.heroContentWidth = updates.heroContentWidth;
    }
    if (updates.heroOverlay !== undefined && HERO_OVERLAY_VALUES.has(updates.heroOverlay)) {
      themeConfig.heroOverlay = updates.heroOverlay;
    }

    // RCCF-71.6.4: background IMAGE — server-side capability gate for the image
    // preset AND its direct keys (a Launch creator cannot inject an image by
    // sending the key alone). The gate reuses requiredCapabilitiesForBackground
    // on the `image` preset, so it is one authority with the preset itself and
    // never a raw plan-code comparison. Unsafe URLs are ignored, never stored.
    const imageKeysTouched =
      updates.experienceBackgroundImage !== undefined ||
      updates.experienceBackgroundImageAssetId !== undefined ||
      updates.experienceBackgroundImageOpacity !== undefined;
    if (imageKeysTouched || updates.experienceBackground === "image") {
      const imageDenied = rejectMissing(
        requiredCapabilitiesForBackground(BACKGROUND_PRESETS.image.background),
      );
      if (imageDenied) return imageDenied;
    }
    if (updates.experienceBackgroundImage !== undefined) {
      if (updates.experienceBackgroundImage === "") {
        // Remove — clear both persisted keys so a stale image never renders.
        delete themeConfig.experienceBackgroundImage;
        delete themeConfig.experienceBackgroundImageAssetId;
      } else if (isSafeAssetUrl(updates.experienceBackgroundImage)) {
        themeConfig.experienceBackgroundImage = updates.experienceBackgroundImage;
      }
    }
    if (updates.experienceBackgroundImageAssetId !== undefined) {
      if (updates.experienceBackgroundImageAssetId === "") {
        delete themeConfig.experienceBackgroundImageAssetId;
      } else {
        themeConfig.experienceBackgroundImageAssetId = updates.experienceBackgroundImageAssetId;
      }
    }
    if (updates.experienceBackgroundImageOpacity !== undefined) {
      if (updates.experienceBackgroundImageOpacity === "") {
        delete themeConfig.experienceBackgroundImageOpacity;
      } else if (isValidImageOpacity(updates.experienceBackgroundImageOpacity)) {
        themeConfig.experienceBackgroundImageOpacity = updates.experienceBackgroundImageOpacity;
      }
    }

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
