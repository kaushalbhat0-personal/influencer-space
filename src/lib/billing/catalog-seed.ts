import { prisma } from "@/lib/prisma";
import { PLANS, FEATURES } from "./plan-catalog";

/**
 * Idempotently populate BillingPlan, BillingFeature, and BillingPlanFeature
 * tables from the canonical in-memory plan catalog.
 *
 * Safe to run multiple times. Upserts by unique code/key.
 */
export async function seedBillingCatalog() {
  // 1. Seed features
  for (const feature of FEATURES) {
    await prisma.billingFeature.upsert({
      where: { key: feature.key },
      update: { description: feature.description, valueType: feature.valueType },
      create: { key: feature.key, description: feature.description, valueType: feature.valueType },
    });
  }

  const featureMap = new Map<string, string>();
  const allFeatures = await prisma.billingFeature.findMany();
  for (const f of allFeatures) {
    featureMap.set(f.key, f.id);
  }

  // 2. Seed plans
  for (const plan of PLANS) {
    await prisma.billingPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        family: plan.family,
        price: plan.price,
        currency: plan.currency,
        cycle: plan.cycle,
        version: { increment: 1 },
      },
      create: {
        code: plan.code,
        family: plan.family,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        cycle: plan.cycle,
      },
    });
  }

  // 3. Seed plan-feature join records
  for (const plan of PLANS) {
    const dbPlan = await prisma.billingPlan.findUnique({ where: { code: plan.code } });
    if (!dbPlan) continue;

    for (const [featureKey, value] of Object.entries(plan.features)) {
      const featureId = featureMap.get(featureKey);
      if (!featureId) continue;

      const data: { intValue?: number; boolValue?: boolean; strValue?: string } = {};
      if (typeof value === "number") data.intValue = value;
      else if (typeof value === "boolean") data.boolValue = value;
      else if (typeof value === "string") data.strValue = value;

      await prisma.billingPlanFeature.upsert({
        where: { planId_featureId: { planId: dbPlan.id, featureId } },
        update: data,
        create: { planId: dbPlan.id, featureId, ...data },
      });
    }
  }

  return { ok: true };
}
