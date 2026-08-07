"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { defaultConfig } from "@/config/influencer";
import { defaultHeroData } from "@/config/hero";
import { YouTubeScraperService } from "@/services/youtube-scraper.service";
import { VercelService } from "@/services/vercel.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { toSubdomain } from "@/lib/utils";
import { purgeOldAuditLogs, logAction } from "@/lib/audit";
import { logger } from "@/lib/observability/logger";
import { billingService } from "@/modules/billing/application/service";
import { billingMigrationRegistry } from "@/modules/billing/application/migration-registry";
import { canonicalPlanCode } from "@/lib/capabilities/plan-resolution";
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
        where: { email: adminEmail },
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
          } as unknown as Prisma.InputJsonValue,
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
          } as unknown as Prisma.InputJsonValue,
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
        where: { email: adminEmail },
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
          } as unknown as Prisma.InputJsonValue,
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
          } as unknown as Prisma.InputJsonValue,
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

export type DeleteTenantResult = {
  success: boolean;
  error?: string;
};

export type ResetPasswordResult = {
  success: boolean;
  error?: string;
};

export async function resetTenantAdminPassword(
  tenantId: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized — Super Admin access required." };
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await prisma.user.updateMany({
      where: { tenantId, role: "ADMIN" },
      data: { password: hashedPassword },
    });

    if (result.count === 0) {
      return { success: false, error: "No admin user found for this tenant." };
    }

    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset password",
    };
  }
}

export async function deleteTenant(tenantId: string): Promise<DeleteTenantResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });

    if (!tenant) {
      return { success: false, error: "Tenant not found." };
    }

    if (tenant.customDomain) {
      try {
        await VercelService.removeDomain(tenant.customDomain);
      } catch {
        logger.warn("Vercel domain removal failed — proceeding with tenant delete.", "super-admin-actions");
      }
    }

    // VALIDATION-04: audit BEFORE deleting (AuditLog cascades away with the tenant).
    await logAction(tenantId, "super-admin:tenant-deleted", { reason: "manual", via: "deleteTenant" });

    // VALIDATION-04: delete orphan-prone rows explicitly and atomically. The
    // bare tenant.delete() leaves Workspace/Members, GenerationSession,
    // CreatorProvisionRun, BillingAccount, AlertRecord and AnalyticsEvent rows
    // behind (several tables have no FK cascade to Tenant).
    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.findUnique({ where: { tenantId }, select: { id: true } });
      if (workspace) {
        await tx.generationSession.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.billingEvent.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.billingInvoice.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.billingSubscription.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.workspace.delete({ where: { id: workspace.id } });
      }
      await tx.creatorProvisionRun.deleteMany({ where: { tenantId } });
      await tx.billingAccount.deleteMany({ where: { accountId: tenantId } });
      await tx.alertRecord.deleteMany({ where: { tenantId } });
      await tx.analyticsEvent.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete tenant",
    };
  }
}

export type LoginAsTokenResult = { success: boolean; loginUrl?: string; error?: string };

export async function generateLoginAsToken(tenantId: string): Promise<LoginAsTokenResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, subdomain: true },
  });
  if (!tenant) return { success: false, error: "Tenant not found" };

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  const token = await new SignJWT({ tenantId, type: "superadmin-impersonation" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return { success: true, loginUrl: `${baseUrl}/api/auth/login-as?token=${token}` };
}

/**
 * IMPLEMENTATION-41: agency impersonation — SUPER_ADMIN temporarily signs in as
 * the agency's AGENCY_ADMIN. 5-min JWT, audited, session cookie + workspace
 * cookie set by /api/auth/login-as; exit via normal sign-out.
 */
export async function generateLoginAsAgencyToken(agencyId: string): Promise<LoginAsTokenResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const agency = await prisma.websiteAgency.findUnique({
    where: { id: agencyId },
    select: { id: true, name: true },
  });
  if (!agency) return { success: false, error: "Agency not found" };

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  const token = await new SignJWT({ agencyId, type: "agency-impersonation" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);
  await logAction("system", "support:impersonate-agency", { agencyId, actor: session.user.email }).catch(() => {});

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return { success: true, loginUrl: `${baseUrl}/api/auth/login-as?token=${token}` };
}

export type PlanUpdateResult = { success: boolean; error?: string };

export async function updateSubscriptionPlan(
  tenantId: string,
  plan: string,
  status: "FREE" | "ACTIVE" | "CANCELLED",
): Promise<PlanUpdateResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // IMPLEMENTATION-39: writes Billing v2 via BillingService (legacy Subscription
    // is now read-only migration compatibility). Status maps FREE→ACTIVE.
    const workspace = await prisma.workspace.findFirst({ where: { tenantId }, select: { id: true } });
    if (!workspace) return { success: false, error: "Workspace not found" };
    const canonical = canonicalPlanCode(plan) ?? plan;
    const result = await billingService.adminSetPlan(
      workspace.id,
      canonical,
      status === "CANCELLED" ? "CANCELLED" : "ACTIVE",
      "super-admin updateSubscriptionPlan",
    );
    if (!result.success) return { success: false, error: result.error };
    billingMigrationRegistry.markMigrated("update-subscription-plan");
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update plan" };
  }
}

export type SyncResult = { success: boolean; error?: string };

export async function triggerTenantContentSync(tenantId: string): Promise<SyncResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { updatedAt: new Date() },
    });
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sync trigger failed" };
  }
}

export async function reVerifyAdminDomain(tenantId: string): Promise<SyncResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true },
    });
    if (!tenant?.customDomain) return { success: false, error: "No custom domain configured" };

    const status = await VercelService.verifyDomain(tenant.customDomain);
    return { success: status.verified };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Domain re-verify failed" };
  }
}

export async function purgeContentFeed(tenantId: string): Promise<SyncResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.contentFeedItem.deleteMany({ where: { tenantId } });
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Purge failed" };
  }
}

export async function togglePlatformFlag(
  key: string,
  value: boolean,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const platformTenant = await prisma.tenant.findFirst({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!platformTenant) return { success: false, error: "No tenant found" };

    const current = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId: platformTenant.id, key: "platform_config" } },
    });

    const config = (current?.value as Record<string, unknown>) || {};
    config[key] = value;

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: platformTenant.id, key: "platform_config" } },
      update: { value: config as unknown as Prisma.InputJsonValue },
      create: { tenantId: platformTenant.id, key: "platform_config", value: config as unknown as Prisma.InputJsonValue },
    });

    revalidatePath("/super-admin/features");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}

export async function purgeOldAuditLogsAction(
  olderThanDays: number = 90,
): Promise<{ success: boolean; deleted?: number; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  if (olderThanDays < 7) {
    return { success: false, error: "Cannot purge logs newer than 7 days." };
  }

  try {
    const { deleted } = await purgeOldAuditLogs(olderThanDays);
    revalidatePath("/super-admin/audit");
    return { success: true, deleted };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Purge failed" };
  }
}







