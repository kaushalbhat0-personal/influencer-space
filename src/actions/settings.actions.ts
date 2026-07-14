"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SettingsService } from "@/services/settings.service";
import { invalidateConfigCache } from "@/config/influencer";

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
    .default({
      primary: "#d4a843",
      secondary: "#fbbf24",
      accent: "#b45309",
    }),
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

export type SettingsActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

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
    colors: {
      primary: "#d4a843",
      secondary: "#fbbf24",
      accent: "#b45309",
    },
  };

  console.log("⚙️ updateInfluencerData called with:", rawData);

  const parsed = influencerDataSchema.safeParse(rawData);

  if (!parsed.success) {
    console.log("⚙️ updateInfluencerData validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await SettingsService.updateInfluencerData(parsed.data);
    invalidateConfigCache();
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
    console.log("⚙️ updateHeroData validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await SettingsService.updateHeroData(parsed.data);
    console.log("⚙️ updateHeroData success");
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    console.error("⚙️ updateHeroData error:", error);
    return { success: false, error: "Failed to update hero settings" };
  }
}
