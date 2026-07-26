import { z } from "zod/v4";

export const socialLinkSchema = z.object({
  platform: z.string().min(1),
  url: z.string().url(),
  label: z.string().optional(),
});

export const seoSchema = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
});

export const slugSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "Must be a valid slug (lowercase, hyphens only)",
);

export const currencySchema = z.string().length(3).toUpperCase();

export type SocialLinkInput = z.infer<typeof socialLinkSchema>;
export type SEOInput = z.infer<typeof seoSchema>;
