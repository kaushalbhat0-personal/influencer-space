import { z } from "zod/v4";

/**
 * Account settings validation — no storefront identity fields.
 * Creator identity lives in Hero.
 */
export const accountSettingsSchema = z.object({
  contactEmail: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  businessName: z.string().nullable().optional(),
  gst: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  payoutPreference: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  categories: z.array(z.string()).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
  }).optional(),
});

export type AccountSettingsUpdate = z.infer<typeof accountSettingsSchema>;
