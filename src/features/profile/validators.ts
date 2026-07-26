import { z } from "zod/v4";
import { socialLinkSchema } from "@/features/_shared/validators";

export const brandColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  socialLinks: z.array(socialLinkSchema).optional(),
  contactEmail: z.string().email().nullable().optional(),
  categories: z.array(z.string()).optional(),
  brandColors: brandColorsSchema.optional(),
  languages: z.array(z.string()).optional(),
  location: z.string().nullable().optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
