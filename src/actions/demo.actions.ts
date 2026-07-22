"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEMO_SEEDS } from "@/lib/demo/seeds";
import type { DemoGenerationResult } from "@/lib/demo/types";

export async function generateDemoWebsite(seedId: string): Promise<DemoGenerationResult> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const seed = DEMO_SEEDS.find((s) => s.id === seedId);
  if (!seed) return { seedId, status: "failed", tenantId: "", storefrontUrl: "", productCount: 0, seedVersion: "1.0", generatorVersion: "1.0", generatedAt: "", generatedBy: "", error: "Seed not found" };

  const subdomain = seed.brand.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 40);
  const tenantId = `demo_${seedId}_${Date.now()}`;

  const tenant = await prisma.tenant.create({
    data: { id: tenantId, name: seed.brand.name, subdomain },
  });

  let productCount = 0;
  for (const p of seed.products) {
    await prisma.product.create({
      data: { tenantId: tenant.id, name: p.name, price: p.price, description: p.description, isActive: true },
    });
    productCount++;
  }

  // Set demo metadata as a setting
  await prisma.setting.create({
    data: { tenantId: tenant.id, key: "demo_metadata", value: { isDemo: true, industry: seed.industry, seedId: seed.id, seedVersion: "1.0", generatedAt: new Date().toISOString(), generatedBy: session.user.id } },
  });

  return {
    seedId, status: "published", tenantId: tenant.id, storefrontUrl: `${subdomain}.creatorspace.app`,
    productCount, seedVersion: "1.0", generatorVersion: "1.0",
    generatedAt: new Date().toISOString(), generatedBy: session.user.id ?? "",
  };
}
