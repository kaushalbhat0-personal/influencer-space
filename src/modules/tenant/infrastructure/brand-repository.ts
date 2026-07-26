import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface CreateBrandData {
  websiteId: string;
  name: string;
  tagline?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  socialLinks?: unknown;
}

export class BrandRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async create(data: CreateBrandData, tx?: Prisma.TransactionClient) {
    return this.client(tx).brand.create({
      data: {
        websiteId: data.websiteId,
        name: data.name,
        tagline: data.tagline ?? "",
        bio: data.bio ?? "",
        avatarUrl: data.avatarUrl,
        bannerUrl: data.bannerUrl,
        socialLinks: (data.socialLinks ?? []) as never,
      },
    });
  }
}

export const brandRepository = new BrandRepository();
