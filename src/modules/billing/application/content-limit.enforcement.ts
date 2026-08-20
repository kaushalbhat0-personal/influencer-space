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
import { getPlan } from "@/lib/capabilities/plans";
import { DEFAULT_PLAN_CODE, FEATURE_IDS, type FeatureId } from "@/lib/capabilities/constants";
import { resolveActivePlan } from "./plan-source";
import type { Prisma } from "@/generated/prisma/client";

/**
 * RCCF-72.15B — Creator Launch global active core-content limit.
 *
 * Launch is a FREE but fully functional Creator plan: Products, Services,
 * Courses and Games are all capability-available, but together they share ONE
 * Launch-wide ceiling of 3 ACTIVE core content items. Testimonials and FAQ are
 * intentionally excluded and retain their independent per-type limits.
 *
 * This is the canonical source of the Launch counter so the server and any UI
 * allowance readout derive from the same primitive.
 */
export const LAUNCH_GLOBAL_LIMIT = 3;

/** The four core content types that share the Launch-wide ceiling. */
export const LAUNCH_CORE_FEATURES: ReadonlySet<FeatureId> = new Set([
  FEATURE_IDS.PRODUCTS,
  FEATURE_IDS.SERVICES,
  FEATURE_IDS.COURSES,
  FEATURE_IDS.GAMES,
]);

/**
 * True when the resolved plan code maps to Creator Launch (including legacy /
 * alias codes). Growth, Scale, Enterprise and all Partner/Agency plans return
 * false and keep their existing per-type limits.
 */
export function isLaunchPlan(planCode: string | null | undefined): boolean {
  if (!planCode) return false;
  return getPlan(planCode)?.code === "creator_launch";
}

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
 * RCCF-72.15B — active core-content usage for a tenant, aggregated across the
 * four core content types. Only ACTIVE items count toward the Launch ceiling:
 *
 * - Product:  published + active + not archived  (existing canonical predicate,
 *   matches `status: "PUBLISHED", isActive: true, archivedAt: null`).
 * - Service:  Offering type=coaching with status `published`.
 * - Course:   Offering type=course with status `published`.
 * - Game:     isActive === true.
 *
 * Drafts, archived and inactive records are excluded. Testimonials and FAQ are
 * NOT part of this counter. Accepts an optional transaction client so it can be
 * re-run under the tenant row lock during the authoritative create path.
 */
export async function countActiveCoreContentUsage(
  tenantId: string,
  tx: Pick<Prisma.TransactionClient, "product" | "offering" | "game"> = prisma,
): Promise<number> {
  const [products, services, courses, games] = await Promise.all([
    tx.product.count({ where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null } }),
    tx.offering.count({ where: { tenantId, type: "coaching", status: "published" } }),
    tx.offering.count({ where: { tenantId, type: "course", status: "published" } }),
    tx.game.count({ where: { tenantId, isActive: true } }),
  ]);
  return products + services + courses + games;
}

/** Structured decision for a Launch core-content rejection (global ceiling). */
function launchCoreDecision(featureKey: FeatureId, used: number, planCode: string): ContentLimitDecision {
  const suggestedUpgrade = capabilityService.requiresUpgrade(planCode, featureKey, used).suggestedUpgrade;
  return {
    ok: false,
    featureKey,
    used,
    limit: LAUNCH_GLOBAL_LIMIT,
    reason: `Core content limit reached (${used}/${LAUNCH_GLOBAL_LIMIT}).`,
    suggestedUpgrade,
  };
}

/**
 * Enforce a content limit for a tenant. Returns ok=true when the tenant still
 * has headroom (or the plan is unlimited); ok=false with a human-readable
 * reason and a suggested upgrade when the limit is reached.
 *
 * For Creator Launch and the four core content types, the GLOBAL active
 * core-content ceiling (3) is authoritative instead of the per-type limit.
 * Testimonials / FAQ and all non-Launch plans keep the existing per-type check.
 */
export async function enforceContentLimit(params: {
  tenantId: string;
  featureKey: FeatureId;
  used?: number;
}): Promise<ContentLimitDecision> {
  const { tenantId, featureKey } = params;

  const plan = await resolveActivePlan(undefined, tenantId);
  const planCode = plan.code ?? DEFAULT_PLAN_CODE;

  if (isLaunchPlan(planCode) && LAUNCH_CORE_FEATURES.has(featureKey)) {
    const used = params.used ?? (await countActiveCoreContentUsage(tenantId));
    if (used < LAUNCH_GLOBAL_LIMIT) {
      return { ok: true, featureKey, used, limit: LAUNCH_GLOBAL_LIMIT };
    }
    return launchCoreDecision(featureKey, used, planCode);
  }

  const used = params.used ?? (await countContentUsage(tenantId, featureKey));
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

/**
 * RCCF-72.15B — authoritative, race-safe core-content create for Creator Launch.
 *
 * Mirrors the established media quota pattern: locks the tenant row
 * (SELECT … FOR UPDATE) so concurrent core-content creates for the same tenant
 * serialize, re-counts ACTIVE core usage under the lock, and rejects when the
 * global Launch ceiling (3) would be exceeded. `work` runs inside the same
 * transaction so the created row is committed atomically with the capacity
 * check — a Launch user cannot fan out 3 concurrent requests to exceed 3.
 *
 * Growth/Scale and Testimonials/FAQ never enter this path.
 */
export async function withLaunchCoreContentCapacity<T>(
  tenantId: string,
  featureKey: FeatureId,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<ContentLimitDecision | T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${tenantId} FOR UPDATE`;
    const plan = await resolveActivePlan(undefined, tenantId);
    const planCode = plan.code ?? DEFAULT_PLAN_CODE;
    if (!isLaunchPlan(planCode)) {
      // Non-Launch: fall through to the existing per-type enforcement contract.
      const decision = await enforceContentLimit({ tenantId, featureKey, used: await countContentUsage(tenantId, featureKey) });
      if (!decision.ok) return decision;
      return work(tx);
    }
    const used = await countActiveCoreContentUsage(tenantId, tx);
    if (used >= LAUNCH_GLOBAL_LIMIT) {
      return launchCoreDecision(featureKey, used, planCode);
    }
    return work(tx);
  });
}
