"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";
import { AffiliateService } from "@/services/affiliate.service";
import { StorageService } from "@/services/storage.service";
import { AFFILIATES_ROUTE } from "@/lib/constants";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";
import { logAction } from "@/lib/audit";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { getTenantContext } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/security/rate-limiter";

const affiliateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  url: z.string().url("Must be a valid URL"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

export type AffiliateActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function requireAuth(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.tenantId) throw new Error("No tenant associated with account");
  return session.user.tenantId;
}

/**
 * RCCF-65.3 — server-derived client IP for the click rate-limit bucket. Reads
 * the proxy-provided headers only; never trusts a client-supplied value. Falls
 * back to a shared bucket when the platform provides no IP header.
 */
async function clientIp(): Promise<string> {
  try {
    const h = headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export async function createAffiliate(
  _prevState: AffiliateActionState,
  formData: FormData,
): Promise<AffiliateActionState> {
  const raw = Object.fromEntries(formData);
  logger.info("createAffiliate called", "affiliate-actions", { metadata: raw as Record<string, unknown> });

  const parsed = affiliateSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    imageUrl: formData.get("imageUrl"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    logger.info("createAffiliate validation failed", "affiliate-actions", { metadata: { fieldErrors: parsed.error.flatten().fieldErrors } as unknown as Record<string, unknown> });
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireAuth();
    // RCCF-35: affiliate links live in the same affiliateLink table as links;
    // the Link page enforces max_links, so the Affiliates page must too —
    // otherwise a lower tier bypasses the content limit.
    const limit = await enforceContentLimit({ tenantId, featureKey: FEATURE_IDS.LINKS });
    if (!limit.ok) return { success: false, error: limit.reason };
    const result = await AffiliateService.create(tenantId, {
      title: parsed.data.title,
      url: parsed.data.url,
      imageUrl: parsed.data.imageUrl || undefined,
      isActive: parsed.data.isActive,
    });
    logger.info("createAffiliate success", "affiliate-actions", { metadata: { affiliateId: result.id } as Record<string, unknown> });
    await logAction(tenantId, "createAffiliate", { affiliateId: result.id });
    revalidatePath(AFFILIATES_ROUTE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    captureError(error, { service: "affiliate-actions", operation: "createAffiliate" });
    return { success: false, error: "Failed to create affiliate" };
  }
}

export async function updateAffiliate(
  _prevState: AffiliateActionState,
  formData: FormData,
): Promise<AffiliateActionState> {
  const id = formData.get("id") as string;
  const raw = Object.fromEntries(formData);
  logger.info("updateAffiliate called", "affiliate-actions", { metadata: { id, data: raw } as unknown as Record<string, unknown> });

  if (!id) {
    logger.info("updateAffiliate missing id", "affiliate-actions");
    return { success: false, error: "Affiliate ID is required" };
  }

  const parsed = affiliateSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    imageUrl: formData.get("imageUrl"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    logger.info("updateAffiliate validation failed", "affiliate-actions", { metadata: { fieldErrors: parsed.error.flatten().fieldErrors } as unknown as Record<string, unknown> });
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireAuth();
    await AffiliateService.update(id, tenantId, {
      title: parsed.data.title,
      url: parsed.data.url,
      imageUrl: parsed.data.imageUrl || undefined,
      isActive: parsed.data.isActive,
    });
    logger.info("updateAffiliate success", "affiliate-actions", { metadata: { id } as Record<string, unknown> });
    await logAction(tenantId, "updateAffiliate", { affiliateId: id });
    revalidatePath(AFFILIATES_ROUTE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    captureError(error, { service: "affiliate-actions", operation: "updateAffiliate" });
    return { success: false, error: "Failed to update affiliate" };
  }
}

export async function deleteAffiliate(
  id: string,
): Promise<AffiliateActionState> {
  logger.info("deleteAffiliate called", "affiliate-actions", { metadata: { id } as Record<string, unknown> });
  try {
    const tenantId = await requireAuth();
    const affiliate = await AffiliateService.findById(id, tenantId);
    logger.info("deleteAffiliate found", "affiliate-actions", { metadata: { affiliateId: affiliate?.id } as Record<string, unknown> });
    if (affiliate?.imageUrl) {
      const path = StorageService.extractPathFromUrl(affiliate.imageUrl);
      logger.info("deleteAffiliate extracting storage path", "affiliate-actions", { metadata: { path } as Record<string, unknown> });
      if (path) {
        await StorageService.delete(path);
        logger.info("deleteAffiliate storage file deleted", "affiliate-actions", { metadata: { path } as Record<string, unknown> });
      }
    }
    await AffiliateService.delete(id, tenantId);
    logger.info("deleteAffiliate success", "affiliate-actions", { metadata: { id } as Record<string, unknown> });
    await logAction(tenantId, "deleteAffiliate", { affiliateId: id, title: affiliate?.title ?? null });
    revalidatePath(AFFILIATES_ROUTE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    captureError(error, { service: "affiliate-actions", operation: "deleteAffiliate" });
    return { success: false, error: "Failed to delete affiliate" };
  }
}

export async function incrementAffiliateClicks(
  id: string,
): Promise<AffiliateActionState> {
  logger.info("incrementAffiliateClicks called", "affiliate-actions", { metadata: { id } as Record<string, unknown> });
  // RCCF-65.3 — the endpoint is narrow: a single well-formed AffiliateLink id.
  // Malformed input fails safely before any DB work.
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    logger.info("incrementAffiliateClicks rejected malformed id", "affiliate-actions");
    return { success: false, error: "Invalid affiliate link id" };
  }
  try {
    // RCCF-65.3 — public storefront click tracking. The tenant is resolved
    // SERVER-side from the middleware-derived `x-tenant-host` header (the real
    // HTTP Host of the storefront being viewed) — never from the browser. This
    // reuses the same server-authoritative tenant resolution as the public
    // storefront contact/newsletter actions (getTenantContext), so an anonymous
    // visitor can increment the link they actually clicked while a crafted id
    // can never cross the tenant boundary.
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Invalid tenant context" };

    // RCCF-65.3 — reuse the platform in-memory rate limiter (same mechanism as
    // auth/login): per-IP throttling so repeated automated requests cannot
    // drive unbounded counter growth. The storefront is never blocked — only
    // the counter increment is.
    const ip = await clientIp();
    const rate = checkRateLimit(`/affiliate-clicks:${ip}`, "/affiliate-clicks");
    if (!rate.allowed) return { success: false, error: "Too many requests" };

    // incrementClicks verifies existence + active + tenant ownership in the
    // repository lookup, then atomically increments. Inactive/deleted/cross-tenant
    // links throw "Affiliate not found" and are never counted.
    await AffiliateService.incrementClicks(id, tenant.id);
    logger.info("incrementAffiliateClicks success", "affiliate-actions", { metadata: { id } as Record<string, unknown> });
    return { success: true };
  } catch (error) {
    captureError(error, { service: "affiliate-actions", operation: "incrementAffiliateClicks" });
    return { success: false, error: "Failed to increment clicks" };
  }
}

export async function toggleAffiliateActive(
  id: string,
): Promise<AffiliateActionState> {
  logger.info("toggleAffiliateActive called", "affiliate-actions", { metadata: { id } as Record<string, unknown> });
  try {
    const tenantId = await requireAuth();
    await AffiliateService.toggleActive(id, tenantId);
    logger.info("toggleAffiliateActive success", "affiliate-actions", { metadata: { id } as Record<string, unknown> });
    await logAction(tenantId, "toggleAffiliateActive", { affiliateId: id });
    revalidatePath(AFFILIATES_ROUTE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    captureError(error, { service: "affiliate-actions", operation: "toggleAffiliateActive" });
    return { success: false, error: "Failed to toggle affiliate status" };
  }
}

