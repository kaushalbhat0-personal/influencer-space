/**
 * Server-side content limit enforcement — RCCF-08.
 *
 * Every content-creation surface (products, services, courses, testimonials,
 * faq, timeline, links, feed, games, gallery, bookings) resolves the tenant's
 * ACTIVE plan through the canonical plan source and enforces the EXISTING
 * per-plan limits configured in COMMERCE_PLANS (featureOverrides). No new
 * capabilities or limit definitions are introduced — this only enforces what
 * the plan configuration already declares.
 */
import { prisma } from "@/lib/prisma";
import { capabilityService } from "@/lib/capabilities";
import { getFeatureInfo } from "@/lib/capabilities/features";
import { DEFAULT_PLAN_CODE, type FeatureId } from "@/lib/capabilities/constants";
import { resolveActivePlan } from "./plan-source";

export interface ContentLimitDecision {
  ok: boolean;
  featureKey: string;
  used: number;
  limit: number;
  reason?: string;
  suggestedUpgrade?: string;
}

/** Setting-stored collections (testimonials/faq live in Tenant settings). */
const SETTING_KEY_FOR_FEATURE: Partial<Record<FeatureId, string>> = {
  max_testimonials: "testimonials",
  max_faq: "faq",
};

async function countSettingItems(tenantId: string, key: string): Promise<number> {
  const row = await prisma.setting.findUnique({
    where: { tenantId_key: { tenantId, key } },
    select: { value: true },
  });
  return Array.isArray(row?.value) ? (row.value as unknown[]).length : 0;
}

/** Count the tenant's current usage for a content-limit feature. */
export async function countContentUsage(tenantId: string, featureKey: FeatureId): Promise<number> {
  switch (featureKey) {
    case "max_products":
      return prisma.product.count({ where: { tenantId } });
    case "max_services":
      return prisma.offering.count({ where: { tenantId, type: "coaching" } });
    case "max_courses":
      return prisma.offering.count({ where: { tenantId, type: "course" } });
    case "max_timeline":
      return prisma.timelineEvent.count({ where: { tenantId } });
    case "max_links":
      return prisma.affiliateLink.count({ where: { tenantId } });
    case "max_games":
      return prisma.game.count({ where: { tenantId } });
    case "max_gallery":
      return prisma.galleryImage.count({ where: { tenantId } });
    case "max_bookings":
      return prisma.booking.count({ where: { tenantId } });
    case "max_feed":
      return prisma.contentFeedItem.count({ where: { tenantId } });
    default: {
      const key = SETTING_KEY_FOR_FEATURE[featureKey];
      return key ? countSettingItems(tenantId, key) : 0;
    }
  }
}

/**
 * Enforce a content limit for a tenant. Returns ok=true when the tenant still
 * has headroom (or the plan is unlimited); ok=false with a human-readable
 * reason and a suggested upgrade when the limit is reached.
 */
export async function enforceContentLimit(params: {
  tenantId: string;
  featureKey: FeatureId;
  used?: number;
}): Promise<ContentLimitDecision> {
  const { tenantId, featureKey } = params;
  const used = params.used ?? (await countContentUsage(tenantId, featureKey));

  const plan = await resolveActivePlan(undefined, tenantId);
  const planCode = plan.code ?? DEFAULT_PLAN_CODE;
  const check = capabilityService.checkLimit(planCode, featureKey, used);

  if (check.isUnlimited || check.remaining > 0) {
    return { ok: true, featureKey, used, limit: check.limit };
  }

  const info = getFeatureInfo(featureKey);
  const reason =
    check.limit === 0
      ? `${info.label} is not available on your current plan.`
      : `${info.label} limit reached (${used}/${check.limit}).`;
  const suggestedUpgrade = capabilityService.requiresUpgrade(planCode, featureKey, used).suggestedUpgrade;

  return { ok: false, featureKey, used, limit: check.limit, reason, suggestedUpgrade };
}
