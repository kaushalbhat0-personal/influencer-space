import { prisma } from "@/lib/prisma";
import { buildStorefrontUrl } from "@/lib/config/platform";
import type { Prisma } from "@/generated/prisma/client";

export type ImportSource = "demo_seed" | "manual" | "youtube" | "instagram" | "twitch" | "website" | "tiktok" | "unknown";

export interface CreatorProfile {
  source: ImportSource;
  creatorName: string;
  brandName: string;
  tagline: string;
  bio: string;
  heroTitle: string;
  aboutText: string;
  tone: string;
  niche: string;
  audience: string;
  products: { name: string; price: number; description: string }[];
  services: string[];
  socialLinks: { platform: string; url: string }[];
  seoTitle: string;
  seoDesc: string;
  palette: { primary: string; secondary: string };
  logoUrl?: string;
  faq: { q: string; a: string }[];
  testimonials: { name: string; text: string }[];
  pages: string[];
  isDemo?: boolean;
  seedId?: string;
  channelId?: string;
}

export interface ProvisionResult {
  success: boolean;
  tenantId: string;
  storefrontUrl: string;
  productCount: number;
  errors: string[];
}

class TenantProvisioner {
  async provision(tx: Prisma.TransactionClient, profile: CreatorProfile) {
    const subdomain = profile.brandName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40);
    return tx.tenant.create({
      data: {
        name: profile.brandName,
        subdomain,
        ...(profile.channelId ? { youtubeChannelId: profile.channelId } : {}),
      },
    });
  }
}

class ProductProvisioner {
  async provision(tx: Prisma.TransactionClient, tenantId: string, products: CreatorProfile["products"]) {
    let count = 0;
    for (const p of products) {
      await tx.product.create({ data: { tenantId, name: p.name, price: p.price, description: p.description, isActive: true } });
      count++;
    }
    return count;
  }
}

class BrandProvisioner {
  async provision(tx: Prisma.TransactionClient, tenantId: string, profile: CreatorProfile) {
    await tx.setting.create({
      data: { tenantId, key: "brand_config", value: { name: profile.brandName, tagline: profile.tagline, bio: profile.bio, heroTitle: profile.heroTitle, aboutText: profile.aboutText, palette: profile.palette } as Prisma.InputJsonValue },
    });
  }
}

class SeoProvisioner {
  async provision(tx: Prisma.TransactionClient, tenantId: string, profile: CreatorProfile) {
    await tx.setting.create({
      data: { tenantId, key: "seo", value: { title: profile.seoTitle, description: profile.seoDesc } as Prisma.InputJsonValue },
    });
  }
}

class PublicationProvisioner {
  async provision(tx: Prisma.TransactionClient, tenantId: string, profile: CreatorProfile, userId: string) {
    if (profile.isDemo && profile.seedId) {
      await tx.setting.create({
        data: { tenantId, key: "demo_metadata", value: { isDemo: true, seedId: profile.seedId, published: false, generatedAt: new Date().toISOString(), generatedBy: userId } as Prisma.InputJsonValue },
      });
    }
  }
}

export class CreatorProvisioningEngine {
  async provision(profile: CreatorProfile, userId: string): Promise<ProvisionResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const tenant = await new TenantProvisioner().provision(tx, profile);
        const productCount = await new ProductProvisioner().provision(tx, tenant.id, profile.products);
        await new BrandProvisioner().provision(tx, tenant.id, profile);
        await new SeoProvisioner().provision(tx, tenant.id, profile);
        await new PublicationProvisioner().provision(tx, tenant.id, profile, userId);

        return {
          success: true,
          tenantId: tenant.id,
          storefrontUrl: buildStorefrontUrl(tenant.subdomain),
          productCount,
          errors: [],
        };
      });
    } catch (e) {
      return { success: false, tenantId: "", storefrontUrl: "", productCount: 0, errors: [String(e)] };
    }
  }
}

export const provisioningEngine = new CreatorProvisioningEngine();
