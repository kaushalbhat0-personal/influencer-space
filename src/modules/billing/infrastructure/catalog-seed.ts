import { prisma } from "@/lib/prisma";
import { getAllPlans, FEATURE_CATALOG } from "@/lib/capabilities";

export async function seedBillingCatalog() {
  // 1. Seed features from canonical catalog
  for (const [key, info] of Object.entries(FEATURE_CATALOG)) {
    await prisma.billingFeature.upsert({
      where: { key },
      update: { description: info.description, valueType: info.valueType },
      create: { key, description: info.description, valueType: info.valueType },
    });
  }

  const featureMap = new Map<string, string>();
  const allFeatures = await prisma.billingFeature.findMany();
  for (const f of allFeatures) featureMap.set(f.key, f.id);

  // 2. Seed plans from canonical catalog
  for (const plan of getAllPlans()) {
    await prisma.billingPlan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, family: plan.family, price: plan.price, currency: plan.currency, cycle: plan.cycle ?? "monthly", version: { increment: 1 } },
      create: { code: plan.code, family: plan.family, name: plan.name, price: plan.price, currency: plan.currency, cycle: plan.cycle ?? "monthly" },
    });
  }

  // 3. Seed plan-feature join records
  for (const plan of getAllPlans()) {
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
