import { prisma } from "@/lib/prisma";
import { normalizeAssetId } from "@/lib/media/resolve";
import type { ProfileData, SocialLink, BrandColors } from "./types";

export const profileService = {
  async getProfile(tenantId: string): Promise<ProfileData> {
    const [tenant, brand, settings] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, instagramApiKey: true },
      }),
      prisma.brand.findFirst({
        where: { website: { tenantId } },
        select: { name: true, tagline: true, bio: true, avatarUrl: true, bannerUrl: true, avatarAssetId: true, bannerAssetId: true, socialLinks: true },
      }),
      prisma.setting.findMany({
        where: { tenantId, key: { in: ["brand_config", "influencer_data"] } },
        select: { key: true, value: true },
      }),
    ]);

    const brandConfig = settings.find((s) => s.key === "brand_config")?.value as Record<string, unknown> | undefined;
    const influencerData = settings.find((s) => s.key === "influencer_data")?.value as Record<string, unknown> | undefined;

    const socialLinks: SocialLink[] = Array.isArray(brand?.socialLinks)
      ? (brand.socialLinks as unknown as SocialLink[])
      : Array.isArray(brandConfig?.socialLinks)
        ? (brandConfig.socialLinks as unknown as SocialLink[])
        : [];

    const colors: BrandColors = {
      primary: (brandConfig?.primaryColor as string) ?? "#2D1B69",
      secondary: (brandConfig?.secondaryColor as string) ?? "#00f5ff",
      accent: (brandConfig?.accentColor as string) ?? "#ff00e5",
    };

    return {
      name: brand?.name ?? tenant?.name ?? "",
      tagline: brand?.tagline ?? "",
      bio: brand?.bio ?? "",
      avatarUrl: brand?.avatarUrl ?? null,
      bannerUrl: brand?.bannerUrl ?? null,
      avatarAssetId: brand?.avatarAssetId ?? null,
      bannerAssetId: brand?.bannerAssetId ?? null,
      socialLinks,
      contactEmail: (influencerData?.contactEmail as string) ?? null,
      categories: Array.isArray(influencerData?.categories) ? influencerData.categories as string[] : [],
      brandColors: colors,
      languages: Array.isArray(influencerData?.languages) ? influencerData.languages as string[] : [],
      location: (influencerData?.location as string) ?? null,
    };
  },

  async updateProfile(tenantId: string, input: Partial<ProfileData>): Promise<ProfileData> {
    const brand = await prisma.brand.findFirst({
      where: { website: { tenantId } },
      select: { id: true },
    });

    if (brand) {
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.tagline !== undefined) updateData.tagline = input.tagline;
      if (input.bio !== undefined) updateData.bio = input.bio;
      if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
      if (input.avatarAssetId !== undefined) updateData.avatarAssetId = normalizeAssetId(input.avatarAssetId);
      if (input.bannerUrl !== undefined) updateData.bannerUrl = input.bannerUrl;
      if (input.bannerAssetId !== undefined) updateData.bannerAssetId = normalizeAssetId(input.bannerAssetId);
      if (input.socialLinks !== undefined) updateData.socialLinks = input.socialLinks;
      if (Object.keys(updateData).length > 0) {
        await prisma.brand.update({ where: { id: brand.id }, data: updateData });
      }
    }

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "influencer_data" } },
      create: {
        tenantId,
        key: "influencer_data",
        value: JSON.parse(JSON.stringify({
          contactEmail: input.contactEmail ?? null,
          categories: input.categories ?? [],
          languages: input.languages ?? [],
          location: input.location ?? null,
        })),
      },
      update: {
        value: JSON.parse(JSON.stringify({
          contactEmail: input.contactEmail ?? null,
          categories: input.categories ?? [],
          languages: input.languages ?? [],
          location: input.location ?? null,
        })),
      },
    });

    if (input.brandColors) {
      const existing = await prisma.setting.findUnique({
        where: { tenantId_key: { tenantId, key: "brand_config" } },
        select: { value: true },
      });
      const existingConfig = (existing?.value as Record<string, unknown>) ?? {};
      await prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key: "brand_config" } },
        create: {
          tenantId,
          key: "brand_config",
          value: JSON.parse(JSON.stringify({
            ...existingConfig,
            primaryColor: input.brandColors.primary,
            secondaryColor: input.brandColors.secondary,
            accentColor: input.brandColors.accent,
          })),
        },
        update: {
          value: JSON.parse(JSON.stringify({
            ...existingConfig,
            primaryColor: input.brandColors.primary,
            secondaryColor: input.brandColors.secondary,
            accentColor: input.brandColors.accent,
          })),
        },
      });
    }

    return this.getProfile(tenantId);
  },
};
