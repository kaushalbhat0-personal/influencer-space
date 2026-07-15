"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { SettingsService } from "@/services/settings.service";
import { getTenantContext } from "@/lib/tenant";

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
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

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

async function requireTenant(): Promise<string> {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized — no tenant context");
  return tenant.id;
}

export async function updateInfluencerData(
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

  console.log("⚙️ updateInfluencerData called with:", rawData);

  const parsed = influencerDataSchema.safeParse(rawData);

  if (!parsed.success) {
    console.log(
      "⚙️ updateInfluencerData validation failed:",
      parsed.error.flatten().fieldErrors,
    );
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

    const tenantId = await requireTenant();
    if (session.user.role === "ADMIN" && session.user.tenantId !== tenantId) {
      return { success: false, error: "Unauthorized — cannot modify another tenant's data." };
    }

    const existing = await SettingsService.getInfluencerData(tenantId);
    const merged =
      session.user.role === "SUPER_ADMIN"
        ? { ...existing, ...parsed.data }
        : { ...existing, ...parsed.data, colors: existing.colors, niche: existing.niche };
    await SettingsService.updateInfluencerData(tenantId, merged);
    console.log("⚙️ updateInfluencerData success");
    revalidatePath("/");
    revalidatePath("/contact");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("⚙️ updateInfluencerData error:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function updateThemeSettings(
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

    const tenantId = await requireTenant();
    const existing = await SettingsService.getInfluencerData(tenantId);
    const merged = { ...existing, ...parsed.data };
    await SettingsService.updateInfluencerData(tenantId, merged);
    console.log("⚙️ updateThemeSettings success");
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("⚙️ updateThemeSettings error:", error);
    return { success: false, error: "Failed to update theme settings" };
  }
}

export async function updateHeroData(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const rawData = {
    videoUrl: (formData.get("videoUrl") as string) || "",
    posterUrl: (formData.get("posterUrl") as string) || "",
    title: (formData.get("heroTitle") as string) || "",
    subtitle: (formData.get("heroSubtitle") as string) || "",
    tagline: (formData.get("heroTagline") as string) || "",
    ctaText: (formData.get("ctaText") as string) || "",
    ctaLink: (formData.get("ctaLink") as string) || "",
    ctaSecondaryText: (formData.get("ctaSecondaryText") as string) || "",
    ctaSecondaryLink: (formData.get("ctaSecondaryLink") as string) || "",
    liveBadgeText: (formData.get("liveBadgeText") as string) || "",
    showLiveBadge: (formData.get("showLiveBadge") as string) || "false",
  };

  console.log("⚙️ updateHeroData called with:", rawData);

  const parsed = heroDataSchema.safeParse(rawData);

  if (!parsed.success) {
    console.log(
      "⚙️ updateHeroData validation failed:",
      parsed.error.flatten().fieldErrors,
    );
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireTenant();
    await SettingsService.updateHeroData(tenantId, parsed.data);
    console.log("⚙️ updateHeroData success");
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("updateHeroData error:", error);
    return { success: false, error: "Failed to update hero settings" };
  }
}

export async function updateSocialChannels(
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
    const tenantId = await requireTenant();
    await SettingsService.updateTenantChannels(tenantId, parsed.data);
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("updateSocialChannels error:", error);
    return { success: false, error: "Failed to update social channels" };
  }
}

export async function updateApiKeys(
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
    const tenantId = await requireTenant();
    await SettingsService.updateTenantApiKeys(tenantId, parsed.data);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("updateApiKeys error:", error);
    return { success: false, error: "Failed to update API keys" };
  }
}

