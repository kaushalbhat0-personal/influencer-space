import { prisma } from "@/lib/prisma";
import type { DemoSeed } from "@/lib/demo/types";
import type { Prisma } from "@/generated/prisma/client";

export interface CreatorProfile {
  name: string; tagline: string; bio: string; heroTitle: string;
  aboutText: string; seoTitle: string; seoDesc: string;
  palette: { primary: string; secondary: string; };
  products: { name: string; price: number; description: string; }[];
  isDemo?: boolean; seedId?: string;
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
    const subdomain = profile.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40);
    return tx.tenant.create({ data: { name: profile.name, subdomain } });
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
      data: { tenantId, key: "brand_config", value: { name: profile.name, tagline: profile.tagline, bio: profile.bio, heroTitle: profile.heroTitle, aboutText: profile.aboutText, palette: profile.palette } as Prisma.InputJsonValue },
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
          storefrontUrl: `${tenant.subdomain}.creatorspace.app`,
          productCount,
          errors: [],
        };
      });
    } catch (e) {
      return { success: false, tenantId: "", storefrontUrl: "", productCount: 0, errors: [String(e)] };
    }
  }

  static fromSeed(seed: DemoSeed): CreatorProfile {
    return {
      name: seed.brand.name, tagline: seed.brand.tagline, bio: seed.content.bio,
      heroTitle: seed.content.hero, aboutText: seed.content.about,
      seoTitle: seed.content.seoTitle, seoDesc: seed.content.seoDesc,
      palette: seed.brand.palette, products: seed.products,
      isDemo: true, seedId: seed.id,
    };
  }
}

export const provisioningEngine = new CreatorProvisioningEngine();
