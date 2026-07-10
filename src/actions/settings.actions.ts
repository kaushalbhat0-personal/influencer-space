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
    colors: {
      primary: "#d4a843",
      secondary: "#fbbf24",
      accent: "#b45309",
    },
  };

  const parsed = influencerDataSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await SettingsService.updateInfluencerData(parsed.data);
    invalidateConfigCache();
    revalidatePath("/");
    revalidatePath("/contact");
    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update settings" };
  }
}
