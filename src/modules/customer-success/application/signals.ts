// ── Customer Success — Signal Builders ─────────────────────
// RCCF-EPIC-09. Two sources feed the SAME engine:
//  - loadSignals(): full canonical Runtime Context (creator dashboard).
//  - loadSignalsLight(): light DB reads (super-admin / agency list views).
// The scoring/journey/risk/opportunity engines are shared — no duplicate scores.

import { prisma } from "@/lib/prisma";
import { cache as reactCache } from "react";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import { computePaymentReadiness } from "@/modules/payment-account";
import { recommendationHistory } from "@/modules/recommendation-runtime";
import type { SuccessSignals } from "../domain/types";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

export async function loadSignals(tenantId: string): Promise<SuccessSignals> {
  const [context, payment, tenant, sub, lastActivity, recommendations] = await Promise.all([
    runtimeContextBuilder.build(tenantId),
    computePaymentReadiness(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { createdAt: true } }),
    prisma.billingSubscription.findFirst({ where: { workspace: { tenantId } }, select: { status: true, trialEndsAt: true, plan: { select: { code: true } } } }),
    prisma.auditLog.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    recommendationHistory.get(tenantId),
  ]);

  const completedRecommendations = Object.values(recommendations).filter((r) => r.status === "accepted" || r.status === "completed").length;

  return {
    tenantId,
    createdAt: tenant?.createdAt ?? new Date(),
    lastActivityAt: lastActivity?.createdAt ?? null,
    productCount: context.metrics.productCount,
    orderCount: context.metrics.orderCount,
    galleryCount: context.metrics.galleryCount,
    published: context.intelligence.published,
    healthScore: context.health.overallScore,
    knowledgeScore: context.knowledge.score.overall,
    goalAlignment: context.goals.alignment.overall,
    successCompletion: context.success?.completionPercent ?? null,
    completedRecommendations,
    paymentReady: payment.readiness === "ready",
    paymentIncomplete: payment.readiness !== "ready",
    subscriptionStatus: sub?.status ?? null,
    trialEndsAt: sub?.trialEndsAt ?? null,
    hasProducts: context.metrics.productCount > 0,
    hasOrders: context.metrics.orderCount > 0,
    analyticsActive: context.intelligence.analyticsActive,
    seoConfigured: context.metrics.hasSeo,
    planCode: sub?.plan?.code ?? null,
    commerceStrategy: context.commerceStrategy.id,
  };
}

/** Light signals for list views (no full Runtime Context build). */
export async function loadSignalsLight(tenantId: string): Promise<SuccessSignals> {
  const [tenant, products, orders, gallery, publishStatus, sub, lastActivity, payment, seo] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { createdAt: true } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.productOrder.count({ where: { tenantId } }),
    prisma.galleryImage.count({ where: { tenantId } }),
    prisma.publishStatus.findFirst({ where: { website: { tenantId } }, select: { state: true } }),
    prisma.billingSubscription.findFirst({ where: { workspace: { tenantId } }, select: { status: true, trialEndsAt: true, plan: { select: { code: true } } } }),
    prisma.auditLog.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    computePaymentReadiness(tenantId),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } }, select: { id: true } }),
  ]);

  return {
    tenantId,
    createdAt: tenant?.createdAt ?? new Date(),
    lastActivityAt: lastActivity?.createdAt ?? null,
    productCount: products,
    orderCount: orders,
    galleryCount: gallery,
    published: publishStatus?.state === "live",
    healthScore: null,
    knowledgeScore: null,
    goalAlignment: null,
    successCompletion: null,
    completedRecommendations: 0,
    paymentReady: payment.readiness === "ready",
    paymentIncomplete: payment.readiness !== "ready",
    subscriptionStatus: sub?.status ?? null,
    trialEndsAt: sub?.trialEndsAt ?? null,
    hasProducts: products > 0,
    hasOrders: orders > 0,
    analyticsActive: false,
    seoConfigured: !!seo,
    planCode: sub?.plan?.code ?? null,
    commerceStrategy: payment.strategy,
  };
}

/** Request-cached full computation (creator dashboard). */
export const computeCustomerSuccessCached = requestCache(async (tenantId: string): Promise<import("../domain/types").CustomerSuccess> => {
  const { computeFromSignals } = await import("./compute");
  const signals = await loadSignals(tenantId);
  return computeFromSignals(signals);
});
