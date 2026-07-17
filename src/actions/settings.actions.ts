"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { SettingsService } from "@/services/settings.service";

const socialSchema = z.object({
  instagram: z.string().optional().default(""),
  youtube: z.string().optional().default(""),
  twitter: z.string().optional().default(""),
  tiktok: z.string().optional().default(""),
});

const influencerDataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  tagline: z.string().min(1, "Tagline is required"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  social: socialSchema,
  profileImage: z.string().optional().default(""),
  niche: z.string().optional().default("gaming"),
  colors: z
    .object({
      primary: z.string().optional().default("#d4a843"),
      secondary: z.string().optional().default("#fbbf24"),
      accent: z.string().optional().default("#b45309"),
    })
    .optional()
    .default({ primary: "#d4a843", secondary: "#fbbf24", accent: "#b45309" }),
});

const themeSettingsSchema = z.object({
  niche: z.string().optional().default("gaming"),
  colors: z
    .object({
      primary: z.string().optional().default("#d4a843"),
      secondary: z.string().optional().default("#fbbf24"),
      accent: z.string().optional().default("#b45309"),
    })
    .optional()
    .default({ primary: "#d4a843", secondary: "#fbbf24", accent: "#b45309" }),
});

const heroDataSchema = z.object({
  videoUrl: z.string().optional().default(""),
  posterUrl: z.string().optional().default(""),
  title: z.string().optional().default(""),
  subtitle: z.string().optional().default(""),
  tagline: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaLink: z.string().optional().default(""),
  ctaSecondaryText: z.string().optional().default(""),
  ctaSecondaryLink: z.string().optional().default(""),
  liveBadgeText: z.string().optional().default(""),
  showLiveBadge: z
    .preprocess(
      (v) => {
        if (v === "on" || v === "true") return true;
        if (v === "false") return false;
        return v;
      },
      z.boolean().optional().default(false),
    ),
  videoDesktopAlignment: z.enum(["top", "center", "bottom"]).optional().default("center"),
  videoMobileAlignment: z.enum(["top", "center", "bottom"]).optional().default("center"),
  imageDesktopAlignment: z.enum(["top", "center", "bottom"]).optional().default("center"),
  imageMobileAlignment: z.enum(["top", "center", "bottom"]).optional().default("center"),
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
  youtubeChannelId: z.string().optional().default(""),
  twitchChannelId: z.string().optional().default(""),
});

const apiKeysSchema = z.object({
  youtubeApiKey: z.string().optional().default(""),
  instagramApiKey: z.string().optional().default(""),
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
  const rawData = {
    name: formData.get("name") as string,
    tagline: formData.get("tagline") as string,
    bio: formData.get("bio") as string,
    social: {
      instagram: (formData.get("instagram") as string) || "",
      youtube: (formData.get("youtube") as string) || "",
      twitter: (formData.get("twitter") as string) || "",
      tiktok: (formData.get("tiktok") as string) || "",
    },
    profileImage: (formData.get("profileImage") as string) || "",
    niche: (formData.get("niche") as string) || "gaming",
    colors: { primary: "#d4a843", secondary: "#fbbf24", accent: "#b45309" },
  };

  const parsed = influencerDataSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.user.role === "ADMIN" && session.user.tenantId !== tenantId) {
      return { success: false, error: "Unauthorized — cannot modify another tenant's data." };
    }

    const existing = await SettingsService.getInfluencerData(tenantId);
    const merged =
      session.user.role === "SUPER_ADMIN"
        ? { ...existing, ...parsed.data }
        : { ...existing, ...parsed.data, colors: existing.colors, niche: existing.niche };
    await SettingsService.updateInfluencerData(tenantId, merged);
    revalidatePath("/");
    revalidatePath("/contact");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("updateInfluencerData error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

export async function updateThemeSettings(
  tenantId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const rawData = {
    niche: (formData.get("niche") as string) || "gaming",
    colors: {
      primary: (formData.get("colors.primary") as string) || "#d4a843",
      secondary: (formData.get("colors.secondary") as string) || "#fbbf24",
      accent: (formData.get("colors.accent") as string) || "#b45309",
    },
  };

  const parsed = themeSettingsSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Only Super Admins can modify theme settings." };
    }

    const existing = await SettingsService.getInfluencerData(tenantId);
    const merged = { ...existing, ...parsed.data };
    await SettingsService.updateInfluencerData(tenantId, merged);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("updateThemeSettings error:", error);
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
    const existing = await SettingsService.getHeroData(tenantId);
    const merged = { ...existing, ...parsed.data };
    await SettingsService.updateHeroData(tenantId, merged);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
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

  try {
    const existing = await SettingsService.getHeroData(tenantId);
    const merged = { ...existing, ...parsed.data };
    await SettingsService.updateHeroData(tenantId, merged);

    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
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
    await SettingsService.updateTenantChannels(tenantId, parsed.data);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
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
    await SettingsService.updateTenantApiKeys(tenantId, parsed.data);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("updateApiKeys error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}
