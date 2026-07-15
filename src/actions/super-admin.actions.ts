"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { defaultConfig } from "@/config/influencer";
import { defaultHeroData } from "@/config/hero";
import { YouTubeScraperService } from "@/services/youtube-scraper.service";
import { VercelService } from "@/services/vercel.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toSubdomain } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

const DEFAULT_PASSWORD = "CreatorLaunch2026!";

const schema = z.object({
  creatorName: z.string().min(2, "Name is required"),
  adminEmail: z.string().email("Valid email required"),
});

const youtubeProvisionSchema = z.object({
  youtubeUrl: z.string().min(1, "YouTube URL or handle is required"),
});

export type ProvisionResult = {
  success: boolean;
  subdomain?: string;
  email?: string;
  password?: string;
  tenantId?: string;
  demoUrl?: string;
  error?: string;
};

export async function provisionNewCreator(
  _prevState: ProvisionResult,
  formData: FormData,
): Promise<ProvisionResult> {
  const parsed = schema.safeParse({
    creatorName: formData.get("creatorName"),
    adminEmail: formData.get("adminEmail"),
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid input. Name and email required." };
  }

  const { creatorName, adminEmail } = parsed.data;

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized — Super Admin access required." };
  }

  const subdomain = toSubdomain(creatorName);
  const password = DEFAULT_PASSWORD;
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { subdomain },
        update: {},
        create: { name: creatorName, subdomain },
      });

      await tx.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
        update: { password: hashedPassword },
        create: {
          tenantId: tenant.id,
          name: creatorName,
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
        },
      });

      await tx.setting.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: "influencer_data" } },
        update: {},
        create: {
          tenantId: tenant.id,
          key: "influencer_data",
          value: {
            ...defaultConfig,
            name: creatorName,
            tagline: "",
            bio: "",
          } as Prisma.InputJsonValue,
        },
      });

      await tx.setting.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: "hero_data" } },
        update: {},
        create: {
          tenantId: tenant.id,
          key: "hero_data",
          value: {
            ...defaultHeroData,
            title: creatorName,
            subtitle: "",
            tagline: "",
            videoUrl: "",
          } as Prisma.InputJsonValue,
        },
      });

      return tenant;
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return {
      success: true,
      subdomain,
      email: adminEmail,
      password,
      tenantId: result.id,
      demoUrl: `${baseUrl}/admin/login`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return { success: false, error: `Subdomain "${subdomain}" already taken.` };
    }
    return { success: false, error: message };
  }
}

export async function magicProvisionFromYoutube(
  _prevState: ProvisionResult,
  formData: FormData,
): Promise<ProvisionResult> {
  const parsed = youtubeProvisionSchema.safeParse({
    youtubeUrl: formData.get("youtubeUrl"),
  });

  if (!parsed.success) {
    return { success: false, error: "YouTube URL or handle is required." };
  }

  const meta = await YouTubeScraperService.fetchChannelMetadata(parsed.data.youtubeUrl);
  if (!meta) {
    return { success: false, error: "Could not resolve YouTube channel. Check the handle." };
  }

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized — Super Admin access required." };
  }

  const creatorName = meta.title;
  const subdomain = toSubdomain(creatorName);
  const adminEmail = `admin@${subdomain}.com`;
  const password = DEFAULT_PASSWORD;
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { subdomain },
        update: { youtubeChannelId: meta.id },
        create: {
          name: creatorName,
          subdomain,
          youtubeChannelId: meta.id,
        },
      });

      await tx.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
        update: { password: hashedPassword },
        create: {
          tenantId: tenant.id,
          name: creatorName,
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
        },
      });

      await tx.setting.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: "influencer_data" } },
        update: {},
        create: {
          tenantId: tenant.id,
          key: "influencer_data",
          value: {
            ...defaultConfig,
            name: creatorName,
            tagline: meta.customUrl,
            bio: meta.description || defaultConfig.bio,
            profileImage: meta.thumbnailUrl || defaultConfig.profileImage,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.setting.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: "hero_data" } },
        update: {},
        create: {
          tenantId: tenant.id,
          key: "hero_data",
          value: {
            ...defaultHeroData,
            title: creatorName,
            subtitle: `${meta.subscriberCount.toLocaleString()} subscribers`,
            tagline: meta.customUrl,
            posterUrl: meta.thumbnailUrl || defaultHeroData.posterUrl,
            videoUrl: "",
          } as Prisma.InputJsonValue,
        },
      });

      return tenant;
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return {
      success: true,
      subdomain,
      email: adminEmail,
      password,
      tenantId: result.id,
      demoUrl: `${baseUrl}/admin/login`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return { success: false, error: `Subdomain "${subdomain}" already taken.` };
    }
    return { success: false, error: message };
  }
}

export type DomainAttachmentResult = {
  success: boolean;
  domain?: string;
  error?: string;
};

export async function attachCustomDomain(
  tenantId: string,
  customDomain: string,
): Promise<DomainAttachmentResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const cleaned = customDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  const result = await VercelService.addDomain(cleaned);

  if (!result.success) {
    return { success: false, domain: cleaned, error: result.error };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: cleaned },
    });

    return { success: true, domain: cleaned };
  } catch (error) {
    return {
      success: false,
      domain: cleaned,
      error: error instanceof Error ? error.message : "Failed to save domain",
    };
  }
}
