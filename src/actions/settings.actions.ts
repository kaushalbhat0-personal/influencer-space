"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { SettingsService } from "@/services/settings.service";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

async function requireAuth(tenantId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
}

const influencerPartialSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().min(1).optional(),
  bio: z.string().min(10).optional(),
  profileImage: z.string().optional(),
  niche: z.string().optional(),
});

const heroPartialSchema = z.object({
  videoUrl: z.string().optional(),
  posterUrl: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  tagline: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  ctaSecondaryText: z.string().optional(),
  ctaSecondaryLink: z.string().optional(),
  liveBadgeText: z.string().optional(),
  showLiveBadge: z.preprocess(
    (v) => {
      if (v === "on" || v === "true") return true;
      if (v === "false") return false;
      return v;
    },
    z.boolean().optional(),
  ),
  videoDesktopAlignment: z.enum(["top", "center", "bottom"]).optional(),
  videoMobileAlignment: z.enum(["top", "center", "bottom"]).optional(),
  imageDesktopAlignment: z.enum(["top", "center", "bottom"]).optional(),
  imageMobileAlignment: z.enum(["top", "center", "bottom"]).optional(),
}).partial();

const socialChannelSchema = z.object({
  youtubeChannelId: z.string().optional(),
  twitchChannelId: z.string().optional(),
});

const apiKeysSchema = z.object({
  youtubeApiKey: z.string().optional(),
  instagramApiKey: z.string().optional(),
});

export type SettingsActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateInfluencerData(
  tenantId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const rawData: Record<string, unknown> = {};
  for (const [key, value] of Array.from(formData.entries())) {
    rawData[key] = value;
  }

  const parsed = influencerPartialSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await requireAuth(tenantId);

    const existing = await SettingsService.getInfluencerData(tenantId);

    const merged: Record<string, unknown> = { ...existing };
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }

    const socialKeys = ["instagram", "youtube", "twitter", "tiktok"] as const;
    for (const key of socialKeys) {
      if (formData.has(key)) {
        merged.social = { ...((merged.social as object) || {}), [key]: formData.get(key) as string };
      }
    }

    await SettingsService.updateInfluencerData(tenantId, merged as Parameters<typeof SettingsService.updateInfluencerData>[1]);

    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    console.error("updateInfluencerData error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

export async function updateHeroData(
  tenantId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const rawData: Record<string, unknown> = {};
  for (const [key, value] of Array.from(formData.entries())) {
    rawData[key] = value;
  }

  const parsed = heroPartialSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await requireAuth(tenantId);

    const sparseData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined && value !== null && value !== "") {
        sparseData[key] = value;
      }
    }

    await prisma.$transaction(async (tx) => {
      await SettingsService.patchHeroData(tenantId, sparseData, tx);
      await logAction(
        tenantId,
        "updateHeroData",
        { fields: Object.keys(sparseData) },
        tx,
      );
    });

    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    console.error("updateHeroData error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

export async function updateHeroPartial(
  tenantId: string,
  partial: Record<string, unknown>,
): Promise<SettingsActionState> {
  const parsed = heroPartialSchema.safeParse(partial);
  if (!parsed.success) {
    return { success: false, error: "Invalid hero data" };
  }

  const sparseData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined && value !== null && value !== "") {
      sparseData[key] = value;
    }
  }

  if (Object.keys(sparseData).length === 0) {
    return { success: true };
  }

  try {
    await requireAuth(tenantId);

    await prisma.$transaction(async (tx) => {
      await SettingsService.patchHeroData(tenantId, sparseData, tx);
      await logAction(
        tenantId,
        "updateHeroPartial",
        { fields: Object.keys(sparseData) },
        tx,
      );
    });

    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    console.error("updateHeroPartial error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

export async function updateSocialChannels(
  tenantId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const rawData = {
    youtubeChannelId: (formData.get("youtubeChannelId") as string) || "",
    twitchChannelId: (formData.get("twitchChannelId") as string) || "",
  };

  const parsed = socialChannelSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Invalid channel ID" };
  }

  try {
    await requireAuth(tenantId);
    await SettingsService.updateTenantChannels(tenantId, parsed.data);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    console.error("updateSocialChannels error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

export async function updateApiKeys(
  tenantId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const rawData = {
    youtubeApiKey: (formData.get("youtubeApiKey") as string) || "",
    instagramApiKey: (formData.get("instagramApiKey") as string) || "",
  };

  const parsed = apiKeysSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await requireAuth(tenantId);

    const updates: { youtubeApiKey?: string; instagramApiKey?: string } = {};
    if (parsed.data.youtubeApiKey) updates.youtubeApiKey = parsed.data.youtubeApiKey;
    if (parsed.data.instagramApiKey) updates.instagramApiKey = parsed.data.instagramApiKey;

    if (Object.keys(updates).length > 0) {
      await SettingsService.updateTenantApiKeys(tenantId, updates);
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    console.error("updateApiKeys error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

const themeConfigSchema = z.object({
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  font: z.string().optional(),
  borderRadius: z.string().optional(),
  layoutDensity: z.enum(["compact", "comfortable", "spacious"]).optional(),
});

export type ThemeConfigInput = Partial<z.infer<typeof themeConfigSchema>>;

export async function updateThemeConfig(
  tenantId: string,
  data: ThemeConfigInput,
): Promise<SettingsActionState> {
  const parsed = themeConfigSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid theme config" };
  }

  const sparseData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined && value !== null && value !== "") {
      sparseData[key] = value;
    }
  }

  if (Object.keys(sparseData).length === 0) return { success: true };

  try {
    await requireAuth(tenantId);

    await prisma.$transaction(async (tx) => {
      await SettingsService.patchThemeConfig(tenantId, sparseData, tx);
      await logAction(tenantId, "updateThemeConfig", { fields: Object.keys(sparseData) }, tx);
    });

    revalidatePath("/admin/appearance");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, error: error.message };
    }
    console.error("updateThemeConfig error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}
