import { prisma } from "@/lib/prisma";
import type { AccountSettingsData, AccountSettingsUpdateInput } from "./types";

/**
 * Account Settings service — IMPLEMENTATION-18B.
 * Reads/writes account + business settings only. Identity (name, tagline, bio,
 * profile picture, social links) is owned by Hero and never touched here.
 */
export const profileService = {
  async getProfile(tenantId: string): Promise<AccountSettingsData> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "account_data" } },
    });
    const value = (setting?.value ?? {}) as Record<string, unknown>;

    return {
      contactEmail: (value.contactEmail as string) ?? null,
      phone: (value.phone as string) ?? null,
      timezone: (value.timezone as string) ?? null,
      language: (value.language as string) ?? null,
      country: (value.country as string) ?? null,
      location: (value.location as string) ?? null,
      businessName: (value.businessName as string) ?? null,
      gst: (value.gst as string) ?? null,
      taxId: (value.taxId as string) ?? null,
      payoutPreference: (value.payoutPreference as string) ?? null,
      currency: (value.currency as string) ?? null,
      categories: Array.isArray(value.categories) ? value.categories as string[] : [],
      notifications: {
        email: (value.notifications as { email?: boolean })?.email ?? true,
        push: (value.notifications as { push?: boolean })?.push ?? true,
      },
    };
  },

  async updateProfile(tenantId: string, input: AccountSettingsUpdateInput): Promise<AccountSettingsData> {
    const existing = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "account_data" } },
      select: { value: true },
    });
    const current = ((existing?.value as Record<string, unknown>) ?? {}) as Record<string, unknown>;

    const next: Record<string, unknown> = {
      ...current,
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.language !== undefined && { language: input.language }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.businessName !== undefined && { businessName: input.businessName }),
      ...(input.gst !== undefined && { gst: input.gst }),
      ...(input.taxId !== undefined && { taxId: input.taxId }),
      ...(input.payoutPreference !== undefined && { payoutPreference: input.payoutPreference }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.categories !== undefined && { categories: input.categories }),
      ...(input.notifications !== undefined && { notifications: input.notifications }),
    };

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "account_data" } },
      create: { tenantId, key: "account_data", value: next as never },
      update: { value: next as never },
    });

    return this.getProfile(tenantId);
  },
};
