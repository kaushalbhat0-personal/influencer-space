import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { tenantSlugService } from "@/lib/slug/tenant-slug.service";
import { buildStorefrontUrl, buildDashboardUrl, buildAdminEmail } from "@/lib/config/platform";
import type { Prisma } from "@/generated/prisma/client";

export interface ProvisioningInput {
  creatorName: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  templateId?: string;
  strategyId?: string;
  sections?: string[];
  generatedContent?: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroCta?: string;
    aboutSection?: string;
    tagline?: string;
    seoTitle?: string;
    seoDescription?: string;
    keywords?: string[];
  };
  generatedTheme?: {
    preset?: string;
    colors?: { primary?: string; secondary?: string; accent?: string };
    fontFamily?: string;
    layoutDensity?: string;
    darkMode?: boolean;
  };
}

export interface ProvisioningResult {
  success: boolean;
  tenantId: string;
  tenantSlug: string;
  workspaceId: string;
  websiteId: string;
  storefrontUrl: string;
  dashboardUrl: string;
  adminEmail: string;
  temporaryPassword: string;
  websiteStatus: string;
  tenantStatus: string;
  publicationStatus: string;
}

function generateTemporaryPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

export class ProvisioningService {
  async provision(input: ProvisioningInput): Promise<ProvisioningResult> {
    const creatorName = input.creatorName.trim();
    if (!creatorName) {
      throw new Error("Creator name is required for provisioning");
    }

    if (creatorName.length < 2) {
      throw new Error("Creator name must be at least 2 characters");
    }

    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const slug = await tenantSlugService.generate(creatorName);

      const tenant = await tx.tenant.create({
        data: {
          name: creatorName,
          subdomain: slug,
        },
      });

      const workspaceSettings: Prisma.SettingCreateManyInput[] = [
        {
          tenantId: tenant.id,
          key: "brand_config",
          value: {
            name: creatorName,
            tagline: input.generatedContent?.tagline || "",
            bio: input.generatedContent?.aboutSection || "",
            heroTitle: input.generatedContent?.heroTitle || creatorName,
            aboutText: input.generatedContent?.aboutSection || "",
            palette: {
              primary: input.generatedTheme?.colors?.primary || "#6366f1",
              secondary: input.generatedTheme?.colors?.secondary || "#a78bfa",
            },
          } as Prisma.InputJsonValue,
        },
        {
          tenantId: tenant.id,
          key: "seo",
          value: {
            title: input.generatedContent?.seoTitle || creatorName,
            description: input.generatedContent?.seoDescription || "",
          } as Prisma.InputJsonValue,
        },
        {
          tenantId: tenant.id,
          key: "influencer_data",
          value: {
            name: creatorName,
            source: input.sourcePlatform || "manual",
            sourceUrl: input.sourceUrl || "",
            tagline: input.generatedContent?.tagline || "",
            bio: input.generatedContent?.aboutSection || "",
          } as Prisma.InputJsonValue,
        },
        {
          tenantId: tenant.id,
          key: "hero_data",
          value: {
            title: input.generatedContent?.heroTitle || creatorName,
            subtitle: input.generatedContent?.heroSubtitle || "",
            tagline: input.generatedContent?.tagline || "",
            videoUrl: "",
          } as Prisma.InputJsonValue,
        },
        {
          tenantId: tenant.id,
          key: "provisioning_meta",
          value: {
            templateId: input.templateId || null,
            strategyId: input.strategyId || null,
            sourcePlatform: input.sourcePlatform || "manual",
            sourceUrl: input.sourceUrl || "",
            provisionedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      ];

      await tx.setting.createMany({ data: workspaceSettings });

      const adminEmail = buildAdminEmail(slug);

      await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: creatorName,
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
        },
      });

      await tx.setting.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: "demo_metadata" } },
        create: {
          tenantId: tenant.id,
          key: "demo_metadata",
          value: {
            published: true,
            publishedAt: new Date().toISOString(),
            provisionedBy: "creator-import",
          } as Prisma.InputJsonValue,
        },
        update: {
          value: {
            published: true,
            publishedAt: new Date().toISOString(),
            provisionedBy: "creator-import",
          } as Prisma.InputJsonValue,
        },
      });

      const storefrontUrl = buildStorefrontUrl(slug);
      const dashboardUrl = buildDashboardUrl(slug);

      return {
        success: true,
        tenantId: tenant.id,
        tenantSlug: slug,
        workspaceId: tenant.id,
        websiteId: tenant.id,
        storefrontUrl,
        dashboardUrl,
        adminEmail,
        temporaryPassword: tempPassword,
        websiteStatus: "published",
        tenantStatus: "active",
        publicationStatus: "published",
      };
    });

    return result;
  }
}

export const provisioningService = new ProvisioningService();
