"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DemoSeedAdapter } from "@/lib/import/adapters/demo-seed";
import { provisioningService } from "@/modules/provisioning/application/provisioning-service";
import { publishingService } from "@/lib/publishing/service";
import { track } from "@/lib/analytics";
import type { DemoGenerationResult } from "@/lib/demo/types";

const demoSeedAdapter = new DemoSeedAdapter();

export async function generateDemoWebsite(seedId: string): Promise<DemoGenerationResult> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return { seedId, status: "failed", tenantId: "", storefrontUrl: "", productCount: 0, seedVersion: "1.0", generatorVersion: "1.0", generatedAt: "", generatedBy: "", error: "Unauthorized" };
  }

  const validation = demoSeedAdapter.validate(seedId);
  if (!validation.valid) {
    return { seedId, status: "failed", tenantId: "", storefrontUrl: "", productCount: 0, seedVersion: "1.0", generatorVersion: "1.0", generatedAt: "", generatedBy: "", error: validation.error || "Invalid seed" };
  }

  const analysis = await demoSeedAdapter.analyze(seedId);
  const profile = analysis.creatorProfile;

  const runId = await provisioningService.createRun({
    creatorName: profile.brandName,
    sourceUrl: seedId,
    sourcePlatform: "demo_seed",
  });

  const provisioningInput = {
    runId,
    creatorName: profile.brandName,
    sourceUrl: seedId,
    sourcePlatform: "demo_seed",
    generatedContent: {
      heroTitle: profile.heroTitle,
      tagline: profile.tagline,
      aboutSection: profile.aboutText,
      seoTitle: profile.seoTitle,
      seoDescription: profile.seoDesc,
    },
    generatedTheme: {
      preset: "custom",
      colors: { primary: profile.palette.primary, secondary: profile.palette.secondary },
    },
  };

  let provisionResult;
  try {
    provisionResult = await provisioningService.provision(provisioningInput as Parameters<typeof provisioningService.provision>[0]);
  } catch (err) {
    return { seedId, status: "failed", tenantId: "", storefrontUrl: "", productCount: 0, seedVersion: "1.0", generatorVersion: "1.0", generatedAt: new Date().toISOString(), generatedBy: session.user.id ?? "", error: String(err) };
  }

  for (const p of profile.products) {
    await prisma.product.create({
      data: {
        tenantId: provisionResult.tenantId,
        name: p.name,
        price: p.price,
        description: p.description,
        isActive: true,
      },
    });
  }

  const publishResult = await publishingService.publish(provisionResult.tenantId);
  const status = publishResult.success ? "published" : "failed";
  const error = publishResult.success ? undefined : `Publishing failed: ${publishResult.error}`;

  track("publish:completed", { source: "demo_seed", status, seedId });

  return {
    seedId, status,
    tenantId: provisionResult.tenantId,
    storefrontUrl: provisionResult.storefrontUrl,
    productCount: profile.products.length,
    seedVersion: "1.0", generatorVersion: "1.0",
    generatedAt: new Date().toISOString(), generatedBy: session.user.id ?? "",
    error,
  };
}
