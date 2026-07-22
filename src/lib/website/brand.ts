import { prisma } from "@/lib/prisma";

export interface BrandInput {
  name: string;
  tagline?: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  socialLinks?: Record<string, string>[];
}

export class BrandService {
  async getByWebsiteId(websiteId: string) {
    return prisma.brand.findUnique({ where: { websiteId } });
  }

  async upsert(websiteId: string, input: BrandInput) {
    return prisma.brand.upsert({
      where: { websiteId },
      create: {
        websiteId,
        name: input.name,
        tagline: input.tagline || "",
        bio: input.bio || "",
        avatarUrl: input.avatarUrl ?? null,
        bannerUrl: input.bannerUrl ?? null,
        socialLinks: input.socialLinks || [],
      },
      update: {
        name: input.name,
        tagline: input.tagline ?? undefined,
        bio: input.bio ?? undefined,
        avatarUrl: input.avatarUrl ?? undefined,
        bannerUrl: input.bannerUrl ?? undefined,
        socialLinks: input.socialLinks ?? undefined,
      },
    });
  }
}
